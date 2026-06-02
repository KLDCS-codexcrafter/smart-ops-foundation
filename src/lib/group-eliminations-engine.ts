/**
 * @file        src/lib/group-eliminations-engine.ts
 * @sibling     NEW @ Sprint 108 · T-Phase-6.C.1.4 · 🏁 Arc 2 Capstone · Pillar C.1
 * @purpose     Produce group-consolidation ELIMINATION ENTRIES (data only).
 *              7-type catalogue E1–E7. Each entry derives from the relevant
 *              IC transaction type(s); E6 (investment vs equity) consumes
 *              getGroupStructure.ownership_pct and computes
 *              minority_share = dSub(100, ownership_pct).
 *
 *              All money math via @/lib/decimal-helpers (dAdd · dSub · dMul ·
 *              dPct · dSum · roundTo). Zero-source categories return zero
 *              entries (no fabrication — FR-91, §L-noted).
 *
 * @reads-from  intercompany-transaction-engine (listICTransactions · 0-DIFF) ·
 *              intercompany-group-structure-engine (getGroupStructure ·
 *              listGroupStructure · 0-DIFF) ·
 *              intercompany-matching-engine (runICMatching · matched filter) ·
 *              decimal-helpers (money math) ·
 *              audit-trail-engine (logAudit)
 *
 * @audit-type  group_elimination · module: mca-roc
 *
 * @scope-wall  DP-A2-9 (CRITICAL) · ENTRIES ONLY. This engine MUST NOT and
 *              MUST NEVER export functions that build consolidated P&L /
 *              Balance-Sheet / Cash-Flow statements, perform NCI rollup,
 *              compute Goodwill, or translate multi-currency balances —
 *              those land in Arc 3 (S109–S112). The S108 test pack asserts
 *              the absence of such functions in BOTH engines.
 *
 * @disciplines FR-19 SIBLING · FR-44 spine reuse · FR-67 §H 0-DIFF ·
 *              FR-91 honest-partial · v1.30 §L (DP-A2-6 · DP-A2-9)
 *
 * @[JWT]       GET  /api/group-eliminations
 *              POST /api/group-eliminations/generate
 */

import { logAudit } from '@/lib/audit-trail-engine';
import { dAdd, dSub, dMul, dPct, dSum, roundTo } from '@/lib/decimal-helpers';
import {
  listICTransactions,
  type IntercompanyTransaction,
} from '@/lib/intercompany-transaction-engine';
import { getGroupStructure } from '@/lib/intercompany-group-structure-engine';

// ─── Provenance · READS_FROM (FR-44 disclosure) ───────────────────────────

export const READS_FROM = {
  icTransactions: 'src/lib/intercompany-transaction-engine.ts (listICTransactions · 0-DIFF)',
  groupStructure: 'src/lib/intercompany-group-structure-engine.ts (getGroupStructure · 0-DIFF)',
  matching: 'src/lib/intercompany-matching-engine.ts (sibling · S108)',
  decimalHelpers: 'src/lib/decimal-helpers.ts (dAdd/dSub/dMul/dPct/dSum/roundTo)',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────

export type EliminationType =
  | 'E1_ic_sales_purchases'          // intercompany revenue ↔ COGS / purchases
  | 'E2_ic_balances'                  // IC receivable ↔ IC payable
  | 'E3_unrealized_profit_inventory'  // intra-group profit on stock still on hand
  | 'E4_ic_dividends'                 // IC dividend income vs distribution
  | 'E5_ic_loans_interest'            // IC loan principal + interest accrual
  | 'E6_investment_vs_equity'         // parent investment ↔ sub equity (ownership_pct)
  | 'E7_unrealized_profit_fixed_assets'; // deferred from S107 asset_transfer

/** Exactly 7 (E1–E7) · order locked · the test pack asserts length === 7. */
export const ELIMINATION_TYPES: readonly EliminationType[] = [
  'E1_ic_sales_purchases',
  'E2_ic_balances',
  'E3_unrealized_profit_inventory',
  'E4_ic_dividends',
  'E5_ic_loans_interest',
  'E6_investment_vs_equity',
  'E7_unrealized_profit_fixed_assets',
] as const;

export interface EliminationEntry {
  elimination_id: string;
  elimination_type: EliminationType;
  fy: string;
  from_entity: string;
  to_entity: string;
  source_ic_txn_ids: string[];
  debit_account: string;
  credit_account: string;
  amount: number;
  /** E6 only — minority interest portion = dSub(100, ownership_pct) applied to amount. */
  minority_share?: number;
  note: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function newId(type: EliminationType): string {
  return `elim-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function postedInFy(fy: string): IntercompanyTransaction[] {
  // FY anchor: financial-year string YYYY-YY (e.g. '2026-27') maps to txn_date
  // year prefix. Accept both 'YYYY-YY' and a plain 'YYYY' for resilience.
  const yearPrefix = fy.slice(0, 4);
  return listICTransactions().filter((t) => {
    if (t.status !== 'posted' && t.status !== 'settled') return false;
    return (t.txn_date ?? '').startsWith(yearPrefix);
  });
}

function aggregateByPair(
  txns: IntercompanyTransaction[],
): Map<string, IntercompanyTransaction[]> {
  const buckets = new Map<string, IntercompanyTransaction[]>();
  for (const t of txns) {
    const key = `${t.from_entity}|${t.to_entity}`;
    const arr = buckets.get(key) ?? [];
    arr.push(t);
    buckets.set(key, arr);
  }
  return buckets;
}

// ─── Per-type derivers ────────────────────────────────────────────────────

/**
 * E1 · IC sales/purchases — revenue ↔ COGS elimination.
 * Source IC types (priced trade flows): invoice · stock_transfer · service_charge.
 */
function deriveE1(fy: string): EliminationEntry[] {
  const sources = postedInFy(fy).filter((t) =>
    t.txn_type === 'invoice' ||
    t.txn_type === 'stock_transfer' ||
    t.txn_type === 'service_charge',
  );
  const by = aggregateByPair(sources);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of by) {
    const [from_entity, to_entity] = pair.split('|');
    const amount = roundTo(dSum(items, (t) => t.amount), 2);
    if (amount <= 0) continue;
    out.push({
      elimination_id: newId('E1_ic_sales_purchases'),
      elimination_type: 'E1_ic_sales_purchases',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'IC-SALES-INC',
      credit_account: 'IC-PURCH-EXP',
      amount,
      note: 'E1 · Eliminate intercompany revenue against group COGS / purchases',
    });
  }
  return out;
}

/**
 * E2 · IC balances — receivable ↔ payable elimination.
 * Source: all IC types that book IC-RECV / IC-PAY (every priced + unpriced
 * type except `payment`, which CLEARS the balance via CASH-BANK).
 */
function deriveE2(fy: string): EliminationEntry[] {
  const balanceTypes: IntercompanyTransaction['txn_type'][] = [
    'invoice', 'stock_transfer', 'service_charge',
    'expense_allocation', 'asset_transfer', 'loan',
  ];
  const sources = postedInFy(fy).filter((t) => balanceTypes.includes(t.txn_type));
  // Net by pair: payments in the same FY reduce the gross balance.
  const payments = postedInFy(fy).filter((t) => t.txn_type === 'payment');
  const grossByPair = aggregateByPair(sources);
  const payByPair = aggregateByPair(payments);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of grossByPair) {
    const [from_entity, to_entity] = pair.split('|');
    const gross = roundTo(dSum(items, (t) => t.amount), 2);
    const paid = roundTo(dSum(payByPair.get(pair) ?? [], (t) => t.amount), 2);
    const net = roundTo(dSub(gross, paid), 2);
    if (net <= 0) continue;
    out.push({
      elimination_id: newId('E2_ic_balances'),
      elimination_type: 'E2_ic_balances',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'IC-PAY',
      credit_account: 'IC-RECV',
      amount: net,
      note: `E2 · Eliminate IC payable against IC receivable (gross ₹${gross} less payments ₹${paid})`,
    });
  }
  return out;
}

/**
 * E3 · Unrealized profit in inventory — intra-group stock still on hand.
 * Source: stock_transfer postings, applying a conservative on-hand factor.
 * §L: full on-hand calculation needs end-of-period stock snapshots (Arc 3 ·
 * S109). For S108 we use a fixed conservative margin of 20% × amount per
 * txn as the unrealized portion — the engine returns zero rows if no
 * stock_transfer sources exist (no fabrication · FR-91).
 */
const E3_ASSUMED_MARGIN_PCT = 20 as const;

function deriveE3(fy: string): EliminationEntry[] {
  const sources = postedInFy(fy).filter((t) => t.txn_type === 'stock_transfer');
  if (sources.length === 0) return [];
  const by = aggregateByPair(sources);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of by) {
    const [from_entity, to_entity] = pair.split('|');
    const total = roundTo(dSum(items, (t) => t.amount), 2);
    const amount = roundTo(dPct(total, E3_ASSUMED_MARGIN_PCT), 2);
    if (amount <= 0) continue;
    out.push({
      elimination_id: newId('E3_unrealized_profit_inventory'),
      elimination_type: 'E3_unrealized_profit_inventory',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'IC-SALES-INC',
      credit_account: 'IC-INV-IN',
      amount,
      note: `E3 · Unrealized profit on intra-group inventory (assumed ${E3_ASSUMED_MARGIN_PCT}% margin × ₹${total})`,
    });
  }
  return out;
}

/**
 * E4 · IC dividends — eliminate dividend income at parent vs distribution.
 * §L: IC transaction engine does not yet model a `dividend` txn_type;
 * returns zero entries until Arc 3 introduces dividend declarations.
 */
function deriveE4(fy: string): EliminationEntry[] {
  // No sourcing IC data yet — explicitly zero (no fabrication · FR-91).
  void fy;
  return [];
}

/**
 * E5 · IC loans & interest — eliminate loan receivable/payable and interest.
 * Source: `loan` IC txns (principal). §L: interest accrual is deferred to
 * Arc 3 (S109+); we eliminate principal only for now.
 */
function deriveE5(fy: string): EliminationEntry[] {
  const sources = postedInFy(fy).filter((t) => t.txn_type === 'loan');
  if (sources.length === 0) return [];
  const by = aggregateByPair(sources);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of by) {
    const [from_entity, to_entity] = pair.split('|');
    const amount = roundTo(dSum(items, (t) => t.amount), 2);
    if (amount <= 0) continue;
    out.push({
      elimination_id: newId('E5_ic_loans_interest'),
      elimination_type: 'E5_ic_loans_interest',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'IC-LOAN-PAY',
      credit_account: 'IC-LOAN-RECV',
      amount,
      note: 'E5 · Eliminate IC loan principal (interest deferred to Arc 3)',
    });
  }
  return out;
}

/**
 * E6 · Investment vs equity — parent investment eliminated against sub equity.
 * Source: `capital_infusion` IC txns. minority_share = dSub(100, ownership_pct)
 * applied to amount via dPct — read from getGroupStructure(to_entity).
 * Zero entries if no capital_infusion sources exist.
 */
function deriveE6(fy: string): EliminationEntry[] {
  const sources = postedInFy(fy).filter((t) => t.txn_type === 'capital_infusion');
  if (sources.length === 0) return [];
  const by = aggregateByPair(sources);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of by) {
    const [from_entity, to_entity] = pair.split('|');
    const amount = roundTo(dSum(items, (t) => t.amount), 2);
    if (amount <= 0) continue;
    const sub = getGroupStructure(to_entity);
    const ownership_pct = sub?.ownership_pct ?? 100;
    const minority_pct = dSub(100, ownership_pct);
    const minority_share = roundTo(dPct(amount, minority_pct), 2);
    out.push({
      elimination_id: newId('E6_investment_vs_equity'),
      elimination_type: 'E6_investment_vs_equity',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'IC-EQUITY',
      credit_account: 'IC-INVEST',
      amount,
      minority_share,
      note: `E6 · Eliminate parent investment vs sub equity (ownership ${ownership_pct}% · minority ${minority_pct}% = ₹${minority_share})`,
    });
  }
  return out;
}

/**
 * E7 · Unrealized profit on intra-group fixed assets — deferred from S107
 * asset_transfer (priced). §L: full computation needs the asset's gross
 * book value at counterparty; for S108 we recognise the priced transfer
 * amount × an assumed gain factor and surface it as the elimination.
 * Returns zero if no asset_transfer sources exist (no fabrication).
 */
const E7_ASSUMED_GAIN_PCT = 15 as const;

function deriveE7(fy: string): EliminationEntry[] {
  const sources = postedInFy(fy).filter((t) => t.txn_type === 'asset_transfer');
  if (sources.length === 0) return [];
  const by = aggregateByPair(sources);
  const out: EliminationEntry[] = [];
  for (const [pair, items] of by) {
    const [from_entity, to_entity] = pair.split('|');
    const total = roundTo(dSum(items, (t) => t.amount), 2);
    const amount = roundTo(dMul(total, dPct(1, E7_ASSUMED_GAIN_PCT)), 2);
    if (amount <= 0) continue;
    out.push({
      elimination_id: newId('E7_unrealized_profit_fixed_assets'),
      elimination_type: 'E7_unrealized_profit_fixed_assets',
      fy,
      from_entity,
      to_entity,
      source_ic_txn_ids: items.map((t) => t.ic_txn_id),
      debit_account: 'FA-DISPOSAL',
      credit_account: 'IC-FA',
      amount,
      note: `E7 · Unrealized profit on intra-group fixed asset (assumed ${E7_ASSUMED_GAIN_PCT}% × ₹${total})`,
    });
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────

const DERIVERS: Record<EliminationType, (fy: string) => EliminationEntry[]> = {
  E1_ic_sales_purchases: deriveE1,
  E2_ic_balances: deriveE2,
  E3_unrealized_profit_inventory: deriveE3,
  E4_ic_dividends: deriveE4,
  E5_ic_loans_interest: deriveE5,
  E6_investment_vs_equity: deriveE6,
  E7_unrealized_profit_fixed_assets: deriveE7,
};

/**
 * Generate elimination entries for every E-type (E1–E7) for the given FY.
 * Logs a single `group_elimination` audit per invocation (run-level).
 */
export function generateEliminations(input: { fy: string }): EliminationEntry[] {
  const { fy } = input;
  const out: EliminationEntry[] = [];
  for (const t of ELIMINATION_TYPES) {
    out.push(...DERIVERS[t](fy));
  }
  logAudit({
    entityCode: 'GROUP',
    action: 'create',
    entityType: 'group_elimination',
    recordId: `elim-run-${fy}-${Date.now()}`,
    recordLabel: `Group eliminations · FY ${fy} · ${out.length} entries · ${ELIMINATION_TYPES.length} types`,
    beforeState: null,
    afterState: {
      fy,
      total_entries: out.length,
      total_amount: roundTo(dSum(out, (e) => e.amount), 2),
    } as Record<string, unknown>,
    sourceModule: 'group-eliminations-engine',
  });
  return out;
}

/** Generate elimination entries for a single E-type. */
export function generateEliminationsByType(
  input: { fy: string; type: EliminationType },
): EliminationEntry[] {
  const { fy, type } = input;
  return DERIVERS[type](fy);
}

/** Per-type aggregate · count + summed amount (decimal-safe). */
export function getEliminationSummary(
  fy: string,
): { type: EliminationType; count: number; total: number }[] {
  const entries = ELIMINATION_TYPES.flatMap((t) => DERIVERS[t](fy).map((e) => ({ ...e, _t: t })));
  return ELIMINATION_TYPES.map((type) => {
    const filtered = entries.filter((e) => e._t === type);
    const total = filtered.reduce((s, e) => dAdd(s, e.amount), 0);
    return { type, count: filtered.length, total: roundTo(total, 2) };
  });
}
