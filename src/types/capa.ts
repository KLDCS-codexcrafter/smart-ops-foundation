/**
 * @file src/types/capa.ts
 * @purpose CAPA (Corrective and Preventive Action) data model · 8D + 5 Whys per Q-LOCK-1(a)
 * @who Lovable on behalf of Operix Founder (Codexcrafter)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability + Auditability + ISO 9001:2015 Clause 10.2
 * @whom Quality Manager · Quality Engineer · Process Owner
 * @decisions D-NEW-BD (CAPA engine NEW · two-engine pattern · per Q-LOCK-4(a))
 *            D-NEW-BE (NCR↔CAPA bidirectional link · capa_pending flow per Q-LOCK-4(b))
 *            D-NEW-BH (verification 30/60/90 milestones)
 *            D-NEW-BJ (α-b API signature alignment with α-a-bis actuals · 3-arg userId-2nd)
 * @disciplines FR-19 (Sibling · consume NCR via getNcrById/transitionNcr · ZERO mutations)
 *              FR-22 (ActivityItemKind 'voucher' citation per A.3 Supplement 2)
 *              FR-30 (Standard File Header)
 *              FR-50 (Multi-Entity 6-point · entity_id field)
 *              FR-51 (Multi-Branch · branch_id captured)
 * @reuses ncr-engine (consume only · ZERO touch) · types/ncr (consume only · ZERO touch)
 * @[JWT] localStorage key pattern: erp_capa_${entityCode}
 */
import type { NcrId } from './ncr';
import type { Party } from './party';

export type CapaId = `CAPA-${string}`;
export type CapaStatus =
  | 'open' | 'investigating' | 'actions_assigned' | 'verifying'
  | 'effective' | 'ineffective' | 'closed' | 'cancelled';
export type CapaSeverity = 'minor' | 'major' | 'critical';
export type CapaSource =
  | 'ncr' | 'audit' | 'customer_complaint' | 'internal_review' | 'preventive_only';
export type CapaOutcome = 'effective' | 'ineffective_re_open_ncr' | 'cancelled';

export type EightDStepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type EightDStepLabel =
  | 'establish_team' | 'define_problem' | 'contain' | 'root_cause'
  | 'corrective_action' | 'verify_effectiveness' | 'standardize_prevent' | 'recognize_team';
export type EightDStepStatus = 'pending' | 'in_progress' | 'complete';

export interface FiveWhys {
  why_1: { question: string; answer: string };
  why_2?: { question: string; answer: string };
  why_3?: { question: string; answer: string };
  why_4?: { question: string; answer: string };
  why_5?: { question: string; answer: string };
  root_cause_summary: string;
}

export interface EightDStep {
  step: EightDStepNum;
  label: EightDStepLabel;
  status: EightDStepStatus;
  owner_user_id?: string | null;
  owner_role_id?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  notes?: string | null;
  five_whys?: FiveWhys | null;
}

export type CapaActionType = 'corrective' | 'preventive';
export type CapaActionStatus = 'pending' | 'in_progress' | 'complete' | 'overdue';

export interface CapaAction {
  id: string;
  description: string;
  type: CapaActionType;
  owner_user_id?: string | null;
  owner_role_id?: string | null;
  due_date: string;
  completed_at?: string | null;
  completed_by?: string | null;
  status: CapaActionStatus;
}

export type VerificationMilestone = 30 | 60 | 90;

export interface CapaVerification {
  scheduled_at: string;
  milestone: VerificationMilestone;
  verified_at?: string | null;
  verified_by?: string | null;
  effective: boolean | null;
  evidence?: string | null;
}

export type CapaAuditAction =
  | 'raise' | 'investigate' | 'assign_actions' | 'schedule_verification'
  | 'verify' | 'close' | 'cancel' | 'update_step' | 'add_action' | 'update_action';

export interface CapaAuditEntry {
  at: string;
  by: string;
  action: CapaAuditAction;
  note?: string;
}

export interface CorrectiveAndPreventiveAction {
  id: CapaId;
  entity_id: string;
  branch_id?: string | null;
  source: CapaSource;
  severity: CapaSeverity;
  status: CapaStatus;
  title: string;
  description?: string | null;
  raised_at: string;
  raised_by: string;
  related_ncr_id?: NcrId | null;
  related_party_id?: Party['id'] | null;
  related_party_name?: string | null;
  eight_d_steps: EightDStep[];
  actions: CapaAction[];
  verifications: CapaVerification[];
  closed_at?: string | null;
  closed_by?: string | null;
  outcome?: CapaOutcome | null;
  audit_log: CapaAuditEntry[];
}

export const DEFAULT_8D_LABELS: Record<EightDStepNum, EightDStepLabel> = {
  1: 'establish_team',
  2: 'define_problem',
  3: 'contain',
  4: 'root_cause',
  5: 'corrective_action',
  6: 'verify_effectiveness',
  7: 'standardize_prevent',
  8: 'recognize_team',
};

export const capaKey = (entityCode: string): string => `erp_capa_${entityCode}`;

export const CAPA_STATUS_LABELS: Record<CapaStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  actions_assigned: 'Actions Assigned',
  verifying: 'Verifying',
  effective: 'Effective',
  ineffective: 'Ineffective',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const CAPA_SEVERITY_LABELS: Record<CapaSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export const CAPA_SOURCE_LABELS: Record<CapaSource, string> = {
  ncr: 'NCR',
  audit: 'Audit',
  customer_complaint: 'Customer Complaint',
  internal_review: 'Internal Review',
  preventive_only: 'Preventive Only',
};

export const CAPA_OUTCOME_LABELS: Record<CapaOutcome, string> = {
  effective: 'Effective',
  ineffective_re_open_ncr: 'Ineffective · Re-open NCR',
  cancelled: 'Cancelled',
};
