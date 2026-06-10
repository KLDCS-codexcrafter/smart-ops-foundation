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
}

const REGISTRY = new Map<string, KpiDefinition>();

/** Idempotent: re-registering the same id is a no-op (never throws). */
export function registerKpi(def: KpiDefinition): void {
  if (REGISTRY.has(def.id)) return;
  REGISTRY.set(def.id, def);
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
  label: 'Survival-kit readiness %',
  dataSource: 'comply360.survival-kit.readiness',
  defaultChart: defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'count', label: 'Checklist items' }],
    title: 'Survival-kit checklist readiness',
  }),
  thresholds: { amber: 85, red: 60, direction: 'higher-good' },
});








