/**
 * wms-pick-pack.ts — WMS Pick & Pack types (Sprint WMS1 · W1 of WMS-ARC)
 *
 * Single-Door canon: all order sources flow via `ordersKey`. Source
 * attribution comes from the Order record itself (honest narration prefix:
 * "EcomX · " · "WebStoreX order" · else "salesx") — picklist NEVER reads
 * `ecOrdersKey` / `wsStoreOrdersKey` (those are link+snapshot mirrors).
 *
 * P8.6 floor canon: both new record types are born with `retention_policy?`
 * and `created_by?`. Mapping in `record-retention-policy-engine`:
 *   picklist     → operational_log_only
 *   pack-group   → operational_log_only
 *
 * [JWT] Wave-2: server picklists + picker auth + camera barcode scan.
 */

import type { RetentionPolicyId } from '@/types/record-retention';

export type PickBucketType = 'single_item' | 'multi_item' | 'b2b_bulk';

export type PicklistStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type PicklistLineStatus = 'pending' | 'picked' | 'short';
export type PickSource = 'salesx' | 'ecomx' | 'webstorex';

export interface PicklistLine {
  id: string;
  order_id: string;
  order_no: string;
  source: PickSource;
  item_id: string;
  item_name: string;
  qty_ordered: number;
  qty_picked: number;
  /** Honest bin/godown hint — BinLabel.items_assigned match preferred,
   *  godown name fallback, else blank. NEVER a fabricated location. */
  bin_hint?: string;
  status: PicklistLineStatus;
}

export interface PicklistSourceSummary {
  salesx: number;
  ecomx: number;
  webstorex: number;
}

export interface Picklist {
  id: string;
  picklist_no: string;
  entity_id: string;
  fiscal_year_id?: string;
  godown_id?: string;
  bucket: PickBucketType;
  status: PicklistStatus;
  picker_name?: string;
  lines: PicklistLine[];
  source_summary: PicklistSourceSummary;
  /** P8.6 floor — born with these */
  created_by?: string;
  retention_policy?: RetentionPolicyId;
  created_at: string;
  updated_at: string;
}

export interface PackGroupLine {
  id: string;
  picklist_line_id: string;
  item_id: string;
  item_name: string;
  qty: number;
}

export type PackGroupStatus = 'open' | 'packed';

export interface PackGroup {
  id: string;
  pack_group_no: string;
  entity_id: string;
  fiscal_year_id?: string;
  picklist_id: string;
  status: PackGroupStatus;
  packing_slip_id?: string;
  /** BOM resolution marker — set when packing-bom-engine returned an active BOM */
  bom_applied?: string;
  lines: PackGroupLine[];
  /** P8.6 floor — born with these */
  created_by?: string;
  retention_policy?: RetentionPolicyId;
  created_at: string;
  updated_at: string;
}

export const picklistsKey = (e: string) => `erp_wms_picklists_${e}`;
export const packGroupsKey = (e: string) => `erp_wms_pack_groups_${e}`;
