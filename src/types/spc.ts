/**
 * @file     spc.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS2 · ST5a
 * @purpose  Statistical Process Control type definitions.
 *           Q-LOCK-5 Option A · Nelson 8 rules with config switch.
 */

export type NelsonRuleId =
  | 'nelson_1'
  | 'nelson_2'
  | 'nelson_3'
  | 'nelson_4'
  | 'nelson_5'
  | 'nelson_6'
  | 'nelson_7'
  | 'nelson_8';

export type WesternElectricRuleId = 'we_1' | 'we_2' | 'we_3' | 'we_4';

export type SPCRuleSet = 'nelson' | 'western_electric' | 'both';

export interface SPCDataPoint {
  parameter: string;
  value: number;
  timestamp: string;
  batch_id?: string;
  reactor_id?: string;
  shift_id?: string;
  sample_id?: string;
}

export interface SPCChartConfig {
  parameter: string;
  upper_control_limit: number;
  lower_control_limit: number;
  upper_spec_limit: number;
  lower_spec_limit: number;
  target: number;
  sample_size: number;
  rule_set: SPCRuleSet;
}

export interface SPCViolation {
  rule_id: NelsonRuleId | WesternElectricRuleId;
  description: string;
  data_point_indices: number[];
  severity: 'warning' | 'critical';
  detected_at: string;
}

export interface SPCChart {
  config: SPCChartConfig;
  data_points: SPCDataPoint[];
  mean: number;
  std_dev: number;
  computed_at: string;
}

export interface SPCAnalysisResult {
  chart_id: string;
  parameter: string;
  in_control: boolean;
  violations: SPCViolation[];
  cpk: number;
  cp: number;
  ppm: number;
  trend: 'stable' | 'rising' | 'falling' | 'unstable';
  sample_count: number;
}

export const spcChartsKey = (entityCode: string): string =>
  `spc_charts_${entityCode}`;

export const spcDataKey = (entityCode: string): string =>
  `spc_data_${entityCode}`;
