/**
 * notification.ts — Sprint P82 · B.4 Notification Center spine types
 *
 * PURPOSE  Single shape for cross-engine notification events emitted by the
 *          8 P82-instrumented publishers and consumed by the bell + center UI
 *          (Pass 2 · Block 4). Read surfaces are CALL-ONLY against existing
 *          engines per the instrumentation wall — no source-engine edits beyond
 *          the single publish() per success path.
 * INPUT    none (type definitions only)
 * OUTPUT   NotificationKind union · NotificationEvent shape · LS key helper
 * DEPENDENCIES  @/types/card-entitlement (CardId) — pure type import
 * TALLY-ON-TOP BEHAVIOR  none (pure spine)
 * SPEC DOC  Sprint_P82_Step2_Lovable_Prompt_v1.md
 * [JWT]    P2BB · server-side fan-out + per-device delivery + push bridge
 */
import type { CardId } from '@/types/card-entitlement';

/** The 8 P82 publisher event kinds (1:1 with the instrumentation table). */
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
  | 'ecomx.unmapped_sku_recorded';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface NotificationEvent {
  id: string;
  /** Entity scope · matches the engine entityCode the event came from. */
  entityCode: string;
  /** Target recipient — '*' = entity-wide broadcast (digest read surfaces filter). */
  userId: string;
  kind: NotificationKind;
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

export const notificationsKey = (entityCode: string): string =>
  `erp_notifications_${entityCode}`;

/** Cap kept in line with cross-card-activity (50) to bound LS footprint. */
export const NOTIFICATION_MAX = 200;
