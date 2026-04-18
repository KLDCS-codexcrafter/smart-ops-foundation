/**
 * sales-return-memo.ts — SalesX field-force return memo
 * Sprint 6B. Memo is the authorization; Credit Note is the accounting entry.
 * [JWT] GET/POST/PATCH /api/salesx/sales-return-memos
 */

export type SalesReturnMemoStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'credit_note_posted';

export type SalesReturnReason =
  | 'damaged_goods'
  | 'wrong_supply'
  | 'quality_issue'
  | 'short_supply'
  | 'excess_supply'
  | 'customer_rejection'
  | 'expired'
  | 'other';

export const SALES_RETURN_REASON_LABELS: Record<SalesReturnReason, string> = {
  damaged_goods: 'Damaged Goods',
  wrong_supply: 'Wrong Supply',
  quality_issue: 'Quality Issue',
  short_supply: 'Short Supply',
  excess_supply: 'Excess Supply',
  customer_rejection: 'Customer Rejection',
  expired: 'Expired Goods',
  other: 'Other',
};

export interface SalesReturnMemoItem {
  id: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string | null;
  rate: number;
  amount: number;
}

export interface SalesReturnMemo {
  id: string;
  entity_id: string;
  memo_no: string;                  // SRM/YY-YY/NNNN
  memo_date: string;
  raised_by_person_id: string;
  raised_by_person_name: string;
  raised_by_person_type: string;    // salesman | agent | broker | reference
  customer_id: string;
  customer_name: string;
  against_invoice_id: string | null;
  against_invoice_no: string;
  against_invoice_date: string | null;
  reason: SalesReturnReason;
  reason_note: string | null;
  items: SalesReturnMemoItem[];
  total_amount: number;
  attachments: string[];

  // Workflow
  status: SalesReturnMemoStatus;
  approved_by_user: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;

  // Linkage to Credit Note
  credit_note_voucher_id: string | null;
  credit_note_voucher_no: string | null;
  credit_note_posted_at: string | null;

  created_at: string;
  updated_at: string;
}

export const salesReturnMemosKey = (e: string) =>
  `erp_sales_return_memos_${e}`;
