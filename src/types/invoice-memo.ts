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
  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
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
