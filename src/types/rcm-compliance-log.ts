/**
 * rcm-compliance-log.ts — Per-voucher RCM compliance log entry
 * Sprint T-Phase-2.7-a · Q5-b · Q6-c-expanded
 *
 * Captures EVERY purchase-side voucher's RCM detection outcome — not just posted ones.
 * Severity tiers HIGH/MED/LOW/INFO surface in RCMComplianceReport.
 * [JWT] GET/POST /api/finecore/rcm-compliance-log
 */

export type RCMSeverity = 'HIGH' | 'MED' | 'LOW' | 'INFO';

/** Five mutually exclusive outcomes captured by the compliance log writer. */
export type RCMOutcomeStatus =
  | 'auto_posted'        // policy=always · JV booked
  | 'passed_true'        // operator marked is_rcm=true · we honoured + posted JV
  | 'skipped_true'       // operator marked is_rcm=true · policy=never (skipped)
  | 'override_no_post'   // detection said RCM · operator overrode is_rcm=false
  | 'report_only';       // policy=report_only · detected · no JV · log only

export interface RCMSignalBreakdown {
  /** Vendor URP (unregistered) signal · HIGH severity. */
  signal_urp: boolean;
  /** Vendor on composition scheme · HIGH severity. */
  signal_composition: boolean;
  /** HSN code on Section 9(3) notification list · MED-HIGH severity. */
  signal_hsn_notified: boolean;
  /** Recommended Section: 9(3) HSN-driven · 9(4) URP-driven. */
  recommended_section: '9(3)' | '9(4)' | null;
}

export interface RCMComplianceLogEntry {
  id: string;
  entity_id: string;
  voucher_id: string;
  voucher_no: string;
  voucher_type: string;            // 'purchase' | 'expense' | 'jv' | etc.
  voucher_date: string;
  vendor_id: string | null;
  vendor_name: string | null;
  vendor_gstin: string | null;
  /** Total taxable amount across affected lines (₹ paise integer). */
  taxable_amount_paise: number;
  /** Detection severity (highest line). */
  severity: RCMSeverity;
  /** Detection signals. */
  signals: RCMSignalBreakdown;
  outcome: RCMOutcomeStatus;
  /** Linked RCM JV id if posted; null otherwise. */
  rcm_jv_id: string | null;
  /** Free-text note from policy engine or operator. */
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export const rcmComplianceLogKey = (entityCode: string): string =>
  `erp_rcm_compliance_log_${entityCode}`;

export const RCM_SEVERITY_LABELS: Record<RCMSeverity, string> = {
  HIGH: 'High',
  MED: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

export const RCM_OUTCOME_LABELS: Record<RCMOutcomeStatus, string> = {
  auto_posted: 'Auto-Posted',
  passed_true: 'Passed-Through',
  skipped_true: 'Skipped (policy=never)',
  override_no_post: 'Operator Override',
  report_only: 'Report-Only',
};
