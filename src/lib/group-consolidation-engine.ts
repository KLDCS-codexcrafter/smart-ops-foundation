/**
 * @file        group-consolidation-engine.ts
 * @purpose     Group consolidation orchestrator — per-entity Trial Balance rollup with
 *              3 Ind AS methods (full · proportional · equity) plus subtraction of
 *              Arc 2 intercompany eliminations. Produces Consolidated Trial Balance +
 *              Consolidated P&L.
 * @sprint      T-Phase-6.C.2.1 · Sprint 109 · Arc 3 OPENER · Block 2-3
 *
 * @orchestrator  Walks each group entity's per-entity financials (fincore vouchers/
 *                ledger_group_code on lines), applies the entity's
 *                consolidation_method from intercompany-group-structure-engine, and
 *                subtracts intercompany eliminations from group-eliminations-engine.
 *                Does NOT re-post ledgers, re-run eliminations, or re-derive group
 *                structure. v1.31 §P: this engine logs only `group_consolidation_run`;
 *                downstream engines own their own audit emissions.
 *
 * @reads-from  fincore-engine (vouchersKey · loadEntities for entity walk) ·
 *              intercompany-group-structure-engine (listGroupStructure ·
 *              consolidation_method · ownership_pct) ·
 *              group-eliminations-engine (generateEliminations({fy})) ·
 *              reportUtils (getL1Code / getL2Code — mirror of ProfitLoss.tsx
 *              ledger_group_code → P&L/BS classification).
 *
 * @scope-wall  DP-A3-9 · Consolidated P&L + Trial Balance ONLY.
 *              NO Balance Sheet (S111) · NO Cash Flow (S111) · NO NCI/Goodwill (S111) ·
 *              NO multi-currency (S110) · NO disclosure (S112) · NO OOB (Arc 4).
 *              Scope-wall test asserts none of those exports exist on this module.
 */
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/fincore-engine';
import { loadEntities } from '@/data/mock-entities';
import {
  listGroupStructure,
  type ConsolidationMethod,
} from '@/lib/intercompany-group-structure-engine';
import {
  generateEliminations,
  type EliminationEntry,
  type EliminationType,
} from '@/lib/group-eliminations-engine';
import { getL1Code, getL2Code } from '@/pages/erp/fincore/reports/reportUtils';
import { dAdd, dSub, dMul, dSum, dPct, round2, dEq } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── Public types ──────────────────────────────────────────────────────────

export type { ConsolidationMethod };

export type Classification = 'pnl' | 'bs';

export interface TBLine {
  ledger_group_code: string;
  classification: Classification;
  debit: number;
  credit: number;
}

export interface EntityTrialBalance {
  entity_id: string;
  method: ConsolidationMethod;
  ownership_pct: number;
  lines: TBLine[];
}

export interface ConsolidatedTrialBalance {
  fy: string;
  entity_count: number;
  lines: TBLine[];
  eliminations_applied: number;
  balanced: boolean;
}

export interface ConsolidatedPnL {
  fy: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  operating_profit: number;
  other_income: number;
  profit_before_tax: number;
  lines: { ledger_group_code: string; amount: number }[];
}

export interface ConsolidationEntityContribution {
  entity_id: string;
  method: ConsolidationMethod;
  contribution: number;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Mirror ProfitLoss.tsx: L1∈{I,E} → P&L; rest (A/L/CE/SR) → BS. */
function classify(ledger_group_code: string): Classification {
  const l1 = getL1Code(ledger_group_code);
  return l1 === 'I' || l1 === 'E' ? 'pnl' : 'bs';
}

/** Parse FY string 'YYYY-YY' → inclusive [startISO, endISO] (Apr-Mar window). */
function fyWindow(fy: string): { start: string; end: string } {
  const startYear = Number.parseInt(fy.slice(0, 4), 10);
  if (Number.isNaN(startYear)) {
    const y = new Date().getFullYear();
    return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
  }
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
}

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/accounting/vouchers
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/** Apply a per-entity method scalar to a TB line (full=1, proportional=pct/100, equity=0 line-by-line). */
function applyMethodToLine(line: TBLine, method: ConsolidationMethod, pct: number): TBLine {
  if (method === 'full') return line;
  if (method === 'equity') {
    // Equity method is NOT line-by-line. Lines are zeroed here; the equity
    // contribution is rolled up as a single investment line at the parent level.
    return { ...line, debit: 0, credit: 0 };
  }
  // proportional — ownership_pct share
  return {
    ...line,
    debit: round2(dPct(line.debit, pct)),
    credit: round2(dPct(line.credit, pct)),
  };
}

/** Eliminations are P&L unless their type is balance-sheet by nature (E2/E6). */
function elimClassification(t: EliminationType): Classification {
  if (t === 'E2_ic_balances' || t === 'E6_investment_vs_equity') return 'bs';
  return 'pnl';
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Compute a single entity's Trial Balance from its FinCore vouchers.
 * Aggregates VoucherLedgerLine.dr_amount / cr_amount by ledger_group_code.
 * Classification mirrors ProfitLoss.tsx (L1∈{I,E} → P&L; else BS).
 */
export function computeEntityTrialBalance(entity_id: string, fy: string): EntityTrialBalance {
  const entities = loadEntities();
  const entity = entities.find((e) => e.id === entity_id);
  const node = listGroupStructure().find((n) => n.entity_id === entity_id);

  const method: ConsolidationMethod = node?.consolidation_method ?? 'full';
  const pct: number = node?.ownership_pct ?? 100;

  if (!entity) {
    return { entity_id, method, ownership_pct: pct, lines: [] };
  }

  const { start, end } = fyWindow(fy);
  const vouchers = ls<Voucher>(vouchersKey(entity.shortCode));

  type Agg = { debit: number; credit: number };
  const buckets = new Map<string, Agg>();
  for (const v of vouchers) {
    if (v.status !== 'posted') continue;
    if (v.date < start || v.date > end) continue;
    for (const l of v.ledger_lines ?? []) {
      const k = l.ledger_group_code;
      if (!k) continue;
      const cur = buckets.get(k) ?? { debit: 0, credit: 0 };
      cur.debit = dAdd(cur.debit, l.dr_amount ?? 0);
      cur.credit = dAdd(cur.credit, l.cr_amount ?? 0);
      buckets.set(k, cur);
    }
  }

  const lines: TBLine[] = Array.from(buckets.entries()).map(([code, agg]) => ({
    ledger_group_code: code,
    classification: classify(code),
    debit: round2(agg.debit),
    credit: round2(agg.credit),
  }));

  return { entity_id, method, ownership_pct: pct, lines };
}

/**
 * The consolidation spine.
 * 1. listGroupStructure() → each entity + method + ownership_pct
 * 2. computeEntityTrialBalance per entity
 * 3. Apply per-entity method scalar (full=100% · proportional=pct · equity=line-zero + parent investment line)
 * 4. Subtract generateEliminations({fy}) (E1–E7) by adding offsetting Dr/Cr pairs
 * 5. Assert balanced (dEq totalDr,totalCr); decimal-helpers throughout
 * 6. Audit: log group_consolidation_run (mca-roc)
 */
export function consolidate(input: { fy: string }): ConsolidatedTrialBalance {
  const { fy } = input;
  const nodes = listGroupStructure();

  // Combine all entity lines after method scaling.
  const combined = new Map<string, TBLine>();

  for (const node of nodes) {
    const tb = computeEntityTrialBalance(node.entity_id, fy);
    for (const raw of tb.lines) {
      const scaled = applyMethodToLine(raw, node.consolidation_method, node.ownership_pct);
      const cur = combined.get(scaled.ledger_group_code) ?? {
        ledger_group_code: scaled.ledger_group_code,
        classification: scaled.classification,
        debit: 0,
        credit: 0,
      };
      cur.debit = dAdd(cur.debit, scaled.debit);
      cur.credit = dAdd(cur.credit, scaled.credit);
      combined.set(scaled.ledger_group_code, cur);
    }

    // Equity method: roll up the parent's share of sub net result as a single
    // investment line (NOT line-by-line). Net result = sum(credit) - sum(debit)
    // over the entity's P&L-classified lines (income positive · expense negative).
    if (node.consolidation_method === 'equity') {
      const pnlLines = tb.lines.filter((l) => l.classification === 'pnl');
      const net = dSub(dSum(pnlLines, (l) => l.credit), dSum(pnlLines, (l) => l.debit));
      const share = round2(dPct(net, node.ownership_pct));
      const absShare = Math.abs(share);
      // Dr IC-EQUITY-INVEST / Cr IC-EQUITY-INCOME (or reversed for losses) — keeps TB balanced.
      const invCode = 'IC-EQUITY-INVEST';
      const incCode = 'IC-EQUITY-INCOME';
      const inv = combined.get(invCode) ?? { ledger_group_code: invCode, classification: 'bs' as Classification, debit: 0, credit: 0 };
      const inc = combined.get(incCode) ?? { ledger_group_code: incCode, classification: 'pnl' as Classification, debit: 0, credit: 0 };
      if (share >= 0) {
        inv.debit = dAdd(inv.debit, absShare);
        inc.credit = dAdd(inc.credit, absShare);
      } else {
        inv.credit = dAdd(inv.credit, absShare);
        inc.debit = dAdd(inc.debit, absShare);
      }
      combined.set(invCode, inv);
      combined.set(incCode, inc);
    }
  }

  // Subtract eliminations (Arc 2 · E1–E7). Each elimination is a balanced Dr/Cr
  // pair; we apply them as negative offsets on debit_account.debit and
  // credit_account.credit so the consolidated TB stays balanced.
  const eliminations: EliminationEntry[] = generateEliminations({ fy });
  for (const e of eliminations) {
    const klass = elimClassification(e.elimination_type);
    const dCode = e.debit_account || `ELIM-${e.elimination_type}-DR`;
    const cCode = e.credit_account || `ELIM-${e.elimination_type}-CR`;
    const drCur = combined.get(dCode) ?? { ledger_group_code: dCode, classification: klass, debit: 0, credit: 0 };
    drCur.debit = dSub(drCur.debit, e.amount);
    combined.set(dCode, drCur);
    const crCur = combined.get(cCode) ?? { ledger_group_code: cCode, classification: klass, debit: 0, credit: 0 };
    crCur.credit = dSub(crCur.credit, e.amount);
    combined.set(cCode, crCur);
  }

  const lines: TBLine[] = Array.from(combined.values()).map((l) => ({
    ledger_group_code: l.ledger_group_code,
    classification: l.classification,
    debit: round2(l.debit),
    credit: round2(l.credit),
  }));

  const totalDr = round2(dSum(lines, (l) => l.debit));
  const totalCr = round2(dSum(lines, (l) => l.credit));
  const balanced = dEq(totalDr, totalCr, 2);

  // Audit: group_consolidation_run (mca-roc)
  logAudit({
    entityCode: 'GROUP',
    action: 'create',
    entityType: 'group_consolidation_run',
    recordId: `consol-${fy}-${Date.now()}`,
    recordLabel: `Group consolidation · FY ${fy} · ${nodes.length} entities · ${eliminations.length} eliminations · ${balanced ? 'balanced' : 'UNBALANCED'}`,
    beforeState: null,
    afterState: {
      fy,
      entity_count: nodes.length,
      line_count: lines.length,
      eliminations_applied: eliminations.length,
      total_debit: totalDr,
      total_credit: totalCr,
      balanced,
    } as Record<string, unknown>,
    sourceModule: 'group-consolidation-engine',
  });

  return {
    fy,
    entity_count: nodes.length,
    lines,
    eliminations_applied: eliminations.length,
    balanced,
  };
}

/**
 * Build Consolidated P&L derived from the consolidated TB.
 * Mirrors ProfitLoss.tsx classifications by L2 code:
 *   revenue       = CR-DR over L2='I-OR'
 *   cogs          = DR-CR over L2='E-COG'
 *   other_income  = CR-DR over L2='I-OI'
 *   expenses      = DR-CR over L2∈{E-OE, E-FC, E-DEP}
 */
export function buildConsolidatedPnL(input: { fy: string }): ConsolidatedPnL {
  const { fy } = input;
  const tb = consolidate({ fy });
  const pnl = tb.lines.filter((l) => l.classification === 'pnl');

  const sumByL2 = (l2: string, nature: 'Cr' | 'Dr'): number => {
    const ls2 = pnl.filter((l) => getL2Code(l.ledger_group_code) === l2);
    const cr = dSum(ls2, (l) => l.credit);
    const dr = dSum(ls2, (l) => l.debit);
    return nature === 'Cr' ? dSub(cr, dr) : dSub(dr, cr);
  };

  const revenue = round2(sumByL2('I-OR', 'Cr'));
  const cogs = round2(sumByL2('E-COG', 'Dr'));
  const gross_profit = round2(dSub(revenue, cogs));
  const other_income = round2(sumByL2('I-OI', 'Cr'));
  const opex = sumByL2('E-OE', 'Dr');
  const finance = sumByL2('E-FC', 'Dr');
  const depreciation = sumByL2('E-DEP', 'Dr');
  const expenses = round2(dSum([opex, finance, depreciation]));
  const operating_profit = round2(dSub(gross_profit, expenses));
  const profit_before_tax = round2(dAdd(operating_profit, other_income));

  const lines = pnl.map((l) => ({
    ledger_group_code: l.ledger_group_code,
    amount: round2(dSub(l.credit, l.debit)),
  }));

  return {
    fy,
    revenue,
    cogs,
    gross_profit,
    expenses,
    operating_profit,
    other_income,
    profit_before_tax,
    lines,
  };
}

/** Per-entity contribution summary (entity_id · method · net P&L contribution). */
export function getConsolidationSummary(fy: string): ConsolidationEntityContribution[] {
  const nodes = listGroupStructure();
  return nodes.map((node) => {
    const tb = computeEntityTrialBalance(node.entity_id, fy);
    const pnl = tb.lines.filter((l) => l.classification === 'pnl');
    const gross = dSub(dSum(pnl, (l) => l.credit), dSum(pnl, (l) => l.debit));
    let scaled = gross;
    if (node.consolidation_method === 'proportional' || node.consolidation_method === 'equity') {
      scaled = dMul(gross, node.ownership_pct / 100);
    }
    return {
      entity_id: node.entity_id,
      method: node.consolidation_method,
      contribution: round2(scaled),
    };
  });
}
