export interface Classification {
  id: string;
  name: string;
  code?: string | null;
  short_name?: string | null;
  description?: string | null;
  classification_type: 'category' | 'subcategory' | 'group' | 'class';
  category_level: 'L1' | 'L2' | 'L3';
  parent_id?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  sub_brand_id?: string | null;
  sub_brand_name?: string | null;
  movement_indicator: string;
  change_history_enabled: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
