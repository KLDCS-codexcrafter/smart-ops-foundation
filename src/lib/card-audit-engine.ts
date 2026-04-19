/**
 * card-audit-engine.ts — Logger + reader for card audit entries
 * Use logAudit() from anywhere. Pure storage wrapper.
 */

import type {
  CardAuditEntry, CardAuditAction,
} from '@/types/card-audit';
import { cardAuditKey, AUDIT_MAX_ENTRIES } from '@/types/card-audit';
import type { CardId } from '@/types/card-entitlement';

interface LogInput {
  entityCode: string;
  userId: string;
  userName: string;
  cardId: CardId;
  moduleId?: string | null;
  action: CardAuditAction;
  refType?: string | null;
  refId?: string | null;
  refLabel?: string | null;
}

export function logAudit(input: LogInput): void {
  const entry: CardAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entity_id: input.entityCode,
    user_id: input.userId,
    user_name: input.userName,
    card_id: input.cardId,
    module_id: input.moduleId ?? null,
    action: input.action,
    ref_type: input.refType ?? null,
    ref_id: input.refId ?? null,
    ref_label: input.refLabel ?? null,
    path: typeof window !== 'undefined'
      ? window.location.pathname + window.location.hash
      : '',
    timestamp: new Date().toISOString(),
  };
  try {
    // [JWT] POST /api/audit/card
    const key = cardAuditKey(input.entityCode);
    const raw = localStorage.getItem(key);
    const list: CardAuditEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    const trimmed = list.slice(-AUDIT_MAX_ENTRIES);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function readAudit(entityCode: string): CardAuditEntry[] {
  try {
    // [JWT] GET /api/audit/card?entity={entityCode}
    const raw = localStorage.getItem(cardAuditKey(entityCode));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function readAuditForUser(entityCode: string, userId: string): CardAuditEntry[] {
  return readAudit(entityCode).filter(e => e.user_id === userId);
}

export function readAuditForCard(entityCode: string, cardId: CardId): CardAuditEntry[] {
  return readAudit(entityCode).filter(e => e.card_id === cardId);
}
