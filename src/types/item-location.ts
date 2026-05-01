export type LocationType = 'inward' | 'qc' | 'production' | 'dispatch' | 'departmental';

export interface ItemLocation {
  id: string;
  item_id: string;
  // Sprint T-Phase-1.2.3 · location_type retained for backward-compatibility;
  // godown_id is now the primary key for per-godown reorder rules.
  location_type: LocationType;
  godown_id?: string | null;
  godown_name?: string | null;
  bin_id?: string | null;
  bin_name?: string | null;
  reorder_level?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  // Sprint T-Phase-1.2.3 · NEW sibling fields for proper reorder discipline
  /** Days from PO placement to receipt — used by reorder engine to compute safety stock */
  lead_time_days?: number | null;
  /** Pre-computed: safety_stock = (max_daily × lead_time) − (avg_daily × lead_time) */
  safety_stock?: number | null;
  /** Economic Order Quantity — sqrt(2 × annual_demand × order_cost / holding_cost). Optional override. */
  eoq?: number | null;
  created_at: string;
  updated_at: string;
}

export const itemLocationsKey = (entityCode: string) => `erp_item_locations_${entityCode}`;
