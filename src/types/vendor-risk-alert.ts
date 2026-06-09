/**
 * @file        src/types/vendor-risk-alert.ts
 * @purpose     Vendor risk alert · raised when threshold breached on any consumed score
 * @sprint      T-VPG-VendorPortal-Gaps · VP-GAPS
 * @decisions   D-NEW-DN · D-NEW-DP (ccc shape alignment)
 * @disciplines FR-30 · FR-50
 */

export type VendorRiskAlertSeverity = 'info' | 'warning' | 'critical';
export type VendorRiskAlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type VendorRiskAlertSource =
  | 'reliability_drop'
  | 'financial_health'
  | 'compliance_expiry'
  | 'risk_grade'
  | 'zone_transition';

export interface VendorRiskAlert {
  id: string;
  party_id: string;
  entity_code: string;
  source: VendorRiskAlertSource;
  severity: VendorRiskAlertSeverity;
  status: VendorRiskAlertStatus;
  title: string;
  detail: string;
  threshold_value?: number;
  observed_value?: number;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export const vendorRiskAlertKey = (entityCode: string): string =>
  `erp_vendor_risk_alerts_${entityCode}`;
