/**
 * session-suspend.ts — Track paused sessions per card
 * Data: { card_id, module_id, label, suspended_at }[]
 * Dashboard banner surfaces them.
 */

import type { CardId } from '@/types/card-entitlement';

export interface SuspendedSession {
  id: string;
  card_id: CardId;
  module_id: string;
  label: string;                   // e.g. 'Credit approval for Sharma Traders'
  deep_link: string;
  suspended_at: string;
  expires_at: string;              // default +24h
}

const KEY = (e: string, uid: string) => `erp_suspended_sessions_${e}_${uid}`;
const TTL_MS = 24 * 60 * 60 * 1000;

export function suspendSession(
  entityCode: string, userId: string,
  entry: Omit<SuspendedSession, 'id' | 'suspended_at' | 'expires_at'>,
): void {
  const now = new Date();
  const full: SuspendedSession = {
    ...entry,
    id: `sus-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    suspended_at: now.toISOString(),
    expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
  };
  try {
    const raw = localStorage.getItem(KEY(entityCode, userId));
    const list: SuspendedSession[] = raw ? JSON.parse(raw) : [];
    // One suspend per card — replace existing
    const filtered = list.filter(s => s.card_id !== full.card_id);
    filtered.push(full);
    localStorage.setItem(KEY(entityCode, userId), JSON.stringify(filtered));
  } catch { /* ignore */ }
}

export function readSuspended(entityCode: string, userId: string): SuspendedSession[] {
  try {
    const raw = localStorage.getItem(KEY(entityCode, userId));
    const list: SuspendedSession[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return list.filter(s => new Date(s.expires_at).getTime() > now);
  } catch { return []; }
}

export function resolveSuspended(entityCode: string, userId: string, sessionId: string): void {
  try {
    const raw = localStorage.getItem(KEY(entityCode, userId));
    const list: SuspendedSession[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(s => s.id !== sessionId);
    localStorage.setItem(KEY(entityCode, userId), JSON.stringify(filtered));
  } catch { /* ignore */ }
}
