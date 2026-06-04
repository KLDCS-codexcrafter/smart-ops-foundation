/**
 * @file        src/test/sprint-139/taskflow-workflow.test.ts
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice
 * @covers      checklists + dependency enforcement + milestone gate on completion ·
 *              templates (spawn + idempotent checklist materialisation) ·
 *              workflows (apply + stage badges + tag + progress) ·
 *              recurring (idempotent + UTC frequency + endDate stop) ·
 *              Decision Register · Meeting Minutes (spawn idempotency) ·
 *              institutional register assertions (S138 backfill · S139 entry · sibling +1 ·
 *              no Phase 8 OPENER drift · workflow-engine SIBLING present).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTask, changeStatus, getTask, listTasks,
} from '@/lib/taskflow-engine';
import {
  addChecklistItem, toggleChecklistItem, listChecklistItems, getChecklistProgress,
  removeChecklistItem,
  createTemplate, listTemplates, deleteTemplate, createTaskFromTemplate,
  createWorkflow, listWorkflows, deleteWorkflow,
  applyWorkflowToTask, getWorkflowProgress,
  completeRecurringTask, getRecurrenceChain,
  recordDecision, listDecisions, linkDecisionToTask,
  createMeetingMinutes, listMinutes, spawnTasksFromMinutes,
  tfChecklistsKey, tfTemplatesKey, tfWorkflowsKey, tfDecisionsKey, tfMinutesKey,
} from '@/lib/taskflow-workflow-engine';
import {
  taskflowKey, taskflowCommentsKey,
  taskflowReassignmentsKey, taskflowDueDateChangesKey, taskflowAuditChainKey,
} from '@/types/taskflow';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'TST';

function clear(): void {
  localStorage.clear();
}

const seed = (over: Partial<Parameters<typeof createTask>[1]> = {}) =>
  createTask(E, {
    title: 'Seed', description: '', assigneeId: 'u1', assigneeName: 'U1',
    creatorId: 'u0', departmentId: 'd1', priority: 'medium', category: 'operations',
    dueDate: null, tags: [], entityId: 'e1',
    ...over,
  });

beforeEach(clear);

describe('S139 · TF-14 checklists', () => {
  it('addChecklistItem stores ordered + audit', () => {
    const t = seed();
    const a = addChecklistItem(E, { taskId: t.id, title: 'A' });
    const b = addChecklistItem(E, { taskId: t.id, title: 'B' });
    expect(a.order).toBe(1);
    expect(b.order).toBe(2);
    expect(listChecklistItems(E, t.id)).toHaveLength(2);
  });

  it('addChecklistItem throws on empty title', () => {
    const t = seed();
    expect(() => addChecklistItem(E, { taskId: t.id, title: '   ' })).toThrow();
  });

  it('removeChecklistItem deletes the row', () => {
    const t = seed();
    const a = addChecklistItem(E, { taskId: t.id, title: 'A' });
    removeChecklistItem(E, a.id);
    expect(listChecklistItems(E, t.id)).toHaveLength(0);
  });

  it('toggleChecklistItem completes + sets completedBy/At', () => {
    const t = seed();
    const a = addChecklistItem(E, { taskId: t.id, title: 'A' });
    const x = toggleChecklistItem(E, a.id, 'u9');
    expect(x.isCompleted).toBe(true);
    expect(x.completedBy).toBe('u9');
    expect(x.completedAt).toBeTruthy();
  });

  it('dependsOn blocks completion until predecessor complete', () => {
    const t = seed();
    const a = addChecklistItem(E, { taskId: t.id, title: 'A' });
    const b = addChecklistItem(E, { taskId: t.id, title: 'B', dependsOn: a.id });
    expect(() => toggleChecklistItem(E, b.id)).toThrow(/predecessor/);
    toggleChecklistItem(E, a.id);
    expect(toggleChecklistItem(E, b.id).isCompleted).toBe(true);
  });

  it('getChecklistProgress reports done + milestonesPending', () => {
    const t = seed();
    const a = addChecklistItem(E, { taskId: t.id, title: 'A', isMilestone: true });
    addChecklistItem(E, { taskId: t.id, title: 'B' });
    expect(getChecklistProgress(E, t.id)).toMatchObject({ total: 2, done: 0, milestonesPending: 1 });
    toggleChecklistItem(E, a.id);
    expect(getChecklistProgress(E, t.id)).toMatchObject({ total: 2, done: 1, milestonesPending: 0 });
  });

  it('changeStatus(completed) blocks on incomplete milestone', () => {
    const t = seed();
    addChecklistItem(E, { taskId: t.id, title: 'M', isMilestone: true });
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    expect(() => changeStatus(E, t.id, 'completed')).toThrow(/milestones/);
  });

  it('changeStatus(completed) blocks on open dependency tasks', () => {
    const dep = seed({ title: 'Dep' });
    const t = seed({ title: 'Main', dependencyIds: [dep.id] });
    changeStatus(E, t.id, 'in_progress');
    changeStatus(E, t.id, 'in_review');
    expect(() => changeStatus(E, t.id, 'completed')).toThrow(/dependencies/);
    changeStatus(E, dep.id, 'in_progress');
    changeStatus(E, dep.id, 'in_review');
    changeStatus(E, dep.id, 'completed');
    expect(changeStatus(E, t.id, 'completed').status).toBe('completed');
  });
});

describe('S139 · TF templates', () => {
  it('createTemplate stores + listTemplates returns it', () => {
    const tpl = createTemplate(E, {
      name: 'Audit', description: '', category: 'compliance', priority: 'high',
      checklistItems: ['x', 'y'], estimatedHours: 4, createdBy: 'me',
    });
    expect(listTemplates(E)).toContainEqual(tpl);
  });

  it('createTemplate throws on empty name', () => {
    expect(() => createTemplate(E, {
      name: '', description: '', category: 'general', priority: 'low',
      checklistItems: [], estimatedHours: 0, createdBy: 'me',
    })).toThrow();
  });

  it('deleteTemplate removes the row', () => {
    const tpl = createTemplate(E, {
      name: 'D', description: '', category: 'general', priority: 'low',
      checklistItems: [], estimatedHours: 0, createdBy: 'me',
    });
    deleteTemplate(E, tpl.id);
    expect(listTemplates(E)).toHaveLength(0);
  });

  it('createTaskFromTemplate materialises checklistItems', () => {
    const tpl = createTemplate(E, {
      name: 'P', description: 'd', category: 'finance', priority: 'medium',
      checklistItems: ['one', 'two', 'three'], estimatedHours: 2, createdBy: 'me',
    });
    const task = createTaskFromTemplate(E, tpl.id, {
      assigneeId: 'u1', assigneeName: 'U1', entityId: 'e1',
    }, 'me');
    const items = listChecklistItems(E, task.id);
    expect(items.map((i) => i.title)).toEqual(['one', 'two', 'three']);
    expect(task.templateId).toBe(tpl.id);
  });

  it('createTaskFromTemplate throws when template missing', () => {
    expect(() => createTaskFromTemplate(E, 'nope', {
      assigneeId: null, assigneeName: '', entityId: 'e1',
    }, 'me')).toThrow();
  });
});

describe('S139 · TF workflows', () => {
  it('createWorkflow stores + listWorkflows returns it', () => {
    const wf = createWorkflow(E, {
      name: 'W', stages: [{ name: 'S1', order: 1, type: 'task', autoTransition: false }],
    });
    expect(listWorkflows(E)).toContainEqual(wf);
    expect(wf.stages[0].id).toBeTruthy();
  });

  it('createWorkflow throws on empty stages', () => {
    expect(() => createWorkflow(E, { name: 'X', stages: [] })).toThrow();
  });

  it('deleteWorkflow removes the row', () => {
    const wf = createWorkflow(E, { name: 'W', stages: [{ name: 'S', order: 1, type: 'task', autoTransition: false }] });
    deleteWorkflow(E, wf.id);
    expect(listWorkflows(E)).toHaveLength(0);
  });

  it('applyWorkflowToTask materialises stages as ordered checklist with badges + workflow tag', () => {
    const t = seed();
    const wf = createWorkflow(E, {
      name: 'Approve', stages: [
        { name: 'Prep', order: 1, type: 'task', autoTransition: false },
        { name: 'Sign', order: 2, type: 'approval', autoTransition: true },
        { name: 'Notify', order: 3, type: 'notification', autoTransition: false },
      ],
    });
    const spawned = applyWorkflowToTask(E, t.id, wf.id);
    expect(spawned).toHaveLength(3);
    const items = listChecklistItems(E, t.id);
    expect(items[0].title).toMatch(/^\[task\]/);
    expect(items[1].title).toMatch(/^\[approval\]/);
    expect(items[2].title).toMatch(/^\[notification\]/);
    const fresh = getTask(E, t.id);
    expect(fresh?.tags).toContain(`workflow:${wf.id}`);
  });

  it('getWorkflowProgress reports pending stage', () => {
    const t = seed();
    const wf = createWorkflow(E, {
      name: 'Two', stages: [
        { name: 'A', order: 1, type: 'task', autoTransition: false },
        { name: 'B', order: 2, type: 'task', autoTransition: false },
      ],
    });
    applyWorkflowToTask(E, t.id, wf.id);
    const p1 = getWorkflowProgress(E, t.id);
    expect(p1?.total).toBe(2);
    expect(p1?.done).toBe(0);
    expect(p1?.pendingStage).toMatch(/A/);
    const items = listChecklistItems(E, t.id);
    toggleChecklistItem(E, items[0].id);
    expect(getWorkflowProgress(E, t.id)?.done).toBe(1);
  });

  it('getWorkflowProgress returns null when no workflow tag', () => {
    const t = seed();
    expect(getWorkflowProgress(E, t.id)).toBeNull();
  });
});

describe('S139 · TF recurring', () => {
  const advanceToInReview = (id: string): void => {
    changeStatus(E, id, 'in_progress');
    changeStatus(E, id, 'in_review');
  };

  it('completeRecurringTask returns next=null when task lacks recurringConfig', () => {
    const due = '2026-06-01T00:00:00.000Z';
    const t = seed({ title: 'R', dueDate: due, isRecurring: true });
    advanceToInReview(t.id);
    const r = completeRecurringTask(E, t.id);
    expect(r.completed.status).toBe('completed');
    expect(r.next).toBeNull();
  });

  it('completeRecurringTask spawns next instance with idempotent recur tag', () => {
    const due = '2026-06-01T00:00:00.000Z';
    const t = seed({ title: 'R2', dueDate: due, isRecurring: true });
    advanceToInReview(t.id);
    const raw = JSON.parse(localStorage.getItem(taskflowKey(E)) || '[]');
    const idx = raw.findIndex((x: { id: string }) => x.id === t.id);
    raw[idx].recurringConfig = { frequency: 'weekly', interval: 1 };
    localStorage.setItem(taskflowKey(E), JSON.stringify(raw));
    const r = completeRecurringTask(E, t.id);
    expect(r.completed.status).toBe('completed');
    expect(r.next).not.toBeNull();
    expect(r.next!.tags.some((tag) => tag.startsWith(`recur:${t.id}:`))).toBe(true);
  });

  it('completeRecurringTask is idempotent on double-complete', () => {
    const due = '2026-06-01T00:00:00.000Z';
    const t = seed({ title: 'R', dueDate: due, isRecurring: true });
    advanceToInReview(t.id);
    const raw = JSON.parse(localStorage.getItem(taskflowKey(E)) || '[]');
    raw[0].recurringConfig = { frequency: 'daily', interval: 1 };
    localStorage.setItem(taskflowKey(E), JSON.stringify(raw));
    const r1 = completeRecurringTask(E, t.id);
    const r2 = completeRecurringTask(E, t.id);
    expect(r1.next?.id).toBe(r2.next?.id);
    const recurChildren = listTasks(E).filter((x) => x.tags.some((tag) => tag.startsWith(`recur:${t.id}:`)));
    expect(recurChildren).toHaveLength(1);
  });

  it('completeRecurringTask stops past endDate', () => {
    const due = '2026-06-01T00:00:00.000Z';
    const t = seed({ title: 'R', dueDate: due, isRecurring: true });
    advanceToInReview(t.id);
    const raw = JSON.parse(localStorage.getItem(taskflowKey(E)) || '[]');
    raw[0].recurringConfig = { frequency: 'daily', interval: 1, endDate: '2026-06-01T00:00:00.000Z' };
    localStorage.setItem(taskflowKey(E), JSON.stringify(raw));
    const r = completeRecurringTask(E, t.id);
    expect(r.next).toBeNull();
  });

  it('getRecurrenceChain returns root + children', () => {
    const due = '2026-06-01T00:00:00.000Z';
    const t = seed({ title: 'R', dueDate: due, isRecurring: true });
    advanceToInReview(t.id);
    const raw = JSON.parse(localStorage.getItem(taskflowKey(E)) || '[]');
    raw[0].recurringConfig = { frequency: 'monthly', interval: 1 };
    localStorage.setItem(taskflowKey(E), JSON.stringify(raw));
    completeRecurringTask(E, t.id);
    const chain = getRecurrenceChain(E, t.id);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain[0].id).toBe(t.id);
  });
});

describe('S139 · TF-32 Decision Register', () => {
  it('recordDecision stores + listDecisions returns it', () => {
    const d = recordDecision(E, {
      entityId: 'e1', decision: 'Adopt SOP-42', decidedByUserId: 'u1',
    });
    expect(listDecisions(E)).toContainEqual(d);
  });

  it('recordDecision throws on empty decision text', () => {
    expect(() => recordDecision(E, {
      entityId: 'e1', decision: '   ', decidedByUserId: 'u1',
    })).toThrow();
  });

  it('linkDecisionToTask appends + is idempotent', () => {
    const d = recordDecision(E, { entityId: 'e1', decision: 'D', decidedByUserId: 'u1' });
    const t = seed();
    const a = linkDecisionToTask(E, d.id, t.id);
    const b = linkDecisionToTask(E, d.id, t.id);
    expect(a.linkedTaskIds).toEqual([t.id]);
    expect(b.linkedTaskIds).toEqual([t.id]);
  });

  it('listDecisions filters by decidedByUserId', () => {
    recordDecision(E, { entityId: 'e1', decision: 'A', decidedByUserId: 'u1' });
    recordDecision(E, { entityId: 'e1', decision: 'B', decidedByUserId: 'u2' });
    expect(listDecisions(E, { decidedByUserId: 'u1' })).toHaveLength(1);
  });
});

describe('S139 · Meeting Minutes', () => {
  it('createMeetingMinutes stores + listMinutes returns', () => {
    const m = createMeetingMinutes(E, {
      entityId: 'e1', title: 'Mtg', heldAt: '2026-06-04T05:30:00.000Z',
      attendeeUserIds: ['u1'], notes: '', createdByUserId: 'u1',
    });
    expect(listMinutes(E)).toContainEqual(m);
  });

  it('spawnTasksFromMinutes creates tasks per actionItem + tags mom:<id>', () => {
    const m = createMeetingMinutes(E, {
      entityId: 'e1', title: 'Mtg', heldAt: '2026-06-04T05:30:00.000Z',
      attendeeUserIds: [], notes: '',
      actionItems: [
        { title: 'Send report', assigneeId: 'u1', dueDate: null },
        { title: 'Schedule QBR',  assigneeId: 'u2', dueDate: null },
      ],
      createdByUserId: 'u0',
    });
    const spawned = spawnTasksFromMinutes(E, m.id, 'u0');
    expect(spawned).toHaveLength(2);
    spawned.forEach((t) => expect(t.tags).toContain(`mom:${m.id}`));
  });

  it('spawnTasksFromMinutes is idempotent (does not respawn)', () => {
    const m = createMeetingMinutes(E, {
      entityId: 'e1', title: 'M', heldAt: '2026-06-04T05:30:00.000Z',
      attendeeUserIds: [], notes: '',
      actionItems: [{ title: 'X', assigneeId: 'u1', dueDate: null }],
      createdByUserId: 'u0',
    });
    const a = spawnTasksFromMinutes(E, m.id, 'u0');
    const b = spawnTasksFromMinutes(E, m.id, 'u0');
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
  });
});

describe('S139 · storage key helpers', () => {
  it('all storage keys are entity-scoped', () => {
    expect(tfChecklistsKey('X')).toBe('tf_checklists_X');
    expect(tfTemplatesKey('X')).toBe('tf_templates_X');
    expect(tfWorkflowsKey('X')).toBe('tf_workflows_X');
    expect(tfDecisionsKey('X')).toBe('tf_decisions_X');
    expect(tfMinutesKey('X')).toBe('tf_minutes_X');
  });

  it('S137/S138 storage keys remain reachable (0-DIFF posture)', () => {
    expect(taskflowKey('X')).toBe('taskflow_v1_X');
    expect(taskflowCommentsKey('X')).toBe('taskflow_comments_v1_X');
    expect(taskflowReassignmentsKey('X')).toBe('tf_reassignments_X');
    expect(taskflowDueDateChangesKey('X')).toBe('tf_duedate_changes_X');
    expect(taskflowAuditChainKey('X')).toBe('tf_task_audit_X');
  });
});

describe('S139 · institutional registers', () => {
  it('SPRINTS contains S139 with predecessor dc387822', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 139);
    expect(s).toBeTruthy();
    expect(s?.predecessorSha).toBe('dc387822');
    expect(s?.newSiblings).toContain('taskflow-workflow-engine');
  });

  it('SPRINTS still has S138 with banked SHA dc387822', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 138);
    expect(s?.headSha).toBe('dc387822');
  });

  it('SIBLINGS contains taskflow-workflow-engine sprint 139', () => {
    const s = SIBLINGS.find((x) => x.id === 'taskflow-workflow-engine');
    expect(s).toBeTruthy();
    expect(s?.sprintAdded).toBe(139);
  });

  it('No SIBLING name leaks "Phase 8 OPENER" outside taskflow-engine row', () => {
    const offenders = SIBLINGS.filter(
      (s) => s.id !== 'taskflow-engine' && /Phase 8 OPENER/i.test(s.name),
    );
    expect(offenders).toEqual([]);
  });
});
