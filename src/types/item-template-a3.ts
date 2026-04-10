export interface ItemTemplateA3 {
  id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  icon?: string | null;
  color?: string | null;
  item_type?: string | null;
  stock_group_id?: string | null;
  stock_group_name?: string | null;
  category_type?: string | null;
  primary_uom_id?: string | null;
  primary_uom_symbol?: string | null;
  costing_method?: string | null;
  hsn_sac_code?: string | null;
  tax_category?: string | null;
  igst_rate?: number | null;
  batch_tracking?: boolean | null;
  serial_tracking?: boolean | null;
  expiry_tracking?: boolean | null;
  reorder_level?: number | null;
  moq?: number | null;
  lead_time_days?: number | null;
  tags?: string[] | null;
  is_system: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
