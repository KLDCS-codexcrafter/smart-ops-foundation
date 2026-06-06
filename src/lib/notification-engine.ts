/**
 * @file        src/lib/notification-engine.ts
 * @purpose     Sprint P82 · B.4 Notification Center spine · publish/read/markRead
 *              + mute layer + on-open digest builders for the 8 P82-instrumented
 *              engines. Entity-scoped LS via notificationsKey(entityCode). Bounded
 *              ring buffer (NOTIFICATION_MAX). APPEND-ONLY: only readAt is mutated
 *              in place; cap-prune drops oldest. NO clearAll (canon: append + cap-prune
 *              are the only deletes; readAt the only in-place update).
 * @sprint      Sprint P82 · Step 2 · Block 1 + Block 1.2 parity
 * @reads-from  taskflow-engine (listTasks · getUnacknowledgedTasks) ·
 *              receivx-engine (evaluatePTPs over LS-stored PTPs) ·
 *              comply360-statutory-memory (loadObligations) · CALL-ONLY per
 *              instrumentation wall (no source-engine edits beyond the single
 *              publish() per success path).
 * @walls       §H 0-DIFF preserved. push-notification-bridge.ts UNTOUCHED.
 * @[JWT]       P2BB · POST /api/notifications · server fan-out + WS delivery
 */
import {
  type NotificationEvent,
  type NotificationKind,
  type NotificationSeverity,
  type NotificationMutePref,
  notificationsKey,
  notificationMutesKey,
  NOTIFICATION_MAX,
} from '@/types/notification';
import type { CardId } from '@/types/card-entitlement';
// Digest reads are CALL-ONLY at runtime; the cycle is safe because every
// reference lives inside a function body (no top-level evaluation).
import { listTasks, getUnacknowledgedTasks } from '@/lib/taskflow-engine';
import { evaluatePTPs } from '@/lib/receivx-engine';
import { loadObligations } from '@/lib/comply360-statutory-memory';


// ── tiny LS helpers (house pattern) ────────────────────────────────────────
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}
function newId(prefix = 'ntf'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface PublishInput {
  /** Required idempotency key · same key never duplicates inside the ring. */
  eventKey: string;
  entityCode: string;
  /** Target recipient · '*' = entity broadcast. */
  targetUserId: string;
  targetRole?: string | null;
  kind: NotificationKind;
  /** Originating engine identifier (e.g. 'taskflow-engine'). */
  source: string;
  cardId: CardId;
  severity?: NotificationSeverity;
  title: string;
  body?: string | null;
  deepLink?: string | null;
  refType?: string | null;
  refId?: string | null;
}

/**
 * publish — append a single NotificationEvent to the entity ring buffer.
 * IDEMPOTENT by eventKey: if an event with the same eventKey already exists
 * for this entity, returns the existing event without appending a duplicate.
 * Cap-prune drops oldest (tail) only.
 */
export function publish(input: PublishInput): NotificationEvent {
  const key = notificationsKey(input.entityCode);
  const all = ls<NotificationEvent>(key);
  const existing = all.find((e) => e.eventKey === input.eventKey);
  if (existing) return existing;

  const evt: NotificationEvent = {
    id: newId(),
    eventKey: input.eventKey,
    entityCode: input.entityCode,
    targetUserId: input.targetUserId,
    targetRole: input.targetRole ?? null,
    kind: input.kind,
    source: input.source,
    cardId: input.cardId,
    severity: input.severity ?? 'info',
    title: input.title,
    body: input.body ?? null,
    deepLink: input.deepLink ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  // newest-first; cap-prune oldest (tail).
  const next = [evt, ...all].slice(0, NOTIFICATION_MAX);
  ss(key, next);
  return evt;
}

// ═══════════════════════════════════════════════════════════════════════
// Mute layer
// ═══════════════════════════════════════════════════════════════════════
function activeMutes(entityCode: string, userId: string): NotificationMutePref[] {
  const now = Date.now();
  return ls<NotificationMutePref>(notificationMutesKey(entityCode, userId))
    .filter((m) => !m.until || new Date(m.until).getTime() > now);
}
function isMuted(
  evt: NotificationEvent,
  mutes: NotificationMutePref[],
): boolean {
  return mutes.some((m) =>
    (m.kind === null || m.kind === evt.kind) &&
    (m.source === null || m.source === evt.source),
  );
}

export function getMutes(entityCode: string, userId: string): NotificationMutePref[] {
  return activeMutes(entityCode, userId);
}

export interface SetMuteInput {
  kind?: NotificationKind | null;
  source?: string | null;
  until?: string | null;
}
export function setMute(
  entityCode: string,
  userId: string,
  input: SetMuteInput,
): NotificationMutePref {
  const pref: NotificationMutePref = {
    id: newId('mute'),
    entityCode,
    userId,
    kind: input.kind ?? null,
    source: input.source ?? null,
    until: input.until ?? null,
    createdAt: new Date().toISOString(),
  };
  const key = notificationMutesKey(entityCode, userId);
  ss(key, [...ls<NotificationMutePref>(key), pref]);
  return pref;
}
export function unsetMute(entityCode: string, userId: string, muteId: string): void {
  const key = notificationMutesKey(entityCode, userId);
  ss(key, ls<NotificationMutePref>(key).filter((m) => m.id !== muteId));
}

// ═══════════════════════════════════════════════════════════════════════
// Reads (consumed by bell + center · mute-filtered)
// ═══════════════════════════════════════════════════════════════════════
export function listNotifications(
  entityCode: string,
  filter?: { userId?: string; unreadOnly?: boolean; kind?: NotificationKind },
): NotificationEvent[] {
  let rows = ls<NotificationEvent>(notificationsKey(entityCode));
  if (filter?.userId) {
    rows = rows.filter((n) => n.targetUserId === filter.userId || n.targetUserId === '*');
    const mutes = activeMutes(entityCode, filter.userId);
    if (mutes.length > 0) rows = rows.filter((n) => !isMuted(n, mutes));
  }
  if (filter?.unreadOnly) rows = rows.filter((n) => !n.readAt);
  if (filter?.kind) rows = rows.filter((n) => n.kind === filter.kind);
  return rows;
}

export function getUnreadCount(entityCode: string, userId: string): number {
  return listNotifications(entityCode, { userId, unreadOnly: true }).length;
}

export function markRead(entityCode: string, id: string): void {
  const key = notificationsKey(entityCode);
  const all = ls<NotificationEvent>(key);
  const idx = all.findIndex((n) => n.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], readAt: new Date().toISOString() };
  ss(key, all);
}

export function markAllRead(entityCode: string, userId: string): number {
  const key = notificationsKey(entityCode);
  const all = ls<NotificationEvent>(key);
  const now = new Date().toISOString();
  let n = 0;
  const next = all.map((evt) => {
    if (evt.readAt) return evt;
    if (evt.targetUserId !== userId && evt.targetUserId !== '*') return evt;
    n += 1;
    return { ...evt, readAt: now };
  });
  if (n > 0) ss(key, next);
  return n;
}

// ═══════════════════════════════════════════════════════════════════════
// On-open digest builders (Pass 2 · Block 1.2 §4)
// Date-scoped eventKey ⇒ same-day re-open adds NO new events (idempotent).
// All reads are CALL-ONLY against the 0.5 read surfaces.
// ═══════════════════════════════════════════════════════════════════════
function todayDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Overdue / unacknowledged tasks digest · once per (entity,user,day). */
export function buildOverdueTasksDigest(
  entityCode: string,
  userId: string,
  nowISO?: string,
): NotificationEvent | null {
  const now = nowISO ? new Date(nowISO) : new Date();
  const today = todayDate(now);
  const tasks = listTasks(entityCode);
  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() < now.getTime();
  });
  const unack = getUnacknowledgedTasks(entityCode, 0);
  const count = overdue.length + unack.length;
  if (count === 0) return null;
  return publish({
    eventKey: `digest:overdue-tasks:${entityCode}:${userId}:${today}`,
    entityCode, targetUserId: userId, kind: 'digest.overdue_tasks',
    source: 'notification-engine', cardId: 'taskflow', severity: 'warning',
    title: `${count} task${count === 1 ? '' : 's'} need your attention`,
    body: `${overdue.length} overdue · ${unack.length} unacknowledged`,
    deepLink: '/erp/taskflow', refType: 'digest', refId: `overdue-tasks:${today}`,
  });
}

/** PTP-due digest · evaluates active PTPs against today; emits if any due today or already broken. */
export function buildPtpDueDigest(
  entityCode: string,
  userId: string,
  nowISO?: string,
): NotificationEvent | null {
  const now = nowISO ? new Date(nowISO) : new Date();
  const today = todayDate(now);
  // PTPs persisted by ReceivX under erp_receivx_ptps_<entityCode>
  // [JWT] GET /api/receivx/ptps?entityCode= — replace LS read in P2BB
  const ptps = ls<Parameters<typeof evaluatePTPs>[0][number]>(
    `erp_receivx_ptps_${entityCode}`,
  );
  // No receipts wired in the spine — pass [] so the engine flips overdue PTPs to 'broken'.
  const evaluated = evaluatePTPs(ptps, [], today);
  const dueToday = evaluated.filter((p) => p.status === 'active' && p.promised_date === today);
  const broken = evaluated.filter((p) => p.status === 'broken');
  const count = dueToday.length + broken.length;
  if (count === 0) return null;
  return publish({
    eventKey: `digest:ptp-due:${entityCode}:${userId}:${today}`,
    entityCode, targetUserId: userId, kind: 'digest.ptp_due',
    source: 'notification-engine', cardId: 'receivx', severity: broken.length > 0 ? 'critical' : 'warning',
    title: `${count} PTP${count === 1 ? '' : 's'} need follow-up`,
    body: `${dueToday.length} due today · ${broken.length} broken`,
    deepLink: '/erp/receivx/ptps', refType: 'digest', refId: `ptp-due:${today}`,
  });
}

/** Statutory obligations due within 7 days · once per (entity,user,day). */
export function buildObligationsDueDigest(
  entityCode: string,
  userId: string,
  nowISO?: string,
): NotificationEvent | null {
  const now = nowISO ? new Date(nowISO) : new Date();
  const today = todayDate(now);
  const horizon = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
  const obligations = loadObligations().filter((o) =>
    o.status === 'pending' && o.due_date >= today && o.due_date <= horizon,
  );
  if (obligations.length === 0) return null;
  return publish({
    eventKey: `digest:obligations-due:${entityCode}:${userId}:${today}`,
    entityCode, targetUserId: userId, kind: 'digest.obligations_due',
    source: 'notification-engine', cardId: 'comply360', severity: 'warning',
    title: `${obligations.length} statutory filing${obligations.length === 1 ? '' : 's'} due this week`,
    body: obligations.slice(0, 3).map((o) => o.label).join(' · ')
      + (obligations.length > 3 ? ` · +${obligations.length - 3} more` : ''),
    deepLink: '/erp/comply360', refType: 'digest', refId: `obligations-due:${today}`,
  });
}

/**
 * runOpenDigests — fired ONCE per bell-open by the UI (Block 4).
 * Returns the events emitted this run (excludes already-emitted same-day digests
 * which short-circuit via publish() idempotency).
 */
export function runOpenDigests(
  entityCode: string,
  userId: string,
  nowISO?: string,
): NotificationEvent[] {
  const out: NotificationEvent[] = [];
  const a = buildOverdueTasksDigest(entityCode, userId, nowISO);
  const b = buildPtpDueDigest(entityCode, userId, nowISO);
  const c = buildObligationsDueDigest(entityCode, userId, nowISO);
  if (a) out.push(a);
  if (b) out.push(b);
  if (c) out.push(c);
  return out;
}
