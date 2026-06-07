/**
 * @file        src/lib/approval-rail-engine.ts
 * @sprint      Sprint B1S1 · T-B1S1-Approval-Rail · Pillar B.1 · SOLE engine credit
 * @realizes    B.1 per Operix_Approval_Matrix_v1.3 · ONE approval rail on TaskFlow ·
 *              cards own records, rail owns the inbox.
 * @authority   Matrix §2 universal rules (iron):
 *              · One rail · 3-slab model
 *              · SoD-1 (creator ≠ approver)
 *              · SoD-2 cross-object (bill-passing ↔ payout same liability)
 *              · role-or-named (named wins)
 *              · reject reason mandatory
 *              · in-card sync (D2) — decisions made at source auto-complete the mirror
 *              · every decision audit-logged
 * @[JWT]       Wave-2: auth-derived approver identity + delegation enforcement + scheduled push.
 *              Until then: free-text names + honesty banner on the inbox.
 */

import {
  type ApprovalAdapter,
  type ApprovalChainStep,
  type ApprovalDecidedByEntry,
  type ApprovalObjectType,
  type ApprovalRuleRow,
  type ApprovalTaskMeta,
  type PendingApprovalItem,
  approvalDecidedByLedgerKey,
  approvalRulesKey,
} from '@/types/approval-rail';
import type { Task } from '@/types/taskflow';
import { taskflowKey } from '@/types/taskflow';
import { createTask, listTasks, changeStatus } from '@/lib/taskflow-engine';
import { publish } from '@/lib/notification-engine';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── tiny LS helpers (engine-local · mirrors sibling pattern) ────────────
function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* swallow */
  }
}
function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function isoNow(): string {
  return new Date().toISOString();
}
function safeAudit(opts: Parameters<typeof logAudit>[0]): void {
  try {
    logAudit(opts);
  } catch {
    /* D-AUDIT-SAFE */
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Adapter registry
// ═══════════════════════════════════════════════════════════════════════
const _adapters = new Map<ApprovalObjectType, ApprovalAdapter>();

export function registerApprovalAdapter(adapter: ApprovalAdapter): void {
  _adapters.set(adapter.object_type, adapter);
}

export function listRegisteredAdapters(): ApprovalAdapter[] {
  return Array.from(_adapters.values());
}

export function __resetApprovalAdaptersForTests(): void {
  _adapters.clear();
}

// ═══════════════════════════════════════════════════════════════════════
// Rule rows · seeded per Matrix §3 defaults · all editable
// ═══════════════════════════════════════════════════════════════════════
function defaultRules(): ApprovalRuleRow[] {
  const mk = (
    object_type: ApprovalObjectType,
    slab0: number | null,
    slab1: number | null,
    slab1Role: string,
    slab2Roles: string[],
  ): ApprovalRuleRow => ({
    id: rid('rule'),
    object_type,
    slab0_auto_below: slab0,
    slab1_single_below: slab1,
    slab1_step: { order: 1, approver: { mode: 'role', role: slab1Role } },
    slab2_chain: slab2Roles.map((r, i) => ({
      order: i + 1,
      approver: { mode: 'role', role: r },
    })),
    sla_hours_slab1: 24,
    sla_hours_slab2_per_step: 48,
    active: true,
  });
  return [
    mk('salesx_discount', 5000, 50000, 'sales-manager', ['sales-head', 'finance-head']),
    mk('procure_po', 10000, 100000, 'hod', ['finance-head', 'md']),
    mk('stock_issue', 25000, 250000, 'store-manager', ['plant-head']),
    mk('production_order', null, 500000, 'production-head', ['plant-head', 'md']),
    mk('requestx_indent', 10000, 100000, 'hod', ['purchase-head', 'finance-head']),
    mk('billpassing_deviation', null, 50000, 'finance-manager', ['finance-head', 'md']),
    mk('servicedesk_proposal', null, 100000, 'service-head', ['md']),
    mk('logistics_dispute', null, 25000, 'dispatch-head', ['logistics-head']),
  ];
}

export function listApprovalRules(entityCode: string): ApprovalRuleRow[] {
  const existing = safeRead<ApprovalRuleRow[]>(approvalRulesKey(entityCode), []);
  if (existing.length > 0) return existing;
  const seeded = defaultRules();
  safeWrite(approvalRulesKey(entityCode), seeded);
  return seeded;
}

export function getApprovalRule(
  entityCode: string,
  object_type: ApprovalObjectType,
): ApprovalRuleRow | null {
  return listApprovalRules(entityCode).find((r) => r.object_type === object_type) ?? null;
}

export function updateApprovalRule(
  entityCode: string,
  ruleId: string,
  patch: Partial<ApprovalRuleRow>,
  byName: string,
): ApprovalRuleRow | null {
  const all = listApprovalRules(entityCode);
  const idx = all.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  const before = all[idx];
  const next: ApprovalRuleRow = {
    ...before,
    ...patch,
    id: before.id,
    object_type: before.object_type,
    lastEditedBy: byName,
    lastEditedAt: isoNow(),
  };
  all[idx] = next;
  safeWrite(approvalRulesKey(entityCode), all);
  safeAudit({
    entityCode,
    action: 'update',
    entityType: 'taskflow_event',
    recordId: ruleId,
    recordLabel: `approval-rule edit · ${next.object_type}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'approval-rail-engine',
  });
  return next;
}

// ═══════════════════════════════════════════════════════════════════════
// Slab resolution (Matrix §2 · 3-slab)
// ═══════════════════════════════════════════════════════════════════════
export interface SlabResolution {
  slab: 0 | 1 | 2;
  chain: ApprovalChainStep[];
  sla_hours: number;
}

export function resolveSlab(rule: ApprovalRuleRow, amount?: number): SlabResolution {
  const amt = typeof amount === 'number' ? amount : 0;
  if (rule.slab0_auto_below != null && amt <= rule.slab0_auto_below) {
    return { slab: 0, chain: [], sla_hours: 0 };
  }
  if (rule.slab1_single_below != null && amt <= rule.slab1_single_below) {
    return { slab: 1, chain: [rule.slab1_step], sla_hours: rule.sla_hours_slab1 };
  }
  return {
    slab: 2,
    chain: rule.slab2_chain,
    sla_hours: rule.sla_hours_slab2_per_step * Math.max(1, rule.slab2_chain.length),
  };
}

/** Matrix §2.3a — named wins; role is fallback. Returns display label. */
export function describeStepApprover(step: ApprovalChainStep): string {
  if (step.approver.mode === 'named' && step.approver.personName) {
    return step.approver.personName;
  }
  return step.approver.role ?? 'unassigned';
}

// ═══════════════════════════════════════════════════════════════════════
// Sync — pending records ↔ mirror tasks (D2)
// ═══════════════════════════════════════════════════════════════════════
function mirrorKeyFor(meta: ApprovalTaskMeta): string {
  return `${meta.source_card}::${meta.object_type}::${meta.source_record_id}`;
}

function findMirrorTask(tasks: Task[], meta: ApprovalTaskMeta): Task | undefined {
  return tasks.find(
    (t) =>
      t.category === 'approval' &&
      t.approval &&
      mirrorKeyFor(t.approval) === mirrorKeyFor(meta),
  );
}

export interface SyncResult {
  created: number;
  autoCompleted: number;
}

export function syncApprovalTasks(entityCode: string): SyncResult {
  const tasks = listTasks(entityCode);
  let created = 0;
  let autoCompleted = 0;

  // Track pending keys per adapter
  const pendingKeys = new Set<string>();

  for (const adapter of _adapters.values()) {
    const rule = getApprovalRule(entityCode, adapter.object_type);
    const pending = adapter.listPending(entityCode);

    for (const p of pending) {
      const resolution = rule ? resolveSlab(rule, p.amount) : { slab: 2 as const, chain: [], sla_hours: 48 };

      // Slab-0 → auto-approve in-source + audit · NO mirror task
      if (rule && resolution.slab === 0) {
        const ok = adapter.approve(entityCode, p.source_record_id, 'auto-rule');
        if (ok) {
          safeAudit({
            entityCode,
            action: 'approve',
            entityType: 'taskflow_event',
            recordId: p.source_record_id,
            recordLabel: `auto_approved_slab0 · ${adapter.object_type} · ${p.source_record_no}`,
            beforeState: null,
            afterState: { decided_by: 'auto-rule', slab: 0, amount: p.amount ?? null },
            sourceModule: 'approval-rail-engine',
          });
        }
        continue;
      }

      const meta: ApprovalTaskMeta = {
        source_card: adapter.source_card,
        object_type: adapter.object_type,
        source_record_id: p.source_record_id,
        source_record_no: p.source_record_no,
        amount: p.amount,
        slab: resolution.slab,
        creator_name: p.creator_name,
        liability_ref: p.liability_ref,
      };
      pendingKeys.add(mirrorKeyFor(meta));

      const existing = findMirrorTask(tasks, meta);
      if (existing) continue;

      const dueDate = new Date(Date.now() + resolution.sla_hours * 3_600_000).toISOString();
      const title = `Approve ${adapter.object_type} ${p.source_record_no}${
        p.amount != null ? ` · ₹${Math.round(p.amount).toLocaleString('en-IN')}` : ''
      }`;

      const newTask = createTask(entityCode, {
        title,
        description: `Approval mirror · drill through to ${adapter.recordRoute(p.source_record_id)}`,
        priority: resolution.slab === 2 ? 'high' : 'medium',
        category: 'approval',
        assigneeId: null,
        assigneeName: describeStepApprover(resolution.chain[0] ?? { order: 1, approver: { mode: 'role', role: 'approver' } }),
        creatorId: 'approval-rail',
        departmentId: null,
        dependencyIds: [],
        watcherIds: [],
        dueDate,
        tags: ['approval', adapter.source_card],
        isRecurring: false,
        entityId: entityCode,
      });
      // Stamp meta directly (createTask does not know approval field)
      stampApprovalMeta(entityCode, newTask.id, meta);
      created += 1;

      publish({
        eventKey: `approval.pending:${entityCode}:${mirrorKeyFor(meta)}`,
        entityCode,
        targetUserId: '*',
        kind: 'approval.pending',
        source: 'approval-rail-engine',
        cardId: 'taskflow',
        severity: 'info',
        title,
        body: `Slab ${resolution.slab} · SLA ${resolution.sla_hours}h`,
        deepLink: '/erp/taskflow#approvals-inbox',
        refType: 'approval',
        refId: meta.source_record_id,
      });
    }
  }

  // D2 sync rule · mirror tasks whose source is no longer pending → auto-complete
  const freshTasks = listTasks(entityCode);
  for (const t of freshTasks) {
    if (t.category !== 'approval' || !t.approval) continue;
    if (t.status === 'completed' || t.status === 'cancelled') continue;
    if (pendingKeys.has(mirrorKeyFor(t.approval))) continue;
    try {
      // 'open' → 'in_progress' → 'in_review' → 'completed' is the legal chain.
      // For mirror auto-complete, walk through the shortest legal path.
      walkTaskTo(entityCode, t.id, 'completed', 'decided at source');
      autoCompleted += 1;
    } catch {
      /* skip mid-state tasks */
    }
  }

  return { created, autoCompleted };
}

function walkTaskTo(entityCode: string, taskId: string, target: 'completed', note: string): void {
  const tasks = listTasks(entityCode);
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  // Walk legal: open→in_progress→in_review→completed
  const seq: { from: string; to: 'in_progress' | 'in_review' | 'completed' }[] = [
    { from: 'open', to: 'in_progress' },
    { from: 'in_progress', to: 'in_review' },
    { from: 'in_review', to: 'completed' },
  ];
  let cur = t.status;
  for (const hop of seq) {
    if (cur === target) break;
    if (cur === hop.from) {
      changeStatus(entityCode, taskId, hop.to, 'approval-rail');
      cur = hop.to;
    }
  }
  // Stamp a note via meta (auto-completed)
  stampApprovalMetaPatch(entityCode, taskId, { decision_reason: note });
}

function stampApprovalMeta(entityCode: string, taskId: string, meta: ApprovalTaskMeta): void {
  const key = taskflowKey(entityCode);
  const all = safeRead<Task[]>(key, []);
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], approval: meta };
  safeWrite(key, all);
}

function stampApprovalMetaPatch(
  entityCode: string,
  taskId: string,
  patch: Partial<ApprovalTaskMeta>,
): void {
  const key = taskflowKey(entityCode);
  const all = safeRead<Task[]>(key, []);
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx < 0 || !all[idx].approval) return;
  all[idx] = { ...all[idx], approval: { ...all[idx].approval!, ...patch } };
  safeWrite(key, all);
}

// ═══════════════════════════════════════════════════════════════════════
// decideApproval — guards in order · adapter delegate · audit · publish
// ═══════════════════════════════════════════════════════════════════════
export interface DecisionResult {
  ok: boolean;
  reason?: string;
}

export function decideApproval(
  entityCode: string,
  taskId: string,
  decision: 'approved' | 'rejected',
  byName: string,
  reason?: string,
): DecisionResult {
  const tasks = listTasks(entityCode);
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.category !== 'approval' || !task.approval) {
    return { ok: false, reason: 'not an approval task' };
  }
  const meta = task.approval;
  const trimmedReason = (reason ?? '').trim();

  // ① reject needs reason (Matrix §2.6)
  if (decision === 'rejected' && trimmedReason.length === 0) {
    return { ok: false, reason: 'reject reason is mandatory (Matrix §2.6)' };
  }

  // ② SoD-1 · creator ≠ approver
  if (meta.creator_name && meta.creator_name.toLowerCase() === byName.toLowerCase()) {
    return { ok: false, reason: 'SoD-1 refusal: creator cannot approve own request' };
  }

  // ③ SoD-2 · cross-object same-liability (bill-passing ↔ payout)
  if (meta.liability_ref) {
    const ledger = safeRead<ApprovalDecidedByEntry[]>(approvalDecidedByLedgerKey(entityCode), []);
    const conflict = ledger.find(
      (e) =>
        e.liability_ref === meta.liability_ref &&
        e.object_type !== meta.object_type &&
        e.decided_by_name.toLowerCase() === byName.toLowerCase(),
    );
    if (conflict) {
      return {
        ok: false,
        reason: `SoD-2 refusal: ${byName} already decided ${conflict.object_type} on liability ${meta.liability_ref}`,
      };
    }
  }

  // Adapter delegate
  const adapter = _adapters.get(meta.object_type);
  if (!adapter) {
    return { ok: false, reason: `no adapter registered for ${meta.object_type}` };
  }
  const adapterOk =
    decision === 'approved'
      ? adapter.approve(entityCode, meta.source_record_id, byName, trimmedReason || undefined)
      : adapter.reject(entityCode, meta.source_record_id, byName, trimmedReason);
  if (!adapterOk) {
    return { ok: false, reason: 'adapter refused decision (record state likely changed)' };
  }

  // Walk task to completed and stamp meta
  walkTaskTo(entityCode, taskId, 'completed', trimmedReason || (decision === 'approved' ? 'approved' : 'rejected'));
  stampApprovalMetaPatch(entityCode, taskId, {
    decision,
    decision_by: byName,
    decision_reason: trimmedReason || undefined,
    decided_at: isoNow(),
  });

  // Record SoD-2 ledger entry
  if (meta.liability_ref) {
    const ledger = safeRead<ApprovalDecidedByEntry[]>(approvalDecidedByLedgerKey(entityCode), []);
    ledger.push({
      id: rid('dbl'),
      liability_ref: meta.liability_ref,
      object_type: meta.object_type,
      decided_by_name: byName,
      decided_at: isoNow(),
    });
    safeWrite(approvalDecidedByLedgerKey(entityCode), ledger);
  }

  // Audit
  safeAudit({
    entityCode,
    action: decision === 'approved' ? 'approve' : 'reject',
    entityType: 'taskflow_event',
    recordId: meta.source_record_id,
    recordLabel: `approval-rail ${decision} · ${meta.object_type} · ${meta.source_record_no}`,
    beforeState: { task_id: taskId, slab: meta.slab },
    afterState: { decision, decided_by: byName, reason: trimmedReason || null },
    sourceModule: 'approval-rail-engine',
  });

  // Publish
  publish({
    eventKey: `approval.decided:${entityCode}:${mirrorKeyFor(meta)}:${decision}`,
    entityCode,
    targetUserId: '*',
    kind: 'approval.decided',
    source: 'approval-rail-engine',
    cardId: 'taskflow',
    severity: decision === 'approved' ? 'success' : 'warning',
    title: `${decision === 'approved' ? 'Approved' : 'Rejected'}: ${meta.object_type} ${meta.source_record_no}`,
    body: `by ${byName}${trimmedReason ? ` · ${trimmedReason}` : ''}`,
    deepLink: adapter.recordRoute(meta.source_record_id),
    refType: 'approval',
    refId: meta.source_record_id,
  });

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════
// Inbox + digest queries
// ═══════════════════════════════════════════════════════════════════════
export interface PendingMirror {
  task: Task;
  meta: ApprovalTaskMeta;
  ageHours: number;
  overdue: boolean;
}

export function listPendingMirrors(entityCode: string): PendingMirror[] {
  const tasks = listTasks(entityCode);
  const now = Date.now();
  return tasks
    .filter((t) => t.category === 'approval' && t.approval && t.status !== 'completed' && t.status !== 'cancelled')
    .map((t) => {
      const ageHours = (now - new Date(t.createdAt).getTime()) / 3_600_000;
      const overdue = t.dueDate ? new Date(t.dueDate).getTime() < now : false;
      return { task: t, meta: t.approval!, ageHours, overdue };
    });
}

export interface ApprovalsDigest {
  waiting: number;
  overdue: number;
  oldest_days: number;
}

export function getApprovalsDigest(entityCode: string): ApprovalsDigest {
  const pending = listPendingMirrors(entityCode);
  const overdue = pending.filter((p) => p.overdue).length;
  const oldest_days = pending.length === 0
    ? 0
    : Math.round(Math.max(...pending.map((p) => p.ageHours)) / 24);
  return { waiting: pending.length, overdue, oldest_days };
}

/** Publishes digest.approvals_pending · idempotent per (entity,user,day) via eventKey. */
export function publishApprovalsDigest(
  entityCode: string,
  userId: string,
  nowISO?: string,
): { count: number } {
  const today = (nowISO ? new Date(nowISO) : new Date()).toISOString().slice(0, 10);
  const d = getApprovalsDigest(entityCode);
  if (d.waiting === 0) return { count: 0 };
  publish({
    eventKey: `digest:approvals-pending:${entityCode}:${userId}:${today}`,
    entityCode,
    targetUserId: userId,
    kind: 'digest.approvals_pending',
    source: 'approval-rail-engine',
    cardId: 'taskflow',
    severity: d.overdue > 0 ? 'critical' : 'warning',
    title: `${d.waiting} approval${d.waiting === 1 ? '' : 's'} waiting`,
    body: `${d.overdue} overdue · oldest ${d.oldest_days}d`,
    deepLink: '/erp/taskflow#approvals-inbox',
    refType: 'digest',
    refId: `approvals-pending:${today}`,
  });
  return { count: d.waiting };
}

// Bulk approve · returns per-row outcome; SoD-blocked rows are skipped (never throw)
export interface BulkOutcome {
  taskId: string;
  ok: boolean;
  reason?: string;
}
export function bulkApprove(
  entityCode: string,
  taskIds: string[],
  byName: string,
  reason?: string,
): BulkOutcome[] {
  return taskIds.map((id) => {
    const r = decideApproval(entityCode, id, 'approved', byName, reason);
    return { taskId: id, ok: r.ok, reason: r.reason };
  });
}
