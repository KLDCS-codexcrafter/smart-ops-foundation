/**
 * cross-card-activity-engine.ts — Recent items list
 */
import type {
  CrossCardActivityItem,
} from '@/types/cross-card-activity';
import {
  crossCardActivityKey, ACTIVITY_MAX,
} from '@/types/cross-card-activity';
import type { CardId } from '@/types/card-entitlement';

export function recordActivity(
  entityCode: string, userId: string,
  item: Omit<CrossCardActivityItem, 'entity_id' | 'user_id' | 'id' | 'last_touched_at'>,
): void {
  const full: CrossCardActivityItem = {
    ...item,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    user_id: userId,
    last_touched_at: new Date().toISOString(),
  };
  try {
    // [JWT] POST /api/activity/recent
    const key = crossCardActivityKey(entityCode, userId);
    const raw = localStorage.getItem(key);
    const list: CrossCardActivityItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(x => x.deep_link !== full.deep_link);
    filtered.unshift(full);
    const trimmed = filtered.slice(0, ACTIVITY_MAX);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function readActivity(entityCode: string, userId: string): CrossCardActivityItem[] {
  try {
    // [JWT] GET /api/activity/recent
    const raw = localStorage.getItem(crossCardActivityKey(entityCode, userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Sprint T-Phase-1.1.1o · D-190 extend (read-only filter helper)
export function readActivityForCard(
  entityCode: string,
  userId: string,
  cardId: CardId,
): CrossCardActivityItem[] {
  // [JWT] GET /api/activity/recent?cardId=:cardId
  return readActivity(entityCode, userId).filter(a => a.card_id === cardId);
}

export function clearActivity(entityCode: string, userId: string): void {
  try {
    // [JWT] DELETE /api/activity/recent
    localStorage.removeItem(crossCardActivityKey(entityCode, userId));
  } catch { /* ignore */ }
}
