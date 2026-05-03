/**
 * procure-followup-engine.ts — RFQ follow-up workflow
 * Sprint T-Phase-1.2.6f-a · per D-258
 * [JWT] POST /api/procure360/rfqs/:id/followups
 */
import type { RFQFollowUp, FollowupDepartmentRole } from '@/types/procure-followup';
import { getRfq, listRfqs, updateRfq } from './rfq-engine';
import { publishProcurementPulse } from './procurement-pulse-stub';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface LogFollowupInput {
  rfq_id: string;
  entity_id: string;
  by_user_id: string;
  by_user_name: string;
  by_department_id: string;
  by_department_role: FollowupDepartmentRole;
  channel: RFQFollowUp['channel'];
  outcome: RFQFollowUp['outcome'];
  notes: string;
  next_action_due: string | null;
  is_ping_to_other_dept?: boolean;
  ping_target_role?: FollowupDepartmentRole | null;
}

export function logRfqFollowup(input: LogFollowupInput, entityCode: string): RFQFollowUp | null {
  const rfq = getRfq(input.rfq_id, entityCode);
  if (!rfq) return null;
  const now = new Date().toISOString();
  const followup: RFQFollowUp = {
    id: newId('fu'),
    rfq_id: input.rfq_id,
    entity_id: input.entity_id,
    by_user_id: input.by_user_id,
    by_user_name: input.by_user_name,
    by_department_id: input.by_department_id,
    by_department_role: input.by_department_role,
    channel: input.channel,
    outcome: input.outcome,
    notes: input.notes,
    followed_up_at: now,
    next_action_due: input.next_action_due,
    attachment_refs: [],
    is_ping_to_other_dept: input.is_ping_to_other_dept ?? false,
    ping_target_role: input.ping_target_role ?? null,
    created_at: now,
  };
  const followUps = [...rfq.follow_ups, followup];
  const counts = {
    followup_count_originating: followUps.filter((f) => f.by_department_role === 'originating').length,
    followup_count_purchase: followUps.filter((f) => f.by_department_role === 'purchase').length,
  };
  updateRfq(
    input.rfq_id,
    {
      follow_ups: followUps,
      ...counts,
      last_followup_at: now,
      next_followup_due: input.next_action_due,
      is_overdue_followup: false,
    },
    entityCode,
  );
  return followup;
}

export function getRfqFollowups(
  rfqId: string,
  entityCode: string,
  deptFilter?: FollowupDepartmentRole,
): RFQFollowUp[] {
  const rfq = getRfq(rfqId, entityCode);
  if (!rfq) return [];
  return deptFilter
    ? rfq.follow_ups.filter((f) => f.by_department_role === deptFilter)
    : rfq.follow_ups;
}

export function getOverdueRfqFollowups(entityCode: string): { rfq_id: string; days_overdue: number }[] {
  const today = Date.now();
  const overdue = listRfqs(entityCode)
    .filter((r) => r.next_followup_due && new Date(r.next_followup_due).getTime() < today)
    .map((r) => ({
      rfq_id: r.id,
      rfq_no: r.rfq_no,
      days_overdue: Math.floor(
        (today - new Date(r.next_followup_due ?? r.created_at).getTime()) / 86400000,
      ),
    }));
  // FIX-3 · D-248 procurement-pulse emit · critical for overdue follow-ups
  for (const o of overdue) {
    publishProcurementPulse({
      severity: 'critical',
      message: `RFQ ${o.rfq_no} follow-up overdue ${o.days_overdue} days`,
    });
  }
  return overdue.map((o) => ({ rfq_id: o.rfq_id, days_overdue: o.days_overdue }));
}

export function computeNextFollowupDue(rfq: { sent_at: string | null; opened_at: string | null; responded_at: string | null }): string {
  const base = rfq.responded_at ? 72 : rfq.opened_at ? 48 : 24;
  return new Date(Date.now() + base * 3600000).toISOString();
}

export function pingOtherDepartment(
  rfqId: string,
  targetRole: FollowupDepartmentRole,
  byUser: { id: string; name: string; deptId: string; deptRole: FollowupDepartmentRole },
  entityCode: string,
): RFQFollowUp | null {
  return logRfqFollowup(
    {
      rfq_id: rfqId,
      entity_id: entityCode,
      by_user_id: byUser.id,
      by_user_name: byUser.name,
      by_department_id: byUser.deptId,
      by_department_role: byUser.deptRole,
      channel: 'portal',
      outcome: 'escalated',
      notes: `Ping to ${targetRole} department`,
      next_action_due: null,
      is_ping_to_other_dept: true,
      ping_target_role: targetRole,
    },
    entityCode,
  );
}
