/**
 * dispute-workflow-engine.ts — Dispute state machine + escalation rules
 * Pure. State transitions are validated here.
 */

import type {
  Dispute, DisputeStatus, DisputeEvent, TenantToleranceDefault,
  MatchLine,
} from '@/types/freight-reconciliation';

const VALID_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  raised: ['under_review', 'withdrawn'],
  under_review: ['response_received', 'escalated', 'withdrawn'],
  response_received: [
    'resolved_in_favor_of_us',
    'resolved_in_favor_of_transporter',
    'resolved_split',
    'escalated',
  ],
  resolved_in_favor_of_us: [],
  resolved_in_favor_of_transporter: [],
  resolved_split: [],
  escalated: [
    'resolved_in_favor_of_us',
    'resolved_in_favor_of_transporter',
    'resolved_split',
    'withdrawn',
  ],
  withdrawn: [],
};

export function canTransition(from: DisputeStatus, to: DisputeStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function validNextStatuses(from: DisputeStatus): DisputeStatus[] {
  return VALID_TRANSITIONS[from];
}

export interface TransitionInput {
  dispute: Dispute;
  to: DisputeStatus;
  by: string;
  notes?: string;
  response_text?: string;
  response_from?: string;
  resolution_amount?: number;
  resolution_notes?: string;
}

export function applyTransition(
  input: TransitionInput,
): { ok: true; dispute: Dispute } | { ok: false; reason: string } {
  if (!canTransition(input.dispute.status, input.to)) {
    return {
      ok: false,
      reason: `Cannot transition from ${input.dispute.status} to ${input.to}`,
    };
  }

  const now = new Date().toISOString();
  const event: DisputeEvent = {
    at: now, by: input.by,
    action: input.to === 'under_review' ? 'notified' :
      input.to === 'response_received' ? 'response' :
      input.to === 'escalated' ? 'escalated' :
      input.to === 'withdrawn' ? 'withdrawn' :
      'resolved',
    notes: input.notes,
  };

  const isResolved = input.to === 'resolved_in_favor_of_us' ||
    input.to === 'resolved_in_favor_of_transporter' ||
    input.to === 'resolved_split';

  const updated: Dispute = {
    ...input.dispute,
    status: input.to,
    response_text: input.response_text ?? input.dispute.response_text,
    response_at: input.response_text ? now : input.dispute.response_at,
    response_from: input.response_from ?? input.dispute.response_from,
    resolved_at: isResolved ? now : input.dispute.resolved_at,
    resolved_by: isResolved ? input.by : input.dispute.resolved_by,
    resolution_amount: input.resolution_amount ?? input.dispute.resolution_amount,
    resolution_notes: input.resolution_notes ?? input.dispute.resolution_notes,
    history: [...input.dispute.history, event],
    updated_at: now,
  };
  return { ok: true, dispute: updated };
}

/** Escalation check — should this variance auto-raise a dispute? */
export function shouldEscalate(
  match: MatchLine, tolerance: TenantToleranceDefault,
): boolean {
  if (match.status !== 'over_billed' && match.status !== 'ghost_lr') return false;
  const absVarRs = Math.abs(match.variance_amount);
  const absVarPct = Math.abs(match.variance_pct);
  return absVarPct > tolerance.escalation_variance_pct &&
    absVarRs * 100 > tolerance.escalation_amount_paise;
}

/** Create a new dispute from a match line. */
export function createDisputeFromMatch(
  match: MatchLine, logisticId: string, logisticName: string,
  raisedBy: string, reason?: string,
): Dispute {
  const now = new Date().toISOString();
  return {
    id: `dsp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: match.entity_id,
    invoice_id: match.invoice_id,
    match_line_id: match.id,
    lr_no: match.lr_no,
    logistic_id: logisticId,
    logistic_name: logisticName,
    dispute_reason: reason ?? autoDisputeReason(match),
    amount_in_dispute: Math.abs(match.variance_amount),
    variance_amount: match.variance_amount,
    variance_pct: match.variance_pct,
    status: 'raised',
    raised_at: now,
    raised_by: raisedBy,
    history: [{ at: now, by: raisedBy, action: 'raised', notes: reason }],
    created_at: now,
    updated_at: now,
  };
}

function autoDisputeReason(m: MatchLine): string {
  if (m.status === 'ghost_lr') return `Ghost LR: ${m.lr_no} not found in our dispatch records`;
  if (m.status === 'over_billed') {
    return `Over-billed by ₹${m.variance_amount.toFixed(2)} (${m.variance_pct.toFixed(1)}%) — expected ₹${m.expected_amount.toFixed(2)}, declared ₹${m.declared_amount.toFixed(2)}`;
  }
  if (m.status === 'under_billed') return `Under-billed — usually transporter's loss, verify intent`;
  return `Variance detected: ${m.status}`;
}
