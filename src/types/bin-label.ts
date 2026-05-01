export interface BinLabel {
  id: string;
  godown_id: string;
  godown_name: string;
  location_code: string;
  aisle?: string | null;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
  location_type: 'inward' | 'qc' | 'production' | 'dispatch' | 'storage';
  barcode_type: 'QR' | 'Code128';
  label_template_id?: string | null;
  items_assigned?: string[] | null;
  status: 'active' | 'inactive';
  printed: boolean;
  last_printed?: string | null;
  created_at: string;
  updated_at: string;
  /** Sprint T-Phase-1.2.6 · Capacity for utilization tracking. Empty = unmeasured (skip from utilization report). */
  capacity?: number | null;
  capacity_unit?: 'kg' | 'units' | 'cubic_metre' | 'litres' | null;
}
