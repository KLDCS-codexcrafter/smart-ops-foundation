/**
 * @file        kpi-registry.ts
 * @purpose     Idempotent append-only KPI registry scaffold for the reporting arc.
 *              Seeds the 2 reference KPIs powering OutstandingAging (RPT-1a).
 *              Full KPI population lands in RPT-1b/4.
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @decisions   D-RPT-4 (KPI registry is data-pointer + chart-config only · no compute moves here)
 * @[JWT]       N/A — in-memory registry
 */

import { defaultChartConfig, type ReportChartConfig } from './chart-config';
import type { RoleLayer } from './role-layer';

export interface KpiThresholds {
  amber: number;
  red: number;
  direction: 'higher-good' | 'lower-good';
}

export interface KpiDefinition {
  id: string;
  label: string;
  /** Data-source pointer (e.g. 'fincore.outstanding.aging') — NO compute here. */
  dataSource: string;
  defaultChart: ReportChartConfig;
  thresholds?: KpiThresholds;
  /**
   * RPT-4 · Role-layer visibility. When omitted, KPI is visible at all layers
   * (back-compat). Tagging for the 74 existing seeds is applied at the bottom
   * of this file via a heuristic block.
   */
  layers?: RoleLayer[];
}

const REGISTRY = new Map<string, KpiDefinition>();

/** Idempotent: re-registering the same id is a no-op (never throws). */
export function registerKpi(def: KpiDefinition): void {
  if (REGISTRY.has(def.id)) return;
  REGISTRY.set(def.id, def);
}

/** RPT-4 · Set/replace the layers field on an existing KPI (no-op if missing). */
export function setKpiLayers(id: string, layers: RoleLayer[]): void {
  const k = REGISTRY.get(id);
  if (k) k.layers = layers;
}

export function getKpi(id: string): KpiDefinition | undefined {
  return REGISTRY.get(id);
}

export function listKpis(): KpiDefinition[] {
  return Array.from(REGISTRY.values());
}

// ─── Reference seeds for OutstandingAging (RPT-1a) ─────────────────────────
registerKpi({
  id: 'ar-overdue-90',
  layers: ['manager', 'management'],
  label: 'A/R Overdue > 90d',
  dataSource: 'fincore.outstanding.aging.receivables',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column',
    xKey: 'party',
    series: [
      { key: 'b_0_30',   label: '0–30 d' },
      { key: 'b_31_60',  label: '31–60 d' },
      { key: 'b_61_90',  label: '61–90 d' },
      { key: 'b_90_plus',label: '90+ d' },
    ],
    title: 'Receivables Ageing',
  }),
  thresholds: { amber: 1_000_000, red: 5_000_000, direction: 'lower-good' },
});

registerKpi({
  id: 'ap-overdue-90',
  layers: ['manager', 'management'],
  label: 'A/P Overdue > 90d',
  dataSource: 'fincore.outstanding.aging.payables',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column',
    xKey: 'party',
    series: [
      { key: 'b_0_30',   label: '0–30 d' },
      { key: 'b_31_60',  label: '31–60 d' },
      { key: 'b_61_90',  label: '61–90 d' },
      { key: 'b_90_plus',label: '90+ d' },
    ],
    title: 'Payables Ageing',
  }),
  thresholds: { amber: 1_000_000, red: 5_000_000, direction: 'lower-good' },
});

// ─── RPT-1b · 8 FinCore page KPI seeds (idempotent · seed data only) ───────
registerKpi({
  id: 'fc-ledger-balance',
  layers: ['manager', 'management'],
  label: 'Ledger running balance',
  dataSource: 'fincore.ledger.history',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'balance', label: 'Running balance' }],
    title: 'Ledger running balance',
  }),
});

registerKpi({
  id: 'fc-cheque-status',
  layers: ['operator', 'manager', 'management'],
  label: 'Cheque status mix',
  dataSource: 'fincore.cheque.status',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Cheques' }],
    title: 'Cheque status mix',
  }),
});

registerKpi({
  id: 'fc-bs-composition',
  layers: ['management'],
  label: 'BS composition',
  dataSource: 'fincore.balance-sheet.composition',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'group',
    series: [
      { key: 'assets', label: 'Assets' },
      { key: 'liabilities', label: 'Liabilities + Capital' },
    ],
    title: 'BS composition',
  }),
});

registerKpi({
  id: 'fc-tb-drcr',
  layers: ['management'],
  label: 'Trial balance Dr/Cr',
  dataSource: 'fincore.trial-balance.drcr',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'group',
    series: [
      { key: 'debit', label: 'Debit' },
      { key: 'credit', label: 'Credit' },
    ],
    title: 'Trial balance Dr/Cr',
  }),
});

registerKpi({
  id: 'fc-stock-value',
  layers: ['operator', 'manager', 'management'],
  label: 'Stock value by group',
  dataSource: 'fincore.stock.value-by-group',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'group',
    series: [{ key: 'value', label: 'Stock value' }],
    title: 'Stock value by group',
  }),
});

registerKpi({
  id: 'fc-pnl-margin',
  layers: ['management'],
  label: 'P&L revenue/expense/margin',
  dataSource: 'fincore.pnl.margin',
  defaultChart: defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'revenue', label: 'Revenue', renderAs: 'bar' },
      { key: 'expense', label: 'Expense', renderAs: 'bar' },
      { key: 'margin',  label: 'Margin',  renderAs: 'line' },
    ],
    title: 'P&L revenue/expense/margin',
  }),
});

registerKpi({
  id: 'fc-monthly-prod',
  layers: ['manager', 'management'],
  label: 'Monthly production trend',
  dataSource: 'fincore.production.monthly',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'month',
    series: [{ key: 'value', label: 'Consumed qty' }],
    title: 'Monthly production trend',
  }),
});

registerKpi({
  id: 'fc-bank-reco',
  layers: ['manager', 'management'],
  label: 'Bank reconciliation %',
  dataSource: 'fincore.bank.reco-percent',
  defaultChart: defaultChartConfig({
    chartType: 'gauge', xKey: 'label',
    series: [{ key: 'reconciled_pct', label: 'Reconciled %' }],
    title: 'Bank reconciliation %',
  }),
  thresholds: { amber: 80, red: 60, direction: 'higher-good' },
});

// ─── RPT-2c · 7 ReceivX + PayOut + Bill-passing KPI seeds (idempotent) ─────
registerKpi({
  id: 'rx-aging-person',
  layers: ['manager', 'management'],
  label: 'AR aging by collector',
  dataSource: 'receivx.aging.by-person',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'collector',
    series: [
      { key: 'b_0_30',   label: '0–30 d' },
      { key: 'b_31_60',  label: '31–60 d' },
      { key: 'b_61_90',  label: '61–90 d' },
      { key: 'b_90_plus',label: '90+ d' },
    ],
    title: 'AR aging by collector',
  }),
});

registerKpi({
  id: 'rx-credit-risk',
  layers: ['manager', 'management'],
  label: 'Credit risk distribution',
  dataSource: 'receivx.credit-risk.distribution',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'risk',
    series: [{ key: 'exposure', label: 'Exposure' }],
    title: 'Credit risk distribution',
  }),
});

registerKpi({
  id: 'rx-collection-eff',
  layers: ['manager', 'management'],
  label: 'Collection efficiency',
  dataSource: 'receivx.collection.efficiency',
  defaultChart: defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'collected', label: 'Collected', renderAs: 'bar' },
      { key: 'efficiency', label: 'Efficiency %', renderAs: 'line' },
    ],
    title: 'Collection efficiency',
  }),
});

registerKpi({
  id: 'rx-ptp-rate',
  layers: ['operator', 'manager', 'management'],
  label: 'PTP kept vs broken',
  dataSource: 'receivx.ptp.kept-vs-broken',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'PTPs' }],
    title: 'PTP kept vs broken',
  }),
});

registerKpi({
  id: 'rx-comm-volume',
  layers: ['operator', 'manager', 'management'],
  label: 'Communication volume by channel',
  dataSource: 'receivx.communication.volume',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'channel',
    series: [{ key: 'count', label: 'Messages' }],
    title: 'Communication volume by channel',
  }),
});

registerKpi({
  id: 'po-requisition-trend',
  layers: ['manager', 'management'],
  label: 'Requisition value trend',
  dataSource: 'payout.requisition.trend',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'value', label: 'Requisition value' }],
    title: 'Requisition value trend',
  }),
});

registerKpi({
  id: 'bp-rate-contract',
  layers: ['operator', 'manager', 'management'],
  label: 'Rate contract value by vendor',
  dataSource: 'bill-passing.rate-contract.value-by-vendor',
  defaultChart: defaultChartConfig({
    chartType: 'bar', xKey: 'vendor',
    series: [{ key: 'value', label: 'Contract value' }],
    title: 'Rate contract value by vendor',
  }),
});

// ─── RPT-2b-i · 7 EximX trade-doc register KPI seeds (idempotent) ──────────
registerKpi({
  id: 'ex-export-po',
  layers: ['operator', 'manager', 'management'],
  label: 'Export PO value',
  dataSource: 'eximx.export-po.value',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'buyer',
    series: [{ key: 'value', label: 'PO value' }],
    title: 'Export PO value',
  }),
});

registerKpi({
  id: 'ex-import-po',
  layers: ['operator', 'manager', 'management'],
  label: 'Import PO value',
  dataSource: 'eximx.import-po.value',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'vendor',
    series: [{ key: 'value', label: 'PO value' }],
    title: 'Import PO value',
  }),
});

registerKpi({
  id: 'ex-shipping-bill',
  layers: ['operator', 'manager', 'management'],
  label: 'Shipping bill FOB by status',
  dataSource: 'eximx.shipping-bill.fob-by-status',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'status',
    series: [{ key: 'fob_value', label: 'FOB value' }],
    title: 'Shipping bill FOB by status',
  }),
});

registerKpi({
  id: 'ex-dispatch',
  layers: ['manager', 'management'],
  label: 'Export dispatch trend',
  dataSource: 'eximx.dispatch.trend',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'value', label: 'Dispatch value' }],
    title: 'Export dispatch trend',
  }),
});

registerKpi({
  id: 'ex-lc-status',
  layers: ['operator', 'manager', 'management'],
  label: 'LC status mix',
  dataSource: 'eximx.lc.status-mix',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'LCs' }],
    title: 'LC status mix',
  }),
});

registerKpi({
  id: 'ex-ci-value',
  layers: ['operator', 'manager', 'management'],
  label: 'Commercial invoice value',
  dataSource: 'eximx.ci.value-by-month',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'month',
    series: [{ key: 'invoice_value', label: 'Invoice value' }],
    title: 'Commercial invoice value',
  }),
});

registerKpi({
  id: 'ex-boe-duty',
  layers: ['operator', 'manager', 'management'],
  label: 'Bill of entry duty/value',
  dataSource: 'eximx.boe.duty-by-status',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'status',
    series: [
      { key: 'duty', label: 'Duty' },
      { key: 'assessable_value', label: 'Assessable value' },
    ],
    title: 'Bill of entry duty/value',
  }),
});

// ─── RPT-2b-ii · 6 EximX finance/realisation register KPI seeds (idempotent) ─
registerKpi({
  id: 'ex-realisation',
  layers: ['management'],
  label: 'Export realisation',
  dataSource: 'eximx.realisation.by-period',
  defaultChart: defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'realised', label: 'Realised', renderAs: 'bar' },
      { key: 'realisation_pct', label: 'Realisation %', renderAs: 'line' },
    ],
    title: 'Export realisation',
  }),
});

registerKpi({
  id: 'ex-fema-270',
  layers: ['manager', 'management'],
  label: 'FEMA 270-day aging',
  dataSource: 'eximx.fema.270-day-aging',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'bucket',
    series: [{ key: 'value', label: 'Outstanding' }],
    title: 'FEMA 270-day aging',
  }),
});

registerKpi({
  id: 'ex-packing-credit',
  layers: ['operator', 'manager', 'management'],
  label: 'Packing credit outstanding',
  dataSource: 'eximx.packing-credit.outstanding-by-status',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'outstanding', label: 'Outstanding' }],
    title: 'Packing credit outstanding',
  }),
});

registerKpi({
  id: 'ex-hedge',
  layers: ['management'],
  label: 'Hedge notional by currency',
  dataSource: 'eximx.hedge.notional-by-currency',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'currency',
    series: [{ key: 'notional', label: 'Notional' }],
    title: 'Hedge notional by currency',
  }),
});

registerKpi({
  id: 'ex-git',
  layers: ['operator', 'manager', 'management'],
  label: 'GIT value by leg',
  dataSource: 'eximx.git.value-by-leg',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'state',
    series: [{ key: 'git_value', label: 'GIT value' }],
    title: 'GIT value by leg',
  }),
});

registerKpi({
  id: 'ex-rootar',
  layers: ['manager', 'management'],
  label: 'RoO preference by FTA',
  dataSource: 'eximx.roo.preference-by-fta',
  defaultChart: defaultChartConfig({
    chartType: 'bar', xKey: 'fta',
    series: [{ key: 'count', label: 'Declarations' }],
    title: 'RoO preference by FTA',
  }),
});

// ─── RPT-2a-i · 6 Comply360 reference dashboard KPI seeds (idempotent) ─────
registerKpi({
  id: 'cmp-fire-compliance',
  layers: ['manager', 'management'],
  label: 'Fire compliance %',
  dataSource: 'comply360.fire-safety.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Fire controls' }],
    title: 'Fire / NOC / Audit / AMC / Drill status',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-costaudit-filings',
  layers: ['manager', 'management'],
  label: 'Cost-audit filings on time %',
  dataSource: 'comply360.cost-audit.cra-filings',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'form_type',
    series: [
      { key: 'filed', label: 'Filed' },
      { key: 'pending', label: 'Pending' },
    ],
    title: 'CRA filings by form / status',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-env-compliance',
  layers: ['manager', 'management'],
  label: 'Environmental compliance %',
  dataSource: 'comply360.environmental.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'count', label: 'Controls' }],
    title: 'Consent / compliance status',
  }),
  thresholds: { amber: 85, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-indsafety',
  layers: ['manager', 'management'],
  label: 'Industrial safety compliance %',
  dataSource: 'comply360.industrial-safety.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'count', label: 'Items' }],
    title: 'Incident / safety-item status',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-waste',
  layers: ['manager', 'management'],
  label: 'Waste disposal compliance %',
  dataSource: 'comply360.waste-management.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'count', label: 'Streams' }],
    title: 'Waste category / disposal',
  }),
  thresholds: { amber: 85, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-dpdp',
  layers: ['manager', 'management'],
  label: 'DPDP readiness %',
  dataSource: 'comply360.dpdp.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'control',
    series: [{ key: 'count', label: 'DPDP controls' }],
    title: 'DPDP control status',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

// ─── RPT-2a-ii · 5 Comply360 cohort-2 dashboard KPI seeds (idempotent) ─────
registerKpi({
  id: 'cmp-quality',
  layers: ['manager', 'management'],
  label: 'Quality standards compliance %',
  dataSource: 'comply360.quality-standards.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Quality controls' }],
    title: 'Quality / standards / cert status',
  }),
  thresholds: { amber: 85, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-cyber',
  layers: ['manager', 'management'],
  label: 'CERT-In readiness %',
  dataSource: 'comply360.cyber-security.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Cyber controls' }],
    title: 'Cyber control / incident status',
  }),
  thresholds: { amber: 85, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-csr',
  layers: ['management'],
  label: 'CSR spend vs obligation %',
  dataSource: 'comply360.csr.csr2-spend',
  defaultChart: defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'required', label: 'Required (₹L)', renderAs: 'bar' },
      { key: 'actual', label: 'Actual (₹L)', renderAs: 'bar' },
      { key: 'compliance_pct', label: 'Compliance %', renderAs: 'line' },
    ],
    title: 'CSR spend vs 2% obligation',
  }),
  thresholds: { amber: 95, red: 80, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-labour',
  layers: ['manager', 'management'],
  label: 'Labour compliance %',
  dataSource: 'comply360.labour-tier2.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Labour controls' }],
    title: 'Labour Tier-2 compliance status',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-mca',
  layers: ['manager', 'management'],
  label: 'MCA filing compliance %',
  dataSource: 'comply360.mca-tier2.summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'MCA filings' }],
    title: 'MCA Tier-2 filing status',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

// ─── RPT-2a-iii · 3 Comply360 cohort-3 dashboard KPI seeds (idempotent) ────
registerKpi({
  id: 'cmp-legal',
  layers: ['manager', 'management'],
  label: 'Legal/IPR compliance %',
  dataSource: 'comply360.legal-ipr.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'count', label: 'IPR records' }],
    title: 'Legal · IPR record mix',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-meetings',
  layers: ['operator', 'manager', 'management'],
  label: 'Meetings compliance %',
  dataSource: 'comply360.meetings.compliance-summary',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'type',
    series: [{ key: 'count', label: 'Meetings' }],
    title: 'Meetings · by type',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'cmp-survivalkit',
  layers: ['manager', 'management'],
  label: 'Survival-kit readiness %',
  dataSource: 'comply360.survival-kit.readiness',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Checklist items' }],
    title: 'Survival-kit checklist readiness',
  }),
  thresholds: { amber: 85, red: 60, direction: 'higher-good' },
});

// ─── RPT-2b-iii · 6 EximX dashboard cohort-1 KPI seeds (idempotent) ────────
registerKpi({
  id: 'ex-cross-realisation',
  layers: ['management'],
  label: 'Cross-entity realisation %',
  dataSource: 'eximx.cross-entity-realisation.summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'entity',
    series: [
      { key: 'realised', label: 'Realised' },
      { key: 'pending', label: 'Pending' },
    ],
    title: 'Realisation by entity',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-form3ceb',
  layers: ['manager', 'management'],
  label: 'Form 3CEB filing %',
  dataSource: 'eximx.form-3ceb.summary',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: '3CEB filings' }],
    title: '3CEB filing status',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-landed-cost',
  layers: ['management'],
  label: 'Landed-cost reconciliation %',
  dataSource: 'eximx.landed-cost.reconciliation',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'mlgit',
    series: [{ key: 'variance_pct', label: 'Variance %' }],
    title: 'Landed-cost variance by MLGIT',
  }),
  thresholds: { amber: 95, red: 85, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-aeo',
  layers: ['management'],
  label: 'AEO benefit utilisation %',
  dataSource: 'eximx.aeo.benefit-utilisation',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'tier',
    series: [{ key: 'bcd_pct', label: 'BCD reduction %' }],
    title: 'AEO benefit utilisation',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-ebrc',
  layers: ['management'],
  label: 'e-BRC/EDPMS recon %',
  dataSource: 'eximx.ebrc-edpms.reconciliation',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'EDPMS records' }],
    title: 'e-BRC / EDPMS recon status',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-monthend-reval',
  layers: ['management'],
  label: 'Month-end reval coverage %',
  dataSource: 'eximx.month-end-reval.coverage',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'currency',
    series: [
      { key: 'revalued', label: 'Revalued' },
      { key: 'pending', label: 'Pending' },
    ],
    title: 'FX reval coverage by currency',
  }),
  thresholds: { amber: 95, red: 80, direction: 'higher-good' },
});

// ─── RPT-2b-iv · 5 EximX dashboard cohort-2 (close) KPI seeds (idempotent) ──
registerKpi({
  id: 'ex-ews',
  layers: ['manager', 'management'],
  label: 'Early-warning coverage %',
  dataSource: 'eximx.ews.coverage',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'severity',
    series: [{ key: 'count', label: 'Signals' }],
    title: 'Early-warning signals by severity',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-buyer-reliability',
  layers: ['manager', 'management'],
  label: 'Buyer reliability index',
  dataSource: 'eximx.buyer-reliability.distribution',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'class',
    series: [{ key: 'count', label: 'Customers' }],
    title: 'Buyer reliability distribution',
  }),
  thresholds: { amber: 80, red: 60, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-vendor-score',
  layers: ['manager', 'management'],
  label: 'Vendor scorecard %',
  dataSource: 'eximx.vendor-score.distribution',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'class',
    series: [{ key: 'count', label: 'Vendors' }],
    title: 'Vendor scorecard distribution',
  }),
  thresholds: { amber: 80, red: 60, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-coo-legal',
  layers: ['manager', 'management'],
  label: 'CoO legalization %',
  dataSource: 'eximx.coo-legal.status',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'state',
    series: [{ key: 'count', label: 'SB / state' }],
    title: 'CoO legalization status',
  }),
  thresholds: { amber: 80, red: 60, direction: 'higher-good' },
});

registerKpi({
  id: 'ex-rms',
  layers: ['manager', 'management'],
  label: 'RMS declaration %',
  dataSource: 'eximx.rms.status',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Declarations' }],
    title: 'RMS declaration status',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

// ─── RPT-2e-i · 6 FinCore GST statutory register KPI seeds (idempotent) ────
registerKpi({
  id: 'fc-gstr1',
  layers: ['operator', 'manager', 'management'],
  label: 'GSTR-1 section coverage',
  dataSource: 'fincore.gst.gstr1.section-counts',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'count', label: 'Invoices' }],
    title: 'GSTR-1 sections',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-gstr3b',
  layers: ['operator', 'manager', 'management'],
  label: 'GSTR-3B outward summary',
  dataSource: 'fincore.gst.gstr3b.outward-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'taxable', label: 'Taxable value' }],
    title: 'GSTR-3B outward summary',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-gstr9',
  layers: ['manager', 'management'],
  label: 'GSTR-9 annual summary',
  dataSource: 'fincore.gst.gstr9.annual-summary',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'table',
    series: [{ key: 'taxable', label: 'Taxable / reversed' }],
    title: 'GSTR-9 annual summary',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-gstr2',
  layers: ['operator', 'manager', 'management'],
  label: 'GSTR-2 ITC posture',
  dataSource: 'fincore.gst.gstr2.itc-posture',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Purchases' }],
    title: 'GSTR-2 ITC posture',
  }),
  thresholds: { amber: 85, red: 65, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-reco',
  layers: ['manager', 'management'],
  label: '2A/2B reconciliation match %',
  dataSource: 'fincore.gst.reco.match-posture',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Reco rows' }],
    title: '2A/2B match posture',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-rcm-compliance',
  layers: ['manager', 'management'],
  label: 'RCM compliance coverage',
  dataSource: 'fincore.gst.rcm-compliance.severity',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'severity',
    series: [{ key: 'count', label: 'Findings' }],
    title: 'RCM compliance by severity',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

// ─── RPT-2e-ii · 6 FinCore RCM/ITC/TDS/Audit register KPI seeds (idempotent) ─
registerKpi({
  id: 'fc-rcm-register',
  layers: ['operator', 'manager', 'management'],
  label: 'RCM by section',
  dataSource: 'fincore.rcm.by-section',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'rcm_value', label: 'RCM value' }],
    title: 'RCM by section',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-itc',
  layers: ['operator', 'manager', 'management'],
  label: 'ITC by status',
  dataSource: 'fincore.itc.by-status',
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'status',
    series: [
      { key: 'eligible',   label: 'Eligible' },
      { key: 'ineligible', label: 'Ineligible' },
      { key: 'reversed',   label: 'Reversed' },
    ],
    title: 'ITC by status',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-clause44',
  layers: ['operator', 'manager', 'management'],
  label: 'Clause-44 expense breakup',
  dataSource: 'fincore.clause44.expense-breakup',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'value', label: 'Value' }],
    title: 'Clause-44 expense breakup',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-tds-advance',
  layers: ['operator', 'manager', 'management'],
  label: 'TDS advance by section',
  dataSource: 'fincore.tds-advance.by-section',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'tds_amount', label: 'TDS amount' }],
    title: 'TDS advance by section',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-tds-analytics',
  layers: ['operator', 'manager', 'management'],
  label: 'TDS by section',
  dataSource: 'fincore.tds-analytics.by-section',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'tds', label: 'TDS' }],
    title: 'TDS by section',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-audit-trail',
  layers: ['operator', 'manager', 'management'],
  label: 'Audit events by type',
  dataSource: 'fincore.audit-trail.by-action',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'action',
    series: [{ key: 'count', label: 'Events' }],
    title: 'Audit events by type',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

// ─── RPT-2e-iii · 6 Statutory-Close KPI seeds (idempotent · seed-data only) ─
registerKpi({
  id: 'fc-eway',
  layers: ['operator', 'manager', 'management'],
  label: 'E-Way Bills by status',
  dataSource: 'fincore.eway.by-status',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'EWBs' }],
    title: 'E-Way Bills by status',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-challan',
  layers: ['operator', 'manager', 'management'],
  label: 'TDS challan amount by type',
  dataSource: 'fincore.challan.by-type',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'type',
    series: [{ key: 'amount', label: 'Amount' }],
    title: 'TDS challan amount by type',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-form24q',
  layers: ['operator', 'manager', 'management'],
  label: 'Form 24Q TDS by quarter',
  dataSource: 'fincore.form24q.by-quarter',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'quarter',
    series: [{ key: 'tds', label: 'TDS' }],
    title: 'Form 24Q TDS by quarter',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-form26q',
  layers: ['operator', 'manager', 'management'],
  label: 'Form 26Q TDS by section',
  dataSource: 'fincore.form26q.by-section',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'tds', label: 'TDS' }],
    title: 'Form 26Q TDS by section',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-form27q',
  layers: ['operator', 'manager', 'management'],
  label: 'Form 27Q NRI TDS by section',
  dataSource: 'fincore.form27q.by-section',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'section',
    series: [{ key: 'tds', label: 'TDS' }],
    title: 'Form 27Q NRI TDS by section',
  }),
  thresholds: { amber: 80, red: 50, direction: 'higher-good' },
});


// ─── RPT-4 · 6 cross-card Management KPIs (idempotent · seed-data only) ────
registerKpi({
  id: 'xc-cash-position',
  label: 'Cash position (cross-card)',
  dataSource: 'reg:fc-ledger',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'balance', label: 'Cash balance' }],
    title: 'Cash position',
  }),
});

registerKpi({
  id: 'xc-ar-aging',
  label: 'A/R aging (cross-card)',
  dataSource: 'reg:fc-outstanding-aging',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'bucket',
    series: [{ key: 'value', label: 'Receivables' }],
    title: 'A/R aging',
  }),
  thresholds: { amber: 1_000_000, red: 5_000_000, direction: 'lower-good' },
});

registerKpi({
  id: 'xc-ap-aging',
  label: 'A/P aging (cross-card)',
  dataSource: 'reg:fc-outstanding-aging',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'stacked-column', xKey: 'bucket',
    series: [{ key: 'value', label: 'Payables' }],
    title: 'A/P aging',
  }),
  thresholds: { amber: 1_000_000, red: 5_000_000, direction: 'lower-good' },
});

registerKpi({
  id: 'xc-compliance-pct',
  label: 'Group compliance %',
  dataSource: 'comply360.aggregate.compliance-pct',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'gauge', xKey: 'label',
    series: [{ key: 'pct', label: 'Compliance %' }],
    title: 'Group compliance %',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'xc-stock-value',
  label: 'Group stock value',
  dataSource: 'reg:fc-ledger',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'entity',
    series: [{ key: 'value', label: 'Stock value' }],
    title: 'Group stock value',
  }),
});

registerKpi({
  id: 'xc-realisation-pct',
  label: 'Group realisation %',
  dataSource: 'reg:ex-tt-payments',
  layers: ['management'],
  defaultChart: defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'realised', label: 'Realised', renderAs: 'bar' },
      { key: 'realisation_pct', label: 'Realisation %', renderAs: 'line' },
    ],
    title: 'Group realisation %',
  }),
  thresholds: { amber: 90, red: 75, direction: 'higher-good' },
});

registerKpi({
  id: 'fc-audit-dash',
  layers: ['operator', 'manager', 'management'],
  label: 'Audit checkpoint mix',
  dataSource: 'fincore.audit-dashboard.checkpoint-mix',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'Checkpoints' }],
    title: 'Audit checkpoint mix',
  }),
  thresholds: { amber: 90, red: 70, direction: 'higher-good' },
});

// ─── RPT-4 · Explicit layer-tagging is inline above (per T2 fix). ───────

// ─── RPT-5b · 9 Inventory KPI seeds (idempotent · layer-tagged · seed only) ───
registerKpi({
  id: 'inv-consumption',
  layers: ['operator', 'manager', 'management'],
  label: 'Consumption value (daily)',
  dataSource: 'inventory.consumption',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'consumption_value', label: 'Consumption ₹' }],
    title: 'Consumption value by date',
  }),
});
registerKpi({
  id: 'inv-consumption-summary',
  layers: ['manager', 'management'],
  label: 'Consumption by department',
  dataSource: 'inventory.consumption',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'dept',
    series: [{ key: 'value', label: 'Consumption ₹' }],
    title: 'Department consumption value',
  }),
});
registerKpi({
  id: 'inv-item-movement',
  layers: ['operator', 'manager', 'management'],
  label: 'Item movement (in/out)',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [
      { key: 'in_qty', label: 'In Qty' },
      { key: 'out_qty', label: 'Out Qty' },
    ],
    title: 'Item movement (in/out)',
  }),
});
registerKpi({
  id: 'inv-slow-moving',
  layers: ['manager', 'management'],
  label: 'Slow / dead stock value',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'bucket',
    series: [{ key: 'stock_value', label: 'Stock Value ₹' }],
    title: 'Slow / dead stock value by age',
  }),
});
registerKpi({
  id: 'inv-grn',
  layers: ['operator', 'manager', 'management'],
  label: 'GRN value by vendor',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'vendor',
    series: [{ key: 'grn_value', label: 'GRN Value ₹' }],
    title: 'GRN value by vendor',
  }),
});
registerKpi({
  id: 'inv-rtv',
  layers: ['operator', 'manager', 'management'],
  label: 'RTV value by vendor',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'vendor',
    series: [{ key: 'rtv_value', label: 'RTV Value ₹' }],
    title: 'RTV value by vendor',
  }),
});
registerKpi({
  id: 'inv-min',
  layers: ['operator', 'manager', 'management'],
  label: 'MIN value by department',
  dataSource: 'inventory.consumption',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'department',
    series: [{ key: 'issue_value', label: 'Issue Value ₹' }],
    title: 'MIN value by department',
  }),
});
registerKpi({
  id: 'inv-stock-ledger',
  layers: ['manager', 'management'],
  label: 'Top item balances',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'line', xKey: 'item',
    series: [{ key: 'balance_qty', label: 'Balance Qty' }],
    title: 'Top item balances',
  }),
});
registerKpi({
  id: 'inv-abc',
  layers: ['manager', 'management'],
  label: 'ABC value distribution',
  dataSource: 'inventory.stock-ledger',
  defaultChart: defaultChartConfig({
    chartType: 'doughnut', xKey: 'class',
    series: [{ key: 'value', label: 'Value' }],
    title: 'ABC value distribution',
  }),
});








// ─── RPT-5c · 9 Procure360 KPI seeds ───
registerKpi({ id: 'pr-vendor-agreements', layers: ['operator','manager','management'], label: 'Agreements by vendor', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'vendor', series: [{ key: 'agreement_count', label: 'Agreements' }], title: 'Agreements by vendor' }) });
registerKpi({ id: 'pr-budget-utilization', layers: ['manager','management'], label: 'Budget head utilization', dataSource: 'procure.budget-utilization', defaultChart: defaultChartConfig({ chartType: 'stacked-column', xKey: 'head', series: [{ key: 'used', label: 'Used ₹' },{ key: 'remaining', label: 'Remaining ₹' }], title: 'Budget head utilization' }) });
registerKpi({ id: 'pr-vendor-reliability', layers: ['manager','management'], label: 'Vendor reliability score', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'vendor', series: [{ key: 'score', label: 'Reliability Score' }], title: 'Top vendors by reliability score' }) });
registerKpi({ id: 'pr-three-way-match', layers: ['operator','manager','management'], label: '3-way match status mix', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'doughnut', xKey: 'status', series: [{ key: 'count', label: 'Bills' }], title: '3-way match status mix' }) });
registerKpi({ id: 'pr-cost-variance-item', layers: ['manager','management'], label: 'Item cost variance', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'item', series: [{ key: 'variance', label: 'Variance ₹' }], title: 'Item cost variance' }) });
registerKpi({ id: 'pr-cost-variance-cat', layers: ['manager','management'], label: 'Category cost variance', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'category', series: [{ key: 'variance', label: 'Variance ₹' }], title: 'Category cost variance' }) });
registerKpi({ id: 'pr-tds-deduction', layers: ['manager','management'], label: 'TDS by section', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'section', series: [{ key: 'tds', label: 'TDS ₹' }], title: 'TDS by section' }) });
registerKpi({ id: 'pr-enquiry', layers: ['operator','manager','management'], label: 'Enquiry status mix', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'Enquiries' }], title: 'Enquiry status mix' }) });
registerKpi({ id: 'pr-peq-followup', layers: ['operator','manager','management'], label: 'Open PEQ status mix', dataSource: 'procure.purchase-orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'Open Enquiries' }], title: 'Open PEQ status mix' }) });

// ─── RPT-5d · 9 QualiCheck KPI seeds (idempotent · seed data only) ───
registerKpi({ id: 'qc-mtc', layers: ['operator','manager','management'], label: 'MTC by status', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'MTCs' }], title: 'MTC by status' }) });
registerKpi({ id: 'qc-ncr', layers: ['operator','manager','management'], label: 'NCR by status', dataSource: 'qualicheck.ncr', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'ncr-status', series: [{ key: 'count', label: 'NCRs' }], title: 'NCR by status' }) });
registerKpi({ id: 'qc-rejection', layers: ['manager','management'], label: 'Rejection qty by reason', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'reason', series: [{ key: 'rejection-qty', label: 'Rejection Qty' }], title: 'Rejection qty by reason' }) });
registerKpi({ id: 'qc-cfr-audit', layers: ['manager','management'], label: 'CFR Part 11 events', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'event-type', series: [{ key: 'count', label: 'Events' }], title: 'CFR Part 11 events by type' }) });
registerKpi({ id: 'qc-godown', layers: ['operator','manager','management'], label: 'Inspections by godown', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'godown', series: [{ key: 'qty', label: 'Inspections' }], title: 'Inspections by godown' }) });
registerKpi({ id: 'qc-stk-transfer', layers: ['operator','manager','management'], label: 'QC stock-transfer lines by status', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'qty', label: 'Lines' }], title: 'QC stock-transfer lines by status' }) });
registerKpi({ id: 'qc-fgr-insp', layers: ['operator','manager','management'], label: 'FGR inspection result mix', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'doughnut', xKey: 'result', series: [{ key: 'count', label: 'Inspections' }], title: 'FGR inspection result mix' }) });
registerKpi({ id: 'qc-iqc-remarks', layers: ['manager','management'], label: 'IQC remarks by category', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'remark-category', series: [{ key: 'count', label: 'Remarks' }], title: 'IQC remarks by category' }) });
registerKpi({ id: 'qc-dashboard', layers: ['manager','management'], label: 'QualiCheck inspection status mix', dataSource: 'qualicheck.inspections', defaultChart: defaultChartConfig({ chartType: 'doughnut', xKey: 'inspection-status', series: [{ key: 'count', label: 'Inspections' }], title: 'QualiCheck inspection status mix' }) });

// ─── RPT-6a · 14 Production KPI seeds (idempotent · seed data only) ───
registerKpi({ id: 'prod-demand-forecast', layers: ['manager','management'], label: 'Demand forecast vs actual', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'line', xKey: 'period', series: [{ key: 'forecast', label: 'Forecast' },{ key: 'actual', label: 'Actual' }], title: 'Demand forecast vs actual' }) });
registerKpi({ id: 'prod-mixed-bu', layers: ['manager','management'], label: 'BU output mix', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'bu', series: [{ key: 'output', label: 'Output' }], title: 'BU output mix' }) });
registerKpi({ id: 'prod-trace', layers: ['operator','manager','management'], label: 'PO status mix', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'POs' }], title: 'PO status mix' }) });
registerKpi({ id: 'prod-itc04', layers: ['manager','management'], label: 'ITC-04 value by quarter', dataSource: 'production.jobwork', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'quarter', series: [{ key: 'value', label: 'JW Value ₹' }], title: 'ITC-04 value by quarter' }) });
registerKpi({ id: 'prod-jw-stock', layers: ['operator','manager','management'], label: 'JW pending stock value by vendor', dataSource: 'production.jobwork', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'jobworker', series: [{ key: 'stock_value', label: 'Stock Value ₹' }], title: 'Stock with job worker by vendor' }) });
registerKpi({ id: 'prod-batch', layers: ['operator','manager','management'], label: 'Process batches by status', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'process', series: [{ key: 'batch_count', label: 'Batches' }], title: 'Process batches by status' }) });
registerKpi({ id: 'prod-plan', layers: ['operator','manager','management'], label: 'Plan quantity by status', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'planned_qty', label: 'Planned Qty' }], title: 'Plan quantity by status' }) });
registerKpi({ id: 'prod-jw-components', layers: ['operator','manager','management'], label: 'JW components by item', dataSource: 'production.jobwork', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'component', series: [{ key: 'qty', label: 'Qty' }], title: 'JW components by item' }) });
registerKpi({ id: 'prod-line-oee', layers: ['manager','management'], label: 'Repetitive line OEE %', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'line', series: [{ key: 'oee_pct', label: 'OEE %' }], title: 'Repetitive line OEE %' }), thresholds: { amber: 75, red: 60, direction: 'higher-good' } });
registerKpi({ id: 'prod-confirmation', layers: ['operator','manager','management'], label: 'Confirmed qty by status', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'confirmed_qty', label: 'Confirmed Qty' }], title: 'Confirmed qty by status' }) });
registerKpi({ id: 'prod-jw-in', layers: ['operator','manager','management'], label: 'JW receipts value by vendor', dataSource: 'production.jobwork', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'vendor', series: [{ key: 'jw_value', label: 'JW Value ₹' }], title: 'JW receipts by vendor' }) });
registerKpi({ id: 'prod-jobcard', layers: ['operator','manager','management'], label: 'Job cards by status', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'Job Cards' }], title: 'Job cards by status' }) });
registerKpi({ id: 'prod-daily-work', layers: ['operator','manager','management'], label: 'Daily work output', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'line', xKey: 'date', series: [{ key: 'output_qty', label: 'Output Qty' }], title: 'Daily work output trend' }) });
registerKpi({ id: 'prod-genealogy', layers: ['manager','management'], label: 'Genealogy nodes by stage', dataSource: 'production.orders', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'process-stage', series: [{ key: 'count', label: 'Nodes' }], title: 'Genealogy nodes by stage' }) });

// ─── RPT-6b · 12 RequestX + Store-hub KPI seeds (idempotent · seed data only) ───
registerKpi({ id: 'rq-indent', layers: ['operator','manager','management'], label: 'Indents by status', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'Indents' }], title: 'Indents by status' }) });
registerKpi({ id: 'rq-ageing', layers: ['manager','management'], label: 'Pending indents by age bucket', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'stacked-column', xKey: 'bucket', series: [{ key: 'count', label: 'Pending' }], title: 'Pending indents by age bucket' }) });
registerKpi({ id: 'rq-dept-summary', layers: ['manager','management'], label: 'Indent value by department', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'department', series: [{ key: 'indent_value', label: 'Indent Value ₹' }], title: 'Indent value by department' }) });
registerKpi({ id: 'rq-po-against', layers: ['operator','manager','management'], label: 'PO conversion mix', dataSource: 'requestx.po-conversion', defaultChart: defaultChartConfig({ chartType: 'doughnut', xKey: 'status', series: [{ key: 'count', label: 'Indents' }], title: 'PO conversion mix' }) });
registerKpi({ id: 'rq-closed', layers: ['operator','manager','management'], label: 'Closed indents by date', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'line', xKey: 'date', series: [{ key: 'count', label: 'Closed' }], title: 'Closed indents by date' }) });
registerKpi({ id: 'rq-pending', layers: ['operator','manager','management'], label: 'Pending indents by department', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'department', series: [{ key: 'count', label: 'Pending' }], title: 'Pending indents by department' }) });
registerKpi({ id: 'rq-extra', layers: ['operator','manager','management'], label: 'Service requests by track', dataSource: 'requestx.indents', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'track', series: [{ key: 'count', label: 'Requests' }], title: 'Service requests by track' }) });
registerKpi({ id: 'st-issue', layers: ['operator','manager','management'], label: 'Stock issue value by department', dataSource: 'storehub.issues', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'department', series: [{ key: 'issue_value', label: 'Issue Value ₹' }], title: 'Stock issue value by department' }) });
registerKpi({ id: 'st-dept-consumption', layers: ['manager','management'], label: 'Consumption by department', dataSource: 'storehub.issues', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'department', series: [{ key: 'consumption', label: 'Consumption ₹' }], title: 'Consumption by department' }) });
registerKpi({ id: 'st-receipt-ack', layers: ['operator','manager','management'], label: 'SRA records by status', dataSource: 'storehub.movement', defaultChart: defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'SRAs' }], title: 'SRA records by status' }) });
registerKpi({ id: 'st-cycle-count', layers: ['operator','manager','management'], label: 'Cycle counts by status', dataSource: 'storehub.movement', defaultChart: defaultChartConfig({ chartType: 'doughnut', xKey: 'status', series: [{ key: 'count', label: 'Cycle Counts' }], title: 'Cycle counts by status' }) });
registerKpi({ id: 'st-movement', layers: ['operator','manager','management'], label: 'Stock movement by date', dataSource: 'storehub.movement', defaultChart: defaultChartConfig({ chartType: 'line', xKey: 'date', series: [{ key: 'movement_qty', label: 'Movement Qty' }], title: 'Stock movement by date' }) });
