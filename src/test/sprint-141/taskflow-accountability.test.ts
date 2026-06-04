/**
 * @file        src/test/sprint-141/taskflow-accountability.test.ts
 * @purpose     Accountability Payoff behavioral suite (≥30 it · LEAN posture).
 * @sprint      Sprint 141 · T-TaskFlow-A641.5
 *
 * Posture: toBeGreaterThanOrEqual · time-robust · no existsSync tombstones.
 * Scope-wall asserts NO leaderboard/ranking exports.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeExpenseTax, createExpense, listExpensesForTask, getTaskExpenseTotals,
  submitExpense, approveExpense, rejectExpense, markReimbursed,
  createEvidence, listEvidenceForTask, getEvidenceCount, EVIDENCE_MAX_BYTES,
  upsertClosePolicy, listClosePolicies, getActiveClosePolicy, evaluateClosePolicy,
  computeAccountabilityMetrics, exportMyTrail,
  generateWorkDiary, generateTeamDiary,
  listIndiaGstRates, listTdsSections,
  tfExpensesKey, tfEvidenceKey, tfClosePoliciesKey,
} from '@/lib/taskflow-accountability-engine';
import * as engine from '@/lib/taskflow-accountability-engine';
import {
  createTask, changeStatus, acknowledgeTask, reassignTask,
} from '@/lib/taskflow-engine';
import type { Task } from '@/types/taskflow';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENTITY = 'TEST-S141';
const U_A = 'u-alice';
const U_B = 'u-bob';

beforeEach(() => { localStorage.clear(); });

function mkTask(overrides: Partial<Parameters<typeof createTask>[1]> = {}): Task {
  return createTask(ENTITY, {
    title: 'Test task', priority: 'medium', category: 'compliance',
    assigneeId: U_A, assigneeName: 'Alice', creatorId: U_A,
    departmentId: 'D1', dueDate: null, entityId: ENTITY,
    ...overrides,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Storage keys (§O · entity-scoped)
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · storage keys', () => {
  it('expenses key is entity-scoped', () => {
    expect(tfExpensesKey(ENTITY)).toBe(`tf_expenses_${ENTITY}`);
  });
  it('evidence key is entity-scoped', () => {
    expect(tfEvidenceKey(ENTITY)).toBe(`tf_evidence_${ENTITY}`);
  });
  it('close-policies key is entity-scoped', () => {
    expect(tfClosePoliciesKey(ENTITY)).toBe(`tf_close_policies_${ENTITY}`);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// FR-44 · GST + TDS seed accessors (NEVER hardcode parallel table)
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · FR-44 GST/TDS seed pass-through', () => {
  it('listIndiaGstRates returns active IN GST rates from seed', () => {
    const rates = listIndiaGstRates();
    expect(rates.length).toBeGreaterThanOrEqual(1);
    expect(rates.every((r) => typeof r.rate === 'number')).toBe(true);
  });
  it('listTdsSections returns active sections from seed', () => {
    const sec = listTdsSections();
    expect(sec.length).toBeGreaterThanOrEqual(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-18 · Expense tax math
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-18 computeExpenseTax', () => {
  const gst = listIndiaGstRates();
  const r18 = gst.find((g) => g.rate === 18)?.rate ?? gst[0].rate;

  it('rejects negative amounts', () => {
    expect(() => computeExpenseTax({ amount: -1, gstRate: r18, isInterState: false }))
      .toThrow(/negative/);
  });
  it('rejects gstRate not in seed', () => {
    expect(() => computeExpenseTax({ amount: 100, gstRate: 13.37, isInterState: false }))
      .toThrow(/invalid gstRate/);
  });
  it('splits CGST+SGST = taxAmount when intra-state', () => {
    const t = computeExpenseTax({ amount: 1000, gstRate: r18, isInterState: false });
    expect(t.igst).toBe(0);
    expect(Math.abs((t.cgst + t.sgst) - t.taxAmount)).toBeLessThanOrEqual(0.01);
  });
  it('uses IGST when inter-state', () => {
    const t = computeExpenseTax({ amount: 1000, gstRate: r18, isInterState: true });
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(t.igst).toBe(t.taxAmount);
  });
  it('applies TDS deduction when section provided', () => {
    const sec = listTdsSections()[0];
    const t = computeExpenseTax({
      amount: 10_000, gstRate: r18, isInterState: false,
      tdsSection: sec.code, tdsRate: 10,
    });
    expect(t.tdsAmount).toBeGreaterThan(0);
    expect(t.netPayable).toBe(Number((t.taxableValue + t.taxAmount - t.tdsAmount).toFixed(2)));
  });
  it('rejects invalid TDS section', () => {
    expect(() => computeExpenseTax({
      amount: 100, gstRate: r18, isInterState: false, tdsSection: 'NOPE', tdsRate: 10,
    })).toThrow(/invalid tdsSection/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-18 · Expense lifecycle
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-18 expense lifecycle', () => {
  it('createExpense persists with draft status', () => {
    const task = mkTask();
    const e = createExpense(ENTITY, {
      taskId: task.id, amount: 500, category: 'travel',
      description: 'Cab', isReimbursable: true, submittedBy: U_A,
    });
    expect(e.status).toBe('draft');
    expect(listExpensesForTask(ENTITY, task.id)).toHaveLength(1);
  });
  it('submit → approve → reimburse path is legal', () => {
    const task = mkTask();
    const e = createExpense(ENTITY, {
      taskId: task.id, amount: 200, category: 'supplies',
      description: 'Stationery', isReimbursable: true, submittedBy: U_A,
    });
    submitExpense(ENTITY, e.id);
    approveExpense(ENTITY, e.id, U_B, 'ok');
    const r = markReimbursed(ENTITY, e.id, 'NEFT-1');
    expect(r.status).toBe('reimbursed');
  });
  it('cannot approve a draft expense', () => {
    const task = mkTask();
    const e = createExpense(ENTITY, {
      taskId: task.id, amount: 200, category: 'supplies',
      description: 'x', isReimbursable: true, submittedBy: U_A,
    });
    expect(() => approveExpense(ENTITY, e.id, U_B)).toThrow(/cannot approve/);
  });
  it('rejectExpense terminates the chain', () => {
    const task = mkTask();
    const e = createExpense(ENTITY, {
      taskId: task.id, amount: 200, category: 'other',
      description: 'x', isReimbursable: false, submittedBy: U_A,
    });
    submitExpense(ENTITY, e.id);
    const r = rejectExpense(ENTITY, e.id, U_B, 'duplicate');
    expect(r.status).toBe('rejected');
  });
  it('getTaskExpenseTotals aggregates correctly', () => {
    const task = mkTask();
    createExpense(ENTITY, {
      taskId: task.id, amount: 100, category: 'travel',
      description: 'a', isReimbursable: true, submittedBy: U_A,
    });
    createExpense(ENTITY, {
      taskId: task.id, amount: 200, category: 'travel',
      description: 'b', isReimbursable: true, submittedBy: U_A,
    });
    const t = getTaskExpenseTotals(ENTITY, task.id);
    expect(t.count).toBe(2);
    expect(t.amount).toBeCloseTo(300, 2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-19 · Evidence
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-19 evidence', () => {
  it('createEvidence persists and counts', () => {
    const task = mkTask();
    createEvidence(ENTITY, {
      taskId: task.id, type: 'proof',
      fileUrl: 'data:text/plain;base64,SGVsbG8=', fileName: 'a.txt',
      fileType: 'text/plain', uploadedBy: U_A, location: null,
    });
    expect(getEvidenceCount(ENTITY, task.id)).toBe(1);
    expect(listEvidenceForTask(ENTITY, task.id)).toHaveLength(1);
  });
  it('rejects payloads exceeding 1MB cap', () => {
    const task = mkTask();
    const huge = 'A'.repeat(Math.ceil(EVIDENCE_MAX_BYTES * 4 / 3) + 1024);
    expect(() => createEvidence(ENTITY, {
      taskId: task.id, type: 'field',
      fileUrl: `data:application/octet-stream;base64,${huge}`,
      fileName: 'big.bin', fileType: 'application/octet-stream',
      uploadedBy: U_A, location: null,
    })).toThrow(/1MB/);
  });
  it('null location is tolerated (geolocation denial path)', () => {
    const task = mkTask();
    const ev = createEvidence(ENTITY, {
      taskId: task.id, type: 'after',
      fileUrl: 'data:text/plain;base64,SGk=', fileName: 'x.txt',
      fileType: 'text/plain', uploadedBy: U_A, location: null,
    });
    expect(ev.location).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-29d · Close policies + resolver wired into changeStatus
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-29d close-policy enforcement', () => {
  it('upsert + getActiveClosePolicy round-trip', () => {
    upsertClosePolicy(ENTITY, {
      entityId: ENTITY, category: 'compliance',
      requireEvidence: true, minEvidenceCount: 2, isActive: true,
    });
    const p = getActiveClosePolicy(ENTITY, 'compliance');
    expect(p?.minEvidenceCount).toBe(2);
    expect(listClosePolicies(ENTITY).length).toBeGreaterThanOrEqual(1);
  });
  it('evaluateClosePolicy blocks with shortfall message', () => {
    upsertClosePolicy(ENTITY, {
      entityId: ENTITY, category: 'compliance',
      requireEvidence: true, minEvidenceCount: 2, isActive: true,
    });
    const task = mkTask({ category: 'compliance' });
    const v = evaluateClosePolicy(ENTITY, task);
    expect(v.allowed).toBe(false);
    expect(v.message).toMatch(/evidence-mandatory: need 2, have 0/);
  });
  it('evaluateClosePolicy allows when threshold met', () => {
    upsertClosePolicy(ENTITY, {
      entityId: ENTITY, category: 'compliance',
      requireEvidence: true, minEvidenceCount: 1, isActive: true,
    });
    const task = mkTask({ category: 'compliance' });
    createEvidence(ENTITY, {
      taskId: task.id, type: 'proof',
      fileUrl: 'data:text/plain;base64,SGk=',
      fileName: 'p.txt', fileType: 'text/plain', uploadedBy: U_A, location: null,
    });
    expect(evaluateClosePolicy(ENTITY, task).allowed).toBe(true);
  });
  it('changeStatus → completed blocks when evidence missing (resolver wired)', () => {
    upsertClosePolicy(ENTITY, {
      entityId: ENTITY, category: 'compliance',
      requireEvidence: true, minEvidenceCount: 1, isActive: true,
    });
    const task = mkTask({ category: 'compliance' });
    changeStatus(ENTITY, task.id, 'in_progress');
    changeStatus(ENTITY, task.id, 'in_review');
    expect(() => changeStatus(ENTITY, task.id, 'completed'))
      .toThrow(/evidence-mandatory/);
  });
  it('changeStatus → completed allowed once evidence captured', () => {
    upsertClosePolicy(ENTITY, {
      entityId: ENTITY, category: 'compliance',
      requireEvidence: true, minEvidenceCount: 1, isActive: true,
    });
    const task = mkTask({ category: 'compliance' });
    createEvidence(ENTITY, {
      taskId: task.id, type: 'proof',
      fileUrl: 'data:text/plain;base64,SGk=',
      fileName: 'p.txt', fileType: 'text/plain', uploadedBy: U_A, location: null,
    });
    changeStatus(ENTITY, task.id, 'in_progress');
    changeStatus(ENTITY, task.id, 'in_review');
    const r = changeStatus(ENTITY, task.id, 'completed');
    expect(r.status).toBe('completed');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-29e · Accountability metrics
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-29e accountability metrics', () => {
  it('returns people + rollups structure', () => {
    mkTask();
    mkTask({ assigneeId: U_B, assigneeName: 'Bob' });
    const b = computeAccountabilityMetrics(ENTITY);
    expect(b.people.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(b.rollups)).toBe(true);
  });
  it('counts overdue against injected `now`', () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    mkTask({ dueDate: past });
    const future = new Date(Date.now() + 86400_000).toISOString();
    const b = computeAccountabilityMetrics(ENTITY, { now: future });
    const me = b.people.find((p) => p.userId === U_A);
    expect(me?.overdueTasks).toBeGreaterThanOrEqual(1);
  });
  it('counts unacknowledged tasks', () => {
    mkTask();
    const b = computeAccountabilityMetrics(ENTITY);
    const me = b.people.find((p) => p.userId === U_A);
    expect(me?.unacknowledgedCount).toBeGreaterThanOrEqual(1);
  });
  it('tracks acknowledgement and clears unacknowledged', () => {
    const t = mkTask();
    acknowledgeTask(ENTITY, t.id, U_A);
    const b = computeAccountabilityMetrics(ENTITY);
    const me = b.people.find((p) => p.userId === U_A);
    expect(me?.unacknowledgedCount).toBe(0);
  });
  it('counts reassignmentsAway against the actor (byUserId)', () => {
    const t = mkTask();
    reassignTask(ENTITY, t.id, U_B, 'load balance', U_A, 'Bob');
    const b = computeAccountabilityMetrics(ENTITY);
    const a = b.people.find((p) => p.userId === U_A);
    expect(a?.reassignmentsAway).toBeGreaterThanOrEqual(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-29f · Symmetric self-trail export
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-29f exportMyTrail', () => {
  it('returns a self-contained bundle for the requesting user', () => {
    const t = mkTask();
    acknowledgeTask(ENTITY, t.id, U_A);
    const bundle = exportMyTrail(ENTITY, U_A);
    expect(bundle.userId).toBe(U_A);
    expect(bundle.tasks.find((x) => x.id === t.id)).toBeTruthy();
    expect(bundle.acknowledgments.length).toBeGreaterThanOrEqual(1);
  });
  it('excludes tasks unrelated to the user', () => {
    mkTask({ assigneeId: U_B, assigneeName: 'Bob', creatorId: U_B });
    const bundle = exportMyTrail(ENTITY, U_A);
    expect(bundle.tasks.length).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TF-31 · Daily work diary
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · TF-31 work diary', () => {
  it('records same-day creations under creator', () => {
    const t = mkTask();
    const today = new Date().toISOString().slice(0, 10);
    const d = generateWorkDiary(ENTITY, U_A, today);
    expect(d.created.find((x) => x.taskId === t.id)).toBeTruthy();
  });
  it('records acknowledgements on the diary day', () => {
    const t = mkTask();
    acknowledgeTask(ENTITY, t.id, U_A);
    const today = new Date().toISOString().slice(0, 10);
    const d = generateWorkDiary(ENTITY, U_A, today);
    expect(d.acknowledged.find((x) => x.taskId === t.id)).toBeTruthy();
  });
  it('generateTeamDiary fans out across active users', () => {
    mkTask();
    mkTask({ assigneeId: U_B, assigneeName: 'Bob', creatorId: U_B });
    const today = new Date().toISOString().slice(0, 10);
    const all = generateTeamDiary(ENTITY, today);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Scope wall · NO leaderboards / ranking (founder canon)
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · scope wall · don\'t-build canon', () => {
  it('engine does NOT export leaderboard surface', () => {
    expect((engine as unknown as Record<string, unknown>).leaderboard).toBeUndefined();
    expect((engine as unknown as Record<string, unknown>).getLeaderboard).toBeUndefined();
    expect((engine as unknown as Record<string, unknown>).rankUsers).toBeUndefined();
    expect((engine as unknown as Record<string, unknown>).getPublicScoreboard).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Institutional · sibling-register + sprint-history
// ───────────────────────────────────────────────────────────────────────────
describe('S141 · institutional', () => {
  it('taskflow-accountability-engine is registered', () => {
    expect(SIBLINGS.some((s) => s.id === 'taskflow-accountability-engine')).toBe(true);
  });
  it('SIBLINGS.length stays at or above the S138 floor', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(207);
  });
  it('S140 is banked (not TBD_AT_BANK)', () => {
    const s140 = SPRINTS.find((s) => s.sprintNumber === 140);
    expect(s140?.headSha).not.toBe('TBD_AT_BANK');
    expect(s140?.headSha).toBe('ad30edeb');
  });
  it('S141 entry exists', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 141)).toBeTruthy();
  });
});
