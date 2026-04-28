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
