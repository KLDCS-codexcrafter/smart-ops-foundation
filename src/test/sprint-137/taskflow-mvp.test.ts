/**
 * @file        src/test/sprint-137/taskflow-mvp.test.ts
 * @purpose     S137.R1 corrective test suite · ratified Task model + Accountability Spine + hash-chain
 * @sprint      Sprint 137.R1 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc opener · Block R5
 * @decisions   ≥34 it (covers 12 statuses, acknowledge, reassign+reason, due-date+reason,
 *              sub-tasks/blocking, hash-chain valid+tamper, category/branch filters,
 *              migration map). Baseline floor honored.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTask, listTasks, getTask, updateTask, changeStatus,
  addComment, listComments, listDueWithin24h, getStats,
  acknowledgeTask, getUnacknowledgedTasks,
  reassignTask, getReassignmentTrail,
  changeDueDate, getDueDateHistory,
  getSubTasks, getBlockingBadges,
  verifyAuditChain, getTaskAuditChain,
  migrateLegacyTask, _legacyMigrationMaps,
  type CreateTaskInput,
} from '@/lib/taskflow-engine';
import {
  taskflowKey, taskflowCommentsKey, taskflowAuditChainKey,
  TASK_STATUS_TRANSITIONS,
  type TaskStatus, type TaskAuditEntry,
} from '@/types/taskflow';

import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import * as engineModule from '@/lib/taskflow-engine';
import * as typesModule from '@/types/taskflow';

const E = 'TEST';

const base = (overrides: Partial<CreateTaskInput> = {}): CreateTaskInput => ({
  title: 'Sample',
  description: 'd',
  assigneeId: 'emp-1',
  assigneeName: 'Ravi Kumar',
  creatorId: 'me',
  departmentId: 'DEPT-0001',
  priority: 'medium',
  category: 'operations',
  dueDate: null,
  entityId: E,
  ...overrides,
});

beforeEach(() => { localStorage.clear(); });

describe('Sprint 137.R1 · TaskFlow engine · CRUD basics', () => {
  it('createTask persists task with TSK- code', () => {
    const t = createTask(E, base());
    expect(t.code).toMatch(/^TSK-\d{6}$/);
    expect(listTasks(E)).toHaveLength(1);
  });
  it('createTask rejects empty title', () => {
    expect(() => createTask(E, base({ title: '   ' }))).toThrow();
  });
  it('createTask defaults status to open', () => {
    expect(createTask(E, base()).status).toBe('open');
  });
  it('listTasks empty on fresh entity', () => {
    expect(listTasks('FRESH')).toEqual([]);
  });
  it('getTask returns null for unknown id', () => {
    expect(getTask(E, 'nope')).toBeNull();
  });
  it('updateTask patches and bumps updatedAt', () => {
    const t = createTask(E, base());
    const u = updateTask(E, t.id, { title: 'changed' });
    expect(u.title).toBe('changed');
    expect(u.updatedAt >= t.updatedAt).toBe(true);
  });
  it('entity-scoped persistence isolates two entities', () => {
    createTask('E1', base({ entityId: 'E1' }));
    expect(listTasks('E1')).toHaveLength(1);
    expect(listTasks('E2')).toHaveLength(0);
  });
});

describe('Sprint 137.R1 · 12-state lifecycle', () => {
  it('TASK_STATUS_TRANSITIONS exposes all 12 statuses', () => {
    const keys = Object.keys(TASK_STATUS_TRANSITIONS).sort();
    expect(keys).toEqual([
      'approved','cancelled','completed','draft','escalated','in_progress',
      'in_review','on_hold','open','pending_approval','rejected','rework',
    ]);
  });
  it('completed and cancelled are terminal', () => {
    expect(TASK_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(TASK_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
  it('legal transition · open → in_progress', () => {
    const t = createTask(E, base());
    expect(changeStatus(E, t.id, 'in_progress').status).toBe('in_progress');
  });
  it('legal transition · in_progress → in_review → completed', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    const done = changeStatus(E, t.id, 'completed');
    expect(done.status).toBe('completed');
    expect(done.completedDate).not.toBeNull();
  });
  it('legal transition · pending_approval → approved → completed', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    changeStatus(E, t.id, 'pending_approval');
    changeStatus(E, t.id, 'approved');
    expect(changeStatus(E, t.id, 'completed').status).toBe('completed');
  });
  it('legal transition · rejected → rework → in_progress', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    changeStatus(E, t.id, 'pending_approval');
    changeStatus(E, t.id, 'rejected');
    changeStatus(E, t.id, 'rework');
    expect(changeStatus(E, t.id, 'in_progress').status).toBe('in_progress');
  });
  it('illegal · completed → open throws', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    changeStatus(E, t.id, 'completed');
    expect(() => changeStatus(E, t.id, 'open' as TaskStatus)).toThrow();
  });
  it('illegal · open → completed throws', () => {
    const t = createTask(E, base());
    expect(() => changeStatus(E, t.id, 'completed')).toThrow();
  });
  it('illegal · cancelled → open throws', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'cancelled');
    expect(() => changeStatus(E, t.id, 'open')).toThrow();
  });
});

describe('Sprint 137.R1 · TF-29a Acknowledgement', () => {
  it('acknowledgeTask stamps acknowledgedAt and acknowledgedBy', () => {
    const t = createTask(E, base());
    const a = acknowledgeTask(E, t.id, 'user-7');
    expect(a.acknowledgedAt).not.toBeNull();
    expect(a.acknowledgedBy).toBe('user-7');
  });
  it('double-acknowledge throws', () => {
    const t = createTask(E, base());
    acknowledgeTask(E, t.id, 'user-7');
    expect(() => acknowledgeTask(E, t.id, 'user-9')).toThrow();
  });
  it('getUnacknowledgedTasks excludes acknowledged + terminal', () => {
    const t1 = createTask(E, base());
    const t2 = createTask(E, base());
    const t3 = createTask(E, base());
    acknowledgeTask(E, t1.id, 'u');
    changeStatus(E, t2.id, 'cancelled');
    const open = getUnacknowledgedTasks(E);
    expect(open.map((t) => t.id)).toEqual([t3.id]);
  });
});

describe('Sprint 137.R1 · TF-29b Reassign (reason mandatory)', () => {
  it('rejects empty reason', () => {
    const t = createTask(E, base());
    expect(() => reassignTask(E, t.id, 'u-2', '  ', 'me')).toThrow();
  });
  it('reassign updates assignee + records trail', () => {
    const t = createTask(E, base({ assigneeId: 'u-1', assigneeName: 'One' }));
    reassignTask(E, t.id, 'u-2', 'rebalance load', 'mgr-1', 'Two');
    expect(getTask(E, t.id)?.assigneeId).toBe('u-2');
    const trail = getReassignmentTrail(E, t.id);
    expect(trail).toHaveLength(1);
    expect(trail[0].fromUserId).toBe('u-1');
    expect(trail[0].reason).toBe('rebalance load');
  });
});

describe('Sprint 137.R1 · TF-29c Due-date change (reason mandatory)', () => {
  it('rejects empty reason', () => {
    const t = createTask(E, base());
    expect(() => changeDueDate(E, t.id, '2030-01-01', '', 'me')).toThrow();
  });
  it('changeDueDate updates + records history', () => {
    const t = createTask(E, base({ dueDate: '2030-01-01T00:00:00.000Z' }));
    changeDueDate(E, t.id, '2030-02-01T00:00:00.000Z', 'client moved milestone', 'mgr');
    expect(getTask(E, t.id)?.dueDate).toBe('2030-02-01T00:00:00.000Z');
    const hist = getDueDateHistory(E, t.id);
    expect(hist).toHaveLength(1);
    expect(hist[0].oldDate).toBe('2030-01-01T00:00:00.000Z');
  });
});

describe('Sprint 137.R1 · TF-14 Sub-tasks + blocking badges', () => {
  it('getSubTasks returns children by parentTaskId', () => {
    const parent = createTask(E, base({ title: 'Parent' }));
    createTask(E, base({ title: 'Child A', parentTaskId: parent.id }));
    createTask(E, base({ title: 'Child B', parentTaskId: parent.id }));
    expect(getSubTasks(E, parent.id)).toHaveLength(2);
  });
  it('getBlockingBadges returns unresolved dependencies', () => {
    const dep = createTask(E, base({ title: 'Blocker' }));
    const t = createTask(E, base({ title: 'Downstream', dependencyIds: [dep.id] }));
    expect(getBlockingBadges(E, t.id)).toHaveLength(1);
    changeStatus(E, dep.id, 'in_progress');
    changeStatus(E, dep.id, 'in_review');
    changeStatus(E, dep.id, 'completed');
    expect(getBlockingBadges(E, t.id)).toHaveLength(0);
  });
});

describe('Sprint 137.R1 · TF-36 Hash-chained audit', () => {
  it('appends chain on create + update', () => {
    const t = createTask(E, base());
    updateTask(E, t.id, { title: 'edit-1' });
    const chain = getTaskAuditChain(E, t.id);
    expect(chain.length).toBeGreaterThanOrEqual(2);
  });
  it('verifyAuditChain valid on clean chain', () => {
    const t = createTask(E, base());
    updateTask(E, t.id, { title: 'a' });
    updateTask(E, t.id, { title: 'b' });
    expect(verifyAuditChain(E, t.id).valid).toBe(true);
  });
  it('verifyAuditChain detects tampering on middle entry', () => {
    const t = createTask(E, base());
    updateTask(E, t.id, { title: 'a' });
    updateTask(E, t.id, { title: 'b' });
    const raw = localStorage.getItem(taskflowAuditChainKey(E));
    const chain = JSON.parse(raw ?? '[]') as TaskAuditEntry[];
    const idx = chain.findIndex((e) => e.taskId === t.id && e.action === 'update');
    chain[idx].action = 'tampered';
    localStorage.setItem(taskflowAuditChainKey(E), JSON.stringify(chain));
    const res = verifyAuditChain(E, t.id);
    expect(res.valid).toBe(false);
    expect(typeof res.breakIndex).toBe('number');
  });
});

describe('Sprint 137.R1 · Comments + Due-Soon + stats', () => {
  it('addComment writes and listComments reads back', () => {
    const t = createTask(E, base());
    addComment(E, t.id, 'hello', 'u-1', 'User One');
    expect(listComments(E, t.id)).toHaveLength(1);
  });
  it('addComment rejects empty body', () => {
    const t = createTask(E, base());
    expect(() => addComment(E, t.id, '   ', 'u', 'u')).toThrow();
  });
  it('listDueWithin24h surfaces tasks inside the window', () => {
    const soon = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    createTask(E, base({ dueDate: soon }));
    expect(listDueWithin24h(E)).toHaveLength(1);
  });
  it('listDueWithin24h excludes completed tasks', () => {
    const soon = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const t = createTask(E, base({ dueDate: soon }));
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    changeStatus(E, t.id, 'completed');
    expect(listDueWithin24h(E)).toHaveLength(0);
  });
  it('getStats aggregates unacknowledged correctly', () => {
    createTask(E, base());
    const t2 = createTask(E, base());
    acknowledgeTask(E, t2.id, 'u');
    expect(getStats(E).unacknowledged).toBe(1);
  });
});

describe('Sprint 137.R1 · Category / Branch filter support', () => {
  it('category field round-trips', () => {
    const t = createTask(E, base({ category: 'internal_audit' }));
    expect(getTask(E, t.id)?.category).toBe('internal_audit');
  });
  it('branchId stored when provided', () => {
    const t = createTask(E, base({ branchId: 'BR-77' }));
    expect(getTask(E, t.id)?.branchId).toBe('BR-77');
  });
});

describe('Sprint 137.R1 · Migration map (legacy→ratified)', () => {
  it('maps old statuses correctly', () => {
    expect(_legacyMigrationMaps.STATUS_MAP.blocked).toBe('on_hold');
    expect(_legacyMigrationMaps.STATUS_MAP.done).toBe('completed');
  });
  it('maps old priorities correctly', () => {
    expect(_legacyMigrationMaps.PRIORITY_MAP.p0).toBe('critical');
    expect(_legacyMigrationMaps.PRIORITY_MAP.p3).toBe('low');
  });
  it('migrateLegacyTask returns ratified shape', () => {
    const m = migrateLegacyTask({
      id: 'x', code: 'TSK-000001', title: 't', status: 'blocked',
      priority: 'p1', assignee_id: 'a', assignee_name: 'A',
      department_code: 'D', customer_id: 'C', due_at: null,
      entity_id: 'E', created_by: 'me',
    });
    expect(m.status).toBe('on_hold');
    expect(m.priority).toBe('high');
    expect(m.clientId).toBe('C');
    expect(m.assigneeId).toBe('a');
  });
});

describe('Sprint 137.R1 · Keys + Institutional registers', () => {
  it('taskflowKey is entity-scoped', () => {
    expect(taskflowKey('A')).toBe('taskflow_v1_A');
    expect(taskflowKey('B')).not.toBe(taskflowKey('A'));
  });
  it('taskflowCommentsKey is entity-scoped', () => {
    expect(taskflowCommentsKey('A')).toBe('taskflow_comments_v1_A');
  });
  it('S137 entry exists in SPRINTS register', () => {
    const s137 = SPRINTS.find((s) => s.sprintNumber === 137);
    expect(s137).toBeDefined();
    expect(s137?.code).toBe('T-TaskFlow-A641.1');
  });
  it('S137 newSiblings includes taskflow-engine', () => {
    const s137 = SPRINTS.find((s) => s.sprintNumber === 137);
    expect(s137?.newSiblings).toContain('taskflow-engine');
  });
  it('S136 headSha was backfilled (non-TBD)', () => {
    const s136 = SPRINTS.find((s) => s.sprintNumber === 136);
    expect(['79153fad', '79153fad291780b756e6a829b4b5c8cdb986020f']).toContain(s136?.headSha);
  });
  it('sibling-register includes taskflow-engine', () => {
    expect(SIBLINGS.some((s) => s.id === 'taskflow-engine')).toBe(true);
  });
});

describe('Sprint 137.R1 · Scope wall (DP-P7-2 additive)', () => {
  it('engine does NOT export approvals API', () => {
    expect((engineModule as Record<string, unknown>).approveTask).toBeUndefined();
    expect((engineModule as Record<string, unknown>).requestApproval).toBeUndefined();
  });
  it('engine does NOT export a notification store', () => {
    expect((engineModule as Record<string, unknown>).createNotification).toBeUndefined();
    expect((engineModule as Record<string, unknown>).listNotifications).toBeUndefined();
  });
  it('types module ships Notification as type-only (no runtime store key)', () => {
    expect((typesModule as Record<string, unknown>).notificationsKey).toBeUndefined();
  });
});
