/**
 * approval-workflow.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1 + M-4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  initialApprovalFields, submit, approve, reject, post, cancelApproval,
  type ApprovalContext,
} from '@/lib/approval-workflow-engine';
import { readAuditTrail } from '@/lib/audit-trail-engine';

const ctx: ApprovalContext = {
  entityCode: 'TST',
  auditEntityType: 'cycle_count',
  sourceModule: 'inventory',
};

describe('approval-workflow-engine · M-4', () => {
  beforeEach(() => localStorage.clear());

  it('AW1 · initialApprovalFields seeds all 10 lifecycle fields', () => {
    const f = initialApprovalFields();
    expect(f.status).toBe('draft');
    expect(f.submitted_at).toBeNull();
    expect(f.approved_at).toBeNull();
    expect(f.rejected_at).toBeNull();
    expect(f.posted_at).toBeNull();
    expect(f.cancelled_at).toBeNull();
  });
  it('AW2 · submit moves draft → submitted + writes audit entry', () => {
    const r = submit({ id: 'r1', status: 'draft' }, { id: 'u1', name: 'A' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.next?.status).toBe('submitted');
    expect(readAuditTrail('TST')).toHaveLength(1);
  });
  it('AW3 · submit rejects non-draft state', () => {
    const r = submit({ id: 'r1', status: 'submitted' }, { id: 'u1', name: 'A' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("'submitted'");
  });
  it('AW4 · approve writes approved_at + approver + audit', () => {
    const r = approve({ id: 'r1', status: 'submitted' }, { id: 'a1', name: 'Approver' }, ctx);
    expect(r.next?.status).toBe('approved');
    expect(r.next?.approver_id).toBe('a1');
    expect(readAuditTrail('TST')[0].action).toBe('approve');
  });
  it('AW5 · reject requires reason text', () => {
    const r = reject({ id: 'r1', status: 'submitted' }, { id: 'a1', name: 'A' }, '   ', ctx);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('required');
  });
  it('AW6 · reject moves submitted → rejected with reason', () => {
    const r = reject({ id: 'r1', status: 'submitted' }, { id: 'a1', name: 'A' }, 'wrong qty', ctx);
    expect(r.next?.status).toBe('rejected');
    expect(r.next?.rejection_reason).toBe('wrong qty');
  });
  it('AW7 · post requires approved status', () => {
    const r = post({ id: 'r1', status: 'submitted' }, ctx);
    expect(r.ok).toBe(false);
  });
  it('AW8 · post moves approved → posted + audit', () => {
    const r = post({ id: 'r1', status: 'approved' }, ctx);
    expect(r.next?.status).toBe('posted');
    expect(readAuditTrail('TST')[0].action).toBe('post');
  });
  it('AW9 · cancelApproval moves any → cancelled with reason', () => {
    const r = cancelApproval({ id: 'r1', status: 'posted' }, 'reversal', ctx);
    expect(r.next?.status).toBe('cancelled');
    expect(r.next?.cancellation_reason).toBe('reversal');
  });
  it('AW10 · cancelApproval rejects already-cancelled', () => {
    const r = cancelApproval({ id: 'r1', status: 'cancelled' }, 'x', ctx);
    expect(r.ok).toBe(false);
  });
  it('AW11 · custom field map redirects approved_at → approved_by_id', () => {
    const customCtx: ApprovalContext = {
      ...ctx, auditEntityType: 'time_entry', sourceModule: 'projx',
      fields: { approverId: 'approved_by_id', approverName: 'approved_by_name' },
    };
    const r = approve({ id: 'r1', status: 'submitted' }, { id: 'a1', name: 'Mgr' }, customCtx);
    expect(r.next?.approved_by_id).toBe('a1');
    expect(r.next?.approved_by_name).toBe('Mgr');
  });
  it('AW12 · audit before/after states differ correctly', () => {
    submit({ id: 'r1', status: 'draft' }, { id: 'u1', name: 'A' }, ctx);
    const log = readAuditTrail('TST')[0];
    expect((log.before_state as { status: string }).status).toBe('draft');
    expect((log.after_state as { status: string }).status).toBe('submitted');
  });
});
