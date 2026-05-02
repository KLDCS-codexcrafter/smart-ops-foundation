/**
 * invoice-memo.ts — Invoice/Tax Memo (IM)
 * Sprint T-Phase-1.1.1n. Memo is the authorization; Sales Invoice is the accounting entry.
 * IM is created by SalesX after goods are dispatched · authorizes Accounts to post Sales Invoice.
 * [JWT] GET/POST/PATCH /api/salesx/invoice-memos
 */

export type IMStatus =
  | 'draft'
  | 'raised'
  | 'invoice_posted';

export interface IMItem {
  id: string;
  item_name: string;
  qty: number;
  uom: string | null;
  rate: number;
  discount_pct: number;
  sub_total: number;
  tax_pct: number;
  tax_amount: number;
  amount: number;
  /** Sprint 2.7-a · GST line-level HSN/SAC + RCM eligibility (Q2-a). */
  hsn_sac_code?: string | null;
  gst_rate?: number | null;
  is_rcm_eligible?: boolean | null;
}

export interface InvoiceMemo {
  id: string;
  entity_id: string;
  memo_no: string;
  memo_date: string;
  sales_order_id: string | null;
  sales_order_no: string | null;
  supply_request_memo_id: string | null;
  supply_request_memo_no: string | null;
  delivery_memo_id: string | null;
  delivery_memo_no: string | null;
  customer_id: string | null;
  customer_name: string | null;
  invoice_date: string | null;
  billing_address: string | null;
  gstin: string | null;
  place_of_supply: string | null;
  items: IMItem[];
  sub_total: number;
  tax_amount: number;
  total_amount: number;
  narration: string | null;
  status: IMStatus;
  raised_by: string | null;
  invoice_voucher_id: string | null;
  invoice_voucher_no: string | null;
  invoice_posted_at: string | null;
  /** Sprint 2.7-a · Bill-To/Ship-To FK + snapshot (Q1-a · mirrors FineCore Voucher pattern). */
  bill_to_address_id?: string | null;
  bill_to_address_snapshot?: string | null;
  bill_to_state_code?: string | null;
  bill_to_gstin?: string | null;
  ship_to_address_id?: string | null;
  ship_to_address_snapshot?: string | null;
  ship_to_state_code?: string | null;
  ship_to_gstin?: string | null;
  /** Sprint 2.7-a · Place of Supply (Section 10 IGST Act). */
  place_of_supply_state_code?: string | null;
  place_of_supply_state_name?: string | null;
  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  /** D-228 Universal Transaction Header (UTH) — all optional · backward compat preserved */
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
  /** Sprint 2.7-c · OOB-15 · bank instrument capture (Q4-c). */
  instrument_type?: string | null;
  instrument_ref_no?: string | null;
  cheque_date?: string | null;
  bank_name?: string | null;
  deposit_date?: string | null;
  /** Tally-Prime multi-source linking (Q2-c · 1.2.6e-tally-1).
   *  Existing single-ref fields stay populated as the "primary" source · this array
   *  captures additional sources when operator clicks "Add another source." */
  multi_source_refs?: import('./multi-source-ref').MultiSourceRef[] | null;
  created_at: string;
  updated_at: string;
}

export const invoiceMemosKey = (e: string) =>
  `erp_invoice_memos_${e}`;

export const IM_STATUS_LABELS: Record<IMStatus, string> = {
  draft: 'Draft',
  raised: 'Raised',
  invoice_posted: 'Invoice Posted',
};
