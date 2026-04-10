export type LocationType = 'inward' | 'qc' | 'production' | 'dispatch';

export interface ItemLocation {
  id: string;
  item_id: string;
  location_type: LocationType;
  godown_id?: string | null;
  godown_name?: string | null;
  bin_id?: string | null;
  bin_name?: string | null;
  reorder_level?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  created_at: string;
  updated_at: string;
}
