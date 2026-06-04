/**
 * @file        src/lib/taskflow-workflow-engine.ts
 * @realizes    TaskFlow Structure Slice · TF-14-full (checklists/milestones/dependency
 *              enforcement) · workflows · templates · recurring · TF-32
 *              (Decision Register + MoM-to-tasks)
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Pillar A.6.4 · TaskFlow Arc
 * @decisions   DESIGN-DECISION-FLAG S139-1: checklist-resolver injection — workflow-engine
 *              registers a synchronous milestone resolver with taskflow-engine at
 *              module init to avoid circular imports (workflow-engine imports engine
 *              types; engine never imports workflow).
 *              DESIGN-DECISION-FLAG S139-2: recurrence tag scheme `recur:<parentId>:<n>`
 *              guarantees idempotent spawn on double-complete (de-dupe by tag).
 *              DESIGN-DECISION-FLAG S139-3: workflows materialize as ordered checklist
 *              items (lean per TF-1 phasing) · stage type badged in title
 *              [task]/[approval]/[review]/[notification] · stored ref via task tag
 *              `workflow:<id>` (no Task model change).
 *              §L-NOTE: stage.autoTransition is RECORDED but NOT executed client-side
 *              (honesty). Real auto-transition = [JWT] P2BB server scheduler.
 *              All mutations audited via reused `taskflow_event` audit type.
 * @[JWT]       P2BB: server recurrence scheduler · workflow auto-transitions
 */

import {
  type ChecklistItem,
  type TaskTemplate,
  type TaskWorkflowTemplate,
  type TaskWorkflowStage,
  type Task,
  type RecurringConfig,
  type TaskCategory,
  type TaskPriority,
} from '@/types/taskflow';
import {
  createTask,
  changeStatus,
  getTask,
  updateTask,
  listTasks,
  registerMilestoneResolver,
  type CreateTaskInput,
} from '@/lib/taskflow-engine';
import { logAudit } from '@/lib/audit-trail-engine';

// ── Storage keys (§O entity-scoped) ───────────────────────────────────────
export const tfChecklistsKey  = (e: string): string => e ? `tf_checklists_${e}`  : 'tf_checklists';
export const tfTemplatesKey   = (e: string): string => e ? `tf_templates_${e}`   : 'tf_templates';
export const tfWorkflowsKey   = (e: string): string => e ? `tf_workflows_${e}`   : 'tf_workflows';
export const tfDecisionsKey   = (e: string): string => e ? `tf_decisions_${e}`   : 'tf_decisions';
export const tfMinutesKey     = (e: string): string => e ? `tf_minutes_${e}`     : 'tf_minutes';

// ── tiny JSON helpers (private · same posture as taskflow-engine) ─────────
const readJSON = <T,>(k: string, fb: T): T => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; }
  catch { return fb; }
};
const writeJSON = (k: string, v: unknown): void => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore quota */ }
};
const safeAudit = (e: Parameters<typeof logAudit>[0]): void => {
  try { logAudit(e); } catch { /* D-AUDIT-SAFE */ }
};
const newId = (p: string): string =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── TF-32 · Decision Register types (VERBATIM per spec) ───────────────────
export interface DecisionRecord {
  id: string; entityId: string;
  decision: string;                  // what was decided (mandatory · throw on empty)
  context?: string | null;
  decidedAt: string;                 // when
  decidedByUserId: string;           // who ruled
  presentUserIds: string[];          // who was present
  linkedTaskIds: string[];
  linkedConversationRef?: string | null;  // OperixChat seam (S140+)
  meetingMinutesId?: string | null;
  createdAt: string; createdByUserId: string;
}
export interface MeetingMinutes {
  id: string; entityId: string;
  title: string; heldAt: string;
  attendeeUserIds: string[];         // employee ids
  notes: string;
  decisionIds: string[];
  actionItems: { title: string; assigneeId: string; dueDate: string | null; taskId?: string }[];
  createdAt: string; createdByUserId: string;
}

// ════════════════════════════════════════════════════════════════════════
// (a) CHECKLISTS · TF-14
// ════════════════════════════════════════════════════════════════════════

export interface AddChecklistItemInput {
  taskId: string;
  title: string;
  isMilestone?: boolean;
  dependsOn?: string;
  order?: number;
  notes?: string;
}

function listAllChecklist(entityCode: string): ChecklistItem[] {
  return readJSON<ChecklistItem[]>(tfChecklistsKey(entityCode), []);
}

export function listChecklistItems(entityCode: string, taskId: string): ChecklistItem[] {
  return listAllChecklist(entityCode)
    .filter((c) => c.taskId === taskId)
    .sort((a, b) => a.order - b.order);
}

export function addChecklistItem(
  entityCode: string,
  input: AddChecklistItemInput,
  _byUserId = 'system',
): ChecklistItem {
  if (!input.title || !input.title.trim()) {
    throw new Error('TaskFlow: checklist item title is required');
  }
  const all = listAllChecklist(entityCode);
  const taskItems = all.filter((c) => c.taskId === input.taskId);
  const order = input.order ?? (taskItems.length === 0 ? 1 : Math.max(...taskItems.map((t) => t.order)) + 1);
  const item: ChecklistItem = {
    id: newId('chk'),
    taskId: input.taskId,
    title: input.title.trim(),
    isCompleted: false,
    isMilestone: input.isMilestone ?? false,
    dependsOn: input.dependsOn,
    notes: input.notes,
    order,
  };
  writeJSON(tfChecklistsKey(entityCode), [...all, item]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event', recordId: item.id,
    recordLabel: `checklist:${item.title}`,
    beforeState: null, afterState: item as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return item;
}

export function removeChecklistItem(entityCode: string, itemId: string, _byUserId = 'system'): void {
  const all = listAllChecklist(entityCode);
  const before = all.find((c) => c.id === itemId);
  if (!before) return;
  writeJSON(tfChecklistsKey(entityCode), all.filter((c) => c.id !== itemId));
  safeAudit({
    entityCode, action: 'cancel', entityType: 'taskflow_event', recordId: itemId,
    recordLabel: `checklist:${before.title}`,
    beforeState: before as unknown as Record<string, unknown>, afterState: null,
    sourceModule: 'taskflow',
  });
}

/**
 * Toggle a checklist item. Throws when attempting to COMPLETE an item whose
 * `dependsOn` predecessor is itself incomplete.
 */
export function toggleChecklistItem(
  entityCode: string,
  itemId: string,
  byUserId = 'system',
  nowISO: string = new Date().toISOString(),
): ChecklistItem {
  const all = listAllChecklist(entityCode);
  const idx = all.findIndex((c) => c.id === itemId);
  if (idx < 0) throw new Error(`TaskFlow: checklist item ${itemId} not found`);
  const before = all[idx];
  const willComplete = !before.isCompleted;
  if (willComplete && before.dependsOn) {
    const pred = all.find((c) => c.id === before.dependsOn);
    if (pred && !pred.isCompleted) {
      throw new Error(
        `TaskFlow: cannot complete "${before.title}" — predecessor "${pred.title}" incomplete`,
      );
    }
  }
  const next: ChecklistItem = {
    ...before,
    isCompleted: willComplete,
    completedBy: willComplete ? byUserId : undefined,
    completedAt: willComplete ? nowISO : undefined,
  };
  const list = [...all];
  list[idx] = next;
  writeJSON(tfChecklistsKey(entityCode), list);
  safeAudit({
    entityCode, action: 'update', entityType: 'taskflow_event', recordId: itemId,
    recordLabel: `checklist:${before.title}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return next;
}

export interface ChecklistProgress {
  total: number;
  done: number;
  milestonesPending: number;
}

export function getChecklistProgress(entityCode: string, taskId: string): ChecklistProgress {
  const items = listChecklistItems(entityCode, taskId);
  return {
    total: items.length,
    done: items.filter((i) => i.isCompleted).length,
    milestonesPending: items.filter((i) => i.isMilestone && !i.isCompleted).length,
  };
}

// ── Milestone resolver registration (TF-14-full · injected into engine) ───
registerMilestoneResolver((entityCode, taskId) =>
  listChecklistItems(entityCode, taskId)
    .filter((i) => i.isMilestone && !i.isCompleted)
    .map((i) => i.title),
);

// ════════════════════════════════════════════════════════════════════════
// (c) TEMPLATES
// ════════════════════════════════════════════════════════════════════════

export interface CreateTemplateInput {
  name: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  checklistItems: string[];
  estimatedHours: number;
  departmentId?: string;
  createdBy: string;
}

export function listTemplates(entityCode: string): TaskTemplate[] {
  return readJSON<TaskTemplate[]>(tfTemplatesKey(entityCode), []);
}
export function getTemplate(entityCode: string, id: string): TaskTemplate | null {
  return listTemplates(entityCode).find((t) => t.id === id) ?? null;
}
export function createTemplate(entityCode: string, input: CreateTemplateInput): TaskTemplate {
  if (!input.name || !input.name.trim()) throw new Error('TaskFlow: template name required');
  const t: TaskTemplate = {
    id: newId('tpl'),
    name: input.name.trim(),
    description: input.description,
    category: input.category,
    priority: input.priority,
    checklistItems: input.checklistItems,
    estimatedHours: input.estimatedHours,
    departmentId: input.departmentId,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  writeJSON(tfTemplatesKey(entityCode), [...listTemplates(entityCode), t]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event', recordId: t.id,
    recordLabel: `template:${t.name}`,
    beforeState: null, afterState: t as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return t;
}
export function deleteTemplate(entityCode: string, id: string): void {
  const all = listTemplates(entityCode);
  const before = all.find((t) => t.id === id);
  if (!before) return;
  writeJSON(tfTemplatesKey(entityCode), all.filter((t) => t.id !== id));
  safeAudit({
    entityCode, action: 'cancel', entityType: 'taskflow_event', recordId: id,
    recordLabel: `template:${before.name}`,
    beforeState: before as unknown as Record<string, unknown>, afterState: null,
    sourceModule: 'taskflow',
  });
}

export function createTaskFromTemplate(
  entityCode: string,
  templateId: string,
  overrides: Partial<CreateTaskInput> & Pick<CreateTaskInput, 'assigneeId' | 'assigneeName' | 'entityId'>,
  byUserId: string,
): Task {
  const tpl = getTemplate(entityCode, templateId);
  if (!tpl) throw new Error(`TaskFlow: template ${templateId} not found`);
  const input: CreateTaskInput = {
    title: overrides.title ?? tpl.name,
    description: overrides.description ?? tpl.description,
    assigneeId: overrides.assigneeId,
    assigneeName: overrides.assigneeName,
    creatorId: byUserId,
    departmentId: overrides.departmentId ?? tpl.departmentId ?? null,
    priority: overrides.priority ?? tpl.priority,
    category: overrides.category ?? tpl.category,
    dueDate: overrides.dueDate ?? null,
    estimatedHours: overrides.estimatedHours ?? tpl.estimatedHours,
    tags: overrides.tags ?? [],
    templateId: tpl.id,
    entityId: overrides.entityId,
    branchId: overrides.branchId ?? null,
    dependencyIds: overrides.dependencyIds ?? [],
    watcherIds: overrides.watcherIds ?? [],
    clientId: overrides.clientId ?? null,
    vendorId: overrides.vendorId ?? null,
    projectId: overrides.projectId ?? null,
    parentTaskId: overrides.parentTaskId ?? null,
    slaDate: overrides.slaDate ?? null,
    isRecurring: overrides.isRecurring ?? false,
  };
  const task = createTask(entityCode, input);
  for (let i = 0; i < tpl.checklistItems.length; i++) {
    addChecklistItem(entityCode, { taskId: task.id, title: tpl.checklistItems[i], order: i + 1 }, byUserId);
  }
  return task;
}

// ════════════════════════════════════════════════════════════════════════
// (d) WORKFLOWS · lean per TF-1 phasing
// ════════════════════════════════════════════════════════════════════════

export interface CreateWorkflowInput {
  name: string;
  stages: Omit<TaskWorkflowStage, 'id'>[];
  isActive?: boolean;
}

export function listWorkflows(entityCode: string): TaskWorkflowTemplate[] {
  return readJSON<TaskWorkflowTemplate[]>(tfWorkflowsKey(entityCode), []);
}
export function getWorkflow(entityCode: string, id: string): TaskWorkflowTemplate | null {
  return listWorkflows(entityCode).find((w) => w.id === id) ?? null;
}
export function createWorkflow(entityCode: string, input: CreateWorkflowInput): TaskWorkflowTemplate {
  if (!input.name || !input.name.trim()) throw new Error('TaskFlow: workflow name required');
  if (!input.stages || input.stages.length === 0) {
    throw new Error('TaskFlow: workflow needs at least one stage');
  }
  const wf: TaskWorkflowTemplate = {
    id: newId('wf'),
    name: input.name.trim(),
    stages: input.stages.map((s) => ({ ...s, id: newId('stg') })),
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
  };
  writeJSON(tfWorkflowsKey(entityCode), [...listWorkflows(entityCode), wf]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event', recordId: wf.id,
    recordLabel: `workflow:${wf.name}`,
    beforeState: null, afterState: wf as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return wf;
}
export function deleteWorkflow(entityCode: string, id: string): void {
  const all = listWorkflows(entityCode);
  const before = all.find((w) => w.id === id);
  if (!before) return;
  writeJSON(tfWorkflowsKey(entityCode), all.filter((w) => w.id !== id));
  safeAudit({
    entityCode, action: 'cancel', entityType: 'taskflow_event', recordId: id,
    recordLabel: `workflow:${before.name}`,
    beforeState: before as unknown as Record<string, unknown>, afterState: null,
    sourceModule: 'taskflow',
  });
}

const STAGE_BADGE: Record<TaskWorkflowStage['type'], string> = {
  task: '[task]',
  approval: '[approval]',
  review: '[review]',
  notification: '[notification]',
};

/**
 * Materialize a workflow on a task as an ordered checklist (one item per
 * stage). Stage type is badged into the item title. `autoTransition` flags
 * are RECORDED on the workflow but NEVER executed here (§L-note · honesty).
 * The task gains a `workflow:<workflowId>` tag (no Task model change).
 */
export function applyWorkflowToTask(
  entityCode: string,
  taskId: string,
  workflowId: string,
  byUserId = 'system',
): ChecklistItem[] {
  const task = getTask(entityCode, taskId);
  if (!task) throw new Error(`TaskFlow: task ${taskId} not found`);
  const wf = getWorkflow(entityCode, workflowId);
  if (!wf) throw new Error(`TaskFlow: workflow ${workflowId} not found`);
  const stages = [...wf.stages].sort((a, b) => a.order - b.order);
  const spawned: ChecklistItem[] = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const item = addChecklistItem(
      entityCode,
      {
        taskId,
        title: `${STAGE_BADGE[s.type]} ${s.name}`,
        order: 1000 + i,
        notes: s.autoTransition ? 'autoTransition:recorded' : undefined,
      },
      byUserId,
    );
    spawned.push(item);
  }
  const tag = `workflow:${workflowId}`;
  if (!task.tags.includes(tag)) {
    updateTask(entityCode, taskId, { tags: [...task.tags, tag] }, byUserId);
  }
  return spawned;
}

export interface WorkflowProgress {
  workflowId: string;
  total: number;
  done: number;
  pendingStage?: string;
}
export function getWorkflowProgress(entityCode: string, taskId: string): WorkflowProgress | null {
  const task = getTask(entityCode, taskId);
  if (!task) return null;
  const tag = task.tags.find((t) => t.startsWith('workflow:'));
  if (!tag) return null;
  const workflowId = tag.slice('workflow:'.length);
  const items = listChecklistItems(entityCode, taskId)
    .filter((i) => i.title.startsWith('['));
  const pending = items.find((i) => !i.isCompleted);
  return {
    workflowId,
    total: items.length,
    done: items.filter((i) => i.isCompleted).length,
    pendingStage: pending?.title,
  };
}

// ════════════════════════════════════════════════════════════════════════
// (e) RECURRING
// ════════════════════════════════════════════════════════════════════════

function advanceDate(iso: string, cfg: RecurringConfig): string {
  const d = new Date(iso);
  const n = cfg.interval;
  switch (cfg.frequency) {
    case 'daily':     d.setUTCDate(d.getUTCDate() + n); break;
    case 'weekly':    d.setUTCDate(d.getUTCDate() + 7 * n); break;
    case 'monthly':   d.setUTCMonth(d.getUTCMonth() + n); break;
    case 'quarterly': d.setUTCMonth(d.getUTCMonth() + 3 * n); break;
  }
  return d.toISOString();
}

/**
 * Complete a task and spawn the next recurrence (idempotent · time-robust).
 * Next instance tagged `recur:<parentId>:<n>` so a duplicate complete cannot
 * spawn twice. Recurrence stops when next due > endDate.
 */
export function completeRecurringTask(
  entityCode: string,
  taskId: string,
  byUserId = 'system',
): { completed: Task; next: Task | null } {
  const before = getTask(entityCode, taskId);
  if (!before) throw new Error(`TaskFlow: task ${taskId} not found`);
  // changeStatus enforces dependency + milestone gates (TF-14-full).
  const completed = before.status === 'completed' ? before : changeStatus(entityCode, taskId, 'completed', byUserId);

  if (!completed.isRecurring || !completed.recurringConfig || !completed.dueDate) {
    return { completed, next: null };
  }
  const cfg = completed.recurringConfig;
  const parentId = completed.tags.find((t) => t.startsWith('recur:'))?.split(':')[1] ?? completed.id;

  // Idempotency: count existing children to derive next sequence n.
  const all = listTasks(entityCode);
  const existing = all.filter((t) => t.tags.some((tag) => tag.startsWith(`recur:${parentId}:`)));
  const n = existing.length + 1;
  const recurTag = `recur:${parentId}:${n}`;
  if (all.some((t) => t.tags.includes(recurTag))) {
    return { completed, next: all.find((t) => t.tags.includes(recurTag)) ?? null };
  }
  const nextDue = advanceDate(completed.dueDate, cfg);
  if (cfg.endDate && nextDue > cfg.endDate) return { completed, next: null };

  const next = createTask(entityCode, {
    title: completed.title,
    description: completed.description,
    assigneeId: completed.assigneeId,
    assigneeName: completed.assigneeName,
    creatorId: byUserId,
    departmentId: completed.departmentId,
    priority: completed.priority,
    category: completed.category,
    dueDate: nextDue,
    estimatedHours: completed.estimatedHours ?? null,
    tags: [...completed.tags.filter((t) => !t.startsWith('recur:')), recurTag],
    entityId: completed.entityId,
    branchId: completed.branchId ?? null,
    isRecurring: true,
  });
  // Preserve recurringConfig on next instance.
  updateTask(entityCode, next.id, { recurringConfig: cfg }, byUserId);
  return { completed, next };
}

export function getRecurrenceChain(entityCode: string, taskId: string): Task[] {
  const task = getTask(entityCode, taskId);
  if (!task) return [];
  const parentId = task.tags.find((t) => t.startsWith('recur:'))?.split(':')[1] ?? task.id;
  const all = listTasks(entityCode);
  const root = all.find((t) => t.id === parentId) ?? task;
  const children = all
    .filter((t) => t.tags.some((tag) => tag.startsWith(`recur:${parentId}:`)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [root, ...children];
}

// ════════════════════════════════════════════════════════════════════════
// (f) DECISION REGISTER · TF-32
// ════════════════════════════════════════════════════════════════════════

export interface RecordDecisionInput {
  entityId: string;
  decision: string;
  context?: string | null;
  decidedAt?: string;
  decidedByUserId: string;
  presentUserIds?: string[];
  linkedTaskIds?: string[];
  linkedConversationRef?: string | null;
  meetingMinutesId?: string | null;
}

export function listDecisions(
  entityCode: string,
  filter?: { meetingMinutesId?: string; decidedByUserId?: string },
): DecisionRecord[] {
  let list = readJSON<DecisionRecord[]>(tfDecisionsKey(entityCode), []);
  if (filter?.meetingMinutesId) list = list.filter((d) => d.meetingMinutesId === filter.meetingMinutesId);
  if (filter?.decidedByUserId) list = list.filter((d) => d.decidedByUserId === filter.decidedByUserId);
  return list;
}

export function recordDecision(entityCode: string, input: RecordDecisionInput): DecisionRecord {
  if (!input.decision || !input.decision.trim()) {
    throw new Error('TaskFlow: decision text is required');
  }
  const now = new Date().toISOString();
  const rec: DecisionRecord = {
    id: newId('dec'),
    entityId: input.entityId,
    decision: input.decision.trim(),
    context: input.context ?? null,
    decidedAt: input.decidedAt ?? now,
    decidedByUserId: input.decidedByUserId,
    presentUserIds: input.presentUserIds ?? [],
    linkedTaskIds: input.linkedTaskIds ?? [],
    linkedConversationRef: input.linkedConversationRef ?? null,
    meetingMinutesId: input.meetingMinutesId ?? null,
    createdAt: now,
    createdByUserId: input.decidedByUserId,
  };
  writeJSON(tfDecisionsKey(entityCode), [...listDecisions(entityCode), rec]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event', recordId: rec.id,
    recordLabel: `decision:${rec.decision.slice(0, 60)}`,
    beforeState: null, afterState: rec as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return rec;
}

export function linkDecisionToTask(
  entityCode: string,
  decisionId: string,
  taskId: string,
): DecisionRecord {
  const all = listDecisions(entityCode);
  const idx = all.findIndex((d) => d.id === decisionId);
  if (idx < 0) throw new Error(`TaskFlow: decision ${decisionId} not found`);
  const before = all[idx];
  if (before.linkedTaskIds.includes(taskId)) return before;
  const next: DecisionRecord = { ...before, linkedTaskIds: [...before.linkedTaskIds, taskId] };
  const list = [...all]; list[idx] = next;
  writeJSON(tfDecisionsKey(entityCode), list);
  safeAudit({
    entityCode, action: 'update', entityType: 'taskflow_event', recordId: decisionId,
    recordLabel: `decision:link-task`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return next;
}

// ── Meeting Minutes ───────────────────────────────────────────────────────

export interface CreateMinutesInput {
  entityId: string;
  title: string;
  heldAt: string;
  attendeeUserIds: string[];
  notes: string;
  decisionIds?: string[];
  actionItems?: { title: string; assigneeId: string; dueDate: string | null }[];
  createdByUserId: string;
}

export function listMinutes(entityCode: string): MeetingMinutes[] {
  return readJSON<MeetingMinutes[]>(tfMinutesKey(entityCode), []);
}
export function getMinutes(entityCode: string, id: string): MeetingMinutes | null {
  return listMinutes(entityCode).find((m) => m.id === id) ?? null;
}

export function createMeetingMinutes(entityCode: string, input: CreateMinutesInput): MeetingMinutes {
  if (!input.title || !input.title.trim()) throw new Error('TaskFlow: minutes title required');
  const now = new Date().toISOString();
  const m: MeetingMinutes = {
    id: newId('mom'),
    entityId: input.entityId,
    title: input.title.trim(),
    heldAt: input.heldAt,
    attendeeUserIds: input.attendeeUserIds,
    notes: input.notes,
    decisionIds: input.decisionIds ?? [],
    actionItems: (input.actionItems ?? []).map((a) => ({ ...a })),
    createdAt: now,
    createdByUserId: input.createdByUserId,
  };
  writeJSON(tfMinutesKey(entityCode), [...listMinutes(entityCode), m]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event', recordId: m.id,
    recordLabel: `minutes:${m.title}`,
    beforeState: null, afterState: m as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return m;
}

/**
 * Spawn one task per actionItem (idempotent · `actionItem.taskId` set once,
 * skipped thereafter). Tasks land in `open` status; normal acknowledgment
 * flow applies (TF-29a).
 */
export function spawnTasksFromMinutes(
  entityCode: string,
  minutesId: string,
  byUserId: string,
): Task[] {
  const all = listMinutes(entityCode);
  const idx = all.findIndex((m) => m.id === minutesId);
  if (idx < 0) throw new Error(`TaskFlow: minutes ${minutesId} not found`);
  const minutes = all[idx];
  const spawned: Task[] = [];
  const tag = `mom:${minutesId}`;
  const nextItems = minutes.actionItems.map((a) => {
    if (a.taskId) return a; // idempotent
    const t = createTask(entityCode, {
      title: a.title,
      description: `Action item from "${minutes.title}"`,
      assigneeId: a.assigneeId || null,
      assigneeName: a.assigneeId || '',
      creatorId: byUserId,
      departmentId: null,
      priority: 'medium',
      category: 'general',
      dueDate: a.dueDate,
      tags: [tag],
      entityId: minutes.entityId,
    });
    spawned.push(t);
    return { ...a, taskId: t.id };
  });
  const nextMinutes: MeetingMinutes = { ...minutes, actionItems: nextItems };
  const list = [...all]; list[idx] = nextMinutes;
  writeJSON(tfMinutesKey(entityCode), list);
  if (spawned.length > 0) {
    safeAudit({
      entityCode, action: 'update', entityType: 'taskflow_event', recordId: minutesId,
      recordLabel: `minutes:spawn:${spawned.length}`,
      beforeState: minutes as unknown as Record<string, unknown>,
      afterState: nextMinutes as unknown as Record<string, unknown>,
      sourceModule: 'taskflow',
    });
  }
  return spawned;
}
