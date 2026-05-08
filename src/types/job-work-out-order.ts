/**
 * @file     job-work-out-order.ts
 * @sprint   T-Phase-1.A.2.c-Job-Work-Tally-Parity (was T-Phase-1.3-3a-pre-2 · Block F · D-533)
 * @decisions D-533 (original) · D-NEW-V (A.2.c · 6 voucher fields + ComponentAllocation) · D-NEW-W (pre_closed status)
 * @purpose  Job Work Out Order — RM/components sent to a sub-contractor for processing.
 *           ITC-04 fields stubbed (Phase 2 active).
 * @[JWT]    erp_job_work_out_orders_<entityCode>
 */
import type { ApprovalEvent } from '@/types/material-indent';

export type JobWorkOutOrderStatus =
  | 'draft' | 'sent' | 'partially_received' | 'received'
  | 'pre_closed'    // NEW · A.2.c · D-NEW-W · operator explicitly closed an incomplete JWO
  | 'cancelled';

export interface JobWorkOutOrderStatusEvent {
  id: string;
  from_status: JobWorkOutOrderStatus | null;
  to_status: JobWorkOutOrderStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

/**
 * Component allocation for a JWO line when item has BOM.
 * Tracks per-component sent vs received qty.
 * NEW · A.2.c · D-NEW-V · Tally Components Order Summary parity.
 */
export interface ComponentAllocation {
  id: string;
  component_item_id: string;
  component_item_code: string;
  component_item_name: string;
  component_qty_required: number;
  component_qty_sent: number;
  component_qty_received: number;
  uom: string;
  bom_id: string | null;
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

  // NEW · A.2.c · component-level tracking (Tally parity)
  track_components?: boolean;
  component_allocations?: ComponentAllocation[];
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

  notes: string;

  // NEW · A.2.c · D-NEW-V · Tally audit-trail fields
  nature_of_processing?: string;
  duration_of_process_days?: number;

  // NEW · A.2.c · D-NEW-V · dispatch logistics (feeds JW-7 Material Movement Register)
  dispatched_through?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  motor_vehicle_no?: string;
  mode_of_payment?: 'cheque' | 'cash' | 'neft' | 'rtgs' | 'upi' | 'other';

  // NEW · A.2.c · D-NEW-W · pre-close metadata
  pre_close_reason?: string;
  pre_closed_at?: string;
  pre_closed_by?: string;

  approval_history: ApprovalEvent[];
  status_history: JobWorkOutOrderStatusEvent[];

  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/production/job-work-out-orders?entityCode=...
export const jobWorkOutOrdersKey = (entityCode: string): string =>
  `erp_job_work_out_orders_${entityCode}`;
