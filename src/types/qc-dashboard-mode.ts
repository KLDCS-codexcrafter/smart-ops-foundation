/**
 * @file     qc-dashboard-mode.ts
 * @sprint   T-Phase-1.3-3b-pre-3 · Block A · D-639
 * @purpose  Q60=c · Polymorphic Pareto grouping for QualiCheckDashboard.
 *
 * Q58=c · Dashboard has 2 always-visible sections (Trend + Pareto) · NO outer display mode union.
 * Q60=c · 4 polymorphic Pareto grouping modes via ViewModeSelector.
 */

export type ParetoGroupingMode = 'per_parameter' | 'per_item' | 'per_machine' | 'per_inspector';

export interface ParetoBin {
  key: string;
  label: string;
  fail_count: number;
  total_count: number;
  fail_rate_pct: number;
  cumulative_pct?: number;
}

export interface ParetoData {
  bins: ParetoBin[];
  total_inspections: number;
  total_failures: number;
  overall_fail_rate_pct: number;
  grouping_mode: ParetoGroupingMode;
}

export interface QCTrendPoint {
  date: string;
  pass_count: number;
  fail_count: number;
  total_count: number;
  pass_rate_pct: number;
}
