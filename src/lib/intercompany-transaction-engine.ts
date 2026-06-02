/**
 * @file        src/lib/intercompany-transaction-engine.ts
 * @sprint      Sprint 106 · T-Phase-6.C.1.2 · Arc 2 · Pillar C.1 · IC Transactions Pt 1
 * @purpose     Intercompany Transaction Engine — orchestrates 4 of 8 IC transaction
 *              types (stock_transfer · service_charge · capital_infusion · loan).
 *              Pipes resolvePrice → generateTPAudit → postVoucher (two reciprocal
 *              entries). Validates both parties via getGroupStructure.
 *
 * @orchestrator  Bridges internal-pricing-engine (resolvePrice → arm's-length) → idea-7
 *                (generateTPAudit → Section 92 doc) → fincore-engine (postVoucher →
 *                reciprocal ledger entries). Validates both parties via
 *                intercompany-group-structure-engine. Does NOT reprice / re-audit
 *                TP / re-post ledgers. v1.31 §P: TP + voucher audit logged downstream
 *                by idea-7 + fincore; this engine logs intercompany_transaction.
 *
 * @reads-from    internal-pricing-engine · idea-7-transfer-pricing-audit-engine ·
 *                fincore-engine · intercompany-group-structure-engine
 *
 * @scope-wall    DP-A2-9 · transactions + reciprocal postings ONLY. NO matching,
 *                NO eliminations, NO consolidation. Those land in S108/Arc 3.
 *
 * @disciplines   FR-44 (orchestration spine · no-dup) · FR-19 SIBLING ·
 *                FR-67 §H 0-DIFF · v1.30 §L (DP-A2-2/3/4/5/8/9) · v1.31 §P
 *
 * @[JWT]         GET  /api/intercompany/transactions
 *                POST /api/intercompany/transactions
 *                POST /api/intercompany/transactions/:id/post
 */

import { logAudit } from '@/lib/audit-trail-engine';
import { dAdd, dSub, roundTo } from '@/lib/decimal-helpers';
import { resolvePrice, type PricingScope } from '@/lib/internal-pricing-engine';
import { generateTPAudit } from '@/lib/idea-7-transfer-pricing-audit-engine';
import {
  postVoucher, generateVoucherNo, vouchersKey,
} from '@/lib/fincore-engine';
import { getGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { loadEntities } from '@/data/mock-entities';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import type { VoucherBaseType } from '@/types/voucher-type';

// ─── Provenance · READS_FROM (FR-44 disclosure) ──────────────────────────────

/**
 * Source-of-truth declaration. Each upstream engine is §H-frozen w.r.t. this
 * engine — we READ via published call-sites only. NEVER reprice, re-audit TP,
 * or re-post ledgers — those are the upstream engines' responsibilities.
 */
export const READS_FROM = {
  internalPricing: 'src/lib/internal-pricing-engine.ts (resolvePrice · USE-SITE)',
  idea7TP: 'src/lib/idea-7-transfer-pricing-audit-engine.ts (generateTPAudit · USE-SITE)',
  fincore: 'src/lib/fincore-engine.ts (postVoucher · generateVoucherNo · vouchersKey)',
  groupStructure: 'src/lib/intercompany-group-structure-engine.ts (getGroupStructure)',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Sprint 106 ships 4 of 8 IC transaction types · S107 adds the other 4. */
export type ICTransactionType =
  | 'stock_transfer'
  | 'service_charge'
  | 'capital_infusion'
  | 'loan';

export const IC_TRANSACTION_TYPES: readonly ICTransactionType[] = [
  'stock_transfer', 'service_charge', 'capital_infusion', 'loan',
] as const;

/** Types that require arm's-length pricing via resolvePrice. */
export const PRICED_IC_TYPES: readonly ICTransactionType[] = [
  'stock_transfer', 'service_charge',
] as const;

/** Types that bypass pricing (equity / principal · not a priced supply). */
export const UNPRICED_IC_TYPES: readonly ICTransactionType[] = [
  'capital_infusion', 'loan',
] as const;

export type ICTransactionStatus = 'draft' | 'priced' | 'posted' | 'settled';

export interface IntercompanyTransaction {
  ic_txn_id: string;
  txn_type: ICTransactionType;
  from_entity: string;            // group-structure entity_id
  to_entity: string;              // group-structure entity_id
  item_key?: string;              // stock_transfer / service_charge
  quantity?: number;
  amount: number;                 // resolved (arm's-length) or principal
  pricing_rule_id?: string;       // from resolvePrice (priced types only)
  tp_audit_id?: string;           // from generateTPAudit
  from_voucher_id?: string;       // fincore postVoucher (source entity)
  to_voucher_id?: string;         // fincore postVoucher (counterparty)
  from_voucher_no?: string;
  to_voucher_no?: string;
  txn_date: string;               // YYYY-MM-DD
  status: ICTransactionStatus;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateICTransactionInput {
  txn_type: ICTransactionType;
  from_entity: string;
  to_entity: string;
  item_key?: string;
  quantity?: number;
  amount?: number;
  txn_date: string;
  note?: string;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/** Side-store key · global (cross-entity by design — IC is bilateral). */
export const IC_TXN_STORAGE_KEY = 'erp_intercompany_transactions';

function loadAll(): IntercompanyTransaction[] {
  try {
    // [JWT] GET /api/intercompany/transactions
    const raw = localStorage.getItem(IC_TXN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as IntercompanyTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: IntercompanyTransaction[]): void {
  // [JWT] POST /api/intercompany/transactions
  localStorage.setItem(IC_TXN_STORAGE_KEY, JSON.stringify(list));
}

function newId(): string {
  return `ic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Per-type ledger mapping (§L documented) ─────────────────────────────────

/**
 * Per-type reciprocal ledger mapping. Each entry returns two balanced
 * ledger_lines pairs (source + counterparty) sized to `amount`.
 *
 * §L · Ledger mapping rationale:
 *   - stock_transfer · COGS at source ↔ Inventory In at counterparty
 *     (real implementation hooks hierarchical-ledger inter-entity nodes; we use
 *     stable codes here · scope wall vs full ledger reuse in S108).
 *   - service_charge · Service Income at source ↔ Service Expense at counterparty
 *     (IC receivable/payable booked symmetrically).
 *   - capital_infusion · Bank/Cash at source ↔ Equity at counterparty (NO pricing).
 *   - loan · Loan Receivable at source ↔ Loan Payable at counterparty (principal
 *     only · interest accrual deferred to S107 / Arc 3).
 */
interface ReciprocalPair {
  fromLines: VoucherLedgerLine[];
  toLines: VoucherLedgerLine[];
  fromBaseType: VoucherBaseType;
  toBaseType: VoucherBaseType;
  fromPrefix: string;
  toPrefix: string;
  fromTypeName: string;
  toTypeName: string;
}

function mkLine(
  ledger_code: string,
  ledger_name: string,
  ledger_group_code: string,
  dr: number,
  cr: number,
  narration: string,
): VoucherLedgerLine {
  return {
    id: `vl-${Math.random().toString(36).slice(2, 10)}`,
    ledger_id: ledger_code,
    ledger_code,
    ledger_name,
    ledger_group_code,
    dr_amount: roundTo(dr, 2),
    cr_amount: roundTo(cr, 2),
    narration,
  };
}

function buildReciprocal(
  txn: IntercompanyTransaction,
  amount: number,
): ReciprocalPair {
  const a = roundTo(amount, 2);
  const narration = `IC ${txn.txn_type} · ${txn.from_entity} → ${txn.to_entity} · ${txn.ic_txn_id}`;

  switch (txn.txn_type) {
    case 'stock_transfer':
      return {
        fromLines: [
          mkLine('IC-RECV', 'Inter-Company Receivable', 'CA', a, 0, narration),
          mkLine('IC-INV-OUT', 'Stock Transferred Out (IC)', 'INC', 0, a, narration),
        ],
        toLines: [
          mkLine('IC-INV-IN', 'Stock Received In (IC)', 'EXP', a, 0, narration),
          mkLine('IC-PAY', 'Inter-Company Payable', 'CL', 0, a, narration),
        ],
        fromBaseType: 'Journal',
        toBaseType: 'Journal',
        fromPrefix: 'ICTX',
        toPrefix: 'ICTX',
        fromTypeName: 'IC Stock Transfer (Source)',
        toTypeName: 'IC Stock Transfer (Counterparty)',
      };
    case 'service_charge':
      return {
        fromLines: [
          mkLine('IC-RECV', 'Inter-Company Receivable', 'CA', a, 0, narration),
          mkLine('IC-SVC-INC', 'Inter-Company Service Income', 'INC', 0, a, narration),
        ],
        toLines: [
          mkLine('IC-SVC-EXP', 'Inter-Company Service Expense', 'EXP', a, 0, narration),
          mkLine('IC-PAY', 'Inter-Company Payable', 'CL', 0, a, narration),
        ],
        fromBaseType: 'Journal',
        toBaseType: 'Journal',
        fromPrefix: 'ICSC',
        toPrefix: 'ICSC',
        fromTypeName: 'IC Service Charge (Source)',
        toTypeName: 'IC Service Charge (Counterparty)',
      };
    case 'capital_infusion':
      return {
        fromLines: [
          mkLine('IC-INVEST', 'Investment in Group Entity', 'INV', a, 0, narration),
          mkLine('CASH-BANK', 'Bank / Cash', 'CA', 0, a, narration),
        ],
        toLines: [
          mkLine('CASH-BANK', 'Bank / Cash', 'CA', a, 0, narration),
          mkLine('IC-EQUITY', 'Equity Share Capital (IC)', 'EQ', 0, a, narration),
        ],
        fromBaseType: 'Journal',
        toBaseType: 'Journal',
        fromPrefix: 'ICCI',
        toPrefix: 'ICCI',
        fromTypeName: 'IC Capital Infusion (Source)',
        toTypeName: 'IC Capital Infusion (Counterparty)',
      };
    case 'loan':
      return {
        fromLines: [
          mkLine('IC-LOAN-RECV', 'Inter-Company Loan Receivable', 'LA', a, 0, narration),
          mkLine('CASH-BANK', 'Bank / Cash', 'CA', 0, a, narration),
        ],
        toLines: [
          mkLine('CASH-BANK', 'Bank / Cash', 'CA', a, 0, narration),
          mkLine('IC-LOAN-PAY', 'Inter-Company Loan Payable', 'LL', 0, a, narration),
        ],
        fromBaseType: 'Journal',
        toBaseType: 'Journal',
        fromPrefix: 'ICLN',
        toPrefix: 'ICLN',
        fromTypeName: 'IC Loan Principal (Source)',
        toTypeName: 'IC Loan Principal (Counterparty)',
      };
  }
}

/** Decimal-safe assertion: every ledger pair sums dr == cr. */
function assertBalanced(lines: VoucherLedgerLine[]): void {
  const dr = lines.reduce((s, l) => dAdd(s, l.dr_amount), 0);
  const cr = lines.reduce((s, l) => dAdd(s, l.cr_amount), 0);
  if (Math.abs(dSub(dr, cr)) > 0.005) {
    throw new Error(`[ic-txn] reciprocal voucher not balanced · dr=${dr} cr=${cr}`);
  }
}

function buildVoucher(opts: {
  entityCode: string;
  voucherNo: string;
  baseType: VoucherBaseType;
  typeName: string;
  date: string;
  lines: VoucherLedgerLine[];
  amount: number;
  narration: string;
}): Voucher {
  const now = new Date().toISOString();
  return {
    id: `vch-${Math.random().toString(36).slice(2, 10)}`,
    voucher_no: opts.voucherNo,
    voucher_type_id: `ic-${opts.baseType}`,
    voucher_type_name: opts.typeName,
    base_voucher_type: opts.baseType,
    entity_id: opts.entityCode,
    date: opts.date,
    ledger_lines: opts.lines,
    gross_amount: roundTo(opts.amount, 2),
    total_discount: 0,
    total_taxable: roundTo(opts.amount, 2),
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    net_amount: roundTo(opts.amount, 2),
    tds_applicable: false,
    narration: opts.narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
    created_by: 'ic-orchestrator',
    created_at: now,
    updated_at: now,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a draft IC transaction. Does NOT price / post — call postICTransaction
 * to run the full orchestration pipeline.
 */
export function createICTransaction(input: CreateICTransactionInput): IntercompanyTransaction {
  if (!input.from_entity || !input.to_entity) {
    throw new Error('[ic-txn] from_entity and to_entity are required');
  }
  if (input.from_entity === input.to_entity) {
    throw new Error('[ic-txn] from_entity and to_entity must differ');
  }
  if (!IC_TRANSACTION_TYPES.includes(input.txn_type)) {
    throw new Error(`[ic-txn] unsupported txn_type: ${input.txn_type}`);
  }
  if (PRICED_IC_TYPES.includes(input.txn_type) && !input.item_key) {
    throw new Error(`[ic-txn] item_key required for ${input.txn_type}`);
  }
  if (UNPRICED_IC_TYPES.includes(input.txn_type) && (input.amount == null || input.amount <= 0)) {
    throw new Error(`[ic-txn] amount > 0 required for ${input.txn_type} (principal/equity)`);
  }

  const now = new Date().toISOString();
  const txn: IntercompanyTransaction = {
    ic_txn_id: newId(),
    txn_type: input.txn_type,
    from_entity: input.from_entity,
    to_entity: input.to_entity,
    item_key: input.item_key,
    quantity: input.quantity,
    amount: roundTo(input.amount ?? 0, 2),
    txn_date: input.txn_date,
    status: 'draft',
    note: input.note,
    created_at: now,
    updated_at: now,
  };

  const all = loadAll();
  all.push(txn);
  saveAll(all);
  return txn;
}

export function getICTransaction(ic_txn_id: string): IntercompanyTransaction | null {
  return loadAll().find((t) => t.ic_txn_id === ic_txn_id) ?? null;
}

export function listICTransactions(filter?: Partial<IntercompanyTransaction>): IntercompanyTransaction[] {
  const all = loadAll();
  if (!filter) return all;
  return all.filter((t) =>
    Object.entries(filter).every(([k, v]) =>
      v === undefined ? true : (t as unknown as Record<string, unknown>)[k] === v,
    ),
  );
}

/**
 * THE ORCHESTRATION PIPELINE (FR-44 spine):
 *   1. Validate both parties via getGroupStructure (reject non-group).
 *   2. PRICE: priced types → resolvePrice({rule_type:'inter_entity', ...}) →
 *      store pricing_rule_id + amount. Unpriced types use principal as-is.
 *   3. TP AUDIT: if pricing_rule_id → generateTPAudit({pricing_rule_id, entity_code:from_entity})
 *      → store tp_audit_id. (Idea-7 logs the TP event itself · v1.31 §P.)
 *   4. POST: build two balanced Voucher headers, generateVoucherNo per entity,
 *      postVoucher(v, entity) for each. (fincore logs the voucher audit.)
 *   5. Log THIS engine's own intercompany_transaction audit.
 *
 * Idempotent: re-calling post on an already-posted txn returns it unchanged.
 */
export function postICTransaction(ic_txn_id: string): IntercompanyTransaction {
  const all = loadAll();
  const idx = all.findIndex((t) => t.ic_txn_id === ic_txn_id);
  if (idx < 0) throw new Error(`[ic-txn] not found: ${ic_txn_id}`);
  const txn = all[idx];

  if (txn.status === 'posted' || txn.status === 'settled') return txn;

  // ── 1. Validate both parties ────────────────────────────────────────
  // USE-SITE READ · intercompany-group-structure-engine.getGroupStructure
  const fromNode = getGroupStructure(txn.from_entity);
  const toNode = getGroupStructure(txn.to_entity);
  if (!fromNode) throw new Error(`[ic-txn] from_entity not in group structure: ${txn.from_entity}`);
  if (!toNode) throw new Error(`[ic-txn] to_entity not in group structure: ${txn.to_entity}`);

  // ── 2. Price (priced types only) ────────────────────────────────────
  let amount = txn.amount;
  let pricing_rule_id: string | undefined;

  if (PRICED_IC_TYPES.includes(txn.txn_type)) {
    const from_scope: PricingScope = { entity_id: txn.from_entity };
    const to_scope: PricingScope = { entity_id: txn.to_entity };
    // USE-SITE READ · internal-pricing-engine.resolvePrice
    const resolved = resolvePrice({
      rule_type: 'inter_entity',
      from_scope,
      to_scope,
      item_key: txn.item_key ?? 'ALL',
      as_of_date: txn.txn_date,
    });
    if (resolved) {
      pricing_rule_id = resolved.rule_id;
      const qty = txn.quantity ?? 1;
      amount = roundTo(resolved.price * qty, 2);
    } else if (txn.amount > 0) {
      amount = txn.amount; // fallback: use caller-supplied amount when no rule matches
    } else {
      throw new Error(
        `[ic-txn] no inter_entity pricing rule found for ${txn.from_entity}→${txn.to_entity} item=${txn.item_key} and no fallback amount given`,
      );
    }
  }

  txn.amount = amount;
  txn.pricing_rule_id = pricing_rule_id;
  txn.status = 'priced';

  // ── 3. TP audit (only when we got a rule_id · capital/loan skip) ────
  if (pricing_rule_id) {
    // USE-SITE READ · idea-7-transfer-pricing-audit-engine.generateTPAudit
    const tp = generateTPAudit({
      pricing_rule_id,
      entity_code: txn.from_entity,
    });
    txn.tp_audit_id = tp.tp_audit_id;
  }

  // ── 4. Post two reciprocal vouchers via fincore.postVoucher ─────────
  const pair = buildReciprocal(txn, amount);
  assertBalanced(pair.fromLines);
  assertBalanced(pair.toLines);

  const fromVchNo = generateVoucherNo(pair.fromPrefix, txn.from_entity);
  const fromVch = buildVoucher({
    entityCode: txn.from_entity,
    voucherNo: fromVchNo,
    baseType: pair.fromBaseType,
    typeName: pair.fromTypeName,
    date: txn.txn_date,
    lines: pair.fromLines,
    amount,
    narration: `IC ${txn.txn_type} · source · counterparty=${txn.to_entity}`,
  });
  // USE-SITE READ · fincore-engine.postVoucher (source entity)
  postVoucher(fromVch, txn.from_entity);

  const toVchNo = generateVoucherNo(pair.toPrefix, txn.to_entity);
  const toVch = buildVoucher({
    entityCode: txn.to_entity,
    voucherNo: toVchNo,
    baseType: pair.toBaseType,
    typeName: pair.toTypeName,
    date: txn.txn_date,
    lines: pair.toLines,
    amount,
    narration: `IC ${txn.txn_type} · counterparty · source=${txn.from_entity}`,
  });
  // USE-SITE READ · fincore-engine.postVoucher (counterparty entity)
  postVoucher(toVch, txn.to_entity);

  txn.from_voucher_id = fromVch.id;
  txn.from_voucher_no = fromVchNo;
  txn.to_voucher_id = toVch.id;
  txn.to_voucher_no = toVchNo;
  txn.status = 'posted';
  txn.updated_at = new Date().toISOString();

  all[idx] = txn;
  saveAll(all);

  // ── 5. Own audit · intercompany_transaction (v1.31 §P: TP+voucher
  //      audit are downstream; we own only this transaction-level event) ──
  logAudit({
    entityCode: txn.from_entity,
    action: 'post',
    entityType: 'intercompany_transaction',
    recordId: txn.ic_txn_id,
    recordLabel: `IC ${txn.txn_type} · ${txn.from_entity}→${txn.to_entity} · ₹${amount}`,
    beforeState: null,
    afterState: txn as unknown as Record<string, unknown>,
    sourceModule: 'intercompany-transaction-engine',
  });

  return txn;
}

/** Sum of posted IC amounts touching a given entity (either side). */
export function getICTotalsForEntity(entity_id: string): { from: number; to: number } {
  const list = loadAll().filter((t) => t.status === 'posted' || t.status === 'settled');
  const from = list.filter((t) => t.from_entity === entity_id).reduce((s, t) => dAdd(s, t.amount), 0);
  const to = list.filter((t) => t.to_entity === entity_id).reduce((s, t) => dAdd(s, t.amount), 0);
  return { from: roundTo(from, 2), to: roundTo(to, 2) };
}

/** Convenience read · vouchers key alias (re-export for page reads). */
export const icVouchersKey = (entity: string): string => vouchersKey(entity);
