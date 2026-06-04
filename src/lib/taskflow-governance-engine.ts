/**
 * @file        src/lib/taskflow-governance-engine.ts
 * @realizes    TaskFlow Governance Slice · TF-3 (approvals REUSE) · TF-21 (SLA+escalation) ·
 *              TF-33 (I'm-Blocked artifact) · TF-11 (Comply360 one-click bridge) · TF-13-rich (reminders)
 * @reads-from  approval-workflow-engine (CONSUME ONLY · 0-DIFF) · taskflow-engine ·
 *              comply360-statutory-memory.loadObligations (READ ONLY) ·
 *              comply360-internal-audit-engine.listAuditUniverse (READ ONLY)
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Pillar A.6.4 · TaskFlow Arc
 * @decisions   DESIGN-DECISION-FLAG S138-1: TaskApprovalChain/Step persisted in
 *              tf_approval_chains / tf_approval_steps. The underlying generic
 *              approval-workflow-engine (6-state: draft/submitted/approved/...)
 *              drives per-step state transitions; the TaskFlow Task itself
 *              transitions via taskflow-engine.changeStatus (in_review →
 *              pending_approval → approved/rejected). 0-DIFF on §H engine.
 *              DESIGN-DECISION-FLAG S138-2: Comply360 surfaces are READ-ONLY
 *              via loadObligations + listAuditUniverse (no engine mutated).
 *              DESIGN-DECISION-FLAG S138-3: Blocked→on_hold transition is OPT-IN
 *              (raiseBlocked accepts {moveToOnHold:boolean}, default false).
 *              SLA evaluation is computed-on-load (NO background scheduler;
 *              [JWT] marker for P2BB server scheduler).
 * @[JWT]       Phase 8 (P2BB): server SLA scheduler · real escalation delivery
 */

import {
  type TaskApprovalChain,
  type TaskApprovalStep,
  type TaskSLARule,
  type TaskReminder,
  type TaskCategory,
  type TaskPriority,
  type ApprovalStatus as TaskApprovalStatus,
} from '@/types/taskflow';
import {
  submit as awSubmit,
  approve as awApprove,
  reject as awReject,
  type ApprovalRecord,
  type ApprovalActor,
  type ApprovalContext,
} from '@/lib/approval-workflow-engine';
import {
  getTask,
  listTasks,
  changeStatus,
  type CreateTaskInput,
} from '@/lib/taskflow-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { loadObligations } from '@/lib/comply360-statutory-memory';
import { listAuditUniverse } from '@/lib/comply360-internal-audit-engine';

// ── tiny JSON helpers (mirror taskflow-engine §O posture) ───────────────────
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
  } catch { /* quota silent */ }
};
const safeAudit = (entry: Parameters<typeof logAudit>[0]): void => {
  try { logAudit(entry); } catch { /* D-AUDIT-SAFE */ }
};
const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Entity-scoped storage keys (§O) ───────────────────────────────────────
// [JWT] tf_approval_chains / steps / sla_rules / blocked / escalations / reminders
export const tfChainsKey       = (e: string) => e ? `tf_approval_chains_${e}` : 'tf_approval_chains';
export const tfStepsKey        = (e: string) => e ? `tf_approval_steps_${e}`  : 'tf_approval_steps';
export const tfSLAKey          = (e: string) => e ? `tf_sla_rules_${e}`       : 'tf_sla_rules';
export const tfBlockedKey      = (e: string) => e ? `tf_blocked_${e}`         : 'tf_blocked';
export const tfEscalationsKey  = (e: string) => e ? `tf_escalations_${e}`     : 'tf_escalations';
export const tfRemindersKey    = (e: string) => e ? `tf_reminders_${e}`       : 'tf_reminders';

// ── VERBATIM artifact types (per Block 2(c)) ──────────────────────────────
export interface BlockedRecord {
  id: string; taskId: string;
  blockedByUserId?: string | null;
  blockedByDependency?: string | null;
  reason: string;
  raisedByUserId: string; raisedAt: string;
  resolvedAt?: string | null; resolvedByUserId?: string | null;
  resolutionNote?: string | null;
}
export interface EscalationRecord {
  id: string; taskId: string; source: 'sla' | 'manual' | 'blocked';
  escalatedTo: 'manager' | 'dept_head' | 'admin';
  reason: string; raisedAt: string; status: 'open' | 'acknowledged' | 'resolved';
  resolvedAt?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// (a) APPROVALS ADAPTER (TF-3) · maps TaskApprovalChain/Step onto the
//     existing approval-workflow-engine. §H 0-DIFF on that engine.
// ═══════════════════════════════════════════════════════════════════════════

const APPROVAL_CTX = (entityCode: string): ApprovalContext => ({
  entityCode,
  auditEntityType: 'taskflow_event',
  sourceModule: 'taskflow-governance',
});

interface StepMirror extends ApprovalRecord {
  taskId: string;
  approverId: string;
  order: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'posted';
  comments?: string;
  decidedAt?: string;
  createdAt: string;
}

// ── Chain CRUD ────────────────────────────────────────────────────────────
export function listApprovalChains(entityCode: string): TaskApprovalChain[] {
  return readJSON<TaskApprovalChain[]>(tfChainsKey(entityCode), []);
}
export function upsertApprovalChain(entityCode: string, chain: TaskApprovalChain): TaskApprovalChain {
  if (!chain.name?.trim()) throw new Error('approval chain: name required');
  if (!chain.steps?.length) throw new Error('approval chain: at least one step required');
  const all = listApprovalChains(entityCode);
  const idx = all.findIndex(c => c.id === chain.id);
  if (idx >= 0) all[idx] = chain; else all.push(chain);
  writeJSON(tfChainsKey(entityCode), all);
  safeAudit({
    entityCode, action: idx >= 0 ? 'update' : 'create',
    entityType: 'taskflow_event', recordId: chain.id,
    recordLabel: `approval_chain · ${chain.name}`,
    beforeState: idx >= 0 ? all[idx] as unknown as Record<string, unknown> : null,
    afterState: chain as unknown as Record<string, unknown>,
    sourceModule: 'taskflow-governance',
  });
  return chain;
}
export function deleteApprovalChain(entityCode: string, chainId: string): void {
  const all = listApprovalChains(entityCode).filter(c => c.id !== chainId);
  writeJSON(tfChainsKey(entityCode), all);
}
export function getDefaultChain(
  entityCode: string,
  opts?: { departmentId?: string; categoryId?: TaskCategory },
): TaskApprovalChain | null {
  const all = listApprovalChains(entityCode);
  const exact = all.find(c => c.isDefault
    && (!opts?.departmentId || c.departmentId === opts.departmentId)
    && (!opts?.categoryId   || c.categoryId   === opts.categoryId));
  return exact ?? all.find(c => c.isDefault) ?? null;
}

// ── Step storage ──────────────────────────────────────────────────────────
function listStepMirrors(entityCode: string): StepMirror[] {
  return readJSON<StepMirror[]>(tfStepsKey(entityCode), []);
}
function writeStepMirrors(entityCode: string, list: StepMirror[]): void {
  writeJSON(tfStepsKey(entityCode), list);
}

function toTaskApprovalStep(m: StepMirror): TaskApprovalStep {
  const status: TaskApprovalStatus =
    m.status === 'approved' ? 'approved'
    : m.status === 'rejected' ? 'rejected'
    : 'pending';
  return {
    id: m.id, taskId: m.taskId, approverId: m.approverId,
    status, order: m.order, comments: m.comments,
    decidedAt: m.decidedAt, createdAt: m.createdAt,
  };
}

// ── Submit · in_review → pending_approval ─────────────────────────────────
export function submitTaskForApproval(
  entityCode: string,
  taskId: string,
  chainId: string,
  byUserId: string,
): { steps: TaskApprovalStep[] } {
  const task = getTask(entityCode, taskId);
  if (!task) throw new Error(`task ${taskId} not found`);
  if (task.status !== 'in_review') {
    throw new Error(`submit illegal · task is '${task.status}' · must be 'in_review'`);
  }
  const chain = listApprovalChains(entityCode).find(c => c.id === chainId);
  if (!chain) throw new Error(`approval chain ${chainId} not found`);

  // Build per-step mirrors and run through approval-workflow-engine.submit
  // so audit + state machine semantics come from the §H engine.
  const ctx = APPROVAL_CTX(entityCode);
  const actor: ApprovalActor = { id: byUserId, name: byUserId };
  const now = new Date().toISOString();
  const existing = listStepMirrors(entityCode).filter(s => s.taskId !== taskId);
  const newMirrors: StepMirror[] = chain.steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s, i) => {
      const base: StepMirror = {
        id: newId('tas'),
        taskId, approverId: s.approverId, order: s.order,
        status: 'draft', createdAt: now,
      };
      // first step → submitted; remaining stay draft until their turn
      if (i === 0) {
        const r = awSubmit<StepMirror>(base, actor, ctx);
        return r.ok && r.next ? r.next : base;
      }
      return base;
    });
  writeStepMirrors(entityCode, [...existing, ...newMirrors]);
  changeStatus(entityCode, taskId, 'pending_approval', byUserId);
  return { steps: newMirrors.map(toTaskApprovalStep) };
}

function currentStep(entityCode: string, taskId: string): StepMirror | null {
  const mirrors = listStepMirrors(entityCode).filter(m => m.taskId === taskId);
  if (!mirrors.length) return null;
  mirrors.sort((a, b) => a.order - b.order);
  // current = first non-terminal
  return mirrors.find(m => m.status !== 'approved' && m.status !== 'rejected') ?? null;
}

// ── Approve a step ────────────────────────────────────────────────────────
export function approveTaskStep(
  entityCode: string,
  taskId: string,
  approverId: string,
  comments?: string,
): { final: boolean; step: TaskApprovalStep } {
  const step = currentStep(entityCode, taskId);
  if (!step) throw new Error(`no pending approval step for task ${taskId}`);
  if (step.status !== 'submitted') {
    throw new Error(`approve illegal · step is '${step.status}'`);
  }
  const ctx = APPROVAL_CTX(entityCode);
  const actor: ApprovalActor = { id: approverId, name: approverId };
  const r = awApprove<StepMirror>(step, actor, ctx);
  if (!r.ok || !r.next) throw new Error(`approve rejected: ${r.reason ?? 'unknown'}`);
  const updated: StepMirror = {
    ...r.next,
    decidedAt: new Date().toISOString(),
    comments: comments ?? step.comments,
  };
  // persist
  const all = listStepMirrors(entityCode).map(m => m.id === step.id ? updated : m);

  // promote next step from draft → submitted via the engine
  const remaining = all
    .filter(m => m.taskId === taskId && m.id !== updated.id && m.status === 'draft')
    .sort((a, b) => a.order - b.order);
  let final = remaining.length === 0;
  if (!final) {
    const nextStep = remaining[0];
    const sub = awSubmit<StepMirror>(nextStep, actor, ctx);
    if (sub.ok && sub.next) {
      const idx = all.findIndex(m => m.id === nextStep.id);
      if (idx >= 0) all[idx] = sub.next;
    }
  }
  writeStepMirrors(entityCode, all);

  if (final) {
    changeStatus(entityCode, taskId, 'approved', approverId);
  }
  return { final, step: toTaskApprovalStep(updated) };
}

// ── Reject a step ─────────────────────────────────────────────────────────
export function rejectTaskStep(
  entityCode: string,
  taskId: string,
  approverId: string,
  reason: string,
): { step: TaskApprovalStep } {
  if (!reason?.trim()) throw new Error('reject: reason required');
  const step = currentStep(entityCode, taskId);
  if (!step) throw new Error(`no pending approval step for task ${taskId}`);
  if (step.status !== 'submitted') {
    throw new Error(`reject illegal · step is '${step.status}'`);
  }
  const ctx = APPROVAL_CTX(entityCode);
  const actor: ApprovalActor = { id: approverId, name: approverId };
  const r = awReject<StepMirror>(step, actor, reason, ctx);
  if (!r.ok || !r.next) throw new Error(`reject failed: ${r.reason ?? 'unknown'}`);
  const updated: StepMirror = {
    ...r.next, decidedAt: new Date().toISOString(), comments: reason,
  };
  const all = listStepMirrors(entityCode).map(m => m.id === step.id ? updated : m);
  writeStepMirrors(entityCode, all);
  changeStatus(entityCode, taskId, 'rejected', approverId);
  return { step: toTaskApprovalStep(updated) };
}

export function getTaskApprovalState(entityCode: string, taskId: string): {
  steps: TaskApprovalStep[]; currentStepId: string | null;
} {
  const mirrors = listStepMirrors(entityCode)
    .filter(m => m.taskId === taskId)
    .sort((a, b) => a.order - b.order);
  const cur = mirrors.find(m => m.status !== 'approved' && m.status !== 'rejected') ?? null;
  return { steps: mirrors.map(toTaskApprovalStep), currentStepId: cur?.id ?? null };
}

// ═══════════════════════════════════════════════════════════════════════════
// (b) SLA + ESCALATION (TF-21)
// ═══════════════════════════════════════════════════════════════════════════

export function listSLARules(entityCode: string): TaskSLARule[] {
  return readJSON<TaskSLARule[]>(tfSLAKey(entityCode), []);
}
export function upsertSLARule(entityCode: string, rule: TaskSLARule): TaskSLARule {
  if (!rule.name?.trim()) throw new Error('SLA rule: name required');
  if (rule.maxHours <= 0) throw new Error('SLA rule: maxHours must be > 0');
  if (rule.escalateAfterHours < 0) throw new Error('SLA rule: escalateAfterHours must be ≥ 0');
  const all = listSLARules(entityCode);
  const idx = all.findIndex(r => r.id === rule.id);
  if (idx >= 0) all[idx] = rule; else all.push(rule);
  writeJSON(tfSLAKey(entityCode), all);
  return rule;
}
export function deleteSLARule(entityCode: string, id: string): void {
  writeJSON(tfSLAKey(entityCode), listSLARules(entityCode).filter(r => r.id !== id));
}

function findApplicableRule(
  rules: TaskSLARule[],
  category: TaskCategory,
  priority: TaskPriority,
): TaskSLARule | null {
  // most-specific wins: category+priority > category > priority > generic
  const active = rules.filter(r => r.isActive);
  return active.find(r => r.category === category && r.priority === priority)
    ?? active.find(r => r.category === category && !r.priority)
    ?? active.find(r => !r.category && r.priority === priority)
    ?? active.find(r => !r.category && !r.priority)
    ?? null;
}

const hoursBetween = (fromISO: string, toISO: string): number =>
  Math.max(0, (Date.parse(toISO) - Date.parse(fromISO)) / 3_600_000);

export function getSLAStatus(
  entityCode: string,
  taskId: string,
  nowISO?: string,
): { rule: TaskSLARule | null; hoursElapsed: number; breached: boolean; escalationDue: boolean } {
  const task = getTask(entityCode, taskId);
  if (!task) return { rule: null, hoursElapsed: 0, breached: false, escalationDue: false };
  const rule = findApplicableRule(listSLARules(entityCode), task.category, task.priority);
  if (!rule) return { rule: null, hoursElapsed: 0, breached: false, escalationDue: false };
  const now = nowISO ?? new Date().toISOString();
  const start = task.acknowledgedAt ?? task.createdAt;
  const hoursElapsed = hoursBetween(start, now);
  return {
    rule,
    hoursElapsed,
    breached: hoursElapsed > rule.maxHours,
    escalationDue: hoursElapsed > rule.escalateAfterHours,
  };
}

export function evaluateSLA(
  entityCode: string,
  nowISO?: string,
): { breached: string[]; escalated: EscalationRecord[] } {
  const now = nowISO ?? new Date().toISOString();
  const rules = listSLARules(entityCode);
  if (!rules.length) return { breached: [], escalated: [] };
  const openTasks = listTasks(entityCode).filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected'
  );
  const breached: string[] = [];
  const escalated: EscalationRecord[] = [];
  const existingEsc = readJSON<EscalationRecord[]>(tfEscalationsKey(entityCode), []);
  for (const t of openTasks) {
    const rule = findApplicableRule(rules, t.category, t.priority);
    if (!rule) continue;
    const start = t.acknowledgedAt ?? t.createdAt;
    const hours = hoursBetween(start, now);
    if (hours > rule.maxHours) breached.push(t.id);
    const dueEscalation = hours > rule.escalateAfterHours;
    const already = existingEsc.some(e =>
      e.taskId === t.id && e.source === 'sla' && e.status !== 'resolved'
    );
    if (dueEscalation && !already) {
      const rec: EscalationRecord = {
        id: newId('esc'),
        taskId: t.id, source: 'sla',
        escalatedTo: rule.escalateTo,
        reason: `SLA breach · ${hours.toFixed(1)}h elapsed > ${rule.escalateAfterHours}h`,
        raisedAt: now, status: 'open',
      };
      escalated.push(rec);
      existingEsc.push(rec);
      try {
        if (t.status !== 'escalated') {
          changeStatus(entityCode, t.id, 'escalated', 'sla-engine');
        }
      } catch { /* transition illegal from terminal-ish state — skip */ }
    }
  }
  writeJSON(tfEscalationsKey(entityCode), existingEsc);
  return { breached, escalated };
}

export function listEscalations(entityCode: string): EscalationRecord[] {
  return readJSON<EscalationRecord[]>(tfEscalationsKey(entityCode), []);
}
export function resolveEscalation(entityCode: string, id: string): void {
  const all = listEscalations(entityCode).map(e =>
    e.id === id ? { ...e, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : e
  );
  writeJSON(tfEscalationsKey(entityCode), all);
}

// ═══════════════════════════════════════════════════════════════════════════
// (c) I'm BLOCKED ARTIFACT (TF-33)
// ═══════════════════════════════════════════════════════════════════════════

export interface RaiseBlockedInput {
  taskId: string;
  reason: string;
  raisedByUserId: string;
  blockedByUserId?: string | null;
  blockedByDependency?: string | null;
  moveToOnHold?: boolean;
}

export function raiseBlocked(entityCode: string, input: RaiseBlockedInput): BlockedRecord {
  if (!input.reason?.trim()) throw new Error('blocked: reason is mandatory');
  if (!input.blockedByUserId && !input.blockedByDependency) {
    throw new Error('blocked: at least one of blockedByUserId or blockedByDependency required');
  }
  const task = getTask(entityCode, input.taskId);
  if (!task) throw new Error(`task ${input.taskId} not found`);
  const rec: BlockedRecord = {
    id: newId('blk'),
    taskId: input.taskId,
    blockedByUserId: input.blockedByUserId ?? null,
    blockedByDependency: input.blockedByDependency ?? null,
    reason: input.reason.trim(),
    raisedByUserId: input.raisedByUserId,
    raisedAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const all = readJSON<BlockedRecord[]>(tfBlockedKey(entityCode), []);
  writeJSON(tfBlockedKey(entityCode), [...all, rec]);
  safeAudit({
    entityCode, action: 'create', entityType: 'taskflow_event',
    recordId: rec.id, recordLabel: `blocked · ${task.code ?? task.id} · ${rec.reason.slice(0, 60)}`,
    beforeState: null, afterState: rec as unknown as Record<string, unknown>,
    sourceModule: 'taskflow-governance',
  });
  if (input.moveToOnHold) {
    try { changeStatus(entityCode, input.taskId, 'on_hold', input.raisedByUserId); }
    catch { /* not a legal transition from current state — keep artifact only */ }
  }
  return rec;
}

export function resolveBlocked(
  entityCode: string,
  blockedId: string,
  resolvedByUserId: string,
  resolutionNote?: string,
): BlockedRecord {
  const all = readJSON<BlockedRecord[]>(tfBlockedKey(entityCode), []);
  const idx = all.findIndex(b => b.id === blockedId);
  if (idx < 0) throw new Error(`blocked ${blockedId} not found`);
  if (all[idx].resolvedAt) throw new Error('blocked already resolved');
  const updated: BlockedRecord = {
    ...all[idx],
    resolvedAt: new Date().toISOString(),
    resolvedByUserId,
    resolutionNote: resolutionNote ?? null,
  };
  all[idx] = updated;
  writeJSON(tfBlockedKey(entityCode), all);
  return updated;
}

export function getOpenBlocked(entityCode: string): BlockedRecord[] {
  return readJSON<BlockedRecord[]>(tfBlockedKey(entityCode), []).filter(b => !b.resolvedAt);
}
export function getBlockedHistory(entityCode: string, taskId: string): BlockedRecord[] {
  return readJSON<BlockedRecord[]>(tfBlockedKey(entityCode), [])
    .filter(b => b.taskId === taskId)
    .sort((a, b) => a.raisedAt.localeCompare(b.raisedAt));
}

export function getTimeBlockedHours(
  entityCode: string,
  taskId: string,
  nowISO?: string,
): number {
  const now = nowISO ?? new Date().toISOString();
  const list = getBlockedHistory(entityCode, taskId);
  let total = 0;
  for (const b of list) {
    const end = b.resolvedAt ?? now;
    total += hoursBetween(b.raisedAt, end);
  }
  return Math.round(total * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// (d) COMPLY360 BRIDGE (TF-11) · READ-ONLY adapter
// ═══════════════════════════════════════════════════════════════════════════

export interface ComplianceSource {
  type: 'obligation' | 'audit_observation';
  id: string;
  label: string;
}

export function listComplianceSources(_entityCode: string): ComplianceSource[] {
  const obligations: ComplianceSource[] = loadObligations().map(o => ({
    type: 'obligation', id: o.id, label: o.label,
  }));
  const observations: ComplianceSource[] = listAuditUniverse().map(u => ({
    type: 'audit_observation', id: u.id, label: u.area_name,
  }));
  return [...obligations, ...observations];
}

export function buildTaskDraftFromSource(
  source: ComplianceSource,
  base: Pick<CreateTaskInput, 'creatorId' | 'entityId'>
    & Partial<Pick<CreateTaskInput, 'assigneeId' | 'assigneeName' | 'departmentId' | 'priority' | 'dueDate'>>,
): CreateTaskInput {
  const category: TaskCategory = source.type === 'obligation' ? 'compliance' : 'internal_audit';
  return {
    title: source.label,
    description: `Auto-created from Comply360 ${source.type} · ${source.id}`,
    assigneeId: base.assigneeId ?? null,
    assigneeName: base.assigneeName ?? '',
    creatorId: base.creatorId,
    departmentId: base.departmentId ?? null,
    priority: base.priority ?? 'medium',
    category,
    dueDate: base.dueDate ?? null,
    tags: [`comply360:${source.type}:${source.id}`],
    entityId: base.entityId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// (e) RICH REMINDERS (TF-13)
// ═══════════════════════════════════════════════════════════════════════════

export function listReminders(entityCode: string): TaskReminder[] {
  return readJSON<TaskReminder[]>(tfRemindersKey(entityCode), []);
}
export function upsertReminder(entityCode: string, r: TaskReminder): TaskReminder {
  if (!r.taskId) throw new Error('reminder: taskId required');
  if (!r.reminderDate) throw new Error('reminder: reminderDate required');
  const all = listReminders(entityCode);
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r; else all.push(r);
  writeJSON(tfRemindersKey(entityCode), all);
  return r;
}
export function deleteReminder(entityCode: string, id: string): void {
  writeJSON(tfRemindersKey(entityCode), listReminders(entityCode).filter(r => r.id !== id));
}
export function getDueReminders(entityCode: string, nowISO?: string): TaskReminder[] {
  const now = nowISO ?? new Date().toISOString();
  return listReminders(entityCode).filter(r => !r.isTriggered && r.reminderDate <= now);
}
export function snoozeReminder(entityCode: string, id: string, hours: number): TaskReminder {
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('snooze: hours must be > 0');
  const all = listReminders(entityCode);
  const idx = all.findIndex(r => r.id === id);
  if (idx < 0) throw new Error(`reminder ${id} not found`);
  const next = new Date(Date.parse(all[idx].reminderDate) + hours * 3_600_000).toISOString();
  all[idx] = { ...all[idx], reminderDate: next, isTriggered: false };
  writeJSON(tfRemindersKey(entityCode), all);
  return all[idx];
}
export function markTriggered(entityCode: string, id: string): TaskReminder {
  const all = listReminders(entityCode);
  const idx = all.findIndex(r => r.id === id);
  if (idx < 0) throw new Error(`reminder ${id} not found`);
  all[idx] = { ...all[idx], isTriggered: true };
  writeJSON(tfRemindersKey(entityCode), all);
  return all[idx];
}
