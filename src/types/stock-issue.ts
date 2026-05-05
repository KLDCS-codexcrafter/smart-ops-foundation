/**
 * stock-issue.ts — Card #7 Store Hub FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block A · D-375
 *
 * Stock Issue records release of stock from Stores godown to a department/recipient.
 * Posts a Stock Journal voucher (D-128 zero-touch · uses existing 'Stock Journal' base_voucher_type).
 *
 * D-127 boundary: lives in src/lib/ (NOT finecore engine touched beyond 'SI' prefix concession).
 * D-228 UTH stamping fields included.
 *
 * [JWT] GET/POST/PATCH /api/store/stock-issues
 */

export type StockIssueStatus = 'draft' | 'issued' | 'cancelled';

export interface StockIssueLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  rate: number;
  value: number;
  source_godown_id: string;
  source_godown_name: string;
  batch_no: string | null;
  remarks: string;
}

export interface StockIssue {
  id: string;
  entity_id: string;
  issue_no: string;                  // SI/YY-YY/NNNN

  status: StockIssueStatus;
  issue_date: string;                // YYYY-MM-DD

  // Recipient
  department_id: string | null;
  department_name: string;
  recipient_id: string | null;
  recipient_name: string;
  purpose: string;

  lines: StockIssueLine[];

  total_value: number;

  // Posting linkage
  voucher_id: string | null;
  voucher_no: string | null;
  posted_at: string | null;

  narration: string;

  // D-228 UTH
  effective_date?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;

  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export const stockIssuesKey = (entityCode: string) => `erp_stock_issues_${entityCode}`;

export const STOCK_ISSUE_STATUS_LABELS: Record<StockIssueStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

export const STOCK_ISSUE_STATUS_COLORS: Record<StockIssueStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};
