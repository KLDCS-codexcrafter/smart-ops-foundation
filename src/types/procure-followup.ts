/**
 * procure-followup.ts — Procurement follow-up types
 * Sprint T-Phase-1.2.6f-a · per D-258
 * [JWT] POST /api/procure360/rfqs/:id/followups
 */

export type FollowupChannel = 'call' | 'email' | 'whatsapp' | 'visit' | 'sms' | 'portal';

export type FollowupOutcome =
  | 'committed' | 'partial_response' | 'no_response'
  | 'declined' | 'reschedule' | 'escalated' | 'closed';

export type FollowupDepartmentRole = 'originating' | 'purchase' | 'store' | 'other';

export interface RFQFollowUp {
  id: string;
  rfq_id: string;
  entity_id: string;
  by_user_id: string;
  by_user_name: string;
  by_department_id: string;
  by_department_role: FollowupDepartmentRole;
  channel: FollowupChannel;
  outcome: FollowupOutcome;
  notes: string;
  followed_up_at: string;
  next_action_due: string | null;
  attachment_refs: string[];
  is_ping_to_other_dept: boolean;
  ping_target_role: FollowupDepartmentRole | null;
  created_at: string;
}

export const FOLLOWUP_CHANNEL_LABELS: Record<FollowupChannel, string> = {
  call: 'Phone Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  visit: 'Site Visit',
  sms: 'SMS',
  portal: 'Portal Message',
};

export const FOLLOWUP_OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  committed: 'Committed',
  partial_response: 'Partial Response',
  no_response: 'No Response',
  declined: 'Declined',
  reschedule: 'Reschedule Requested',
  escalated: 'Escalated',
  closed: 'Closed',
};
