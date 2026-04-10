export type BatchStatus = 'active' | 'inactive' | 'expired' | 'consumed';
export type QCStatus = 'pending' | 'passed' | 'failed' | 'partial';

export interface Batch {
  id: string;
  batch_number: string;
  item_id?: string | null;
  item_name?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  available_quantity: number;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_invoice_no?: string | null;
  supplier_invoice_date?: string | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  qc_status: QCStatus;
  status: BatchStatus;
  notes?: string | null;
  lot_number?: string | null;
  supplier_batch_number?: string | null;
  qc_hold?: boolean;
  godown_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchFormData {
  batch_number: string;
  item_id?: string | null;
  item_name?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  quantity: number;
  supplier_name?: string | null;
  supplier_invoice_no?: string | null;
  qc_status: QCStatus;
  status: BatchStatus;
  notes?: string | null;
  lot_number?: string | null;
  supplier_batch_number?: string | null;
  qc_hold?: boolean;
  godown_name?: string | null;
}
