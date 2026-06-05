/**
 * @file        src/lib/receivx-followup-engine.ts
 * @realizes    Collections Follow-Up discipline (Charis TDL spec) · DP-RX-1…3 ·
 *              append-only log · Today board · planned reminders · Last-3.
 * @reads-from  receivx-engine + receivx types (READ/CALL · one documented additive
 *              task-field write rides the existing localStorage task save path) ·
 *              fd_party_contacts (read) · audit-trail-engine.
 * @sprint      Sprint 148 · T-ReceivX-CF.1
 * @[JWT]       P2BB: login-time prompt server-side · WhatsApp send integration.
 *
 * DP-RX-1 delta canon: receivx-engine.ts + receivx.ts types ZERO diff.
 *   The single additive write here mutates `last_contact_at`, `last_contact_channel`
 *   and `next_action_date` on the OutstandingTask SHAPE-COMPATIBLE-AS-IS, persisted
 *   via the existing `receivxTasksKey` localStorage path (same pattern used by
 *   OutstandingTaskBoard.tsx). NO change to OutstandingTask shape.
 *
 * DP-RX-2 APPEND-ONLY: no edit path, no bulk delete. `voidFollowUp(reason)` is
 *   the sole correction. The TDL's "Clear Followup" is deliberately NOT mirrored.
 *
 * DP-RX-3 once-per-day on-open prompt (client-side flag · [JWT] P2BB server-side).
 *
 * §H 0-DIFF: approval-workflow-engine + Comply360 + push-notification-bridge UNTOUCHED.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import {
  receivxTasksKey, receivxPTPsKey,
  type OutstandingTask, type PTP,
} from '@/types/receivx';
import {
  receivxFollowUpsKey, receivxFollowUpPromptKey,
  type CollectionFollowUp, type FollowUpChannel,
} from '@/types/receivx-followup';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function mkId(p: string): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string { return new Date().toISOString(); }

function audit(
  entityCode: string,
  action: 'create' | 'update' | 'cancel',
  recordId: string,
  recordLabel: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'receivx_followup_event',
      recordId, recordLabel, beforeState: before, afterState: after,
      reason, sourceModule: 'receivx',
    });
  } catch (e) { console.error('[receivx-followup audit]', e); }
}

// ─── load/save ───────────────────────────────────────────────────────
export function loadFollowUps(entityCode: string): CollectionFollowUp[] {
  return readJSON<CollectionFollowUp[]>(receivxFollowUpsKey(entityCode), []);
}
function saveFollowUps(entityCode: string, rows: CollectionFollowUp[]): void {
  writeJSON(receivxFollowUpsKey(entityCode), rows);
}

function loadTasks(entityCode: string): OutstandingTask[] {
  return readJSON<OutstandingTask[]>(receivxTasksKey(entityCode), []);
}
function saveTasks(entityCode: string, rows: OutstandingTask[]): void {
  // [JWT] PUT /api/receivx/tasks — same path the board uses
  writeJSON(receivxTasksKey(entityCode), rows);
}

/**
 * DP-RX-1 channel mapping · OutstandingTask.last_contact_channel is the existing
 * union {'whatsapp' | 'email' | 'sms' | 'call'}. Follow-up channels {meeting, visit}
 * are mapped to 'call' (closest in-person/voice analog) — DESIGN-DECISION-FLAG.
 */
function mapChannelToTaskUnion(ch: FollowUpChannel): 'whatsapp' | 'email' | 'sms' | 'call' {
  if (ch === 'whatsapp' || ch === 'email' || ch === 'sms' || ch === 'call') return ch;
  // 'meeting' | 'visit' → 'call' (DESIGN-DECISION-FLAG)
  return 'call';
}

// ─── public API ──────────────────────────────────────────────────────
export interface LogFollowUpInput {
  taskId: string;
  followedUpByUserId: string;
  followedUpByName: string;
  channel: FollowUpChannel;
  remarks: string;                     // MANDATORY
  contactPersonId?: string | null;
  contactPersonName?: string | null;
  nextFollowUpDate?: string | null;
  promisedAmount?: number | null;      // when set → PTP created
  at?: string | null;
}

export function logFollowUp(entityCode: string, input: LogFollowUpInput): CollectionFollowUp {
  if (!input.remarks || !input.remarks.trim()) {
    throw new Error('Follow-up: remarks are mandatory');
  }
  const tasks = loadTasks(entityCode);
  const tIdx = tasks.findIndex((t) => t.id === input.taskId);
  if (tIdx < 0) throw new Error(`Outstanding task not found: ${input.taskId}`);
  const t = tasks[tIdx];

  const at = input.at ?? nowISO();
  let ptpId: string | null = null;

  // promisedAmount set → PTP via EXISTING machinery (mirrors OutstandingTaskBoard inline shape)
  if (input.promisedAmount != null && input.promisedAmount > 0) {
    if (!input.nextFollowUpDate) {
      throw new Error('Follow-up: promised amount requires a next follow-up date (promised_date)');
    }
    const ptp: PTP = {
      id: `ptp-${Date.now()}`,
      entity_id: entityCode,
      task_id: t.id,
      party_id: t.party_id,
      party_name: t.party_name,
      voucher_no: t.voucher_no,
      promised_date: input.nextFollowUpDate,
      promised_amount: input.promisedAmount,
      actual_receipt_voucher_no: null,
      actual_receipt_date: null,
      actual_amount: 0,
      status: 'active',
      evaluation_date: null,
      recorded_by: input.followedUpByUserId,
      recorded_via: input.channel === 'meeting' || input.channel === 'visit' ? 'meeting' : input.channel,
      notes: input.remarks.trim(),
      created_at: at, updated_at: at,
    };
    const existingPTPs = readJSON<PTP[]>(receivxPTPsKey(entityCode), []);
    // [JWT] POST /api/receivx/ptps — same path the board uses
    writeJSON(receivxPTPsKey(entityCode), [...existingPTPs, ptp]);
    ptpId = ptp.id;
  }

  // Build the append-only follow-up record
  const fu: CollectionFollowUp = {
    id: mkId('fu'),
    entityId: entityCode,
    taskId: t.id,
    partyId: t.party_id,
    partyName: t.party_name,
    voucherNo: t.voucher_no,
    followedUpByUserId: input.followedUpByUserId,
    followedUpByName: input.followedUpByName,
    at,
    channel: input.channel,
    contactPersonId: input.contactPersonId ?? null,
    contactPersonName: input.contactPersonName ?? null,
    remarks: input.remarks.trim(),
    nextFollowUpDate: input.nextFollowUpDate ?? null,
    promisedAmount: input.promisedAmount ?? null,
    ptpId,
    voidedAt: null, voidedByUserId: null, voidReason: null,
    createdAt: at,
  };
  saveFollowUps(entityCode, [fu, ...loadFollowUps(entityCode)]);

  // DP-RX-1 · additive task-side-effect write via EXISTING task save path
  const before: Record<string, unknown> = {
    last_contact_at: t.last_contact_at,
    last_contact_channel: t.last_contact_channel,
    next_action_date: t.next_action_date,
  };
  tasks[tIdx] = {
    ...t,
    last_contact_at: at,
    last_contact_channel: mapChannelToTaskUnion(input.channel),
    next_action_date: input.nextFollowUpDate ?? t.next_action_date,
    active_ptp_id: ptpId ?? t.active_ptp_id,
    status: ptpId ? 'promised' : t.status,
    updated_at: at,
  };
  saveTasks(entityCode, tasks);

  audit(entityCode, 'create', fu.id, `${fu.partyName} · ${fu.voucherNo}`,
    before,
    { last_contact_at: at, last_contact_channel: mapChannelToTaskUnion(input.channel),
      next_action_date: tasks[tIdx].next_action_date, ptpId },
    `follow-up logged via ${input.channel}`);
  return fu;
}

// ─── listFollowUps + getLastN ────────────────────────────────────────
export interface ListFollowUpsFilter {
  taskId?: string;
  partyId?: string;
  byUserId?: string;
  from?: string;
  to?: string;
}
export function listFollowUps(entityCode: string, f: ListFollowUpsFilter = {}): CollectionFollowUp[] {
  return loadFollowUps(entityCode)
    .filter((x) => (!f.taskId    || x.taskId === f.taskId))
    .filter((x) => (!f.partyId   || x.partyId === f.partyId))
    .filter((x) => (!f.byUserId  || x.followedUpByUserId === f.byUserId))
    .filter((x) => (!f.from      || x.at >= f.from))
    .filter((x) => (!f.to        || x.at <= f.to))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function getLastN(entityCode: string, partyId: string, n = 3): CollectionFollowUp[] {
  return listFollowUps(entityCode, { partyId }).slice(0, n);
}

// ─── voidFollowUp ────────────────────────────────────────────────────
export function voidFollowUp(
  entityCode: string,
  followUpId: string,
  reason: string,
  byUserId: string,
): CollectionFollowUp {
  if (!reason || !reason.trim()) throw new Error('voidFollowUp: reason is mandatory');
  const rows = loadFollowUps(entityCode);
  const idx = rows.findIndex((x) => x.id === followUpId);
  if (idx < 0) throw new Error(`Follow-up not found: ${followUpId}`);
  if (rows[idx].voidedAt) throw new Error('Follow-up already voided');
  const before = { voidedAt: null as string | null, voidReason: null as string | null };
  const at = nowISO();
  rows[idx] = { ...rows[idx], voidedAt: at, voidedByUserId: byUserId, voidReason: reason.trim() };
  saveFollowUps(entityCode, rows);
  // NOTE · APPEND-ONLY canon: task side-effects (last_contact_*, next_action_date)
  // are NOT reverted here. A corrective follow-up is the documented recovery path.
  audit(entityCode, 'cancel', followUpId, `${rows[idx].partyName} · ${rows[idx].voucherNo}`,
    before, { voidedAt: at, voidReason: reason.trim() }, `follow-up voided: ${reason.trim()}`);
  return rows[idx];
}

// ─── Today board ─────────────────────────────────────────────────────
export interface TodayRow {
  task: OutstandingTask;
  lastFollowUp: CollectionFollowUp | null;
}
export interface TodayBoard {
  overdue: TodayRow[];
  today: TodayRow[];
}
export function getTodaysFollowUps(entityCode: string, nowISO_?: string): TodayBoard {
  const now = nowISO_ ?? nowISO();
  const today = now.slice(0, 10);
  const tasks = loadTasks(entityCode);
  const fus = loadFollowUps(entityCode).filter((x) => !x.voidedAt);
  const lastByTask = new Map<string, CollectionFollowUp>();
  for (const fu of fus) {
    const prev = lastByTask.get(fu.taskId);
    if (!prev || fu.at > prev.at) lastByTask.set(fu.taskId, fu);
  }
  const overdue: TodayRow[] = [];
  const todayRows: TodayRow[] = [];
  for (const t of tasks) {
    if (!t.next_action_date) continue;
    const day = t.next_action_date.slice(0, 10);
    const row: TodayRow = { task: t, lastFollowUp: lastByTask.get(t.id) ?? null };
    if (day < today) overdue.push(row);
    else if (day === today) todayRows.push(row);
  }
  return { overdue, today: todayRows };
}

// ─── Planned reminders ───────────────────────────────────────────────
export interface PlannedReminderGroup { dateISO: string; tasks: OutstandingTask[] }

export function getPlannedReminders(
  entityCode: string,
  opts: { days: 7 | 30 },
  nowISO_?: string,
): PlannedReminderGroup[] {
  const now = nowISO_ ?? nowISO();
  const today = now.slice(0, 10);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + opts.days);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const tasks = loadTasks(entityCode).filter((t) => {
    if (!t.next_action_date) return false;
    const d = t.next_action_date.slice(0, 10);
    return d > today && d <= horizonStr;
  });
  const byDate = new Map<string, OutstandingTask[]>();
  for (const t of tasks) {
    const d = t.next_action_date!.slice(0, 10);
    const arr = byDate.get(d) ?? [];
    arr.push(t);
    byDate.set(d, arr);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, taskList]) => ({ dateISO, tasks: taskList }));
}

// ─── On-open prompt (DP-RX-3) ────────────────────────────────────────
export function shouldPromptToday(entityCode: string, nowISO_?: string): boolean {
  const now = nowISO_ ?? nowISO();
  const key = receivxFollowUpPromptKey(entityCode, now);
  try {
    if (localStorage.getItem(key) === '1') return false;
  } catch { /* noop */ }
  const { overdue, today } = getTodaysFollowUps(entityCode, now);
  return (overdue.length + today.length) > 0;
}

export function markPrompted(entityCode: string, dateISO: string): void {
  try { localStorage.setItem(receivxFollowUpPromptKey(entityCode, dateISO), '1'); } catch { /* noop */ }
}
