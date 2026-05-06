/**
 * @file     job-work-out-order.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block F · D-533
 * @purpose  Job Work Out Order — RM/components sent to a sub-contractor for processing.
 *           ITC-04 fields stubbed (Phase 2 active).
 * @[JWT]    erp_job_work_out_orders_<entityCode>
 */
import type { ApprovalEvent } from '@/types/material-indent';

export type JobWorkOutOrderStatus =
  | 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';

export interface JobWorkOutOrderStatusEvent {
  id: string;
  from_status: JobWorkOutOrderStatus | null;
  to_status: JobWorkOutOrderStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface JobWorkOutOrderLine {
  id: string;
  line_no: number;

  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;

  sent_qty: number;
  received_qty: number;

  source_godown_id: string;
  source_godown_name: string;
  job_work_godown_id: string;
  job_work_godown_name: string;

  expected_output_item_id: string;
  expected_output_item_code: string;
  expected_output_item_name: string;
  expected_output_qty: number;
  expected_output_uom: string;

  job_work_rate: number;
  job_work_value: number;

  remarks: string;
}

export interface JobWorkOutOrder {
  id: string;
  entity_id: string;
  doc_no: string;

  status: JobWorkOutOrderStatus;
  jwo_date: string;
  expected_return_date: string;

  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string | null;

  production_order_id: string | null;
  production_order_no: string | null;

  department_id: string;
  department_name: string;
  raised_by_user_id: string;
  raised_by_name: string;

  lines: JobWorkOutOrderLine[];

  total_sent_qty: number;
  total_received_qty: number;
  total_jw_value: number;

  itc04_reference: string | null;
  itc04_quarter: string | null;

  approval_history: ApprovalEvent[];
  status_history: JobWorkOutOrderStatusEvent[];

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/production/job-work-out-orders?entityCode=...
export const jobWorkOutOrdersKey = (entityCode: string): string =>
  `erp_job_work_out_orders_${entityCode}`;
