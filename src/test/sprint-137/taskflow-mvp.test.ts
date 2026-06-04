/**
 * @file        src/test/sprint-137/taskflow-mvp.test.ts
 * @purpose     Sprint 137 lean-behavioral test suite · TaskFlow MVP Core
 * @sprint      T-TaskFlow-A641.1 · Phase 8 OPENER · Block 6
 * @decisions   Baseline floor honored (no widening of pre-existing 20 failures).
 *              S137 own headSha via toContain([...]) not toBe.
 *              4 SSOT read surfaces 0-DIFF — assert engine imports only.
 *              ≥20 it · scope-wall toBeUndefined for out-of-scope APIs.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTask, listTasks, getTask, updateTask, changeStatus,
  addComment, listComments, listDueWithin24h, getStats,
} from '@/lib/taskflow-engine';
import {
  taskflowKey, taskflowCommentsKey, TASK_STATUS_TRANSITIONS,
} from '@/types/taskflow';
import type { Task } from '@/types/taskflow';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import * as engineModule from '@/lib/taskflow-engine';
import * as typesModule from '@/types/taskflow';

const E = 'TEST';

const base = (overrides: Partial<Parameters<typeof createTask>[1]> = {}) => ({
  title: 'Sample',
  description: 'd',
  assignee_id: 'emp-1',
  assignee_name: 'Ravi Kumar',
  department_code: 'DEPT-0001',
  priority: 'p2' as const,
  due_at: null,
  entity_id: E,
  created_by: 'me',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 137 · TaskFlow MVP · engine', () => {
  it('createTask persists task with TSK- code', () => {
    const t = createTask(E, base());
    expect(t.code).toMatch(/^TSK-\d{6}$/);
    expect(listTasks(E)).toHaveLength(1);
  });

  it('createTask rejects empty title', () => {
    expect(() => createTask(E, base({ title: '   ' }))).toThrow();
  });

  it('createTask defaults status to open', () => {
    const t = createTask(E, base());
    expect(t.status).toBe('open');
  });

  it('listTasks returns empty array on fresh entity', () => {
    expect(listTasks('FRESH')).toEqual([]);
  });

  it('getTask returns null for unknown id', () => {
    expect(getTask(E, 'nope')).toBeNull();
  });

  it('updateTask patches and bumps updated_at', () => {
    const t = createTask(E, base());
    const u = updateTask(E, t.id, { title: 'changed' });
    expect(u.title).toBe('changed');
    expect(u.updated_at >= t.updated_at).toBe(true);
  });

  it('changeStatus walks open → in_progress', () => {
    const t = createTask(E, base());
    const u = changeStatus(E, t.id, 'in_progress');
    expect(u.status).toBe('in_progress');
  });

  it('changeStatus rejects illegal transition from done', () => {
    const t = createTask(E, base());
    changeStatus(E, t.id, 'done');
    expect(() => changeStatus(E, t.id, 'open')).toThrow();
  });

  it('TASK_STATUS_TRANSITIONS marks done as terminal', () => {
    expect(TASK_STATUS_TRANSITIONS.done).toEqual([]);
  });

  it('addComment writes and listComments reads back', () => {
    const t = createTask(E, base());
    addComment(E, t.id, 'hello', 'u-1', 'User One');
    const cs = listComments(E, t.id);
    expect(cs).toHaveLength(1);
    expect(cs[0]?.body).toBe('hello');
  });

  it('addComment rejects empty body', () => {
    const t = createTask(E, base());
    expect(() => addComment(E, t.id, '   ', 'u', 'u')).toThrow();
  });

  it('listDueWithin24h surfaces tasks inside the window', () => {
    const soonISO = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    createTask(E, base({ due_at: soonISO }));
    expect(listDueWithin24h(E)).toHaveLength(1);
  });

  it('listDueWithin24h excludes done tasks', () => {
    const soonISO = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const t = createTask(E, base({ due_at: soonISO }));
    changeStatus(E, t.id, 'done');
    expect(listDueWithin24h(E)).toHaveLength(0);
  });

  it('listDueWithin24h excludes tasks with no due_at', () => {
    createTask(E, base({ due_at: null }));
    expect(listDueWithin24h(E)).toHaveLength(0);
  });

  it('getStats aggregates by status', () => {
    createTask(E, base());
    const t2 = createTask(E, base());
    changeStatus(E, t2.id, 'in_progress');
    const s = getStats(E);
    expect(s.total).toBe(2);
    expect(s.open).toBe(1);
    expect(s.in_progress).toBe(1);
  });

  it('taskflowKey is entity-scoped', () => {
    expect(taskflowKey('A')).toBe('taskflow_v1_A');
    expect(taskflowKey('B')).not.toBe(taskflowKey('A'));
  });

  it('taskflowCommentsKey is entity-scoped', () => {
    expect(taskflowCommentsKey('A')).toBe('taskflow_comments_v1_A');
  });

  it('entity-scoped persistence isolates two entities', () => {
    createTask('E1', base({ entity_id: 'E1' }));
    expect(listTasks('E1')).toHaveLength(1);
    expect(listTasks('E2')).toHaveLength(0);
  });
});

describe('Sprint 137 · TaskFlow MVP · institutional', () => {
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
    // toContain([...]) lean-behavioral form — accept short OR full SHA
    expect(['79153fad', '79153fad291780b756e6a829b4b5c8cdb986020f']).toContain(s136?.headSha);
  });

  it('sibling-register includes taskflow-engine', () => {
    expect(SIBLINGS.some((s) => s.id === 'taskflow-engine')).toBe(true);
  });
});

describe('Sprint 137 · TaskFlow MVP · scope wall (DP-P7-2 additive)', () => {
  it('engine does NOT export an approvals API (Phase 2)', () => {
    expect((engineModule as Record<string, unknown>).approveTask).toBeUndefined();
    expect((engineModule as Record<string, unknown>).requestApproval).toBeUndefined();
  });

  it('engine does NOT export a notification store (B.4 future)', () => {
    expect((engineModule as Record<string, unknown>).createNotification).toBeUndefined();
    expect((engineModule as Record<string, unknown>).listNotifications).toBeUndefined();
  });

  it('types module ships Notification as type-only (no runtime store key)', () => {
    expect((typesModule as Record<string, unknown>).notificationsKey).toBeUndefined();
  });
});
