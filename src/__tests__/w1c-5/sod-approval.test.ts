/**
 * @file        sod-approval.test.ts
 * @sprint      W1C-5 · Block 2 · audit B-01 HIGH
 * @purpose     Attack-test: submitter cannot approve/reject own record.
 *              Tier-L 'current-user' seam passes; allowSelfApproval ctx flag passes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { submit, approve, reject, initialApprovalFields, type ApprovalContext, type ApprovalRecord } from '@/lib/approval-workflow-engine';

const CTX: ApprovalContext = {
  entityCode: 'W1C5SOD',
  auditEntityType: 'cycle_count',
  sourceModule: 'inventory',
};

function makeRec(): ApprovalRecord {
  return { id: `r-${Math.random().toString(36).slice(2, 8)}`, ...initialApprovalFields() };
}

describe('W1C-5 · Block 2 · SoD on approve()/reject() (attack-test)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('REJECTS approve when approver.id === submitter.id (real distinct user ids)', () => {
    const rec = makeRec();
    const sub = submit(rec, { id: 'usr_alice_42', name: 'Alice' }, CTX);
    expect(sub.ok).toBe(true);
    const res = approve(sub.next!, { id: 'usr_alice_42', name: 'Alice' }, CTX);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Separation of duties/);
  });

  it('ACCEPTS approve when approver differs from submitter', () => {
    const rec = makeRec();
    const sub = submit(rec, { id: 'usr_alice', name: 'Alice' }, CTX);
    const res = approve(sub.next!, { id: 'usr_bob', name: 'Bob' }, CTX);
    expect(res.ok).toBe(true);
  });

  it("ACCEPTS approve when both are the 'current-user' Tier-L seam", () => {
    const rec = makeRec();
    const sub = submit(rec, { id: 'current-user', name: 'Demo' }, CTX);
    const res = approve(sub.next!, { id: 'current-user', name: 'Demo' }, CTX);
    expect(res.ok).toBe(true);
  });

  it('ACCEPTS approve when ctx.allowSelfApproval === true (sole-proprietor opt-in)', () => {
    const rec = makeRec();
    const sub = submit(rec, { id: 'usr_solo', name: 'Solo' }, CTX);
    const res = approve(sub.next!, { id: 'usr_solo', name: 'Solo' }, { ...CTX, allowSelfApproval: true });
    expect(res.ok).toBe(true);
  });

  it('REJECTS reject() when rejecter.id === submitter.id (same rail)', () => {
    const rec = makeRec();
    const sub = submit(rec, { id: 'usr_alice', name: 'Alice' }, CTX);
    const res = reject(sub.next!, { id: 'usr_alice', name: 'Alice' }, 'no reason', CTX);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Separation of duties/);
  });
});
