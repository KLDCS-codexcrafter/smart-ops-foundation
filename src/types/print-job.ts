export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
export type PrintJobSource = 'manual' | 'barcode_generator' | 'asset_tag' | 'bin_label' | 'grn_trigger';

export interface PrintJob {
  id: string;
  job_number: string;
  item_id?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  label_template_id: string;
  label_template_name: string;
  template_version: number;
  barcode_type?: string | null;
  quantity: number;
  printed_count: number;
  source: PrintJobSource;
  source_ref?: string | null;
  status: PrintJobStatus;
  is_reprint: boolean;
  reprint_reason?: string | null;
  reprint_authorized_by?: string | null;
  original_job_id?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
