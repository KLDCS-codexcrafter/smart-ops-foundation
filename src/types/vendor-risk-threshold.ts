/**
 * @file        src/types/vendor-risk-threshold.ts
 * @purpose     CC-editable risk threshold rules · drives vendor-risk-compliance-engine evaluation
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_risk_thresholds) · honest no-alert when source scores absent
 */

export type VendorRiskMetric =
  | 'financial_health'
  | 'reliability'
  | 'compliance'
  | 'on_time';

export type VendorRiskOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

export interface VendorRiskThreshold {
  id: string;
  metric: VendorRiskMetric;
  operator: VendorRiskOperator;
  value: number;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const vendorRiskThresholdsKey = (entityCode: string): string =>
  `erp_vendor_risk_thresholds_${entityCode}`;
