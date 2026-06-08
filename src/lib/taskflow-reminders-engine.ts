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
import { listPendingMirrors } from '@/lib/approval-rail-engine';
import { listTasks } from '@/lib/taskflow-engine';
import { listPendingQa } from '@/lib/qa-inspection-engine';
import { customerReminderKey } from '@/types/customer-reminder';

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

// ═══════════════════════════════════════════════════════════════════════
// §2.4b · Reminder Catalog + User Prefs + Snapshots + Digest
// Honest count-readers over EXISTING stores. No fake zeros: items with no
// data source surface status='unavailable' + reason.
// ═══════════════════════════════════════════════════════════════════════

export type ReminderCatalogId =
  | 'approvals_waiting'
  | 'tasks_due_today'
  | 'ptps_today'
  | 'gst_obligations'
  | 'amc_expiring'
  | 'low_stock'
  | 'quarantine'
  | 'open_picklists'
  | 'unacked_manifests'
  | 'retention_reviews'
  | 'procure_followups'
  | 'birthdays_today';

export type ReminderRole = 'operations' | 'finance' | 'sales' | 'admin' | 'any';

export interface ReminderCatalogItem {
  id: ReminderCatalogId;
  label: string;
  description: string;
  roles: ReminderRole[];
  defaultThreshold: number;
  defaultHeadline: boolean;
  defaultShow: boolean;
  /** Source citation: 'engine#fn (file:line)' OR 'unavailable: <reason>' */
  source: string;
  deepLink: string;
}

export const REMINDER_CATALOG: ReminderCatalogItem[] = [
  {
    id: 'approvals_waiting', label: 'Approvals waiting',
    description: 'Mirror tasks in your inbox still pending decision.',
    roles: ['operations', 'finance', 'sales', 'admin', 'any'],
    defaultThreshold: 0, defaultHeadline: true, defaultShow: true,
    source: 'approval-rail-engine#listPendingMirrors (src/lib/approval-rail-engine.ts:517)',
    deepLink: '/erp/taskflow#approvals-inbox',
  },
  {
    id: 'tasks_due_today', label: 'Tasks due today',
    description: 'TaskFlow tasks with dueDate ≤ end-of-day, not completed/cancelled.',
    roles: ['operations', 'finance', 'sales', 'admin', 'any'],
    defaultThreshold: 0, defaultHeadline: true, defaultShow: true,
    source: 'taskflow-engine#listTasks (src/lib/taskflow-engine.ts:158)',
    deepLink: '/erp/taskflow',
  },
  {
    id: 'quarantine', label: 'QA inspections pending',
    description: 'QA records in pending or in_progress state.',
    roles: ['operations', 'admin', 'any'],
    defaultThreshold: 5, defaultHeadline: false, defaultShow: true,
    source: 'qa-inspection-engine#listPendingQa (src/lib/qa-inspection-engine.ts:47)',
    deepLink: '/erp/qualicheck',
  },
  {
    id: 'birthdays_today', label: 'Birthdays today',
    description: 'CRM customer reminders of type=birthday with trigger_date=today.',
    roles: ['sales', 'admin', 'any'],
    defaultThreshold: 0, defaultHeadline: false, defaultShow: true,
    source: 'customer-reminder store via customerReminderKey (src/types/customer-reminder.ts:32)',
    deepLink: '/erp/servicedesk',
  },
  // ── Honestly unavailable today (catalog visible · disabled by default) ─
  {
    id: 'ptps_today', label: 'PTPs due today', description: 'Promise-to-Pay receivables due today.',
    roles: ['finance', 'any'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: receivx-engine exposes no PTP-by-date count; activates with PTP store.',
    deepLink: '/erp/receivx',
  },
  {
    id: 'gst_obligations', label: 'GST obligations', description: 'Filings or payments due in the window.',
    roles: ['finance', 'admin'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: comply360 calendar does not export a pending-count in tree.',
    deepLink: '/erp/comply360',
  },
  {
    id: 'amc_expiring', label: 'AMC expiring (30 d)', description: 'AMC contracts expiring soon.',
    roles: ['sales', 'admin'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: servicedesk-engine has no AMC expiry-index export yet.',
    deepLink: '/erp/servicedesk',
  },
  {
    id: 'low_stock', label: 'Low-stock items', description: 'Items below reorder level.',
    roles: ['operations', 'admin'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: no aggregated low-stock counter; requires item-master walk.',
    deepLink: '/erp/inventory-hub',
  },
  {
    id: 'open_picklists', label: 'Open picklists', description: 'WMS picklists not yet packed.',
    roles: ['operations'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: wms-pick-pack-engine has no count export in tree.',
    deepLink: '/erp/dispatch/wms',
  },
  {
    id: 'unacked_manifests', label: 'Unacked manifests', description: 'Manifests awaiting LR acknowledgement.',
    roles: ['operations'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: ack join requires manifest-by-manifest scan; deferred to Wave-2.',
    deepLink: '/erp/dispatch/wms',
  },
  {
    id: 'retention_reviews', label: 'Retention reviews', description: 'Records pending periodic retention review.',
    roles: ['admin'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: record-retention-policy-engine has no "pending-review" count export.',
    deepLink: '/erp/docvault',
  },
  {
    id: 'procure_followups', label: 'Procure follow-ups', description: 'Vendor follow-ups due today.',
    roles: ['operations'], defaultThreshold: 0, defaultHeadline: false, defaultShow: false,
    source: 'unavailable: procurement-followups store has no due-today counter.',
    deepLink: '/erp/procure-hub',
  },
];

export interface UserReminderPref {
  id: ReminderCatalogId;
  show: boolean;
  headline: boolean;
  order: number;
  threshold: number;
  show_zero: boolean;
}

export interface UserReminderPrefs {
  user_name: string;
  items: UserReminderPref[];
}

const prefsKey = (entityCode: string, userName: string): string =>
  `erp_my_reminders_prefs_${entityCode}_${userName.toLowerCase()}`;

function defaultPrefs(userName: string): UserReminderPrefs {
  return {
    user_name: userName,
    items: REMINDER_CATALOG.map((c, i) => ({
      id: c.id,
      show: c.defaultShow,
      headline: c.defaultHeadline,
      order: i,
      threshold: c.defaultThreshold,
      show_zero: c.defaultHeadline,
    })),
  };
}

export function getUserPrefs(entityCode: string, userName: string): UserReminderPrefs {
  const raw = safeRead<UserReminderPrefs | null>(prefsKey(entityCode, userName), null);
  if (!raw) return defaultPrefs(userName);
  const have = new Set(raw.items.map((i) => i.id));
  const merged: UserReminderPref[] = [
    ...raw.items,
    ...REMINDER_CATALOG
      .filter((c) => !have.has(c.id))
      .map((c, idx) => ({
        id: c.id, show: c.defaultShow, headline: c.defaultHeadline,
        order: raw.items.length + idx, threshold: c.defaultThreshold, show_zero: c.defaultHeadline,
      })),
  ];
  return { user_name: raw.user_name, items: merged };
}

export function saveUserPrefs(entityCode: string, prefs: UserReminderPrefs): UserReminderPrefs {
  safeWrite(prefsKey(entityCode, prefs.user_name), prefs);
  return prefs;
}

export type ReminderSnapshotStatus = 'ok' | 'unavailable';

export interface ReminderSnapshot {
  id: ReminderCatalogId;
  label: string;
  description: string;
  status: ReminderSnapshotStatus;
  count: number | null;
  threshold: number;
  breached: boolean;
  headline: boolean;
  show_zero: boolean;
  order: number;
  reason?: string;
  deepLink: string;
  source: string;
}

type CountReader = () => number;

function readApprovalsWaiting(entityCode: string): number {
  return listPendingMirrors(entityCode).length;
}
function readTasksDueToday(entityCode: string, endOfDay: number): number {
  return listTasks(entityCode).filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() <= endOfDay;
  }).length;
}
function readQuarantine(entityCode: string): number {
  return listPendingQa(entityCode).length;
}
function readBirthdaysToday(entityCode: string, todayStr: string): number {
  const rows = safeRead<Array<{ reminder_type: string; trigger_date: string; status: string }>>(
    customerReminderKey(entityCode), [],
  );
  return rows.filter((r) =>
    r.reminder_type === 'birthday'
    && r.status !== 'dismissed'
    && typeof r.trigger_date === 'string'
    && r.trigger_date.slice(0, 10) === todayStr,
  ).length;
}

export function getMyReminders(entityCode: string, userName: string, nowISO?: string): ReminderSnapshot[] {
  const prefs = getUserPrefs(entityCode, userName);
  const now = nowISO ? new Date(nowISO) : new Date();
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const todayStr = now.toISOString().slice(0, 10);

  const readers: Partial<Record<ReminderCatalogId, CountReader>> = {
    approvals_waiting: () => readApprovalsWaiting(entityCode),
    tasks_due_today: () => readTasksDueToday(entityCode, endOfDay.getTime()),
    quarantine: () => readQuarantine(entityCode),
    birthdays_today: () => readBirthdaysToday(entityCode, todayStr),
  };

  const out: ReminderSnapshot[] = REMINDER_CATALOG.map((cat) => {
    const pref = prefs.items.find((p) => p.id === cat.id);
    const headline = pref?.headline ?? cat.defaultHeadline;
    const show_zero = pref?.show_zero ?? cat.defaultHeadline;
    const order = pref?.order ?? 999;
    const threshold = pref?.threshold ?? cat.defaultThreshold;

    if (cat.source.startsWith('unavailable')) {
      return {
        id: cat.id, label: cat.label, description: cat.description,
        status: 'unavailable', count: null, threshold, breached: false,
        headline, show_zero, order,
        reason: cat.source.replace(/^unavailable:\s*/, ''),
        deepLink: cat.deepLink, source: cat.source,
      };
    }
    const reader = readers[cat.id];
    if (!reader) {
      return {
        id: cat.id, label: cat.label, description: cat.description,
        status: 'unavailable', count: null, threshold, breached: false,
        headline, show_zero, order,
        reason: 'no reader bound',
        deepLink: cat.deepLink, source: cat.source,
      };
    }
    try {
      const n = reader();
      return {
        id: cat.id, label: cat.label, description: cat.description,
        status: 'ok', count: n, threshold,
        breached: n > threshold,
        headline, show_zero, order,
        deepLink: cat.deepLink, source: cat.source,
      };
    } catch (e) {
      return {
        id: cat.id, label: cat.label, description: cat.description,
        status: 'unavailable', count: null, threshold, breached: false,
        headline, show_zero, order,
        reason: (e as Error).message || 'reader-threw',
        deepLink: cat.deepLink, source: cat.source,
      };
    }
  });

  return out.sort((a, b) => a.order - b.order);
}

/** Idempotent per (entity,user,day) via eventKey. Publishes digest.my_reminders. */
export function publishMyRemindersDigest(
  entityCode: string,
  userName: string,
  nowISO?: string,
): { count: number } {
  const today = (nowISO ? new Date(nowISO) : new Date()).toISOString().slice(0, 10);
  const snaps = getMyReminders(entityCode, userName, nowISO);
  const breached = snaps.filter((s) => s.status === 'ok' && s.breached);
  if (breached.length === 0) return { count: 0 };
  const total = breached.reduce((acc, s) => acc + (s.count ?? 0), 0);
  publish({
    eventKey: `digest:my-reminders:${entityCode}:${userName}:${today}`,
    entityCode,
    targetUserId: userName,
    kind: 'digest.my_reminders',
    source: 'taskflow-reminders-engine',
    cardId: 'taskflow',
    severity: breached.length >= 3 ? 'critical' : 'warning',
    title: `${breached.length} reminder${breached.length === 1 ? '' : 's'} need attention`,
    body: breached.map((b) => `${b.label}: ${b.count}`).join(' · '),
    deepLink: '/erp/dashboard#my-reminders',
    refType: 'digest',
    refId: `my-reminders:${today}`,
  });
  // Sprint B2 · B.2 first-customer hook · enqueue outbox message (≤2 lines additive)
  try { void (import('@/lib/communication-engine').then(m => m.enqueueFromEvent({ entityCode, fiscalYearId: 'FY-UNRESOLVED', objectType: 'digest.my_reminders', sourceCard: 'taskflow', recipientUserName: userName, mergeData: { count: total, body: breached.map((b) => `${b.label}: ${b.count}`).join(' · ') } }))); } catch { /* swallow */ }
  return { count: total };
}

