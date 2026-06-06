/**
 * @file        src/lib/notification-engine.ts
 * @purpose     Sprint P82 · B.4 Notification Center spine · publish/read/markRead
 *              surface for the 8 P82-instrumented engines. Entity-scoped LS via
 *              notificationsKey(entityCode). Bounded ring buffer (NOTIFICATION_MAX).
 *              Pure write-side; the bell + center UI (Block 4 · Pass 2) consumes
 *              read functions only.
 * @sprint      Sprint P82 · Step 2 · Block 1 · spine
 * @reads-from  none (self-contained spine · LS-only)
 * @walls       §H 0-DIFF: every non-instrumented engine UNTOUCHED ·
 *              applications.ts UNTOUCHED · route maps UNTOUCHED ·
 *              card-entitlement.ts touches LIMITED to the 1.0 sales-role line.
 *              No new runtime deps. push-notification-bridge.ts UNTOUCHED.
 * @[JWT]       P2BB · POST /api/notifications · server fan-out + WS delivery
 */
import {
  type NotificationEvent,
  type NotificationKind,
  type NotificationSeverity,
  notificationsKey,
  NOTIFICATION_MAX,
} from '@/types/notification';
import type { CardId } from '@/types/card-entitlement';

// ── tiny LS helpers (house pattern) ────────────────────────────────────────
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}
function newId(): string {
  return `ntf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface PublishInput {
  entityCode: string;
  userId: string;                 // target recipient · '*' = entity broadcast
  kind: NotificationKind;
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
 * Engines call this from a SUCCESS-PATH line only (1 import + 1 call per
 * success branch per the P82 instrumentation wall · no other diff).
 */
export function publish(input: PublishInput): NotificationEvent {
  const evt: NotificationEvent = {
    id: newId(),
    entityCode: input.entityCode,
    userId: input.userId,
    kind: input.kind,
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
  const all = ls<NotificationEvent>(notificationsKey(input.entityCode));
  const next = [evt, ...all].slice(0, NOTIFICATION_MAX);
  ss(notificationsKey(input.entityCode), next);
  return evt;
}

// ── Reads (consumed by bell + center · Block 4 · Pass 2) ───────────────────
export function listNotifications(
  entityCode: string,
  filter?: { userId?: string; unreadOnly?: boolean; kind?: NotificationKind },
): NotificationEvent[] {
  let rows = ls<NotificationEvent>(notificationsKey(entityCode));
  if (filter?.userId) {
    rows = rows.filter((n) => n.userId === filter.userId || n.userId === '*');
  }
  if (filter?.unreadOnly) rows = rows.filter((n) => !n.readAt);
  if (filter?.kind) rows = rows.filter((n) => n.kind === filter.kind);
  return rows;
}

export function getUnreadCount(entityCode: string, userId: string): number {
  return listNotifications(entityCode, { userId, unreadOnly: true }).length;
}

export function markRead(entityCode: string, id: string): void {
  const all = ls<NotificationEvent>(notificationsKey(entityCode));
  const idx = all.findIndex((n) => n.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], readAt: new Date().toISOString() };
  ss(notificationsKey(entityCode), all);
}

export function markAllRead(entityCode: string, userId: string): number {
  const all = ls<NotificationEvent>(notificationsKey(entityCode));
  const now = new Date().toISOString();
  let n = 0;
  const next = all.map((evt) => {
    if (evt.readAt) return evt;
    if (evt.userId !== userId && evt.userId !== '*') return evt;
    n += 1;
    return { ...evt, readAt: now };
  });
  if (n > 0) ss(notificationsKey(entityCode), next);
  return n;
}

export function clearAll(entityCode: string): void {
  ss<NotificationEvent>(notificationsKey(entityCode), []);
}
