/**
 * @file        src/types/vendor-risk-alert.ts
 * @purpose     Vendor risk alert — raised by vendor-risk-compliance-engine on threshold breach
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_risk_alerts) · CONSUMES vendor-reliability-score + vendor-financial-health (never recomputes)
 */

export type VendorRiskAlertSeverity = 'info' | 'warning' | 'critical';
export type VendorRiskAlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface VendorRiskAlert {
  id: string;
  vendor_id: string;
  severity: VendorRiskAlertSeverity;
  rule_id: string;
  message: string;
  raised_at: string;
  status: VendorRiskAlertStatus;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
}

export const vendorRiskAlertsKey = (entityCode: string): string =>
  `erp_vendor_risk_alerts_${entityCode}`;
