/**
 * @file        src/lib/consolidated-cash-flow-engine.ts
 * @sibling     NEW @ Sprint 111 · T-Phase-6.C.2.3 · Arc 3 · Pillar C.2 (Group Consolidation)
 * @realizes    Ind AS 7 (Schedule III) Consolidated Statement of Cash Flows derived from the
 *              S110-translated consolidated TB. Engine-local op/inv/fin classifier.
 * @fr-44       §L · cash-flow-engine is a TREASURY PROJECTOR (getCurrentBankBalances /
 *              computeCashFlowProjection / suggestPaymentTiming / forecastByWeek). It has NO
 *              Ind AS 7 op/inv/fin partition to reuse — therefore implementing the Schedule III
 *              classifier engine-local here does NOT violate FR-44 (no existing classifier to
 *              duplicate · cash-flow-engine stays 0-DIFF · no §H waiver required).
 * @reads-from  fx-translation-engine (consolidateWithTranslation) ·
 *              group-consolidation-engine (consolidate fallback · type re-exports) ·
 *              reportUtils (getL1Code · getL2Code)
 * @scope-wall  DP-A3-9 · CF + section classifier ONLY.
 *              NO BS/NCI/Goodwill (sibling) · NO disclosure (S112) · NO XBRL (Arc 4) · NO OOB.
 * @sprint      T-Phase-6.C.2.3 · Sprint 111 · Arc 3 · Block 2 + Block 3
 * [JWT] Phase 8: GET /api/consolidation/cash-flow?fy=:fy
 */
import {
  consolidate,
  type ConsolidatedTrialBalance,
} from '@/lib/group-consolidation-engine';
import { consolidateWithTranslation } from '@/lib/fx-translation-engine';
import { getL1Code, getL2Code } from '@/pages/erp/fincore/reports/reportUtils';
import { dAdd, dSub, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ── Public READS_FROM (FR-44 self-declaration) ─────────────────────────────
export const READS_FROM = {
  engines: [
    'fx-translation-engine',
    'group-consolidation-engine',
    'reportUtils',
  ],
  storage_keys: ['erp_consolidated_cf_<fy>'],
} as const;

// ── Types ─────────────────────────────────────────────────────────────────

export type CFSection = 'operating' | 'investing' | 'financing';

export interface CFLine {
  ledger_group_code: string;
  section: CFSection;
  /** Schedule III nature: A → debit−credit; L/CE → credit−debit; I → credit−debit; E → −(debit−credit). */
  amount: number;
}

export interface ConsolidatedCashFlow {
  fy: string;
  lines: CFLine[];
  operating_total: number;
  investing_total: number;
  financing_total: number;
  net_change: number;
  generated_at: string;
}

// ── Ind AS 7 / Schedule III classifier (ENGINE-LOCAL) ─────────────────────

/**
 * Map a ledger_group_code → cash-flow section per Schedule III / Ind AS 7.
 *
 * Investing — Non-current assets (fixed assets, intangibles, investments, CWIP):
 *   L2 ∈ {A-NCA}  →  investing
 *
 * Financing — Long-term borrowings, share capital, dividends:
 *   L2 ∈ {L-NCL}      →  financing
 *   L1 === 'CE'       →  financing
 *
 * Operating — Working capital, current liabilities, P&L flows:
 *   L1 ∈ {I, E}                  →  operating
 *   L2 ∈ {A-CA, L-CL}            →  operating
 *
 * Fallback: 'operating' (conservative · §L-flagged in close summary).
 */
export function classifyCashFlowSection(ledger_group_code: string): CFSection {
  const l1 = getL1Code(ledger_group_code);
  const l2 = getL2Code(ledger_group_code);
  if (l1 === 'CE') return 'financing';
  if (l2 === 'A-NCA') return 'investing';
  if (l2 === 'L-NCL') return 'financing';
  if (l1 === 'I' || l1 === 'E') return 'operating';
  if (l2 === 'A-CA' || l2 === 'L-CL') return 'operating';
  return 'operating';
}

// ── Cash-flow assembly ────────────────────────────────────────────────────

function natureAmount(code: string, debit: number, credit: number): number {
  const l1 = getL1Code(code);
  // A → debit−credit; L/CE → credit−debit; I → credit−debit; E → −(debit−credit) (cash use)
  if (l1 === 'A') return dSub(debit, credit);
  if (l1 === 'L' || l1 === 'CE' || l1 === 'I') return dSub(credit, debit);
  if (l1 === 'E') return dSub(credit, debit);
  return dSub(credit, debit);
}

export function buildCashFlow(input: { fy: string }): ConsolidatedCashFlow {
  const tb: ConsolidatedTrialBalance = (() => {
    try { return consolidateWithTranslation({ fy: input.fy }); }
    catch { return consolidate({ fy: input.fy }); }
  })();

  const lines: CFLine[] = tb.lines.map((l) => ({
    ledger_group_code: l.ledger_group_code,
    section: classifyCashFlowSection(l.ledger_group_code),
    amount: round2(natureAmount(l.ledger_group_code, l.debit, l.credit)),
  }));

  const sumOf = (s: CFSection): number =>
    round2(dSum(lines.filter((l) => l.section === s), (l) => l.amount));

  const operating_total = sumOf('operating');
  const investing_total = sumOf('investing');
  const financing_total = sumOf('financing');
  const net_change = round2(dAdd(dAdd(operating_total, investing_total), financing_total));

  const result: ConsolidatedCashFlow = {
    fy: input.fy,
    lines,
    operating_total,
    investing_total,
    financing_total,
    net_change,
    generated_at: new Date().toISOString(),
  };

  try {
    // [JWT] POST /api/consolidation/cash-flow
    localStorage.setItem(`erp_consolidated_cf_${input.fy}`, JSON.stringify(result));
  } catch { /* quota silent */ }

  logAudit({
    entityCode: 'GROUP',
    action: 'create',
    entityType: 'consolidated_cash_flow_run',
    recordId: `ccf-${input.fy}-${Date.now()}`,
    recordLabel: `Consolidated CF · FY ${input.fy} · Op ₹${operating_total.toFixed(2)} · Inv ₹${investing_total.toFixed(2)} · Fin ₹${financing_total.toFixed(2)} · Net ₹${net_change.toFixed(2)}`,
    beforeState: null,
    afterState: {
      fy: input.fy,
      operating_total, investing_total, financing_total, net_change,
      line_count: lines.length,
    } as Record<string, unknown>,
    sourceModule: 'consolidated-cash-flow-engine',
  });

  return result;
}

export function loadConsolidatedCashFlow(fy: string): ConsolidatedCashFlow | null {
  try {
    // [JWT] GET /api/consolidation/cash-flow
    const raw = localStorage.getItem(`erp_consolidated_cf_${fy}`);
    return raw ? (JSON.parse(raw) as ConsolidatedCashFlow) : null;
  } catch { return null; }
}
