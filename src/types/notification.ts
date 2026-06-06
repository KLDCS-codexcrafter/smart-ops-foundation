/**
 * notification.ts — Sprint P82 · B.4 Notification Center spine types (Pass 2 · Block 1.2 parity)
 *
 * PURPOSE  Single shape for cross-engine notification events emitted by the
 *          8 P82-instrumented publishers and consumed by the bell + center UI.
 *          FIELD PARITY against the verbatim spec OperixNotification:
 *            eventKey · targetUserId · targetRole · severity · source · deepLink · readAt.
 *          eventKey is REQUIRED — publish() is idempotent by eventKey (same key
 *          never duplicates within the entity ring buffer).
 *
 * INPUT    none (type definitions only)
 * OUTPUT   NotificationKind · NotificationEvent · NotificationMutePref · LS keys
 * DEPENDENCIES  @/types/card-entitlement (CardId) — pure type import
 * TALLY-ON-TOP BEHAVIOR  none (pure spine)
 * SPEC DOC  Sprint_P82_Step2_Lovable_Prompt_v1.md
 * [JWT]    P2BB · server-side fan-out + per-device delivery + push bridge
 */
import type { CardId } from '@/types/card-entitlement';

/** The 8 P82 publisher event kinds (1:1 with the instrumentation table) + 3 digest kinds. */
export type NotificationKind =
  // taskflow-engine (3)
  | 'taskflow.acknowledged'
  | 'taskflow.reassigned'
  | 'taskflow.due_date_changed'
  // taskflow-accountability-engine (1)
  | 'taskflow.evidence_created'
  // approval-workflow-engine (2)
  | 'approval.approved'
  | 'approval.rejected'
  // ecomx-recon-engine (3)
  | 'ecomx.recon_completed'
  | 'ecomx.claim_created'
  | 'ecomx.claim_status_changed'
  // ecomx-engine (1 · NEW unmapped only)
  | 'ecomx.unmapped_sku_recorded'
  // on-open digests (3 · Pass 2 · Block 1.2 §4)
  | 'digest.overdue_tasks'
  | 'digest.ptp_due'
  | 'digest.obligations_due';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

/**
 * NotificationEvent — spec OperixNotification + the 4 P82 extensions
 * (kind/cardId/title/body/refType/refId/createdAt) needed by the bell row UI.
 */
export interface NotificationEvent {
  id: string;
  /** Idempotency key · same key MUST NOT duplicate inside the entity ring buffer. */
  eventKey: string;
  /** Entity scope · matches the engine entityCode the event came from. */
  entityCode: string;
  /** Target recipient · '*' = entity-wide broadcast (digest read surfaces filter). */
  targetUserId: string;
  /** Optional role-based fan-out (e.g. 'finance', 'sales') · null = userId-only. */
  targetRole: string | null;
  kind: NotificationKind;
  /** Originating engine identifier (e.g. 'taskflow-engine'). */
  source: string;
  /** Originating card (drives bell grouping + deep-link card chip). */
  cardId: CardId;
  severity: NotificationSeverity;
  /** One-line summary rendered in the bell row. */
  title: string;
  /** Optional secondary line (id, party, amount, etc.). */
  body: string | null;
  /** Stable in-app route for click-through · null when no deep target exists. */
  deepLink: string | null;
  /** Cross-link back to the originating record (taskId · claimId · runId · skuId). */
  refType: string | null;
  refId: string | null;
  createdAt: string;
  /** ISO timestamp when the recipient marked it read · null = unread. */
  readAt: string | null;
}

/**
 * NotificationMutePref — per (entity,user) suppression for a kind and/or source.
 * Filtering is applied inside listNotifications + getUnreadCount.
 */
export interface NotificationMutePref {
  id: string;
  entityCode: string;
  userId: string;
  /** Null = match any kind · combined with source (AND). */
  kind: NotificationKind | null;
  /** Null = match any source · combined with kind (AND). */
  source: string | null;
  /** Optional expiry · ISO · null = permanent until unmuted. */
  until: string | null;
  createdAt: string;
}

export const notificationsKey = (entityCode: string): string =>
  `erp_notifications_${entityCode}`;

export const notificationMutesKey = (entityCode: string, userId: string): string =>
  `erp_notification_mutes_${entityCode}_${userId}`;

/** Per spec: bounded ring buffer cap (oldest-pruned). */
export const NOTIFICATION_MAX = 500;
