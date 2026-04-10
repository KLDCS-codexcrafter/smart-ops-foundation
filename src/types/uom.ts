export type UOMCategory = 'weight' | 'length' | 'volume' | 'quantity' | 'area' | 'time';
export type UOMType = 'simple' | 'compound' | 'alternate';

export interface UnitOfMeasure {
  id: string;
  code?: string | null;
  name: string;
  symbol: string;
  short_name?: string | null;
  category: UOMCategory;
  uom_type: UOMType;
  decimal_precision: number;
  uqc_code?: string | null;
  bis_iso_mapping?: string | null;
  parent_id?: string | null;
  internal_notes?: string | null;
  is_system: boolean;
  is_active: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
