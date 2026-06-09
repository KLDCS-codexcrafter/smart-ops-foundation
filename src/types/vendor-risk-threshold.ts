/**
 * @file        src/types/vendor-risk-threshold.ts
 * @purpose     CC-editable thresholds that drive zone classification + alerts
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · CC-editable per ccc reference
 */

export type VendorThresholdKind =
  | 'reliability_min_green'
  | 'reliability_min_amber'
  | 'financial_risk_max_green'
  | 'financial_risk_max_amber'
  | 'compliance_expiry_warn_days'
  | 'overall_risk_max_green'
  | 'overall_risk_max_amber';

export interface VendorRiskThreshold {
  id: string;
  entity_code: string;
  kind: VendorThresholdKind;
  value: number;
  label: string;
  description: string;
  edited_by?: string;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

export const vendorRiskThresholdKey = (entityCode: string): string =>
  `erp_vendor_risk_thresholds_${entityCode}`;

/** Append-only edit audit log · sibling to thresholds · does NOT mutate audit-trail wall */
export interface VendorRiskThresholdEdit {
  id: string;
  threshold_id: string;
  entity_code: string;
  kind: VendorThresholdKind;
  previous_value: number;
  new_value: number;
  edited_by?: string;
  edited_at: string;
  reason?: string;
}

export const vendorRiskThresholdEditKey = (entityCode: string): string =>
  `erp_vendor_risk_threshold_edits_${entityCode}`;
