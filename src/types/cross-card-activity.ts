/**
 * cross-card-activity.ts — User's recently touched items across all cards
 * Powers the Bell icon drawer in ERPHeader.
 */

import type { CardId } from './card-entitlement';

export type ActivityItemKind =
  | 'voucher' | 'master' | 'report' | 'module' | 'document';

export interface CrossCardActivityItem {
  id: string;
  entity_id: string;
  user_id: string;
  card_id: CardId;
  kind: ActivityItemKind;
  ref_id: string | null;
  title: string;
  subtitle: string | null;
  deep_link: string;
  last_touched_at: string;
}

export const crossCardActivityKey = (e: string, uid: string) =>
  `erp_cross_card_activity_${e}_${uid}`;

export const ACTIVITY_MAX = 50;
