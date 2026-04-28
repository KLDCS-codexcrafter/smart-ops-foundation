/**
 * compliance-alert.ts — Field compliance alerts (halt, battery, offline)
 * Sprint T-Phase-1.1.1l-c · Append-only · Resolved via flag, not delete
 * [JWT] GET/POST /api/salesx/compliance-alerts
 */

export type ComplianceAlertKind =
  | 'halt_detected'
  | 'low_battery'
  | 'offline_too_long'
  | 'no_checkin_by_11am';

export const COMPLIANCE_ALERT_LABELS: Record<ComplianceAlertKind, string> = {
  halt_detected:      'Stationary too long',
  low_battery:        'Low battery',
  offline_too_long:   'Offline too long',
  no_checkin_by_11am: 'No check-in by 11 AM',
};

export const COMPLIANCE_ALERT_COLORS: Record<ComplianceAlertKind, string> = {
  halt_detected:      'bg-amber-500/10 text-amber-700 border-amber-500/30',
  low_battery:        'bg-red-500/10 text-red-700 border-red-500/30',
  offline_too_long:   'bg-purple-500/10 text-purple-700 border-purple-500/30',
  no_checkin_by_11am: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
};

export interface ComplianceAlert {
  id: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  user_role: 'salesman' | 'telecaller' | 'supervisor' | 'sales_manager';
  kind: ComplianceAlertKind;
  severity: 'info' | 'warning' | 'critical';
  detected_at: string;
  resolved_at: string | null;
  resolved_by_id: string | null;
  resolved_by_name: string | null;
  context: {
    battery_pct?: number;
    halt_minutes?: number;
    offline_minutes?: number;
    last_known_lat?: number;
    last_known_lng?: number;
  };
  created_at: string;
}

export const complianceAlertsKey = (e: string) => `erp_compliance_alerts_${e}`;
