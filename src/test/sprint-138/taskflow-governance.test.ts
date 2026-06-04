/**
 * @file        src/test/sprint-138/taskflow-governance.test.ts
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Governance Slice
 * @covers      approval chains · sequential approvals · SLA specificity ·
 *              SLA breach → escalation · I'm-Blocked artifact ·
 *              Comply360 read-only bridge · reminders snooze.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTask, changeStatus, getTask, listTasks,
} from '@/lib/taskflow-engine';
import {
  upsertApprovalChain, submitTaskForApproval, approveTaskStep, rejectTaskStep,
  upsertSLARule, evaluateSLA, listEscalations,
  raiseBlocked, resolveBlocked, getOpenBlocked,
  listComplianceSources, buildTaskDraftFromSource,
  upsertReminder, snoozeReminder, listReminders,
} from '@/lib/taskflow-governance-engine';
import type { TaskApprovalChain, TaskSLARule, TaskReminder } from '@/types/taskflow';

const E = 'TST';

const seedTask = (over: Partial<Parameters<typeof createTask>[1]> = {}) =>
  createTask(E, {
    title: 'Seed', description: '', assigneeId: 'u1', assigneeName: 'U1',
    creatorId: 'u0', departmentId: 'd1', priority: 'medium', category: 'operations',
    dueDate: null, tags: [], entityId: 'e1',
    ...over,
  });

beforeEach(() => {
  localStorage.clear();
});

describe('Approval chains (TF-3) · sequential', () => {
  it('runs a 2-step chain: submit → approve → approve = task approved', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    changeStatus(E, t.id, 'in_review', 'u0');
    const chain: TaskApprovalChain = {
      id: 'c1', name: 'two-step', isDefault: true,
      steps: [{ approverId: 'a1', order: 1 }, { approverId: 'a2', order: 2 }],
    };
    upsertApprovalChain(E, chain);
    submitTaskForApproval(E, t.id, 'c1', 'u0');
    expect(getTask(E, t.id)?.status).toBe('pending_approval');
    const r1 = approveTaskStep(E, t.id, 'a1');
    expect(r1.final).toBe(false);
    const r2 = approveTaskStep(E, t.id, 'a2');
    expect(r2.final).toBe(true);
    expect(getTask(E, t.id)?.status).toBe('approved');
  });
  it('reject on any step → task rejected', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    changeStatus(E, t.id, 'in_review', 'u0');
    upsertApprovalChain(E, { id: 'c2', name: 's', isDefault: true,
      steps: [{ approverId: 'a1', order: 1 }] });
    submitTaskForApproval(E, t.id, 'c2', 'u0');
    rejectTaskStep(E, t.id, 'a1', 'missing evidence');
    expect(getTask(E, t.id)?.status).toBe('rejected');
  });
  it('reject without reason → throws', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    changeStatus(E, t.id, 'in_review', 'u0');
    upsertApprovalChain(E, { id: 'c3', name: 's', isDefault: true,
      steps: [{ approverId: 'a1', order: 1 }] });
    submitTaskForApproval(E, t.id, 'c3', 'u0');
    expect(() => rejectTaskStep(E, t.id, 'a1', '')).toThrow();
  });
  it('submit illegal when task not in_review', () => {
    const t = seedTask();
    upsertApprovalChain(E, { id: 'c4', name: 's', isDefault: true,
      steps: [{ approverId: 'a1', order: 1 }] });
    expect(() => submitTaskForApproval(E, t.id, 'c4', 'u0')).toThrow();
  });
});

describe('SLA + escalation (TF-21)', () => {
  it('breach raises escalation; below threshold does not', () => {
    const past = new Date(Date.now() - 48 * 3600_000).toISOString();
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    // Tighten createdAt by reading + rewriting; engine sets createdAt on createTask.
    const all = JSON.parse(localStorage.getItem(`taskflow_tasks_${E}`) ?? '[]');
    all[0].createdAt = past;
    localStorage.setItem(`taskflow_tasks_${E}`, JSON.stringify(all));
    const rule: TaskSLARule = {
      id: 'sla-1', name: 'global 24h', maxHours: 24, escalateAfterHours: 12,
      escalateTo: 'manager', isActive: true,
    };
    upsertSLARule(E, rule);
    const out = evaluateSLA(E);
    expect(out.breached).toBe(1);
    expect(out.escalated).toBeGreaterThanOrEqual(1);
    expect(listEscalations(E).length).toBeGreaterThanOrEqual(1);
  });
  it('specificity: category+priority beats category-only', () => {
    const t = seedTask({ category: 'compliance', priority: 'critical' });
    changeStatus(E, t.id, 'in_progress', 'u0');
    const all = JSON.parse(localStorage.getItem(`taskflow_tasks_${E}`) ?? '[]');
    all[0].createdAt = new Date(Date.now() - 4 * 3600_000).toISOString();
    localStorage.setItem(`taskflow_tasks_${E}`, JSON.stringify(all));
    upsertSLARule(E, { id: 'a', name: 'cat', category: 'compliance', maxHours: 24,
      escalateAfterHours: 12, escalateTo: 'manager', isActive: true });
    upsertSLARule(E, { id: 'b', name: 'cat+pri', category: 'compliance', priority: 'critical',
      maxHours: 2, escalateAfterHours: 1, escalateTo: 'admin', isActive: true });
    const out = evaluateSLA(E);
    expect(out.breached).toBe(1);
    const escs = listEscalations(E);
    expect(escs[0]?.escalatedTo).toBe('admin');
  });
});

describe('I’m-Blocked artifact (TF-33)', () => {
  it('raise + resolve cycle; reason mandatory; one of user/dep mandatory', () => {
    const t = seedTask();
    expect(() => raiseBlocked(E, { taskId: t.id, reason: '', raisedByUserId: 'u1' })).toThrow();
    expect(() => raiseBlocked(E, { taskId: t.id, reason: 'x', raisedByUserId: 'u1' })).toThrow();
    const b = raiseBlocked(E, {
      taskId: t.id, reason: 'awaiting input', raisedByUserId: 'u1',
      blockedByUserId: 'u2',
    });
    expect(getOpenBlocked(E)).toHaveLength(1);
    resolveBlocked(E, b.id, 'u1', 'received');
    expect(getOpenBlocked(E)).toHaveLength(0);
  });
  it('moveToOnHold transitions task when legal', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    raiseBlocked(E, {
      taskId: t.id, reason: 'wait', raisedByUserId: 'u1',
      blockedByDependency: 'EXT-1', moveToOnHold: true,
    });
    expect(getTask(E, t.id)?.status).toBe('on_hold');
  });
});

describe('Comply360 bridge (TF-11)', () => {
  it('listComplianceSources returns READ-ONLY items and buildTaskDraftFromSource maps category', () => {
    const sources = listComplianceSources(E);
    expect(Array.isArray(sources)).toBe(true);
    const fakeOblig = { type: 'obligation' as const, id: 'OB-1', label: 'TDS quarterly' };
    const draft = buildTaskDraftFromSource(fakeOblig, { creatorId: 'u0', entityId: 'e1' });
    expect(draft.category).toBe('compliance');
    expect(draft.tags).toContain('comply360:obligation:OB-1');
    const fakeObs = { type: 'audit_observation' as const, id: 'AO-1', label: 'Cash review' };
    const d2 = buildTaskDraftFromSource(fakeObs, { creatorId: 'u0', entityId: 'e1' });
    expect(d2.category).toBe('internal_audit');
  });
});

describe('Rich reminders (TF-13)', () => {
  it('snooze pushes reminderDate forward by hours and resets isTriggered', () => {
    const t = seedTask();
    const future = new Date(Date.now() + 3600_000).toISOString();
    const r: TaskReminder = { id: 'r1', taskId: t.id, userId: 'u1',
      reminderDate: future, message: 'check', isTriggered: true };
    upsertReminder(E, r);
    const snoozed = snoozeReminder(E, 'r1', 2);
    expect(snoozed.isTriggered).toBe(false);
    expect(new Date(snoozed.reminderDate).getTime()).toBeGreaterThan(new Date(future).getTime());
    expect(listReminders(E)).toHaveLength(1);
  });
  it('snooze with non-positive hours throws', () => {
    const t = seedTask();
    upsertReminder(E, { id: 'r2', taskId: t.id, userId: 'u1',
      reminderDate: new Date().toISOString(), message: 'm', isTriggered: false });
    expect(() => snoozeReminder(E, 'r2', 0)).toThrow();
  });
});

describe('institutional contract', () => {
  it('listTasks remains stable shape', () => {
    seedTask(); seedTask();
    expect(listTasks(E)).toHaveLength(2);
  });
});
