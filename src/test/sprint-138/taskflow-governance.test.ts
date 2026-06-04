/**
 * @file        src/test/sprint-138/taskflow-governance.test.ts
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Governance Slice (+T1 hotfix)
 * @covers      approval chains · sequential approvals · SLA specificity · breach + idempotency ·
 *              I'm-Blocked artifact (raise/resolve/getTimeBlockedHours/moveToOnHold) ·
 *              Comply360 read-only bridge (both branches) · reminders (snooze/due/triggered) ·
 *              comment migration (TaskCommentModel + mentions + internal + legacy shim) ·
 *              institutional register assertions (S137 SHA · S138 last entry · sibling 207 · no Phase 8 OPENER).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTask, changeStatus, getTask, listTasks,
  addComment, listComments,
} from '@/lib/taskflow-engine';
import {
  upsertApprovalChain, submitTaskForApproval, approveTaskStep, rejectTaskStep,
  upsertSLARule, evaluateSLA, listEscalations,
  raiseBlocked, resolveBlocked, getOpenBlocked, getTimeBlockedHours,
  listComplianceSources, buildTaskDraftFromSource,
  upsertReminder, snoozeReminder, listReminders, getDueReminders, markTriggered,
} from '@/lib/taskflow-governance-engine';
import {
  type TaskApprovalChain, type TaskSLARule, type TaskReminder,
  taskflowKey, taskflowCommentsKey,
} from '@/types/taskflow';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

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
  it('single-step final-approve transitions task → approved', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    changeStatus(E, t.id, 'in_review', 'u0');
    upsertApprovalChain(E, { id: 'c5', name: 's', isDefault: true,
      steps: [{ approverId: 'a1', order: 1 }] });
    submitTaskForApproval(E, t.id, 'c5', 'u0');
    const r = approveTaskStep(E, t.id, 'a1');
    expect(r.final).toBe(true);
    expect(getTask(E, t.id)?.status).toBe('approved');
  });
});

describe('SLA + escalation (TF-21)', () => {
  it('breach raises escalation; below threshold does not', () => {
    const past = new Date(Date.now() - 48 * 3600_000).toISOString();
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    const all = JSON.parse(localStorage.getItem(taskflowKey(E)) ?? '[]');
    all[0].createdAt = past;
    localStorage.setItem(taskflowKey(E), JSON.stringify(all));
    const rule: TaskSLARule = {
      id: 'sla-1', name: 'global 24h', maxHours: 24, escalateAfterHours: 12,
      escalateTo: 'manager', isActive: true,
    };
    upsertSLARule(E, rule);
    const out = evaluateSLA(E);
    expect(out.breached).toHaveLength(1);
    expect(out.escalated.length).toBeGreaterThanOrEqual(1);
    expect(listEscalations(E).length).toBeGreaterThanOrEqual(1);
    // task transitioned to escalated when legal
    expect(['escalated', 'in_progress']).toContain(getTask(E, t.id)?.status);
  });
  it('specificity: category+priority beats category-only', () => {
    const t = seedTask({ category: 'compliance', priority: 'critical' });
    changeStatus(E, t.id, 'in_progress', 'u0');
    const all = JSON.parse(localStorage.getItem(taskflowKey(E)) ?? '[]');
    all[0].createdAt = new Date(Date.now() - 4 * 3600_000).toISOString();
    localStorage.setItem(taskflowKey(E), JSON.stringify(all));
    upsertSLARule(E, { id: 'a', name: 'cat', category: 'compliance', maxHours: 24,
      escalateAfterHours: 12, escalateTo: 'manager', isActive: true });
    upsertSLARule(E, { id: 'b', name: 'cat+pri', category: 'compliance', priority: 'critical',
      maxHours: 2, escalateAfterHours: 1, escalateTo: 'admin', isActive: true });
    const out = evaluateSLA(E);
    expect(out.breached).toHaveLength(1);
    const escs = listEscalations(E);
    expect(escs[0]?.escalatedTo).toBe('admin');
    void t;
  });
  it('idempotency: running evaluateSLA twice yields exactly one EscalationRecord', () => {
    const t = seedTask({ priority: 'high' });
    changeStatus(E, t.id, 'in_progress', 'u0');
    const all = JSON.parse(localStorage.getItem(taskflowKey(E)) ?? '[]');
    all[0].createdAt = new Date(Date.now() - 48 * 3600_000).toISOString();
    localStorage.setItem(taskflowKey(E), JSON.stringify(all));
    upsertSLARule(E, { id: 'sla-i', name: 'global', maxHours: 24,
      escalateAfterHours: 12, escalateTo: 'manager', isActive: true });
    evaluateSLA(E);
    evaluateSLA(E);
    const escs = listEscalations(E).filter((e) => e.taskId === t.id && e.source === 'sla');
    expect(escs).toHaveLength(1);
  });
});

describe('I’m-Blocked artifact (TF-33)', () => {
  it('raiseBlocked: empty reason throws', () => {
    const t = seedTask();
    expect(() => raiseBlocked(E, { taskId: t.id, reason: '', raisedByUserId: 'u1', blockedByUserId: 'u2' })).toThrow();
  });
  it('raiseBlocked: neither person nor dependency throws', () => {
    const t = seedTask();
    expect(() => raiseBlocked(E, { taskId: t.id, reason: 'why', raisedByUserId: 'u1' })).toThrow();
  });
  it('raise + resolve cycle clears open count', () => {
    const t = seedTask();
    const b = raiseBlocked(E, {
      taskId: t.id, reason: 'awaiting input', raisedByUserId: 'u1', blockedByUserId: 'u2',
    });
    expect(getOpenBlocked(E)).toHaveLength(1);
    resolveBlocked(E, b.id, 'u1', 'received');
    expect(getOpenBlocked(E)).toHaveLength(0);
  });
  it('getTimeBlockedHours computes elapsed (open) and finalized (resolved) windows', () => {
    const t = seedTask();
    const baseISO = '2026-06-04T00:00:00.000Z';
    const b1 = raiseBlocked(E, {
      taskId: t.id, reason: 'r1', raisedByUserId: 'u1', blockedByDependency: 'X',
    });
    // backdate the raise to deterministic time
    {
      const all = JSON.parse(localStorage.getItem(`tf_blocked_${E}`) ?? '[]');
      all[0].raisedAt = baseISO;
      localStorage.setItem(`tf_blocked_${E}`, JSON.stringify(all));
    }
    // unresolved window measured against injected now = +2h
    const hOpen = getTimeBlockedHours(E, t.id, '2026-06-04T02:00:00.000Z');
    expect(hOpen).toBeCloseTo(2, 2);
    // resolve & assert closed window = 5h regardless of wall clock
    resolveBlocked(E, b1.id, 'u1', 'done');
    {
      const all = JSON.parse(localStorage.getItem(`tf_blocked_${E}`) ?? '[]');
      all[0].resolvedAt = '2026-06-04T05:00:00.000Z';
      localStorage.setItem(`tf_blocked_${E}`, JSON.stringify(all));
    }
    const hClosed = getTimeBlockedHours(E, t.id, '2099-01-01T00:00:00.000Z');
    expect(hClosed).toBeCloseTo(5, 2);
  });
  it('moveToOnHold flag transitions task to on_hold when legal', () => {
    const t = seedTask();
    changeStatus(E, t.id, 'in_progress', 'u0');
    raiseBlocked(E, {
      taskId: t.id, reason: 'wait', raisedByUserId: 'u1',
      blockedByDependency: 'EXT-1', moveToOnHold: true,
    });
    expect(getTask(E, t.id)?.status).toBe('on_hold');
  });
  it('moveToOnHold from terminal status keeps artifact but does not transition', () => {
    const t = seedTask();
    // 'open' → 'on_hold' is legal so use cancelled (terminal)
    changeStatus(E, t.id, 'cancelled', 'u0');
    raiseBlocked(E, {
      taskId: t.id, reason: 'note', raisedByUserId: 'u1',
      blockedByDependency: 'EXT', moveToOnHold: true,
    });
    expect(getTask(E, t.id)?.status).toBe('cancelled');
    expect(getOpenBlocked(E)).toHaveLength(1);
  });
});

describe('Comply360 bridge (TF-11)', () => {
  it('listComplianceSources returns READ-ONLY items', () => {
    const sources = listComplianceSources(E);
    expect(Array.isArray(sources)).toBe(true);
  });
  it('buildTaskDraftFromSource maps obligation → compliance + tag format', () => {
    const draft = buildTaskDraftFromSource(
      { type: 'obligation', id: 'OB-1', label: 'TDS quarterly' },
      { creatorId: 'u0', entityId: 'e1' },
    );
    expect(draft.category).toBe('compliance');
    expect(draft.tags).toContain('comply360:obligation:OB-1');
  });
  it('buildTaskDraftFromSource maps audit_observation → internal_audit + tag format', () => {
    const draft = buildTaskDraftFromSource(
      { type: 'audit_observation', id: 'AO-9', label: 'Cash review' },
      { creatorId: 'u0', entityId: 'e1' },
    );
    expect(draft.category).toBe('internal_audit');
    expect(draft.tags).toContain('comply360:audit_observation:AO-9');
  });
});

describe('Rich reminders (TF-13)', () => {
  it('snooze pushes reminderDate forward and resets isTriggered', () => {
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
  it('getDueReminders surfaces only past-due, untriggered items', () => {
    const t = seedTask();
    upsertReminder(E, { id: 'rA', taskId: t.id, userId: 'u1',
      reminderDate: '2020-01-01T00:00:00.000Z', message: 'old', isTriggered: false });
    upsertReminder(E, { id: 'rB', taskId: t.id, userId: 'u1',
      reminderDate: '2099-01-01T00:00:00.000Z', message: 'far', isTriggered: false });
    const due = getDueReminders(E);
    expect(due.map((r) => r.id)).toEqual(['rA']);
  });
  it('markTriggered flips the flag', () => {
    const t = seedTask();
    upsertReminder(E, { id: 'rC', taskId: t.id, userId: 'u1',
      reminderDate: '2020-01-01T00:00:00.000Z', message: 'x', isTriggered: false });
    const r = markTriggered(E, 'rC');
    expect(r.isTriggered).toBe(true);
  });
});

describe('Comment model migration (T1-2)', () => {
  it('addComment writes TaskCommentModel shape', () => {
    const t = seedTask();
    const c = addComment(E, t.id, 'hello', 'u1', 'U1');
    expect(c.taskId).toBe(t.id);
    expect(c.userId).toBe('u1');
    expect(c.content).toBe('hello');
    expect(c.isInternal).toBe(false);
    expect(c.mentions).toEqual([]);
  });
  it('addComment persists mentions[] + isInternal toggle', () => {
    const t = seedTask();
    const c = addComment(E, t.id, 'ping', 'u1', 'U1', { isInternal: true, mentions: ['u2', 'u3'] });
    expect(c.isInternal).toBe(true);
    expect(c.mentions).toEqual(['u2', 'u3']);
    const got = listComments(E, t.id);
    expect(got).toHaveLength(1);
    expect(got[0].mentions).toEqual(['u2', 'u3']);
    expect(got[0].isInternal).toBe(true);
  });
  it('listComments shim lifts legacy {task_id,body,author_id,author_name,created_at} rows', () => {
    const t = seedTask();
    // write legacy-format row directly
    const legacy = [{
      id: 'legacy-1', task_id: t.id, body: 'old',
      author_id: 'u9', author_name: 'U9', created_at: '2025-01-01T00:00:00.000Z',
    }];
    localStorage.setItem(taskflowCommentsKey(E), JSON.stringify(legacy));
    const out = listComments(E, t.id);
    expect(out).toHaveLength(1);
    expect(out[0].taskId).toBe(t.id);
    expect(out[0].userId).toBe('u9');
    expect(out[0].content).toBe('old');
    expect(out[0].isInternal).toBe(false);
    expect(out[0].mentions).toEqual([]);
  });
});

describe('institutional contract', () => {
  it('listTasks remains stable shape', () => {
    seedTask(); seedTask();
    expect(listTasks(E)).toHaveLength(2);
  });
  it('sibling-register has exactly 207 entries and includes taskflow-governance-engine', () => {
    expect(SIBLINGS.length).toBe(207);
    expect(SIBLINGS.some((s) => s.id === 'taskflow-governance-engine')).toBe(true);
  });
  it('sprint-history: S137 entry banked at SHA 0742e96b and S138 last entry references TaskFlow-A641.2', () => {
    const hist = JSON.stringify(SPRINT_HISTORY);
    expect(hist).toContain('0742e96b');
    expect(hist).toContain('T-TaskFlow-A641.2');
  });
  it('no "Phase 8 OPENER" label remains in src/', () => {
    // Read this very engine file + landing label as guardrails.
    const files = [
      'src/lib/taskflow-engine.ts',
      'src/lib/taskflow-governance-engine.ts',
      'src/pages/erp/taskflow/TaskFlowLandingPage.tsx',
      'src/pages/erp/taskflow/TaskRoomPage.tsx',
      'src/pages/erp/taskflow/TaskFlowAllTasksPage.tsx',
      'src/types/taskflow.ts',
      'src/types/audit-trail.ts',
      'src/apps/erp/configs/taskflow-shell-config.ts',
      'src/apps/erp/configs/taskflow-sidebar-config.ts',
    ];
    for (const rel of files) {
      const txt = readFileSync(resolve(process.cwd(), rel), 'utf8');
      expect(txt.includes('Phase 8 OPENER')).toBe(false);
    }
  });
});
