/**
 * record-retention.ts — Retention policy model (P8.6 · B.5-L3)
 * TXUI-2 deferral resolved under P2BB-Retention authority.
 *
 * Five statutory-informed retention buckets. Editable by operators
 * (defaults are NOT legal advice — confirm with your CA).
 *
 * [JWT] Phase-8 Wave-2: server-side enforcement + Rule 46(8) India-resident
 *       daily backup anchor live there. This module is evaluation + flagging only.
 */

export type RetentionPolicyId =
  | 'companies_act_8yr'
  | 'hr_employment_lifetime'
  | 'gst_8yr'
  | 'customer_app_friendly'
  | 'operational_log_only';

export type RetentionAction = 'review' | 'archive_flag';

export type RetentionYears = number | 'employment_lifetime_plus_7';

export interface RetentionPolicyRow {
  id: RetentionPolicyId;
  label: string;
  retentionYears: RetentionYears;
  action: RetentionAction;
  statuteDescription: string;
  editable: true;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export type RetentionEvaluationStatus =
  | 'within_retention'
  | 'past_retention_review'
  | 'no_data';

export interface RetentionEvaluationRow {
  recordType: string;
  fiscalYear: string;
  recordCount: number;
  policyId: RetentionPolicyId;
  cutoffFY: string;
  status: RetentionEvaluationStatus;
}
