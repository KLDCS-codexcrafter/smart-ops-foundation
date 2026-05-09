/**
 * @file src/test/store-hub-approval-workflow.test.ts
 * @purpose Q-LOCK-4b revised coverage · stock-issue approval workflow integration
 * @sprint T-Phase-1.A.6.α-a-Department-Stores-Foundation · Block D test
 * @decisions Q-LOCK-4b revised · approval-workflow-engine consumption · D-NEW-BJ adapt #8
 * @disciplines FR-19 (sibling extension) · FR-21 · FR-30
 * @reuses approval-workflow-engine · stock-issue-engine
 * @[JWT] writes to audit-trail via approval-workflow-engine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitStockIssueForApproval, approveStockIssue, rejectStockIssue,
  createStockIssue, listStockIssues,
} from '@/lib/stock-issue-engine';

const E = 'TEST';

async function seed() {
  const si = await createStockIssue({
    entity_id: E,
    department_name: 'Production',
    recipient_name: 'Operator',
    purpose: 'unit-test',
    lines: [{
      item_id: 'i1', item_code: 'I1', item_name: 'Bolt', uom: 'NOS',
      qty: 5, rate: 10, source_godown_id: 'gd-stores', source_godown_name: 'Main Stores',
    }],
  }, E, 'u-test');
  return si;
}

describe('Stock issue approval workflow · Q-LOCK-4b (α-a Block D)', () => {
  beforeEach(() => localStorage.clear());

  it('submitStockIssueForApproval moves draft → submitted', async () => {
    const si = await seed();
    const r = submitStockIssueForApproval(E, 'u1', 'User One', si.id);
    expect(r.ok).toBe(true);
    const after = listStockIssues(E).find(s => s.id === si.id) as unknown as Record<string, unknown>;
    expect(after.status).toBe('submitted');
  });

  it('approveStockIssue moves submitted → approved', async () => {
    const si = await seed();
    submitStockIssueForApproval(E, 'u1', 'User One', si.id);
    const r = approveStockIssue(E, 'u2', 'Approver', si.id);
    expect(r.ok).toBe(true);
    const after = listStockIssues(E).find(s => s.id === si.id) as unknown as Record<string, unknown>;
    expect(after.status).toBe('approved');
  });

  it('rejectStockIssue moves submitted → rejected with reason', async () => {
    const si = await seed();
    submitStockIssueForApproval(E, 'u1', 'User One', si.id);
    const r = rejectStockIssue(E, 'u2', 'Approver', si.id, 'incomplete details');
    expect(r.ok).toBe(true);
    const after = listStockIssues(E).find(s => s.id === si.id) as unknown as Record<string, unknown>;
    expect(after.status).toBe('rejected');
    expect(after.rejection_reason).toBe('incomplete details');
  });
});
