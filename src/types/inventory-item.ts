export type ItemType =
  | 'Raw Material' | 'Finished Goods' | 'Semi-Finished' | 'Component'
  | 'By-Product' | 'Co-Product' | 'Scrap' | 'Consumables'
  | 'Stores & Consumables' | 'Packaging Material' | 'Service' | 'Fixed Asset';

export type CostingMethodItem =
  | 'weighted_avg' | 'fifo_annual' | 'fifo_perpetual' | 'lifo_annual'
  | 'lifo_perpetual' | 'last_purchase' | 'standard_cost' | 'specific_id'
  | 'monthly_avg' | 'zero_cost';

export interface InventoryItem {
  id: string;
  code: string;
  auto_code: boolean;
  name: string;
  display_name?: string | null;
  short_name?: string | null;
  regional_name?: string | null;
  // Type & Group
  item_type: ItemType;
  stock_group_id?: string | null;
  stock_group_name?: string | null;
  stock_group_breadcrumb?: string | null;
  category_type: string;
  stock_nature: 'Inventory' | 'Non-Inventory';
  use_for: string;
  // Descriptions
  description?: string | null;
  purchase_description?: string | null;
  sales_description?: string | null;
  internal_notes?: string | null;
  // Classification
  classification_id?: string | null;
  classification_name?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  sub_brand_id?: string | null;
  sub_brand_name?: string | null;
  country_of_origin?: string | null;
  // Measurement
  primary_uom_id?: string | null;
  primary_uom_symbol?: string | null;
  secondary_uom_id?: string | null;
  secondary_uom_symbol?: string | null;
  secondary_conversion_factor?: number | null;
  tertiary_uom_id?: string | null;
  tertiary_uom_symbol?: string | null;
  tertiary_conversion_factor?: number | null;
  purchase_uom_id?: string | null;
  purchase_uom_symbol?: string | null;
  net_weight?: number | null;
  gross_weight?: number | null;
  weight_unit?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit?: string | null;
  // Tax & Compliance
  hsn_sac_code?: string | null;
  hsn_description?: string | null;
  tax_category: string;
  igst_rate?: number | null;
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  cess_rate?: number | null;
  cess_valuation_type?: string | null;
  itc_eligible: boolean;
  rcm_applicable: boolean;
  tcs_applicable: boolean;
  tds_applicable: boolean;
  supply_type: string;
  mrp?: number | null;
  // Standard rates — base reference prices per item
  std_purchase_rate?: number | null;   // reference rate for Purchase Orders
  std_selling_rate?: number | null;    // base list price for all sales
  std_cost_rate?: number | null;       // for items using standard_cost costing method
  // Auto-maintained by transactions — DO NOT edit manually
  last_purchase_rate?: number | null;  // updated on every GRN posted (A.6)
  last_purchase_date?: string | null;
  last_selling_rate?: number | null;   // updated on every Delivery Note posted (A.6)
  last_selling_date?: string | null;
  // MRP companions — mrp field already exists above
  mrp_inclusive_tax?: boolean | null;  // true = GST embedded in MRP (FMCG/Pharma default)
  mrp_uom?: string | null;             // per unit display: 'per kg', 'per pcs', 'per ltr'
  fssai_license?: string | null;
  drug_license?: string | null;
  epr_registration?: string | null;
  // Inventory
  costing_method: CostingMethodItem;
  costing_override: boolean;
  purchase_ledger_id?: string | null;
  sales_ledger_id?: string | null;
  reorder_level?: number | null;
  reorder_qty?: number | null;
  moq?: number | null;
  lead_time_days?: number | null;
  safety_stock?: number | null;
  max_stock_level?: number | null;
  // Tracking (overrides)
  batch_tracking: boolean;
  batch_override: boolean;
  serial_tracking: boolean;
  serial_override: boolean;
  expiry_tracking: boolean;
  qc_hold_on_receipt: boolean;
  // Warranty & Service
  warranty_period?: number | null;
  warranty_unit?: string | null;
  warranty_type?: string | null;
  service_required: boolean;
  service_interval?: number | null;
  amc_applicable: boolean;
  // Digital Shelf
  listing_title?: string | null;
  short_bullets?: string[] | null;
  long_description?: string | null;
  ecommerce_images?: string[] | null;
  video_url?: string | null;
  search_keywords?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  url_slug?: string | null;
  amazon_status?: 'live' | 'draft' | 'not_listed' | null;
  flipkart_status?: 'live' | 'draft' | 'not_listed' | null;
  website_status?: 'live' | 'draft' | 'not_listed' | null;
  product_attributes?: Record<string, string> | null;
  in_the_box?: string | null;
  // ESG
  carbon_footprint?: number | null;
  recyclability_percent?: number | null;
  certifications?: string[] | null;
  // Item parameter profile (IDs of params kept from group)
  selected_param_ids?: string[] | null;
  // Meta
  status: 'active' | 'inactive' | 'draft';
  effective_from?: string | null;
  effective_to?: string | null;
  created_at: string;
  updated_at: string;
}
