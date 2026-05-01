/**
 * rtv.ts — Return to Vendor (Rejections Out)
 * Sprint T-Phase-1.2.6
 *
 * Activates existing vt-rejections-out voucher type.
 * [JWT] GET/POST/PATCH /api/inventory/rtvs
 */

export type RTVStatus = 'draft' | 'posted' | 'shipped' | 'cancelled';

export interface RTVLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  godown_id: string;
  godown_name: string;
  bin_id: string | null;
  rejected_qty: number;
  unit_rate: number;
  line_total: number;
  source_grn_id: string | null;
  source_grn_no: string | null;
  source_grn_line_id: string | null;
  qc_failure_reason: string;
  batch_no: string | null;
  serial_nos: string[];
  heat_no: string | null;
}

export interface RTV {
  id: string;
  entity_id: string;
  rtv_no: string;
  status: RTVStatus;
  rtv_date: string;
  vendor_id: string;
  vendor_name: string;
  vendor_address: string | null;
  vendor_gst: string | null;
  transport_mode: string | null;
  vehicle_no: string | null;
  lr_no: string | null;
  expected_credit_note_no: string | null;
  lines: RTVLine[];
  total_qty: number;
  total_value: number;
  narration: string | null;
  posted_at: string | null;
  shipped_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const rtvsKey = (entityCode: string) => `erp_rtvs_${entityCode}`;

export const RTV_STATUS_COLORS: Record<RTVStatus, string> = {
  draft:     'bg-gray-500/10 text-gray-700 border-gray-500/30',
  posted:    'bg-blue-500/10 text-blue-700 border-blue-500/30',
  shipped:   'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/30',
};
