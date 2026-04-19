/**
 * card-audit.ts — Append-only audit log for all card activity
 * Powers personalized grids, pulse tiles, SOC2 compliance.
 */

import type { CardId } from './card-entitlement';

export type CardAuditAction =
  | 'card_open'
  | 'module_open'
  | 'master_save'
  | 'voucher_post'
  | 'voucher_cancel'
  | 'report_run'
  | 'export'
  | 'permission_denied';

export interface CardAuditEntry {
  id: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  card_id: CardId;
  module_id: string | null;
  action: CardAuditAction;
  ref_type: string | null;
  ref_id: string | null;
  ref_label: string | null;
  path: string;
  timestamp: string;
}

export const cardAuditKey = (e: string) => `erp_card_audit_${e}`;

/** Soft cap — trim to last N entries on write to avoid unbounded growth. */
export const AUDIT_MAX_ENTRIES = 500;
