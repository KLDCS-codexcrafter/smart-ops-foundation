export type PackingLevel = 'primary' | 'inner' | 'master';

export interface ItemPacking {
  id: string;
  item_id: string;
  level: PackingLevel;
  barcode?: string | null;
  barcode_type?: 'EAN13' | 'QR' | 'Code128' | 'ITF14' | 'EAN8' | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit: 'cm' | 'inch';
  net_weight?: number | null;
  gross_weight?: number | null;
  weight_unit: 'kg' | 'g' | 'lb';
  units_per_pack?: number | null;
  packs_per_carton?: number | null;
  cartons_per_pallet?: number | null;
  pallet_gross_weight?: number | null;
  created_at: string;
  updated_at: string;
}
