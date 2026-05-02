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
  /** Sprint 2.7-a · GST line-level HSN/SAC + RCM eligibility (Q2-a). */
  hsn_sac_code?: string | null;
  gst_rate?: number | null;
  is_rcm_eligible?: boolean | null;
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

export const supplyRequestMemosKey = (e: string) =>
  `erp_supply_request_memos_${e}`;

export const SRM_STATUS_LABELS: Record<SRMStatus, string> = {
  draft: 'Draft',
  raised: 'Raised',
  acknowledged: 'Acknowledged',
  dispatching: 'Dispatching',
  dispatched: 'Dispatched',
};
