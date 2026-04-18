/**
 * irn.ts — Invoice Reference Number (IRN) + E-Way Bill types
 * Sprint 9. Shape matches NIC IRP schema v1.1.0 (https://einv-apisandbox.nic.in).
 * [JWT] POST /api/finecore/irn/generate
 * [JWT] POST /api/finecore/irn/cancel
 * [JWT] POST /api/finecore/ewb/generate
 */

export type IRNStatus = 'pending' | 'generated' | 'cancelled' | 'failed';

export type EWBStatus =
  | 'not_required'
  | 'pending'
  | 'generated'
  | 'expired'
  | 'extended'
  | 'cancelled';

export type EWBTransportMode = 'road' | 'rail' | 'air' | 'ship';

export type EWBSupplyType = 'outward' | 'inward';

export type EWBSubSupplyType =
  | 'supply' | 'import' | 'export' | 'job_work'
  | 'for_own_use' | 'job_work_returns' | 'sales_return'
  | 'others' | 'sku_samples';

export type EWBDocType = 'INV' | 'BIL' | 'BOE' | 'CHL' | 'CNT' | 'OTH';

export interface IRNRecord {
  id: string;
  entity_id: string;
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type: string;
  supplier_gstin: string;
  customer_gstin: string;
  customer_name: string;
  total_invoice_value: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;

  irn: string | null;
  ack_no: string | null;
  ack_date: string | null;
  signed_invoice: string | null;
  signed_qr_code: string | null;
  qr_code_url: string | null;

  status: IRNStatus;
  error_code: string | null;
  error_message: string | null;

  cancellation_reason: string | null;
  cancellation_remarks: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;

  generated_by: string;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EWBRecord {
  id: string;
  entity_id: string;
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  irn: string | null;

  supply_type: EWBSupplyType;
  sub_supply_type: EWBSubSupplyType;
  doc_type: EWBDocType;
  transport_mode: EWBTransportMode;
  transport_distance_km: number;

  transporter_id: string | null;
  transporter_name: string | null;
  vehicle_no: string | null;
  vehicle_type: 'regular' | 'odc' | null;
  transport_doc_no: string | null;
  transport_doc_date: string | null;

  dispatch_gstin: string;
  dispatch_addr: string;
  dispatch_state_code: string;
  ship_to_gstin: string;
  ship_to_addr: string;
  ship_to_state_code: string;

  total_value: number;

  ewb_no: string | null;
  ewb_date: string | null;
  valid_until: string | null;

  status: EWBStatus;
  error_code: string | null;
  error_message: string | null;

  cancellation_reason: string | null;
  cancellation_remarks: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;

  extended_at: string | null;
  extension_reason: string | null;
  extended_valid_until: string | null;

  generated_by: string;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const irnRecordsKey = (e: string) => `erp_irn_records_${e}`;
export const ewbRecordsKey = (e: string) => `erp_ewb_records_${e}`;

/** EWB threshold per GSTN rules. May vary by state — configurable. */
export const DEFAULT_EWB_THRESHOLD = 50000;

/** IRN cancellation window in hours. Fixed by GSTN at 24. */
export const IRN_CANCELLATION_WINDOW_HOURS = 24;

/** EWB cancellation window in hours. */
export const EWB_CANCELLATION_WINDOW_HOURS = 24;

export const IRN_CANCEL_REASONS = [
  { code: '1', label: 'Duplicate' },
  { code: '2', label: 'Data Entry Mistake' },
  { code: '3', label: 'Order Cancelled' },
  { code: '4', label: 'Other' },
] as const;

export const EWB_CANCEL_REASONS = [
  { code: '1', label: 'Duplicate' },
  { code: '2', label: 'Order Cancelled' },
  { code: '3', label: 'Data Entry Mistake' },
  { code: '4', label: 'Others' },
] as const;

export const EWB_EXTEND_REASONS = [
  { code: '1', label: 'Transit Delay' },
  { code: '2', label: 'Vehicle Breakdown' },
  { code: '3', label: 'Natural Calamity' },
  { code: '4', label: 'Law and Order Situation' },
  { code: '5', label: 'Accident' },
  { code: '6', label: 'Others' },
] as const;
