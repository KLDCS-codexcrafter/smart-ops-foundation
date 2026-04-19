/**
 * family-wallet.ts — Family wallet linking and point transfers
 * Out-of-box idea #4. Enables customers to gift/transfer loyalty points
 * to linked family members. 24h undo window. Full audit trail.
 * [JWT] POST /api/customer/family/link  POST /api/customer/family/transfer
 */

export type FamilyLinkStatus = 'pending' | 'active' | 'suspended' | 'ended';

export interface FamilyLink {
  id: string;
  entity_id: string;
  primary_customer_id: string;     // account holder
  linked_customer_id: string;      // family member
  linked_name: string;             // display name
  relationship: string;            // 'spouse', 'child', 'parent', 'other'
  status: FamilyLinkStatus;
  linked_at: string;
  ended_at: string | null;
  created_by: string;
}

export type TransferStatus = 'completed' | 'undone' | 'expired';

export interface FamilyTransfer {
  id: string;
  entity_id: string;
  from_customer_id: string;
  from_name: string;
  to_customer_id: string;
  to_name: string;
  points: number;                  // positive integer
  gift_message: string;
  status: TransferStatus;
  transferred_at: string;
  undo_until: string;              // 24h after transferred_at
  undone_at: string | null;
}

/** Undo window — 24 hours gives receiver time to acknowledge or reject. */
export const UNDO_WINDOW_HOURS = 24;

/** Max active family links per account — prevents gaming. */
export const MAX_FAMILY_MEMBERS = 4;

/** Minimum transfer — prevents micro-transfer spam. */
export const MIN_TRANSFER_POINTS = 50;

export const familyLinksKey     = (e: string) => `erp_family_links_${e}`;
export const familyTransfersKey = (e: string) => `erp_family_transfers_${e}`;
