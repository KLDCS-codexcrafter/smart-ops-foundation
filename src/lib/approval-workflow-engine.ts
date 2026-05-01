/**
 * approval-workflow-engine.ts — Generalized 6-state approval workflow.
 *
 * Sprint T-Phase-1.2.5h-c1 · Card #2.5 sub-sprint 4 of 5 · M-4 closure.
 *
 * Replaces three near-identical implementations (cycle counts, time entries,
 * expense claims) with a single state machine. Wires audit-trail automatically
 * (MCA Rule 3(1)) so callers never forget to log transitions.
 *
 * State machine:
 *
 *   draft ──submit──▶ submitted ──approve──▶ approved ──post──▶ posted
 *                       │                       │
 *                       └──reject──▶ rejected   └──cancel──▶ cancelled
 *
 * D-128 sibling-discipline: callers retain their existing field names
 * (e.g. cycle_count uses submitted_at/approved_at; time_entries uses
 * approved_by_id/approved_by_name). The engine takes a `fields` map so
 * each caller stamps its own field names. No legacy field is ever renamed.
 *
 * D-194 Phase 1/2 boundary: pure function — caller persists.
 */

import { logAudit } from '@/lib/audit-trail-engine';
import type { AuditEntityType } from '@/types/audit-trail';

export type ApprovalStatus =
  | 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted' | 'cancelled';

export interface ApprovalActor {
  id: string;
  name: string;
}

export interface ApprovalContext {
  entityCode: string;
  /** Audit trail entity type — e.g. 'cycle_count', 'time_entry' */
  auditEntityType: AuditEntityType;
  /** Module label for audit log (e.g. 'inventory', 'projx', 'pay-hub') */
  sourceModule: string;
  /** Field names (snake_case) for stamping timestamps + actors. Defaults are
   * provided but callers should pass their existing names to preserve D-128. */
  fields?: Partial<ApprovalFieldMap>;
  /** Human-readable label for audit log (defaults to record id) */
  recordLabel?: (record: ApprovalRecord) => string;
}

export interface ApprovalFieldMap {
  status: string;            // default 'status'
  submittedAt: string;       // default 'submitted_at'
  approvedAt: string;        // default 'approved_at'
  rejectedAt: string;        // default 'rejected_at'
  postedAt: string;          // default 'posted_at'
  cancelledAt: string;       // default 'cancelled_at'
  approverId: string;        // default 'approver_id'
  approverName: string;      // default 'approver_name'
  rejectionReason: string;   // default 'rejection_reason'
  cancellationReason: string; // default 'cancellation_reason'
  counterId: string;         // default 'counter_id'   (submitter)
  counterName: string;       // default 'counter_name'
  updatedAt: string;         // default 'updated_at'
}

const DEFAULT_FIELDS: ApprovalFieldMap = {
  status: 'status',
  submittedAt: 'submitted_at',
  approvedAt: 'approved_at',
  rejectedAt: 'rejected_at',
  postedAt: 'posted_at',
  cancelledAt: 'cancelled_at',
  approverId: 'approver_id',
  approverName: 'approver_name',
  rejectionReason: 'rejection_reason',
  cancellationReason: 'cancellation_reason',
  counterId: 'counter_id',
  counterName: 'counter_name',
  updatedAt: 'updated_at',
};

/** Minimal shape — engine writes via `Record<string, unknown>` index access. */
export type ApprovalRecord = Record<string, unknown> & { id: string };

export interface ApprovalResult<T extends ApprovalRecord> {
  ok: boolean;
  reason?: string;
  next?: T;
}

function resolveFields(ctx: ApprovalContext): ApprovalFieldMap {
  return { ...DEFAULT_FIELDS, ...(ctx.fields ?? {}) };
}

function stamp<T extends ApprovalRecord>(
  rec: T,
  patch: Record<string, unknown>,
  fields: ApprovalFieldMap,
): T {
  return { ...rec, ...patch, [fields.updatedAt]: new Date().toISOString() } as T;
}

function audit<T extends ApprovalRecord>(
  ctx: ApprovalContext,
  action: 'create' | 'update' | 'approve' | 'reject' | 'post' | 'cancel',
  before: T | null,
  after: T,
  reason: string | null = null,
) {
  logAudit({
    entityCode: ctx.entityCode || 'GLOBAL',
    action,
    entityType: ctx.auditEntityType,
    recordId: after.id,
    recordLabel: ctx.recordLabel?.(after) ?? after.id,
    beforeState: before ? { ...before } : null,
    afterState: { ...after },
    reason,
    sourceModule: ctx.sourceModule,
  });
}

/** Initial approval state for a freshly created record. */
export function initialApprovalFields(fields?: Partial<ApprovalFieldMap>): Record<string, unknown> {
  const f = { ...DEFAULT_FIELDS, ...(fields ?? {}) };
  return {
    [f.status]: 'draft' as ApprovalStatus,
    [f.submittedAt]: null,
    [f.approvedAt]: null,
    [f.rejectedAt]: null,
    [f.postedAt]: null,
    [f.cancelledAt]: null,
    [f.approverId]: null,
    [f.approverName]: null,
    [f.rejectionReason]: null,
    [f.cancellationReason]: null,
  };
}

/** draft → submitted */
export function submit<T extends ApprovalRecord>(
  rec: T,
  submitter: ApprovalActor,
  ctx: ApprovalContext,
): ApprovalResult<T> {
  const f = resolveFields(ctx);
  const status = rec[f.status] as ApprovalStatus | undefined;
  if (status !== 'draft') {
    return { ok: false, reason: `Cannot submit · current status is '${status ?? 'unknown'}'` };
  }
  const now = new Date().toISOString();
  const next = stamp(rec, {
    [f.status]: 'submitted',
    [f.submittedAt]: now,
    [f.counterId]: submitter.id,
    [f.counterName]: submitter.name,
  }, f);
  audit(ctx, 'update', rec, next);
  return { ok: true, next };
}

/** submitted → approved */
export function approve<T extends ApprovalRecord>(
  rec: T,
  approver: ApprovalActor,
  ctx: ApprovalContext,
): ApprovalResult<T> {
  const f = resolveFields(ctx);
  const status = rec[f.status] as ApprovalStatus | undefined;
  if (status !== 'submitted') {
    return { ok: false, reason: `Cannot approve · current status is '${status ?? 'unknown'}'` };
  }
  const now = new Date().toISOString();
  const next = stamp(rec, {
    [f.status]: 'approved',
    [f.approvedAt]: now,
    [f.approverId]: approver.id,
    [f.approverName]: approver.name,
  }, f);
  audit(ctx, 'approve', rec, next);
  return { ok: true, next };
}

/** submitted → rejected */
export function reject<T extends ApprovalRecord>(
  rec: T,
  approver: ApprovalActor,
  reason: string,
  ctx: ApprovalContext,
): ApprovalResult<T> {
  const f = resolveFields(ctx);
  const status = rec[f.status] as ApprovalStatus | undefined;
  if (status !== 'submitted') {
    return { ok: false, reason: `Cannot reject · current status is '${status ?? 'unknown'}'` };
  }
  if (!reason.trim()) {
    return { ok: false, reason: 'Rejection reason required' };
  }
  const now = new Date().toISOString();
  const next = stamp(rec, {
    [f.status]: 'rejected',
    [f.rejectedAt]: now,
    [f.approverId]: approver.id,
    [f.approverName]: approver.name,
    [f.rejectionReason]: reason,
  }, f);
  audit(ctx, 'reject', rec, next, reason);
  return { ok: true, next };
}

/** approved → posted */
export function post<T extends ApprovalRecord>(
  rec: T,
  ctx: ApprovalContext,
): ApprovalResult<T> {
  const f = resolveFields(ctx);
  const status = rec[f.status] as ApprovalStatus | undefined;
  if (status !== 'approved') {
    return { ok: false, reason: `Cannot post · current status is '${status ?? 'unknown'}'` };
  }
  const now = new Date().toISOString();
  const next = stamp(rec, {
    [f.status]: 'posted',
    [f.postedAt]: now,
  }, f);
  audit(ctx, 'post', rec, next);
  return { ok: true, next };
}

/** any non-terminal → cancelled (used when admin retracts an approval/post). */
export function cancelApproval<T extends ApprovalRecord>(
  rec: T,
  reason: string,
  ctx: ApprovalContext,
): ApprovalResult<T> {
  const f = resolveFields(ctx);
  const status = rec[f.status] as ApprovalStatus | undefined;
  if (status === 'cancelled') {
    return { ok: false, reason: 'Already cancelled' };
  }
  if (!reason.trim()) {
    return { ok: false, reason: 'Cancellation reason required' };
  }
  const now = new Date().toISOString();
  const next = stamp(rec, {
    [f.status]: 'cancelled',
    [f.cancelledAt]: now,
    [f.cancellationReason]: reason,
  }, f);
  audit(ctx, 'cancel', rec, next, reason);
  return { ok: true, next };
}
