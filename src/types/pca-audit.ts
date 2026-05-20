/**
 * @file        src/types/pca-audit.ts
 * @purpose     PCA Post-Clearance Audit · v7 Gap #5 closure
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q5=b FOUNDATION · 7-state workflow
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped · FR-80 exhaustive
 */

export type PCAAuditStatus =
  | 'initiated' | 'document_request' | 'response_received' | 'desk_audit'
  | 'on_site_audit' | 'findings_issued' | 'closed';

export const PCA_VALID_TRANSITIONS: Record<PCAAuditStatus, PCAAuditStatus[]> = {
  initiated: ['document_request', 'closed'],
  document_request: ['response_received'],
  response_received: ['desk_audit'],
  desk_audit: ['on_site_audit', 'findings_issued', 'closed'],
  on_site_audit: ['findings_issued'],
  findings_issued: ['closed'],
  closed: [],
};

export type PCATriggerSource = 'rms_yellow_lane' | 'rms_red_lane' | 'cbic_random_selection' | 'whistleblower' | 'other';

export interface PCAAudit {
  id: string;
  pca_case_no: string;
  entity_id: string;
  status: PCAAuditStatus;
  trigger_source: PCATriggerSource;
  related_boe_id: string;
  related_boe_no: string;
  customs_zone: string;
  audit_initiated_date: string;
  document_request_date: string | null;
  document_response_date: string | null;
  findings_date: string | null;
  findings_summary: string;
  duty_short_paid_inr: number;
  interest_payable_inr: number;
  penalty_inr: number;
  total_demand_inr: number;
  appeal_filed: boolean;
  closed_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const pcaAuditKey = (entityCode: string): string => `erp_${entityCode}_pca_audits`;
