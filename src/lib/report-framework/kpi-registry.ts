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

