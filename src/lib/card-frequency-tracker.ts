/**
 * card-frequency-tracker.ts — Compute which cards a user opens most often
 * Reads from Stage 3a audit log. Returns top-N ranked card IDs.
 */

import type { CardId } from '@/types/card-entitlement';
import { readAuditForUser } from '@/lib/card-audit-engine';

const WINDOW_DAYS = 30;

export function topCardsForUser(
  entityCode: string, userId: string, limit: number = 4,
): CardId[] {
  const all = readAuditForUser(entityCode, userId);
  const cutoff = Date.now() - WINDOW_DAYS * 86_400_000;
  const recent = all.filter(e => new Date(e.timestamp).getTime() >= cutoff);
  const counts = new Map<CardId, number>();
  for (const e of recent) {
    if (e.action === 'card_open' || e.action === 'module_open') {
      counts.set(e.card_id, (counts.get(e.card_id) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
