/**
 * @file     job-work-receipt.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block H · D-535
 * @purpose  Job Work Receipt — receives processed/finished items back from a sub-contractor
 *           against a sent JobWorkOutOrder. Routes to quarantine when QC enabled.
 * @[JWT]    erp_job_work_receipts_<entityCode>
 */

export type JobWorkReceiptStatus = 'draft' | 'received' | 'cancelled';

export interface JobWorkReceiptStatusEvent {
  id: string;
  from_status: JobWorkReceiptStatus | null;
  to_status: JobWorkReceiptStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface JobWorkReceiptLine {
  id: string;
  line_no: number;

  job_work_out_order_line_id: string;

  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;

  expected_qty: number;
  received_qty: number;
  rejected_qty: number;

  destination_godown_id: string;
  destination_godown_name: string;

  qc_required: boolean;
  routed_to_quarantine: boolean;

  batch_no: string | null;
  serial_nos: string[];

  remarks: string;
}

export interface JobWorkReceipt {
  id: string;
  entity_id: string;
  doc_no: string;

  status: JobWorkReceiptStatus;
  receipt_date: string;

  job_work_out_order_id: string;
  job_work_out_order_no: string;
  vendor_id: string;
  vendor_name: string;

  department_id: string;
  department_name: string;
  received_by_user_id: string;
  received_by_name: string;

  lines: JobWorkReceiptLine[];

  total_received_qty: number;
  total_rejected_qty: number;

  marks_jwo_complete: boolean;

  status_history: JobWorkReceiptStatusEvent[];

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/production/job-work-receipts?entityCode=...
export const jobWorkReceiptsKey = (entityCode: string): string =>
  `erp_job_work_receipts_${entityCode}`;
