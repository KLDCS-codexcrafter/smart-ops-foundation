/**
 * delivery-memo.ts — Delivery Memo (DM)
 * Sprint T-Phase-1.1.1n. Memo is the authorization; LR is the transport record.
 * DM is created by Dispatch after receiving SRM · authorizes Logistics + LR generation.
 * [JWT] GET/POST/PATCH /api/dispatch/delivery-memos
 */

export type DMStatus =
  | 'draft'
  | 'raised'
  | 'lr_assigned'
  | 'delivered';

export interface DMItem {
  id: string;
  item_name: string;
  qty: number;
  uom: string | null;
  amount: number;
}

export interface DeliveryMemo {
  id: string;
  entity_id: string;
  memo_no: string;
  memo_date: string;
  supply_request_memo_id: string | null;
  supply_request_memo_no: string | null;
  customer_id: string | null;
  customer_name: string | null;
  delivery_address: string | null;
  transporter_name: string | null;
  vehicle_no: string | null;
  lr_no: string | null;
  lr_date: string | null;
  expected_delivery_date: string | null;
  items: DMItem[];
  total_amount: number;
  status: DMStatus;
  created_by: string | null;
  delivered_at: string | null;
  pod_reference: string | null;
  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  /** D-228 Universal Transaction Header (UTH) — all optional · backward compat preserved */
  narration?: string | null;
  // created_by already declared above (line 40) · no duplicate
  updated_by?: string | null;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  /** Tally-Prime voucher type identity (Q1-b · 1.2.6e-tally-1) · UI dropdown in 2.7-b. */
  voucher_type_id?: string | null;
  voucher_type_name?: string | null;
  /** Tally-Prime multi-source linking (Q2-c · 1.2.6e-tally-1).
   *  Existing single-ref fields stay populated as the "primary" source · this array
   *  captures additional sources when operator clicks "Add another source." */
  multi_source_refs?: import('./multi-source-ref').MultiSourceRef[] | null;
  created_at: string;
  updated_at: string;
}

export const deliveryMemosKey = (e: string) =>
  `erp_delivery_memos_${e}`;

export const DM_STATUS_LABELS: Record<DMStatus, string> = {
  draft: 'Draft',
  raised: 'Raised',
  lr_assigned: 'LR Assigned',
  delivered: 'Delivered',
};
