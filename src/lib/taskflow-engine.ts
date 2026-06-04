/**
 * @file        src/lib/taskflow-engine.ts
 * @purpose     TaskFlow engine · CRUD + 12-state lifecycle + Accountability Spine + hash-chain
 * @sprint      Sprint 137.R1 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc opener
 * @decisions   R1 corrective additions per ratified spec:
 *              · 12-state TASK_STATUS_TRANSITIONS validated by changeStatus
 *              · TF-29a acknowledgeTask + getUnacknowledgedTasks
 *              · TF-29b reassignTask (reason mandatory · trail in tf_reassignments)
 *              · TF-29c changeDueDate (reason mandatory · history in tf_duedate_changes)
 *              · TF-14 getSubTasks + getBlockingBadges
 *              · TF-36 hash-chained per-task audit (appendTaskAudit · verifyAuditChain)
 *              FR-44 read-only consume from 4 SSOT surfaces (all 0-DIFF).
 *              §O entity-scoped localStorage via taskflowKey(entityCode).
 *              Audit type 'taskflow_event' under mca-roc (ComplianceModule UNTOUCHED).
 *              D-AUDIT-SAFE try/catch around logAudit.
 *              DESIGN-DECISION-FLAG R1-3: sha256 helper — local compact synchronous
 *              FNV-1a 64×2 hash returning 64 hex chars. crypto.subtle is async only;
 *              engine surface must stay sync for vitest jsdom + chain-verify in tests.
 *              Upgrade path to real SHA-256 = B.4 (push/notification consolidation).
 * @[JWT]       GET/POST/PUT/PATCH /api/taskflow/tasks
 */

import {
  type Task,
  type TaskComment,
  type TaskCommentModel,
  type TaskStatus,
  type TaskPriority,
  type TaskCategory,
  type ReassignmentRecord,
  type DueDateChangeRecord,
  type TaskAuditEntry,
  taskflowKey,
  taskflowCommentsKey,
  taskflowReassignmentsKey,
  taskflowDueDateChangesKey,
  taskflowAuditChainKey,
  TASK_STATUS_TRANSITIONS,
} from '@/types/taskflow';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit-trail-engine';

// ── tiny JSON helpers ──────────────────────────────────────────────────────
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
  try { logAudit(entry); } catch { /* D-AUDIT-SAFE */ }
};

const genCode = (all: Task[]): string =>
  'TSK-' + String(all.length + 1).padStart(6, '0');

const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── DESIGN-DECISION-FLAG R1-3 · Synchronous "sha256-equivalent" hash ───────
// Compact FNV-1a 64-bit, run twice (forward + reverse) and concatenated to
// 32 hex chars + 32 hex chars = 64-char hex digest. Deterministic and
// tamper-sensitive (single-byte changes cascade through both halves).
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME  = 0x100000001b3n;
function fnv1a64(input: string): bigint {
  let h = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    h = (h ^ BigInt(input.charCodeAt(i))) & MASK_64;
    h = (h * FNV_PRIME) & MASK_64;
  }
  return h;
}
function sha256Sync(input: string): string {
  const a = fnv1a64(input).toString(16).padStart(16, '0');
  const b = fnv1a64(input.split('').reverse().join('') + '|' + a).toString(16).padStart(16, '0');
  const c = fnv1a64(a + b).toString(16).padStart(16, '0');
  const d = fnv1a64(b + a + '!').toString(16).padStart(16, '0');
  return a + b + c + d; // 64 hex chars
}
const GENESIS_HASH = '0'.repeat(64);

// Canonical JSON: stable key order, omit the two hash fields.
function canonicalJSON(entry: TaskAuditEntry): string {
  const { prevHash: _p, entryHash: _e, ...rest } = entry;
  const sortedKeys = Object.keys(rest).sort();
  const stable: Record<string, unknown> = {};
  for (const k of sortedKeys) stable[k] = (rest as Record<string, unknown>)[k];
  return JSON.stringify(stable);
}

function appendTaskAudit(
  entityCode: string,
  taskId: string,
  action: string,
  userId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): TaskAuditEntry {
  const chain = readJSON<TaskAuditEntry[]>(taskflowAuditChainKey(entityCode), []);
  const taskChain = chain.filter((e) => e.taskId === taskId);
  const prevHash = taskChain.length === 0
    ? GENESIS_HASH
    : taskChain[taskChain.length - 1].entryHash;
  const entry: TaskAuditEntry = {
    id: newId('aud'),
    taskId,
    action,
    userId,
    before,
    after,
    timestamp: new Date().toISOString(),
    prevHash,
    entryHash: GENESIS_HASH, // placeholder before hashing
  };
  entry.entryHash = sha256Sync(prevHash + canonicalJSON(entry));
  writeJSON(taskflowAuditChainKey(entityCode), [...chain, entry]);
  return entry;
}

export function verifyAuditChain(
  entityCode: string,
  taskId: string,
): { valid: boolean; breakIndex?: number } {
  const chain = readJSON<TaskAuditEntry[]>(taskflowAuditChainKey(entityCode), [])
    .filter((e) => e.taskId === taskId);
  let prev = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prevHash !== prev) return { valid: false, breakIndex: i };
    const recomputed = sha256Sync(prev + canonicalJSON(e));
    if (recomputed !== e.entryHash) return { valid: false, breakIndex: i };
    prev = e.entryHash;
  }
  return { valid: true };
}

export function getTaskAuditChain(entityCode: string, taskId: string): TaskAuditEntry[] {
  return readJSON<TaskAuditEntry[]>(taskflowAuditChainKey(entityCode), [])
    .filter((e) => e.taskId === taskId);
}

// ── Reads ──────────────────────────────────────────────────────────────────

// [JWT] GET /api/taskflow/tasks?entityCode={e}
export function listTasks(entityCode: string): Task[] {
  return readJSON<Task[]>(taskflowKey(entityCode), []);
}
export function getTask(entityCode: string, id: string): Task | null {
  return listTasks(entityCode).find((t) => t.id === id) ?? null;
}

// [JWT] GET /api/taskflow/comments?taskId={id}
// S138.T1 — TaskCommentModel migration with READ-SHIM for legacy TaskComment.
type LegacyOrNewComment = TaskComment | TaskCommentModel;
function isLegacyComment(c: LegacyOrNewComment): c is TaskComment {
  return typeof (c as TaskComment).task_id === 'string'
    && typeof (c as TaskCommentModel).taskId !== 'string';
}
function liftLegacy(c: TaskComment): TaskCommentModel {
  return {
    id: c.id,
    taskId: c.task_id,
    userId: c.author_id,
    content: c.body,
    isInternal: false,
    mentions: [],
    createdAt: c.created_at,
    updatedAt: c.created_at,
  };
}
export function listComments(entityCode: string, taskId: string): TaskCommentModel[] {
  const raw = readJSON<LegacyOrNewComment[]>(taskflowCommentsKey(entityCode), []);
  return raw
    .map((c) => (isLegacyComment(c) ? liftLegacy(c) : c))
    .filter((c) => c.taskId === taskId);
}
export function listCommentsLegacy(entityCode: string, taskId: string): TaskComment[] {
  // Back-compat surface for any consumer still expecting old shape.
  return listComments(entityCode, taskId).map((c) => ({
    id: c.id,
    task_id: c.taskId,
    body: c.content,
    author_id: c.userId,
    author_name: c.userId,
    created_at: c.createdAt,
  }));
}

// ── Writes ─────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId: string | null;
  assigneeName: string;
  creatorId: string;
  departmentId: string | null;
  clientId?: string | null;
  vendorId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  dependencyIds?: string[];
  watcherIds?: string[];
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
  slaDate?: string | null;
  estimatedHours?: number | null;
  tags?: string[];
  isRecurring?: boolean;
  templateId?: string | null;
  entityId: string;
  branchId?: string | null;
}

// [JWT] POST /api/taskflow/tasks
export function createTask(entityCode: string, input: CreateTaskInput): Task {
  if (!input.title || !input.title.trim()) {
    throw new Error('TaskFlow: title is required');
  }
  const now = new Date().toISOString();
  const all = listTasks(entityCode);
  const task: Task = {
    id: newId('tsk'),
    code: genCode(all),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    status: 'open',
    priority: input.priority,
    category: input.category,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    creatorId: input.creatorId,
    departmentId: input.departmentId,
    clientId: input.clientId ?? null,
    vendorId: input.vendorId ?? null,
    projectId: input.projectId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    dependencyIds: input.dependencyIds ?? [],
    watcherIds: input.watcherIds ?? [],
    dueDate: input.dueDate,
    slaDate: input.slaDate ?? null,
    startDate: null,
    completedDate: null,
    estimatedHours: input.estimatedHours ?? null,
    actualHours: null,
    tags: input.tags ?? [],
    isRecurring: input.isRecurring ?? false,
    recurringConfig: null,
    templateId: input.templateId ?? null,
    entityId: input.entityId,
    branchId: input.branchId ?? null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    createdAt: now,
    updatedAt: now,
  };
  writeJSON(taskflowKey(entityCode), [...all, task]);
  safeAudit({
    entityCode,
    action: 'create',
    entityType: 'taskflow_event',
    recordId: task.id,
    recordLabel: `${task.code} · ${task.title} · assigned:${task.assigneeName}`,
    beforeState: null,
    afterState: task as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  appendTaskAudit(entityCode, task.id, 'create', input.creatorId, undefined, task as unknown as Record<string, unknown>);
  return task;
}

// [JWT] PATCH /api/taskflow/tasks/:id
export function updateTask(
  entityCode: string,
  id: string,
  patch: Partial<Omit<Task, 'id' | 'code' | 'createdAt' | 'entityId'>>,
  byUserId = 'system',
): Task {
  const all = listTasks(entityCode);
  const before = all.find((t) => t.id === id);
  if (!before) throw new Error(`TaskFlow: task ${id} not found`);
  const updated: Task = { ...before, ...patch, updatedAt: new Date().toISOString() };
  writeJSON(taskflowKey(entityCode), all.map((t) => (t.id === id ? updated : t)));
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
  appendTaskAudit(entityCode, id, 'update', byUserId,
    before as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
  );
  return updated;
}

// [JWT] PATCH /api/taskflow/tasks/:id/status — 12-state transition guard
export function changeStatus(
  entityCode: string,
  id: string,
  next: TaskStatus,
  byUserId = 'system',
): Task {
  const before = getTask(entityCode, id);
  if (!before) throw new Error(`TaskFlow: task ${id} not found`);
  const allowed = TASK_STATUS_TRANSITIONS[before.status];
  if (!allowed.includes(next)) {
    throw new Error(`TaskFlow: invalid transition ${before.status} → ${next}`);
  }
  const completedDate = next === 'completed' ? new Date().toISOString() : before.completedDate ?? null;
  return updateTask(entityCode, id, { status: next, completedDate }, byUserId);
}

// ── TF-29a · Acknowledgement ──────────────────────────────────────────────
export function acknowledgeTask(
  entityCode: string,
  taskId: string,
  userId: string,
): Task {
  const t = getTask(entityCode, taskId);
  if (!t) throw new Error(`TaskFlow: task ${taskId} not found`);
  if (t.acknowledgedAt) {
    throw new Error('TaskFlow: task already acknowledged');
  }
  return updateTask(
    entityCode,
    taskId,
    { acknowledgedAt: new Date().toISOString(), acknowledgedBy: userId },
    userId,
  );
}

export function getUnacknowledgedTasks(
  entityCode: string,
  thresholdHours = 0,
): Task[] {
  const cutoff = Date.now() - thresholdHours * 3600 * 1000;
  return listTasks(entityCode).filter((t) => {
    if (t.acknowledgedAt) return false;
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (thresholdHours <= 0) return true;
    return new Date(t.createdAt).getTime() <= cutoff;
  });
}

// ── TF-29b · Reassign with mandatory reason ───────────────────────────────
export function reassignTask(
  entityCode: string,
  taskId: string,
  toUserId: string,
  reason: string,
  byUserId: string,
  toUserName = '',
): Task {
  if (!reason || !reason.trim()) {
    throw new Error('TaskFlow: reassignment reason is required');
  }
  const t = getTask(entityCode, taskId);
  if (!t) throw new Error(`TaskFlow: task ${taskId} not found`);
  const record: ReassignmentRecord = {
    id: newId('rea'),
    taskId,
    fromUserId: t.assigneeId,
    toUserId,
    reason: reason.trim(),
    byUserId,
    timestamp: new Date().toISOString(),
  };
  const all = readJSON<ReassignmentRecord[]>(taskflowReassignmentsKey(entityCode), []);
  writeJSON(taskflowReassignmentsKey(entityCode), [...all, record]);
  return updateTask(
    entityCode,
    taskId,
    { assigneeId: toUserId, assigneeName: toUserName || toUserId },
    byUserId,
  );
}
export function getReassignmentTrail(entityCode: string, taskId: string): ReassignmentRecord[] {
  return readJSON<ReassignmentRecord[]>(taskflowReassignmentsKey(entityCode), [])
    .filter((r) => r.taskId === taskId);
}

// ── TF-29c · Change due-date with mandatory reason ────────────────────────
export function changeDueDate(
  entityCode: string,
  taskId: string,
  newDate: string | null,
  reason: string,
  byUserId: string,
): Task {
  if (!reason || !reason.trim()) {
    throw new Error('TaskFlow: due-date change reason is required');
  }
  const t = getTask(entityCode, taskId);
  if (!t) throw new Error(`TaskFlow: task ${taskId} not found`);
  const record: DueDateChangeRecord = {
    id: newId('ddc'),
    taskId,
    oldDate: t.dueDate,
    newDate,
    reason: reason.trim(),
    byUserId,
    timestamp: new Date().toISOString(),
  };
  const all = readJSON<DueDateChangeRecord[]>(taskflowDueDateChangesKey(entityCode), []);
  writeJSON(taskflowDueDateChangesKey(entityCode), [...all, record]);
  return updateTask(entityCode, taskId, { dueDate: newDate }, byUserId);
}
export function getDueDateHistory(entityCode: string, taskId: string): DueDateChangeRecord[] {
  return readJSON<DueDateChangeRecord[]>(taskflowDueDateChangesKey(entityCode), [])
    .filter((r) => r.taskId === taskId);
}

// ── TF-14 · Sub-tasks / dependency badges ─────────────────────────────────
export function getSubTasks(entityCode: string, parentTaskId: string): Task[] {
  return listTasks(entityCode).filter((t) => t.parentTaskId === parentTaskId);
}
export interface BlockingBadge {
  taskId: string;
  code: string;
  title: string;
  status: TaskStatus;
}
export function getBlockingBadges(entityCode: string, taskId: string): BlockingBadge[] {
  const t = getTask(entityCode, taskId);
  if (!t || !t.dependencyIds || t.dependencyIds.length === 0) return [];
  const all = listTasks(entityCode);
  return t.dependencyIds
    .map((depId) => all.find((x) => x.id === depId))
    .filter((x): x is Task => !!x && x.status !== 'completed' && x.status !== 'cancelled')
    .map((x) => ({ taskId: x.id, code: x.code, title: x.title, status: x.status }));
}

// ── Comments · TaskCommentModel (S138.T1 migration) ──────────────────────
// [JWT] POST /api/taskflow/comments
export interface AddCommentOpts {
  isInternal?: boolean;
  mentions?: string[];
  parentCommentId?: string;
}
export function addComment(
  entityCode: string,
  taskId: string,
  content: string,
  userId: string,
  _legacyAuthorName?: string, // kept positional for back-compat
  opts: AddCommentOpts = {},
): TaskCommentModel {
  if (!content.trim()) throw new Error('TaskFlow: comment body required');
  const all = readJSON<unknown[]>(taskflowCommentsKey(entityCode), []);
  const now = new Date().toISOString();
  const mentions = (opts.mentions ?? []).filter(Boolean);
  const c: TaskCommentModel = {
    id: newId('cmt'),
    taskId,
    userId,
    content: content.trim(),
    isInternal: !!opts.isInternal,
    mentions,
    parentCommentId: opts.parentCommentId,
    createdAt: now,
    updatedAt: now,
  };
  writeJSON(taskflowCommentsKey(entityCode), [...all, c]);
  safeAudit({
    entityCode,
    action: 'create',
    entityType: 'taskflow_event',
    recordId: taskId,
    recordLabel: `comment by ${userId}${c.isInternal ? ' · internal' : ''}${mentions.length ? ` · mentions:${mentions.length}` : ''}`,
    beforeState: null,
    afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  // Fire a sonner toast per @mention (UI bridge · no notification rail yet).
  if (mentions.length > 0) {
    for (const m of mentions) {
      try { toast.message(`@${m} mentioned`, { description: c.content.slice(0, 80) }); }
      catch { /* test env / SSR */ }
    }
  }
  return c;
}

// ── Computed reads ────────────────────────────────────────────────────────
export function listDueWithin24h(entityCode: string, nowISO?: string): Task[] {
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  return listTasks(entityCode).filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate).getTime();
    return due >= now && due <= horizon;
  });
}

export function getStats(entityCode: string) {
  const all = listTasks(entityCode);
  const by = (s: TaskStatus) => all.filter((t) => t.status === s).length;
  return {
    total: all.length,
    open: by('open'),
    in_progress: by('in_progress'),
    in_review: by('in_review'),
    pending_approval: by('pending_approval'),
    on_hold: by('on_hold'),
    escalated: by('escalated'),
    blocked: by('on_hold'),     // legacy alias preserved for landing-page parity
    completed: by('completed'),
    done: by('completed'),       // legacy alias for old surfaces
    cancelled: by('cancelled'),
    unacknowledged: all.filter(
      (t) => !t.acknowledgedAt && t.status !== 'completed' && t.status !== 'cancelled',
    ).length,
    due_soon: listDueWithin24h(entityCode).length,
  };
}

// ── Migration helper (old field/status/priority → ratified model) ─────────
interface LegacyTask {
  id?: string; code?: string; title?: string; description?: string;
  status?: string; priority?: string;
  assignee_id?: string | null; assignee_name?: string;
  department_code?: string | null;
  customer_id?: string | null; vendor_id?: string | null;
  due_at?: string | null; entity_id?: string;
  created_by?: string; created_at?: string; updated_at?: string;
}
const STATUS_MAP: Record<string, TaskStatus> = {
  open: 'open', in_progress: 'in_progress', blocked: 'on_hold', done: 'completed',
};
const PRIORITY_MAP: Record<string, TaskPriority> = {
  p0: 'critical', p1: 'high', p2: 'medium', p3: 'low',
};
export function migrateLegacyTask(legacy: LegacyTask): Partial<Task> {
  return {
    id: legacy.id,
    code: legacy.code,
    title: legacy.title ?? '',
    description: legacy.description ?? '',
    status: STATUS_MAP[legacy.status ?? 'open'] ?? 'open',
    priority: PRIORITY_MAP[legacy.priority ?? 'p2'] ?? 'medium',
    category: 'general',
    assigneeId: legacy.assignee_id ?? null,
    assigneeName: legacy.assignee_name ?? '',
    creatorId: legacy.created_by ?? 'system',
    departmentId: legacy.department_code ?? null,
    clientId: legacy.customer_id ?? null,
    vendorId: legacy.vendor_id ?? null,
    dependencyIds: [],
    watcherIds: [],
    dueDate: legacy.due_at ?? null,
    tags: [],
    isRecurring: false,
    entityId: legacy.entity_id ?? '',
    createdAt: legacy.created_at ?? new Date().toISOString(),
    updatedAt: legacy.updated_at ?? new Date().toISOString(),
  };
}
export const _legacyMigrationMaps = { STATUS_MAP, PRIORITY_MAP };
