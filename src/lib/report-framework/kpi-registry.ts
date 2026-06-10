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
