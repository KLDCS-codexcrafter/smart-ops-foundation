/**
 * @file        src/lib/taskflow-reminders-engine.ts
 * @sprint      Sprint B1S2 · T-B1S2-Adapters-MyReminders · Pillar B.1 CLOSE · SOLE engine credit
 * @realizes    Operator-grade "My Reminders" — every screen can pin a self-served
 *              reminder anchored to any object (approval mirror task / TaskFlow Task
 *              / voucher / party / free-text). Owns CRUD + snooze + fire + digest.
 * @authority   Wave-1 honesty: client-side polling, no server scheduler.
 *              "Reminders by email and WhatsApp arrive with B.2 and B.3" — same
 *              banner the rail already carries; we honor it on MyRemindersPage.
 * @[JWT]       Wave-2 · GET /api/my-reminders?entity={e}&user={u}
 *              Wave-2 · POST /api/my-reminders/{id}/fire (scheduled push)
 */

import {
  type MyReminder,
  type MyReminderKind,
  type MyReminderStatus,
  myRemindersKey,
} from '@/types/my-reminder';
import { publish } from '@/lib/notification-engine';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── tiny LS helpers ────────────────────────────────────────────────────
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
function rid(): string {
  return `myr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function isoNow(): string {
  return new Date().toISOString();
}
function safeAudit(opts: Parameters<typeof logAudit>[0]): void {
  try { logAudit(opts); } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════════
export interface CreateMyReminderInput {
  entityCode: string;
  user_name: string;
  kind: MyReminderKind;
  title: string;
  remind_at: string;
  ref_id?: string;
  ref_label?: string;
  deep_link?: string;
  note?: string;
}

export function createMyReminder(input: CreateMyReminderInput): MyReminder {
  const all = safeRead<MyReminder[]>(myRemindersKey(input.entityCode), []);
  const row: MyReminder = {
    id: rid(),
    entity_id: input.entityCode,
    user_name: input.user_name,
    kind: input.kind,
    ref_id: input.ref_id,
    ref_label: input.ref_label,
    deep_link: input.deep_link,
    title: input.title,
    note: input.note,
    remind_at: input.remind_at,
    status: 'pending',
    created_at: isoNow(),
    updated_at: isoNow(),
  };
  all.push(row);
  safeWrite(myRemindersKey(input.entityCode), all);
  safeAudit({
    entityCode: input.entityCode,
    action: 'create',
    entityType: 'taskflow_event',
    recordId: row.id,
    recordLabel: `my-reminder · ${row.kind} · ${row.title}`,
    beforeState: null,
    afterState: row as unknown as Record<string, unknown>,
    sourceModule: 'taskflow-reminders-engine',
  });
  return row;
}

export function listMyReminders(entityCode: string, userName?: string): MyReminder[] {
  const all = safeRead<MyReminder[]>(myRemindersKey(entityCode), []);
  if (!userName) return all;
  return all.filter((r) => r.user_name.toLowerCase() === userName.toLowerCase());
}

export function getMyReminder(entityCode: string, id: string): MyReminder | null {
  return safeRead<MyReminder[]>(myRemindersKey(entityCode), []).find((r) => r.id === id) ?? null;
}

function persist(entityCode: string, updater: (rows: MyReminder[]) => MyReminder[]): void {
  const next = updater(safeRead<MyReminder[]>(myRemindersKey(entityCode), []));
  safeWrite(myRemindersKey(entityCode), next);
}

export function snoozeMyReminder(entityCode: string, id: string, hours: number): MyReminder | null {
  let updated: MyReminder | null = null;
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
  const until = new Date(Date.now() + safeHours * 3_600_000).toISOString();
  persist(entityCode, (rows) =>
    rows.map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, status: 'snoozed', snoozed_until: until, remind_at: until, updated_at: isoNow() };
      return updated;
    }),
  );
  return updated;
}

export function dismissMyReminder(entityCode: string, id: string): MyReminder | null {
  let updated: MyReminder | null = null;
  persist(entityCode, (rows) =>
    rows.map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, status: 'dismissed', dismissed_at: isoNow(), updated_at: isoNow() };
      return updated;
    }),
  );
  return updated;
}

export function deleteMyReminder(entityCode: string, id: string): boolean {
  let removed = false;
  persist(entityCode, (rows) => {
    const next = rows.filter((r) => {
      if (r.id === id) { removed = true; return false; }
      return true;
    });
    return next;
  });
  return removed;
}

// ═══════════════════════════════════════════════════════════════════════
// Polling fire — call from page mount / interval (client-side only · honesty)
// ═══════════════════════════════════════════════════════════════════════
export interface FireResult {
  fired: number;
}

export function fireDueMyReminders(entityCode: string, userName?: string, nowISO?: string): FireResult {
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  const all = safeRead<MyReminder[]>(myRemindersKey(entityCode), []);
  let fired = 0;
  const next = all.map((r) => {
    if (userName && r.user_name.toLowerCase() !== userName.toLowerCase()) return r;
    if (r.status !== 'pending' && r.status !== 'snoozed') return r;
    if (new Date(r.remind_at).getTime() > now) return r;
    fired += 1;
    publish({
      eventKey: `my-reminder:${entityCode}:${r.id}:${r.remind_at}`,
      entityCode,
      targetUserId: r.user_name,
      kind: 'reminder.due',
      source: 'taskflow-reminders-engine',
      cardId: 'taskflow',
      severity: 'info',
      title: r.title,
      body: r.note ?? `Reminder · ${r.kind}`,
      deepLink: r.deep_link ?? '/erp/taskflow#my-reminders',
      refType: r.kind,
      refId: r.ref_id ?? r.id,
    });
    return { ...r, status: 'fired' as MyReminderStatus, fired_at: new Date(now).toISOString(), updated_at: isoNow() };
  });
  safeWrite(myRemindersKey(entityCode), next);
  return { fired };
}

// ═══════════════════════════════════════════════════════════════════════
// Digest — for NotificationBell open or landing card
// ═══════════════════════════════════════════════════════════════════════
export interface MyRemindersDigest {
  total: number;
  pending: number;
  overdue: number;
  due_today: number;
}

export function getMyRemindersDigest(entityCode: string, userName: string, nowISO?: string): MyRemindersDigest {
  const now = nowISO ? new Date(nowISO) : new Date();
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const rows = listMyReminders(entityCode, userName);
  let pending = 0; let overdue = 0; let dueToday = 0;
  for (const r of rows) {
    if (r.status === 'dismissed' || r.status === 'fired') continue;
    pending += 1;
    const t = new Date(r.remind_at).getTime();
    if (t < now.getTime()) overdue += 1;
    else if (t <= todayEnd.getTime()) dueToday += 1;
  }
  return { total: rows.length, pending, overdue, due_today: dueToday };
}
