/**
 * @file        src/lib/taskflow-accountability-engine.ts
 * @realizes    Accountability Payoff · TF-18 (GST/TDS expenses) · TF-19 (evidence) ·
 *              TF-29d (evidence-mandatory close · ClosePolicyResolver) · TF-29e
 *              (accountability metrics) · TF-29f (symmetric self-trail export) ·
 *              TF-31 (daily work diary).
 * @reads-from  src/data/compliance-seed-data.ts (GST_RATES · TDS_SECTIONS · FR-44) ·
 *              taskflow-engine · taskflow-governance-engine (ALL READ-ONLY).
 * @sprint      Sprint 141 · T-TaskFlow-A641.5 · Pillar A.6.4 · taskflow-accountability-engine
 * @scope-wall  NO leaderboards · NO ranking · NO public scoreboards (don't-build canon).
 *              §H + approval-workflow-engine + Comply360 + push-notification-bridge UNTOUCHED.
 *              Audit emitted inline as taskflow_event (no new audit type).
 * @[JWT]       P2BB — FinCore/PayOut voucher emission for approved expenses ·
 *              reimbursement payout integration · server-side metric aggregation.
 */
import type {
  Task, TaskStatus, TaskCategory, TaskEvidence, TaskExpense,
  TaskClosePolicy, PersonAccountabilityMetrics, WorkDiaryEntry,
} from '@/types/taskflow';
import {
  tfExpensesKey, tfEvidenceKey, tfClosePoliciesKey,
} from '@/types/taskflow';
import {
  listTasks, getTask,
  getReassignmentTrail, getDueDateHistory, getTaskAuditChain,
  registerClosePolicyResolver,
} from '@/lib/taskflow-engine';
import {
  taskflowReassignmentsKey, taskflowDueDateChangesKey,
  taskflowAuditChainKey,
} from '@/types/taskflow';
import {
  getTimeBlockedHours, listEscalations, getOpenBlocked,
  type BlockedRecord,
} from '@/lib/taskflow-governance-engine';
import { GST_RATES, TDS_SECTIONS } from '@/data/compliance-seed-data';
import { logAudit } from '@/lib/audit-trail-engine';
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';

// ── tiny JSON helpers (mirror taskflow-engine pattern) ─────────────────────
const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const writeJSON = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};
type AuditOpts = Parameters<typeof logAudit>[0];
const safeAudit = (
  entityCode: string,
  partial: Omit<AuditOpts, 'entityCode' | 'action' | 'entityType' | 'sourceModule' | 'beforeState' | 'afterState'> & {
    action?: AuditOpts['action'];
    beforeState?: AuditOpts['beforeState'];
    afterState?: AuditOpts['afterState'];
  },
): void => {
  try {
    logAudit({
      entityCode,
      action: partial.action ?? 'update',
      entityType: 'taskflow_event',
      recordId: partial.recordId,
      recordLabel: partial.recordLabel,
      beforeState: partial.beforeState ?? null,
      afterState: partial.afterState ?? null,
      sourceModule: 'taskflow-accountability',
    });
  } catch { /* D-AUDIT-SAFE */ }
};
const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── FR-44 · GST/TDS seed accessors (READ-ONLY · NEVER hardcode parallel table)
export function listIndiaGstRates(): { code: string; rate: number; name: string }[] {
  return GST_RATES
    .filter(r => r.countryCode === 'IN' && r.taxType === 'gst' && r.status === 'active')
    .map(r => ({ code: r.code, rate: r.rate, name: r.name }));
}
function isValidGstRate(rate: number): boolean {
  return listIndiaGstRates().some(r => r.rate === rate);
}
export function listTdsSections(): { code: string; name: string; rateIndividual: number; rateCompany: number; rateNoPAN: number }[] {
  return TDS_SECTIONS
    .filter(s => s.status === 'active')
    .map(s => ({
      code: s.sectionCode, name: s.sectionName,
      rateIndividual: s.rateIndividual, rateCompany: s.rateCompany, rateNoPAN: s.rateNoPAN,
    }));
}
function isValidTdsSection(code: string): boolean {
  return TDS_SECTIONS.some(s => s.sectionCode === code && s.status === 'active');
}

// ═══════════════════════════════════════════════════════════════════════════
// (a) EXPENSES · TF-18
// ═══════════════════════════════════════════════════════════════════════════
export interface ComputeExpenseTaxInput {
  amount: number;
  gstRate: number;            // validated against GST_RATES (IN)
  isInterState: boolean;
  tdsSection?: string;        // optional; validated against TDS_SECTIONS
  tdsRate?: number;
  isReverseCharge?: boolean;
}
export interface ComputeExpenseTaxResult {
  taxableValue: number;
  cgst: number; sgst: number; igst: number;
  taxAmount: number;
  tdsAmount: number;
  netPayable: number;         // amount + taxAmount - tdsAmount (RCM honesty: client-side)
  isReverseCharge: boolean;
}

export function computeExpenseTax(input: ComputeExpenseTaxInput): ComputeExpenseTaxResult {
  if (input.amount < 0) throw new Error('TaskFlow: expense amount cannot be negative');
  if (!isValidGstRate(input.gstRate)) {
    throw new Error(`TaskFlow: invalid gstRate ${input.gstRate} (not in compliance-seed-data GST_RATES · IN)`);
  }
  if (input.tdsSection && !isValidTdsSection(input.tdsSection)) {
    throw new Error(`TaskFlow: invalid tdsSection ${input.tdsSection} (not in compliance-seed-data TDS_SECTIONS)`);
  }
  const taxableValue = round2(input.amount);
  const taxAmount = round2(dMul(taxableValue, input.gstRate / 100));
  let cgst = 0, sgst = 0, igst = 0;
  if (input.isInterState) {
    igst = taxAmount;
  } else {
    const half = round2(taxAmount / 2);
    cgst = half;
    // ensure halves sum to taxAmount exactly to absorb rounding drift
    sgst = round2(taxAmount - half);
  }
  const tdsRate = input.tdsRate ?? 0;
  const tdsAmount = input.tdsSection
    ? round2(dMul(taxableValue, tdsRate / 100))
    : 0;
  const netPayable = round2(dAdd(taxableValue, taxAmount) - tdsAmount);
  return {
    taxableValue, cgst, sgst, igst,
    taxAmount, tdsAmount, netPayable,
    isReverseCharge: !!input.isReverseCharge,
  };
}

export function listExpenses(entityCode: string): TaskExpense[] {
  return readJSON<TaskExpense[]>(tfExpensesKey(entityCode), []);
}
export function listExpensesForTask(entityCode: string, taskId: string): TaskExpense[] {
  return listExpenses(entityCode).filter(e => e.taskId === taskId);
}

export interface CreateExpenseInput {
  taskId: string;
  amount: number;
  category: TaskExpense['category'];
  description: string;
  isReimbursable: boolean;
  currency?: string;
  gstRate?: number;
  isInterState?: boolean;
  isReverseCharge?: boolean;
  tdsSection?: string;
  tdsRate?: number;
  gstin?: string;
  hsnSacCode?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  paymentMode?: string;
  paymentRef?: string;
  submittedBy: string;
}
export function createExpense(entityCode: string, input: CreateExpenseInput): TaskExpense {
  const all = listExpenses(entityCode);
  const now = new Date().toISOString();
  let cgst = 0, sgst = 0, igst = 0, taxAmount = 0, tdsAmount = 0;
  if (typeof input.gstRate === 'number') {
    const t = computeExpenseTax({
      amount: input.amount,
      gstRate: input.gstRate,
      isInterState: !!input.isInterState,
      tdsSection: input.tdsSection,
      tdsRate: input.tdsRate,
      isReverseCharge: input.isReverseCharge,
    });
    cgst = t.cgst; sgst = t.sgst; igst = t.igst;
    taxAmount = t.taxAmount; tdsAmount = t.tdsAmount;
  }
  const exp: TaskExpense = {
    id: newId('exp'),
    taskId: input.taskId,
    amount: round2(input.amount),
    currency: input.currency || 'INR',
    category: input.category,
    description: input.description,
    isReimbursable: input.isReimbursable,
    taxAmount, taxRate: input.gstRate,
    receiptUrl: input.receiptUrl, receiptFileName: input.receiptFileName,
    status: 'draft',
    submittedBy: input.submittedBy,
    gstin: input.gstin, hsnSacCode: input.hsnSacCode,
    gstRate: input.gstRate, cgst, sgst, igst,
    isInterState: input.isInterState, isReverseCharge: input.isReverseCharge,
    tdsSection: input.tdsSection, tdsRate: input.tdsRate, tdsAmount,
    paymentMode: input.paymentMode, paymentRef: input.paymentRef,
    createdAt: now, updatedAt: now,
  };
  writeJSON(tfExpensesKey(entityCode), [...all, exp]);
  safeAudit({
    entityType: 'taskflow_event', recordId: exp.id,
    recordLabel: `expense ${exp.id} · draft`,
    afterState: exp as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return exp;
}

function _updateExpense(entityCode: string, id: string, patch: Partial<TaskExpense>): TaskExpense {
  const all = listExpenses(entityCode);
  const idx = all.findIndex(e => e.id === id);
  if (idx < 0) throw new Error(`TaskFlow: expense ${id} not found`);
  const before = all[idx];
  const next: TaskExpense = { ...before, ...patch, updatedAt: new Date().toISOString() };
  all[idx] = next;
  writeJSON(tfExpensesKey(entityCode), all);
  safeAudit({
    entityType: 'taskflow_event', recordId: id,
    recordLabel: `expense ${id} · ${next.status}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return next;
}

export function submitExpense(entityCode: string, id: string): TaskExpense {
  const e = listExpenses(entityCode).find(x => x.id === id);
  if (!e) throw new Error(`TaskFlow: expense ${id} not found`);
  if (e.status !== 'draft') {
    throw new Error(`TaskFlow: cannot submit expense in status ${e.status}`);
  }
  return _updateExpense(entityCode, id, { status: 'submitted' });
}
export function approveExpense(entityCode: string, id: string, approvedBy: string, financeNote?: string): TaskExpense {
  const e = listExpenses(entityCode).find(x => x.id === id);
  if (!e) throw new Error(`TaskFlow: expense ${id} not found`);
  if (e.status !== 'submitted') {
    throw new Error(`TaskFlow: cannot approve expense in status ${e.status}`);
  }
  // [JWT] P2BB · emit FinCore voucher here when payout rail wired
  return _updateExpense(entityCode, id, { status: 'approved', approvedBy, financeNote });
}
export function rejectExpense(entityCode: string, id: string, approvedBy: string, financeNote?: string): TaskExpense {
  const e = listExpenses(entityCode).find(x => x.id === id);
  if (!e) throw new Error(`TaskFlow: expense ${id} not found`);
  if (e.status !== 'submitted') {
    throw new Error(`TaskFlow: cannot reject expense in status ${e.status}`);
  }
  return _updateExpense(entityCode, id, { status: 'rejected', approvedBy, financeNote });
}
export function markReimbursed(entityCode: string, id: string, paymentRef?: string): TaskExpense {
  const e = listExpenses(entityCode).find(x => x.id === id);
  if (!e) throw new Error(`TaskFlow: expense ${id} not found`);
  if (e.status !== 'approved') {
    throw new Error(`TaskFlow: cannot reimburse expense in status ${e.status}`);
  }
  // [JWT] P2BB · PayOut seam — actual disbursement happens server-side
  return _updateExpense(entityCode, id, { status: 'reimbursed', paymentRef });
}

export interface TaskExpenseTotals {
  count: number;
  amount: number;
  tax: number;
  tds: number;
  net: number;
  byStatus: Record<TaskExpense['status'], number>;
}
export function getTaskExpenseTotals(entityCode: string, taskId: string): TaskExpenseTotals {
  const list = listExpensesForTask(entityCode, taskId);
  const byStatus: Record<TaskExpense['status'], number> = {
    draft: 0, submitted: 0, approved: 0, rejected: 0, reimbursed: 0,
  };
  let amount = 0, tax = 0, tds = 0;
  for (const e of list) {
    amount = dAdd(amount, e.amount);
    tax = dAdd(tax, e.taxAmount || 0);
    tds = dAdd(tds, e.tdsAmount || 0);
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  }
  amount = round2(amount); tax = round2(tax); tds = round2(tds);
  return { count: list.length, amount, tax, tds, net: round2(amount + tax - tds), byStatus };
}

// ═══════════════════════════════════════════════════════════════════════════
// (b) EVIDENCE · TF-19
// ═══════════════════════════════════════════════════════════════════════════
export const EVIDENCE_MAX_BYTES = 1_048_576; // 1MB

export interface CreateEvidenceInput {
  taskId: string;
  type: TaskEvidence['type'];
  fileUrl: string;           // base64 data URL
  fileName: string;
  fileType: string;
  notes?: string;
  location?: string | null;  // null tolerated (permission denied / no geolocation)
  uploadedBy: string;
}
export function createEvidence(entityCode: string, input: CreateEvidenceInput): TaskEvidence {
  // base64 cap (rough: every 4 base64 chars = 3 bytes; allow data: prefix)
  const b64 = input.fileUrl.includes(',') ? input.fileUrl.split(',', 2)[1] : input.fileUrl;
  const approxBytes = Math.floor((b64?.length || 0) * 3 / 4);
  if (approxBytes > EVIDENCE_MAX_BYTES) {
    throw new Error(`TaskFlow: evidence exceeds 1MB cap (${approxBytes} bytes)`);
  }
  const all = listEvidence(entityCode);
  const ev: TaskEvidence = {
    id: newId('ev'),
    taskId: input.taskId,
    type: input.type,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    fileType: input.fileType,
    notes: input.notes,
    timestamp: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    location: input.location ?? undefined,
  };
  writeJSON(tfEvidenceKey(entityCode), [...all, ev]);
  safeAudit({
    entityType: 'taskflow_event', recordId: ev.id,
    recordLabel: `evidence ${ev.id} · ${ev.type}`,
    afterState: { id: ev.id, taskId: ev.taskId, type: ev.type, fileName: ev.fileName } as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return ev;
}
export function listEvidence(entityCode: string): TaskEvidence[] {
  return readJSON<TaskEvidence[]>(tfEvidenceKey(entityCode), []);
}
export function listEvidenceForTask(entityCode: string, taskId: string): TaskEvidence[] {
  return listEvidence(entityCode).filter(e => e.taskId === taskId);
}
export function getEvidenceCount(entityCode: string, taskId: string): number {
  return listEvidenceForTask(entityCode, taskId).length;
}

// ═══════════════════════════════════════════════════════════════════════════
// (c) EVIDENCE-MANDATORY CLOSE · TF-29d
// ═══════════════════════════════════════════════════════════════════════════
export function listClosePolicies(entityCode: string): TaskClosePolicy[] {
  return readJSON<TaskClosePolicy[]>(tfClosePoliciesKey(entityCode), []);
}
export function getActiveClosePolicy(entityCode: string, category: TaskCategory): TaskClosePolicy | null {
  return listClosePolicies(entityCode).find(p => p.category === category && p.isActive) ?? null;
}
export interface UpsertClosePolicyInput {
  entityId: string;
  category: TaskCategory;
  requireEvidence: boolean;
  minEvidenceCount?: number;
  isActive?: boolean;
}
export function upsertClosePolicy(entityCode: string, input: UpsertClosePolicyInput): TaskClosePolicy {
  const all = listClosePolicies(entityCode);
  const now = new Date().toISOString();
  const existingIdx = all.findIndex(p => p.category === input.category);
  const minCount = Math.max(1, input.minEvidenceCount ?? 1);
  const isActive = input.isActive ?? true;
  let policy: TaskClosePolicy;
  if (existingIdx >= 0) {
    policy = {
      ...all[existingIdx],
      entityId: input.entityId,
      requireEvidence: input.requireEvidence,
      minEvidenceCount: minCount,
      isActive,
      updatedAt: now,
    };
    all[existingIdx] = policy;
  } else {
    policy = {
      id: newId('cp'),
      entityId: input.entityId,
      category: input.category,
      requireEvidence: input.requireEvidence,
      minEvidenceCount: minCount,
      isActive,
      createdAt: now, updatedAt: now,
    };
    all.push(policy);
  }
  writeJSON(tfClosePoliciesKey(entityCode), all);
  safeAudit({
    entityType: 'taskflow_event', recordId: policy.id,
    recordLabel: `close_policy ${policy.category} · upsert`,
    afterState: policy as unknown as Record<string, unknown>,
    sourceModule: 'taskflow',
  });
  return policy;
}

export interface EvaluateClosePolicyResult {
  allowed: boolean;
  required: number;
  have: number;
  message: string; // empty when allowed
}
export function evaluateClosePolicy(entityCode: string, task: Task): EvaluateClosePolicyResult {
  const policy = getActiveClosePolicy(entityCode, task.category);
  if (!policy || !policy.requireEvidence) {
    return { allowed: true, required: 0, have: getEvidenceCount(entityCode, task.id), message: '' };
  }
  const have = getEvidenceCount(entityCode, task.id);
  const required = policy.minEvidenceCount;
  if (have >= required) {
    return { allowed: true, required, have, message: '' };
  }
  return {
    allowed: false, required, have,
    message: `evidence-mandatory: need ${required}, have ${have}`,
  };
}

// Register the resolver into taskflow-engine (mirrors S139 milestone-resolver hook).
// `entityCode` here comes from changeStatus; we cannot guess it from taskId alone,
// so resolver evaluates against currently-known tasks for that entity.
registerClosePolicyResolver((entityCode, taskId) => {
  const t = getTask(entityCode, taskId);
  if (!t) return '';
  const verdict = evaluateClosePolicy(entityCode, t);
  return verdict.allowed ? '' : verdict.message;
});

// ═══════════════════════════════════════════════════════════════════════════
// (d) ACCOUNTABILITY METRICS · TF-29e
// ═══════════════════════════════════════════════════════════════════════════
export interface AccountabilityMetricsOptions {
  from?: string;     // ISO
  to?: string;       // ISO
  now?: string;      // ISO · injectable for time-robust tests
}
export interface DepartmentRollup {
  departmentId: string | null;
  userCount: number;
  openTasks: number; overdueTasks: number;
  unacknowledgedCount: number;
  reworkBounces: number;
  reassignmentsAway: number;
  blockedHoursOpen: number;
  slaBreaches: number;
}
export interface AccountabilityMetricsBundle {
  people: PersonAccountabilityMetrics[];
  rollups: DepartmentRollup[];
}

function _bucketAge(days: number): keyof PersonAccountabilityMetrics['ageingBuckets'] {
  if (days <= 2) return 'd0_2';
  if (days <= 7) return 'd3_7';
  if (days <= 14) return 'd8_14';
  return 'd15_plus';
}

export function computeAccountabilityMetrics(
  entityCode: string,
  opts: AccountabilityMetricsOptions = {},
): AccountabilityMetricsBundle {
  const nowMs = opts.now ? new Date(opts.now).getTime() : Date.now();
  const fromMs = opts.from ? new Date(opts.from).getTime() : -Infinity;
  const toMs = opts.to ? new Date(opts.to).getTime() : Infinity;

  const tasks = listTasks(entityCode).filter(t => {
    const cMs = new Date(t.createdAt).getTime();
    return cMs >= fromMs && cMs <= toMs;
  });

  const reassignments = readJSON<{ id: string; taskId: string; fromUserId: string | null; toUserId: string; reason: string; byUserId: string; timestamp: string }[]>(taskflowReassignmentsKey(entityCode), []);
  const dueDateChanges = readJSON<unknown[]>(taskflowDueDateChangesKey(entityCode), []);
  void dueDateChanges; // available for export bundle below
  const auditChain = readJSON<{ id: string; taskId: string; action: string; userId: string; before?: Record<string, unknown>; after?: Record<string, unknown>; timestamp: string }[]>(taskflowAuditChainKey(entityCode), []);
  const escalations = listEscalations(entityCode);

  const byUser = new Map<string, PersonAccountabilityMetrics>();
  const ackDeltas = new Map<string, number[]>(); // userId → [hours]

  const ensure = (userId: string | null, userName: string, departmentId: string | null): PersonAccountabilityMetrics => {
    const key = userId || '__unassigned__';
    let m = byUser.get(key);
    if (!m) {
      m = {
        userId: key, userName: userName || key, departmentId,
        openTasks: 0, overdueTasks: 0,
        avgTimeToAcknowledgeHours: null,
        unacknowledgedCount: 0,
        ageingBuckets: { d0_2: 0, d3_7: 0, d8_14: 0, d15_plus: 0 },
        reworkBounces: 0, reassignmentsAway: 0,
        blockedHoursOpen: 0, slaBreaches: 0,
        estimatedHoursTotal: 0, actualHoursTotal: 0,
      };
      byUser.set(key, m);
    }
    return m;
  };

  for (const t of tasks) {
    const m = ensure(t.assigneeId, t.assigneeName, t.departmentId);
    const isOpen = t.status !== 'completed' && t.status !== 'cancelled';
    if (isOpen) {
      m.openTasks += 1;
      if (t.dueDate) {
        const overdue = new Date(t.dueDate).getTime() < nowMs;
        if (overdue) m.overdueTasks += 1;
      }
      const ageDays = Math.max(0, Math.floor((nowMs - new Date(t.createdAt).getTime()) / 86_400_000));
      m.ageingBuckets[_bucketAge(ageDays)] += 1;
      if (!t.acknowledgedAt) m.unacknowledgedCount += 1;
      m.blockedHoursOpen = round2(dAdd(m.blockedHoursOpen, getTimeBlockedHours(entityCode, t.id, opts.now)));
    }
    if (t.acknowledgedAt) {
      const dh = (new Date(t.acknowledgedAt).getTime() - new Date(t.createdAt).getTime()) / 3_600_000;
      if (dh >= 0) {
        const arr = ackDeltas.get(m.userId) || [];
        arr.push(dh);
        ackDeltas.set(m.userId, arr);
      }
    }
    if (typeof t.estimatedHours === 'number') m.estimatedHoursTotal = round2(dAdd(m.estimatedHoursTotal, t.estimatedHours));
    if (typeof t.actualHours === 'number') m.actualHoursTotal = round2(dAdd(m.actualHoursTotal, t.actualHours));
  }

  // Rework bounces — transitions INTO 'rework' attributed to current assignee at time of audit
  for (const a of auditChain) {
    const tsMs = new Date(a.timestamp).getTime();
    if (tsMs < fromMs || tsMs > toMs) continue;
    const after = a.after as { status?: string; assigneeId?: string; assigneeName?: string; departmentId?: string | null } | undefined;
    const before = a.before as { status?: string } | undefined;
    if (after?.status === 'rework' && before?.status !== 'rework') {
      const m = ensure(after.assigneeId ?? null, after.assigneeName ?? '', after.departmentId ?? null);
      m.reworkBounces += 1;
    }
  }

  // Reassignments AWAY — attributed by byUserId (the person who reassigned)
  for (const r of reassignments) {
    const tsMs = new Date(r.timestamp).getTime();
    if (tsMs < fromMs || tsMs > toMs) continue;
    const t = tasks.find(x => x.id === r.taskId);
    const m = ensure(r.byUserId, t?.assigneeName ?? r.byUserId, t?.departmentId ?? null);
    m.reassignmentsAway += 1;
  }

  // SLA breaches — escalations with source 'sla' on tasks owned by user
  for (const esc of escalations) {
    const tsMs = new Date(esc.createdAt).getTime();
    if (tsMs < fromMs || tsMs > toMs) continue;
    if (esc.source !== 'sla') continue;
    const t = tasks.find(x => x.id === esc.taskId);
    if (!t) continue;
    const m = ensure(t.assigneeId, t.assigneeName, t.departmentId);
    m.slaBreaches += 1;
  }

  // Acknowledge-time average
  for (const [userId, arr] of ackDeltas.entries()) {
    const m = byUser.get(userId);
    if (!m || arr.length === 0) continue;
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    m.avgTimeToAcknowledgeHours = round2(avg);
  }

  const people = Array.from(byUser.values());
  const rollupMap = new Map<string, DepartmentRollup>();
  for (const m of people) {
    const key = m.departmentId || '__none__';
    let r = rollupMap.get(key);
    if (!r) {
      r = {
        departmentId: m.departmentId,
        userCount: 0, openTasks: 0, overdueTasks: 0,
        unacknowledgedCount: 0, reworkBounces: 0, reassignmentsAway: 0,
        blockedHoursOpen: 0, slaBreaches: 0,
      };
      rollupMap.set(key, r);
    }
    r.userCount += 1;
    r.openTasks += m.openTasks;
    r.overdueTasks += m.overdueTasks;
    r.unacknowledgedCount += m.unacknowledgedCount;
    r.reworkBounces += m.reworkBounces;
    r.reassignmentsAway += m.reassignmentsAway;
    r.blockedHoursOpen = round2(dAdd(r.blockedHoursOpen, m.blockedHoursOpen));
    r.slaBreaches += m.slaBreaches;
  }
  return { people, rollups: Array.from(rollupMap.values()) };
}

// ═══════════════════════════════════════════════════════════════════════════
// (e) SYMMETRIC VISIBILITY · TF-29f
// ═══════════════════════════════════════════════════════════════════════════
export interface MyTrailBundle {
  userId: string;
  generatedAt: string;
  tasks: Task[];
  acknowledgments: { taskId: string; code: string; acknowledgedAt: string }[];
  reassignments: { id: string; taskId: string; fromUserId: string | null; toUserId: string; reason: string; byUserId: string; timestamp: string }[];
  dueDateChanges: { id: string; taskId: string; oldDate: string | null; newDate: string | null; reason: string; byUserId: string; timestamp: string }[];
  blockedRecords: ReturnType<typeof listBlocked>;
  auditEntries: { id: string; taskId: string; action: string; userId: string; timestamp: string }[];
  diarySpan: { from: string; to: string };
}
export function exportMyTrail(entityCode: string, userId: string): MyTrailBundle {
  const allTasks = listTasks(entityCode);
  const myTasks = allTasks.filter(t => t.assigneeId === userId || t.creatorId === userId);
  const acknowledgments = myTasks
    .filter(t => !!t.acknowledgedAt && t.acknowledgedBy === userId)
    .map(t => ({ taskId: t.id, code: t.code, acknowledgedAt: t.acknowledgedAt as string }));
  const allReassignments = readJSON<MyTrailBundle['reassignments']>(taskflowReassignmentsKey(entityCode), []);
  const reassignments = allReassignments.filter(r => r.fromUserId === userId || r.toUserId === userId || r.byUserId === userId);
  const allDueDateChanges = readJSON<MyTrailBundle['dueDateChanges']>(taskflowDueDateChangesKey(entityCode), []);
  const myTaskIds = new Set(myTasks.map(t => t.id));
  const dueDateChanges = allDueDateChanges.filter(d => myTaskIds.has(d.taskId) || d.byUserId === userId);
  const blockedRecords = listBlocked(entityCode).filter(b => myTaskIds.has(b.taskId));
  const auditChain = readJSON<{ id: string; taskId: string; action: string; userId: string; timestamp: string }[]>(taskflowAuditChainKey(entityCode), []);
  const auditEntries = auditChain.filter(a => myTaskIds.has(a.taskId) || a.userId === userId)
    .map(a => ({ id: a.id, taskId: a.taskId, action: a.action, userId: a.userId, timestamp: a.timestamp }));
  const firstTs = myTasks.length > 0 ? myTasks.map(t => t.createdAt).sort()[0] : new Date().toISOString();
  return {
    userId,
    generatedAt: new Date().toISOString(),
    tasks: myTasks,
    acknowledgments,
    reassignments,
    dueDateChanges,
    blockedRecords,
    auditEntries,
    diarySpan: { from: firstTs.slice(0, 10), to: new Date().toISOString().slice(0, 10) },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// (f) DAILY WORK DIARY · TF-31
// ═══════════════════════════════════════════════════════════════════════════
function _sameDay(iso: string | null | undefined, dateISO: string): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === dateISO;
}
function _taskRef(t: Task): { taskId: string; code: string; title: string } {
  return { taskId: t.id, code: t.code, title: t.title };
}
export function generateWorkDiary(entityCode: string, userId: string, dateISO: string): WorkDiaryEntry {
  const tasks = listTasks(entityCode);
  const auditChain = readJSON<{ id: string; taskId: string; action: string; userId: string; before?: Record<string, unknown>; after?: Record<string, unknown>; timestamp: string }[]>(taskflowAuditChainKey(entityCode), []);
  const taskById = new Map(tasks.map(t => [t.id, t]));

  const created = tasks
    .filter(t => t.creatorId === userId && _sameDay(t.createdAt, dateISO))
    .map(_taskRef);
  const acknowledged = tasks
    .filter(t => t.acknowledgedBy === userId && _sameDay(t.acknowledgedAt, dateISO))
    .map(_taskRef);
  const completed = tasks
    .filter(t => t.status === 'completed' && _sameDay(t.completedDate, dateISO) && (t.assigneeId === userId))
    .map(_taskRef);

  const statusChanges: WorkDiaryEntry['statusChanges'] = [];
  let commentsPosted = 0;
  for (const a of auditChain) {
    if (a.userId !== userId) continue;
    if (!_sameDay(a.timestamp, dateISO)) continue;
    if (a.action === 'comment_added' || a.action === 'comment') {
      commentsPosted += 1;
      continue;
    }
    const before = a.before as { status?: TaskStatus } | undefined;
    const after = a.after as { status?: TaskStatus } | undefined;
    if (before?.status && after?.status && before.status !== after.status) {
      const t = taskById.get(a.taskId);
      if (t) {
        statusChanges.push({ taskId: t.id, code: t.code, from: before.status, to: after.status });
      }
    }
  }

  // Tasks that crossed their due-date during this day (relative to current state)
  const dayStart = new Date(dateISO + 'T00:00:00').getTime();
  const dayEnd = dayStart + 86_400_000;
  const wentOverdue = tasks
    .filter(t => (t.assigneeId === userId)
      && t.dueDate
      && t.status !== 'completed' && t.status !== 'cancelled'
      && new Date(t.dueDate).getTime() >= dayStart
      && new Date(t.dueDate).getTime() < dayEnd)
    .map(_taskRef);

  return { userId, dateISO, acknowledged, created, statusChanges, completed, commentsPosted, wentOverdue };
}

export function generateTeamDiary(entityCode: string, dateISO: string): WorkDiaryEntry[] {
  const tasks = listTasks(entityCode);
  const audit = readJSON<{ userId: string; timestamp: string }[]>(taskflowAuditChainKey(entityCode), []);
  const activeUsers = new Set<string>();
  for (const t of tasks) {
    if (_sameDay(t.createdAt, dateISO) && t.creatorId) activeUsers.add(t.creatorId);
    if (_sameDay(t.acknowledgedAt, dateISO) && t.acknowledgedBy) activeUsers.add(t.acknowledgedBy);
    if (_sameDay(t.completedDate, dateISO) && t.assigneeId) activeUsers.add(t.assigneeId);
  }
  for (const a of audit) {
    if (_sameDay(a.timestamp, dateISO)) activeUsers.add(a.userId);
  }
  return Array.from(activeUsers).map(uid => generateWorkDiary(entityCode, uid, dateISO));
}

// Re-export read-only helpers consumers may want
export { getReassignmentTrail, getDueDateHistory, getTaskAuditChain };
