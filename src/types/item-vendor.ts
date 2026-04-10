export interface ItemVendor {
  id: string;
  item_id: string;
  vendor_id?: string | null;
  vendor_name: string;
  vendor_item_code?: string | null;
  current_rate?: number | null;
  rate_valid_till?: string | null;
  moq?: number | null;
  lead_time_days?: number | null;
  avg_delivery_days?: number | null;
  quality_rating?: 1 | 2 | 3 | 4 | 5 | null;
  last_rejection_percent?: number | null;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}
