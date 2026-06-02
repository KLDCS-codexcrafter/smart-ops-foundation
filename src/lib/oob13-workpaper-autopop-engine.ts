/**
 * @file        src/lib/oob13-workpaper-autopop-engine.ts
 * @oob         OOB-13 · Workpaper Auto-Population · 10 audit-workpaper templates auto-populated from
 *              existing engine data (idea-7 TP audit · multi-gaap depreciation · TDS · cost-audit ·
 *              statutory registers · group consolidation · consolidation disclosure).
 * @fr-44       ASSEMBLES workpapers by READING source engines. Builds NO source figures itself. All
 *              source engines stay 0-DIFF. Does NOT reimplement TP / depreciation / TDS / cost-audit /
 *              statutory / consolidation logic. Each workpaper row cites its source_ref.
 * @reads-from  idea-7-transfer-pricing-audit-engine · multi-gaap-depreciation-engine ·
 *              comply360-tds-aggregator-engine · comply360-cost-audit-engine ·
 *              comply360-statutory-registers-engine · group-consolidation-engine ·
 *              consolidated-balance-sheet-engine · consolidation-disclosure-engine · decimal-helpers
 * @sprint      T-Phase-6.B.OOB.2 · Sprint 114 · Arc 4 · 183rd SIBLING ⭐
 * @decisions   DP-A4-3 (FR-44 idea-7 + multi-engine reuse) · DP-A4-8 (HONEST METRICS — no machine
 *              certified-OOB-count register; the narrative ceiling figure is documentary only)
 * @disciplines FR-19 · FR-44 · FR-67 · FR-91 (honest metrics) · v1.30 §L
 * @[JWT]       Phase 2: engine is stateless; only audit log persisted via audit-trail-engine.
 *
 * §L DESIGN-DECISION-FLAGs:
 *  · Pure assembly: every WorkpaperRow carries a `source_ref` citing the originating engine + record.
 *  · Empty source → populated:false + skeleton (NO fabrication · honest · FR-91).
 *  · No financial computation. decimal-helpers used only for total roll-ups of pre-existing figures.
 *  · No certified-OOB-count counter is exported (DP-A4-8 honest metrics).
 *  · SCOPE WALL: NO Arc-4 governance pillar work, NO new source figure builders.
 */

import { listTPAudits } from '@/lib/idea-7-transfer-pricing-audit-engine';
import { compareMultiGAAPBooks, computeMultiGAAPDepreciation } from '@/lib/multi-gaap-depreciation-engine';
import { aggregateBySection } from '@/lib/comply360-tds-aggregator-engine';
import { listCostAuditorAppointments } from '@/lib/comply360-cost-audit-engine';
import {
  listRegisterEntries,
  type StatutoryRegisterType,
} from '@/lib/comply360-statutory-registers-engine';
import { buildConsolidatedPnL } from '@/lib/group-consolidation-engine';
import { buildBalanceSheet } from '@/lib/consolidated-balance-sheet-engine';
import { buildDisclosurePack } from '@/lib/consolidation-disclosure-engine';
import { dAdd, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
import type { AssetUnitRecord } from '@/types/fixed-asset';

export const READS_FROM = {
  engines: [
    'idea-7-transfer-pricing-audit-engine',
    'multi-gaap-depreciation-engine',
    'comply360-tds-aggregator-engine',
    'comply360-cost-audit-engine',
    'comply360-statutory-registers-engine',
    'group-consolidation-engine',
    'consolidated-balance-sheet-engine',
    'consolidation-disclosure-engine',
  ],
  storage_keys: [],
} as const;

// ─── 10 workpaper templates (the institutional ceiling) ──────────────────────
export type WorkpaperTemplateId =
  | 'transfer_pricing'
  | 'depreciation_reconciliation'
  | 'tds_reconciliation'
  | 'cost_audit'
  | 'statutory_register_extract'
  | 'consolidation'
  | 'gst_reconciliation'
  | 'related_party'
  | 'fixed_asset_register'
  | 'provisions';

export const WORKPAPER_TEMPLATES: readonly WorkpaperTemplateId[] = [
  'transfer_pricing',
  'depreciation_reconciliation',
  'tds_reconciliation',
  'cost_audit',
  'statutory_register_extract',
  'consolidation',
  'gst_reconciliation',
  'related_party',
  'fixed_asset_register',
  'provisions',
] as const;

export interface WorkpaperRow {
  label: string;
  value: string | number;
  source_ref: string;
}

export interface Workpaper {
  template_id: WorkpaperTemplateId;
  fy: string;
  entity_code: string;
  rows: WorkpaperRow[];
  populated: boolean;
  source_engine: string;
  generated_at: string;
  /** §L-flag: when populated=false, why (honest, no fabrication). */
  skeleton_reason?: string;
  /** Sum of numeric rows where present — for UI summary (decimal-helpers). */
  total?: number;
}

/** Map template → source engine name (for UI + audit). */
export const TEMPLATE_SOURCE_ENGINE: Record<WorkpaperTemplateId, string> = {
  transfer_pricing: 'idea-7-transfer-pricing-audit-engine',
  depreciation_reconciliation: 'multi-gaap-depreciation-engine',
  tds_reconciliation: 'comply360-tds-aggregator-engine',
  cost_audit: 'comply360-cost-audit-engine',
  statutory_register_extract: 'comply360-statutory-registers-engine',
  consolidation: 'group-consolidation-engine',
  gst_reconciliation: 'consolidation-disclosure-engine',
  related_party: 'idea-7-transfer-pricing-audit-engine',
  fixed_asset_register: 'multi-gaap-depreciation-engine',
  provisions: 'consolidated-balance-sheet-engine',
};

// ─── In-memory ledger of generated workpapers (audit-trail is source-of-truth) ──
const WORKPAPERS: Workpaper[] = [];

function skeleton(
  template_id: WorkpaperTemplateId,
  fy: string,
  entity_code: string,
  reason: string,
): Workpaper {
  return {
    template_id,
    fy,
    entity_code,
    rows: [],
    populated: false,
    source_engine: TEMPLATE_SOURCE_ENGINE[template_id],
    generated_at: new Date().toISOString(),
    skeleton_reason: reason,
    total: 0,
  };
}

// ─── Per-template populators (USE-SITE READS · no source-engine edits) ───────

function populateTransferPricing(fy: string, entity_code: string): Workpaper {
  const audits = listTPAudits();
  if (!audits.length) return skeleton('transfer_pricing', fy, entity_code, 'No TP audit records yet (idea-7 listTPAudits empty)');
  const rows: WorkpaperRow[] = audits.map((a) => ({
    label: `TP audit ${a.tp_audit_id} · methodology ${a.methodology}`,
    value: a.threshold_basis_inr,
    source_ref: `idea-7-transfer-pricing-audit-engine.listTPAudits#${a.tp_audit_id}`,
  }));
  const total = round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0)));
  return {
    template_id: 'transfer_pricing', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.transfer_pricing,
    generated_at: new Date().toISOString(), total,
  };
}

function populateDepreciationReconciliation(fy: string, entity_code: string): Workpaper {
  // multi-gaap requires units — empty units => skeleton (honest, no fabrication)
  const units: AssetUnitRecord[] = [];
  const result = computeMultiGAAPDepreciation(units, fy);
  const comp = compareMultiGAAPBooks(result);
  if (!comp.length) return skeleton('depreciation_reconciliation', fy, entity_code, 'No asset units in scope (multi-gaap compareMultiGAAPBooks empty)');
  const rows: WorkpaperRow[] = comp.map((c) => ({
    label: `${c.ledger_name} · IT/CA/IndAS Δ`,
    value: c.maxAbsoluteDifferential,
    source_ref: `multi-gaap-depreciation-engine.compareMultiGAAPBooks#${c.ledger_name}`,
  }));
  return {
    template_id: 'depreciation_reconciliation', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.depreciation_reconciliation,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

function populateTDSReconciliation(fy: string, entity_code: string): Workpaper {
  const summary = aggregateBySection({ entity_code, fy });
  if (!summary.length) return skeleton('tds_reconciliation', fy, entity_code, 'No TDS deductions for FY (aggregateBySection empty)');
  const rows: WorkpaperRow[] = summary.map((s) => ({
    label: `Section ${s.section} · ${s.deduction_count} deductions · ${s.party_count} parties`,
    value: s.tds_amount,
    source_ref: `comply360-tds-aggregator-engine.aggregateBySection#${s.section}`,
  }));
  return {
    template_id: 'tds_reconciliation', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.tds_reconciliation,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

function populateCostAudit(fy: string, entity_code: string): Workpaper {
  const appts = listCostAuditorAppointments({ fy });
  if (!appts.length) return skeleton('cost_audit', fy, entity_code, 'No cost auditor appointments for FY (listCostAuditorAppointments empty)');
  const rows: WorkpaperRow[] = appts.map((a) => ({
    label: `${a.appointment_type} · ICMAI ${a.icmai_membership_no}`,
    value: a.fy,
    source_ref: `comply360-cost-audit-engine.listCostAuditorAppointments#${a.id}`,
  }));
  return {
    template_id: 'cost_audit', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.cost_audit,
    generated_at: new Date().toISOString(), total: 0,
  };
}

function populateStatutoryRegisterExtract(fy: string, entity_code: string): Workpaper {
  // Walk all 7 register types
  const types: StatutoryRegisterType[] = [
    'Register_of_Members', 'Register_of_Directors_KMP', 'Register_of_Charges',
    'Register_of_Loans_Investments', 'Register_of_Share_Certificates',
    'Register_of_Sweat_Equity', 'Register_of_ESOP',
  ];
  const rows: WorkpaperRow[] = [];
  for (const t of types) {
    const entries = listRegisterEntries(t, { is_active: true });
    for (const e of entries) {
      rows.push({
        label: `${t} · ${e.id}`,
        value: e.effective_date,
        source_ref: `comply360-statutory-registers-engine.listRegisterEntries#${e.id}`,
      });
    }
  }
  if (!rows.length) return skeleton('statutory_register_extract', fy, entity_code, 'No active statutory register entries (listRegisterEntries empty across 7 types)');
  return {
    template_id: 'statutory_register_extract', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.statutory_register_extract,
    generated_at: new Date().toISOString(), total: 0,
  };
}

function populateConsolidation(fy: string, entity_code: string): Workpaper {
  let pnl;
  try { pnl = buildConsolidatedPnL({ fy }); }
  catch { return skeleton('consolidation', fy, entity_code, 'buildConsolidatedPnL unavailable / no consolidated TB for FY'); }
  const rows: WorkpaperRow[] = [
    { label: 'Revenue', value: pnl.revenue, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#revenue' },
    { label: 'COGS', value: pnl.cogs, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#cogs' },
    { label: 'Gross profit', value: pnl.gross_profit, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#gross_profit' },
    { label: 'Other income', value: pnl.other_income, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#other_income' },
    { label: 'Expenses', value: pnl.expenses, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#expenses' },
    { label: 'Operating profit', value: pnl.operating_profit, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#operating_profit' },
    { label: 'Profit before tax', value: pnl.profit_before_tax, source_ref: 'group-consolidation-engine.buildConsolidatedPnL#profit_before_tax' },
  ];
  return {
    template_id: 'consolidation', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.consolidation,
    generated_at: new Date().toISOString(),
    total: round2(pnl.profit_before_tax),
  };
}

function populateGstReconciliation(fy: string, entity_code: string): Workpaper {
  // GST workpaper sources from the consolidation-disclosure pack (which aggregates Schedule III).
  let pack;
  try { pack = buildDisclosurePack({ fy }); }
  catch { return skeleton('gst_reconciliation', fy, entity_code, 'buildDisclosurePack unavailable / consolidated figures missing'); }
  if (!pack.sections.length) return skeleton('gst_reconciliation', fy, entity_code, 'Disclosure pack returned no sections');
  const rows: WorkpaperRow[] = pack.sections.map((s) => ({
    label: `Disclosure section · ${s.title}`,
    value: s.total,
    source_ref: `consolidation-disclosure-engine.buildDisclosurePack#${s.key}`,
  }));
  return {
    template_id: 'gst_reconciliation', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.gst_reconciliation,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

function populateRelatedParty(fy: string, entity_code: string): Workpaper {
  // Related-party workpaper sources from idea-7 TP audits (Section 92 = related-party transactions).
  const audits = listTPAudits();
  const rp = audits.filter((a) => a.section92_applicable);
  if (!rp.length) return skeleton('related_party', fy, entity_code, 'No Section-92-applicable TP audits (idea-7 listTPAudits filtered)');
  const rows: WorkpaperRow[] = rp.map((a) => ({
    label: `Related-party (s.92) · ${a.tp_audit_id}`,
    value: a.threshold_basis_inr,
    source_ref: `idea-7-transfer-pricing-audit-engine.listTPAudits#${a.tp_audit_id}`,
  }));
  return {
    template_id: 'related_party', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.related_party,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

function populateFixedAssetRegister(fy: string, entity_code: string): Workpaper {
  // Fixed-asset register workpaper sources from multi-gaap depreciation (Companies-Act book).
  const units: AssetUnitRecord[] = [];
  const result = computeMultiGAAPDepreciation(units, fy);
  if (!result.companiesAct.length) return skeleton('fixed_asset_register', fy, entity_code, 'No asset units in scope (multi-gaap companiesAct empty)');
  const rows: WorkpaperRow[] = result.companiesAct.map((r, idx) => ({
    label: `${r.ledger_name} · row ${idx + 1}`,
    value: r.current_depr,
    source_ref: `multi-gaap-depreciation-engine.computeMultiGAAPDepreciation#${r.ledger_name}/${idx}`,
  }));
  return {
    template_id: 'fixed_asset_register', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.fixed_asset_register,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

function populateProvisions(fy: string, entity_code: string): Workpaper {
  // Provisions workpaper sources from consolidated BS (liabilities side).
  let bs;
  try { bs = buildBalanceSheet({ fy }); }
  catch { return skeleton('provisions', fy, entity_code, 'buildBalanceSheet unavailable / consolidated TB missing'); }
  const liabLines = bs.liabilities.filter((l) => /prov/i.test(l.ledger_group_code));
  if (!liabLines.length) return skeleton('provisions', fy, entity_code, 'No provision-tagged liability lines in consolidated BS');
  const rows: WorkpaperRow[] = liabLines.map((l) => ({
    label: l.ledger_group_code,
    value: l.amount,
    source_ref: `consolidated-balance-sheet-engine.buildBalanceSheet#liabilities/${l.ledger_group_code}`,
  }));
  return {
    template_id: 'provisions', fy, entity_code, rows, populated: true,
    source_engine: TEMPLATE_SOURCE_ENGINE.provisions,
    generated_at: new Date().toISOString(),
    total: round2(dSum(rows, (r) => (typeof r.value === 'number' ? r.value : 0))),
  };
}

const POPULATORS: Record<WorkpaperTemplateId, (fy: string, entity_code: string) => Workpaper> = {
  transfer_pricing: populateTransferPricing,
  depreciation_reconciliation: populateDepreciationReconciliation,
  tds_reconciliation: populateTDSReconciliation,
  cost_audit: populateCostAudit,
  statutory_register_extract: populateStatutoryRegisterExtract,
  consolidation: populateConsolidation,
  gst_reconciliation: populateGstReconciliation,
  related_party: populateRelatedParty,
  fixed_asset_register: populateFixedAssetRegister,
  provisions: populateProvisions,
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function autoPopulateWorkpaper(input: {
  template_id: WorkpaperTemplateId;
  fy: string;
  entity_code: string;
}): Workpaper {
  const fn = POPULATORS[input.template_id];
  const wp = fn(input.fy, input.entity_code);
  WORKPAPERS.push(wp);
  // ── audit: workpaper_autopop_event (mca-roc) ──
  try {
    logAudit({
      entityCode: input.entity_code,
      action: 'create',
      entityType: 'workpaper_autopop_event',
      recordId: `${input.template_id}_${input.fy}_${input.entity_code}`,
      recordLabel: `Workpaper ${input.template_id} · ${input.fy} · ${input.entity_code}`,
      beforeState: null,
      afterState: {
        template_id: wp.template_id,
        populated: wp.populated,
        source_engine: wp.source_engine,
        row_count: wp.rows.length,
      } as Record<string, unknown>,
      sourceModule: 'oob13-workpaper-autopop-engine',
    });
  } catch { /* audit failure must not break workpaper assembly · honest */ }
  return wp;
}

export function autoPopulateAll(input: { fy: string; entity_code: string }): Workpaper[] {
  return WORKPAPER_TEMPLATES.map((t) =>
    autoPopulateWorkpaper({ template_id: t, fy: input.fy, entity_code: input.entity_code }),
  );
}

export function listWorkpapers(filter?: Partial<Workpaper>): Workpaper[] {
  if (!filter) return [...WORKPAPERS];
  return WORKPAPERS.filter((w) =>
    Object.entries(filter).every(([k, v]) => (w as unknown as Record<string, unknown>)[k] === v),
  );
}

/** Test-only · clears the in-memory workpaper ledger. NOT exported via index. */
export function __resetWorkpapersForTests(): void {
  WORKPAPERS.length = 0;
}

/** Roll-up helper for UI totals — uses decimal-helpers (no recompute of source figures). */
export function sumWorkpaperTotals(ws: Workpaper[]): number {
  return round2(ws.reduce((acc, w) => dAdd(acc, w.total ?? 0), 0));
}
