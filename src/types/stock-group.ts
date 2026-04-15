export type CostingMethod = 'weighted_avg' | 'fifo_annual' | 'fifo_perpetual'
  | 'lifo_annual' | 'lifo_perpetual' | 'last_purchase'
  | 'standard_cost' | 'specific_id' | 'monthly_avg' | 'zero_cost';

export interface StockGroup {
  id: string;
  code: string;
  short_code?: string | null;
  name: string;
  display_name?: string | null;
  parent_id?: string | null;
  category_type: string;
  material_type: string;
  stock_nature: string;
  use_for: string;
  batch_grid_enabled: boolean;
  serial_grid_enabled: boolean;
  costing_method: CostingMethod;
  movement_class?: 'A' | 'B' | 'C' | null;
  movement_indicator: string;
  expiry_tracking: boolean;
  reorder_level?: number | null;
  internal_notes?: string | null;
  default_remarks?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  // GST rate fields — used as fallback when Stock Item has no rate set
  igst_rate: number | null;
  cgst_rate: number | null;
  sgst_rate: number | null;
  cess_rate: number | null;
  gst_type: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated' | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StockGroupFormData {
  code: string;
  short_code?: string | null;
  name: string;
  display_name?: string | null;
  parent_id?: string | null;
  category_type: string;
  material_type: string;
  stock_nature: string;
  use_for: string;
  batch_grid_enabled: boolean;
  serial_grid_enabled: boolean;
  costing_method: CostingMethod;
  movement_class?: 'A' | 'B' | 'C' | null;
  movement_indicator: string;
  expiry_tracking: boolean;
  reorder_level?: number | null;
  internal_notes?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  // GST rate fields
  igst_rate?: number | null;
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  cess_rate?: number | null;
  gst_type?: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated' | null;
}
