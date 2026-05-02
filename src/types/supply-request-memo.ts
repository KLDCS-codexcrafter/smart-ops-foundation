/**
 * supply-request-memo.ts — Supply Request Memo (SRM)
 * Sprint T-Phase-1.1.1n. Memo is the authorization; Delivery Note is the goods movement.
 * SRM is created by SalesX after SO is confirmed · authorizes Dispatch to pick + pack + ship.
 * [JWT] GET/POST/PATCH /api/salesx/supply-request-memos
 */

export type SRMStatus =
  | 'draft'
  | 'raised'
  | 'acknowledged'
  | 'dispatching'
  | 'dispatched';

export interface SRMItem {
  id: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string | null;
  rate: number;
  amount: number;
}

export interface SupplyRequestMemo {
  id: string;
  entity_id: string;
  memo_no: string;
  memo_date: string;
  sales_order_id: string | null;
  sales_order_no: string | null;
  customer_id: string | null;
  customer_name: string | null;
  raised_by_person_id: string | null;
  raised_by_person_name: string | null;
  raised_by_person_type: string | null;
  expected_dispatch_date: string | null;
  delivery_address: string | null;
  special_instructions: string | null;
  items: SRMItem[];
  total_amount: number;
  status: SRMStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  dispatched_at: string | null;
  delivery_memo_id: string | null;
  delivery_memo_no: string | null;
  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  /** D-228 Universal Transaction Header (UTH) — all optional · backward compat preserved */
  narration?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  posted_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export const supplyRequestMemosKey = (e: string) =>
  `erp_supply_request_memos_${e}`;

export const SRM_STATUS_LABELS: Record<SRMStatus, string> = {
  draft: 'Draft',
  raised: 'Raised',
  acknowledged: 'Acknowledged',
  dispatching: 'Dispatching',
  dispatched: 'Dispatched',
};
