/**
 * @file        src/lib/taskflow-engine.ts
 * @purpose     TaskFlow MVP engine · CRUD + status lifecycle + computed Due-Soon
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · 🎬 Phase 8 OPENER · Block 2
 * @decisions   DP-P7-2 additive · FR-44 read-only consume from 4 SSOT surfaces:
 *              · assignee  ← useEmployees (read pattern via 4ds_employees_* keys)
 *              · dept      ← useOrgStructure / DEPARTMENTS_KEY
 *              · customer  ← party-master-engine.loadPartiesByType('customer')
 *              · vendor    ← party-master-engine.loadPartiesByType('vendor')
 *              All 4 source surfaces stay 0-DIFF.
 *              §O entity-scoped localStorage via taskflowKey(entityCode).
 *              Audit type 'taskflow_event' under mca-roc (ComplianceModule UNTOUCHED).
 *              D-AUDIT-SAFE try/catch around logAudit.
 * @[JWT]       GET/POST/PUT /api/taskflow/tasks
 */

import {
  type Task,
  type TaskComment,
  type TaskStatus,
  type TaskPriority,
  taskflowKey,
  taskflowCommentsKey,
  TASK_STATUS_TRANSITIONS,
} from '@/types/taskflow';
import { logAudit } from '@/lib/audit-trail-engine';

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
};

const safeAudit = (entry: Parameters<typeof logAudit>[0]): void => {
  try {
    logAudit(entry);
  } catch {
    /* D-AUDIT-SAFE: never let audit failures cascade into business logic */
  }
};

const genCode = (all: Task[]): string => {
  const next = all.length + 1;
  return 'TSK-' + String(next).padStart(6, '0');
};

// ── Reads ──────────────────────────────────────────────────────────────────

// [JWT] GET /api/taskflow/tasks?entityCode={e}
export function listTasks(entityCode: string): Task[] {
  return readJSON<Task[]>(taskflowKey(entityCode), []);
}

export function getTask(entityCode: string, id: string): Task | null {
  return listTasks(entityCode).find((t) => t.id === id) ?? null;
}

// [JWT] GET /api/taskflow/comments?taskId={id}
export function listComments(entityCode: string, taskId: string): TaskComment[] {
  return readJSON<TaskComment[]>(taskflowCommentsKey(entityCode), []).filter(
    (c) => c.task_id === taskId,
  );
}

// ── Writes ─────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignee_id: string | null;
  assignee_name: string;
  department_code: string | null;
  customer_id?: string | null;
  vendor_id?: string | null;
  priority: TaskPriority;
  due_at: string | null;
  entity_id: string;
  created_by: string;
}

// [JWT] POST /api/taskflow/tasks
export function createTask(entityCode: string, input: CreateTaskInput): Task {
  if (!input.title || !input.title.trim()) {
    throw new Error('TaskFlow: title is required');
  }
  const now = new Date().toISOString();
  const all = listTasks(entityCode);
  const task: Task = {
    id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: genCode(all),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    assignee_id: input.assignee_id,
    assignee_name: input.assignee_name,
    department_code: input.department_code,
    customer_id: input.customer_id ?? null,
    vendor_id: input.vendor_id ?? null,
    priority: input.priority,
    status: 'open',
    due_at: input.due_at,
    entity_id: input.entity_id,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  };
  writeJSON(taskflowKey(entityCode), [...all, task]);
  safeAudit({
    entityCode,
    action: 'create',
    entityType: 'taskflow_event',
    recordId: task.id,
    recordLabel: `${task.code} · ${task.title} · assigned:${task.assignee_name}`,
    beforeState: null,
    afterState: task as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return task;
}

// [JWT] PATCH /api/taskflow/tasks/:id
export function updateTask(
  entityCode: string,
  id: string,
  patch: Partial<Omit<Task, 'id' | 'code' | 'created_at' | 'entity_id'>>,
): Task {
  const all = listTasks(entityCode);
  const before = all.find((t) => t.id === id);
  if (!before) throw new Error(`TaskFlow: task ${id} not found`);
  const updated: Task = { ...before, ...patch, updated_at: new Date().toISOString() };
  writeJSON(
    taskflowKey(entityCode),
    all.map((t) => (t.id === id ? updated : t)),
  );
  safeAudit({
    entityCode,
    action: 'update',
    entityType: 'taskflow_event',
    recordId: id,
    recordLabel: `${updated.code} · update`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return updated;
}

// [JWT] PATCH /api/taskflow/tasks/:id/status
export function changeStatus(
  entityCode: string,
  id: string,
  next: TaskStatus,
): Task {
  const before = getTask(entityCode, id);
  if (!before) throw new Error(`TaskFlow: task ${id} not found`);
  const allowed = TASK_STATUS_TRANSITIONS[before.status];
  if (!allowed.includes(next)) {
    throw new Error(
      `TaskFlow: invalid transition ${before.status} → ${next}`,
    );
  }
  return updateTask(entityCode, id, { status: next });
}

// [JWT] POST /api/taskflow/comments
export function addComment(
  entityCode: string,
  taskId: string,
  body: string,
  author_id: string,
  author_name: string,
): TaskComment {
  if (!body.trim()) throw new Error('TaskFlow: comment body required');
  const all = readJSON<TaskComment[]>(taskflowCommentsKey(entityCode), []);
  const c: TaskComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: taskId,
    body: body.trim(),
    author_id,
    author_name,
    created_at: new Date().toISOString(),
  };
  writeJSON(taskflowCommentsKey(entityCode), [...all, c]);
  safeAudit({
    entityCode,
    action: 'create',
    entityType: 'taskflow_event',
    recordId: taskId,
    recordLabel: `comment by ${author_name}`,
    beforeState: null,
    afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return c;
}

// ── Computed reads (no stored notification entities — DESIGN-DECISION-FLAG #3) ──

/**
 * listDueWithin24h — pure read · computed at render time per Block-5 ruling.
 * NO notification entity persisted. Surfaces Due-Soon strip on landing page.
 */
export function listDueWithin24h(entityCode: string, nowISO?: string): Task[] {
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  return listTasks(entityCode).filter((t) => {
    if (t.status === 'done') return false;
    if (!t.due_at) return false;
    const due = new Date(t.due_at).getTime();
    return due >= now && due <= horizon;
  });
}

export function getStats(entityCode: string) {
  const all = listTasks(entityCode);
  return {
    total: all.length,
    open: all.filter((t) => t.status === 'open').length,
    in_progress: all.filter((t) => t.status === 'in_progress').length,
    blocked: all.filter((t) => t.status === 'blocked').length,
    done: all.filter((t) => t.status === 'done').length,
    due_soon: listDueWithin24h(entityCode).length,
  };
}
