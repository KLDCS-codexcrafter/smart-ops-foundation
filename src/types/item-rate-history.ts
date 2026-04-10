export type RateType = 'mrp' | 'std_purchase' | 'std_selling' | 'std_cost';

export interface ItemRateHistory {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  rate_type: RateType;
  old_rate: number | null;
  new_rate: number;
  changed_by: string;
  change_reason: string;              // mandatory — never empty
  change_reason_category:              // pre-seeded dropdown value
    | 'price_revision'
    | 'vendor_rate_change'
    | 'currency_adjustment'
    | 'market_correction'
    | 'seasonal_update'
    | 'bulk_update'
    | 'copy_from_last_purchase'
    | 'other';
  effective_from: string;              // date from which new rate applies
  bulk_update_id?: string | null;      // links batch updates together
  created_at: string;
}
