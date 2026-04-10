export interface Batch {
  id: string;
  batch_number: string;
  stock_item_id: string;
  stock_item_name: string;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit: string;
  status: 'active' | 'expired' | 'consumed' | 'quarantine';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  lot_number?: string | null;
  supplier_batch_number?: string | null;
  qc_hold?: boolean;
  godown_name?: string | null;
}

export interface BatchFormData {
  batch_number: string;
  stock_item_id: string;
  stock_item_name: string;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit: string;
  status: 'active' | 'expired' | 'consumed' | 'quarantine';
  notes?: string | null;
  lot_number?: string | null;
  supplier_batch_number?: string | null;
  qc_hold?: boolean;
  godown_name?: string | null;
}
