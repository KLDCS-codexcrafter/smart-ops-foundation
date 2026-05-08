/**
 * @file        bill-passing.ts
 * @sprint      T-Phase-1.2.6f-c-2 · Block A · per D-285 · T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration (qc_variance · cached tax fields · D-NEW-AH/AI) · T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring (cached tax fields wired · D-NEW-AL)
 * @purpose     Bill Passing types · 3-way/4-way Match record · variance metadata
 * @decisions   D-285 (NEW page) · D-286 (hybrid 3-way/4-way) · D-287 (FCPI auto-draft on approval) · D-NEW-AH (qc_variance) · D-NEW-AI (cached tax derivation)
 * @disciplines FR-22 Type Discipline · FR-50 Multi-entity 6-point
 */

export type BillPassingStatus =
  | 'pending_match'
  | 'matched_clean'
  | 'matched_with_variance'
  | 'awaiting_qa'
  | 'qa_failed'
  | 'approved_for_fcpi'
  | 'fcpi_drafted'
  | 'rejected'
  | 'cancelled';

export type MatchType = '3-way' | '4-way';

export type LineMatchStatus =
  | 'clean'
  | 'qty_variance'
  | 'rate_variance'
  | 'tax_variance'
  | 'total_variance'
  | 'qc_variance'      // 4-way · QC inspection failed (D-NEW-AH · A.3.b)
  | 'unmatched';

export interface BillPassingLine {
  id: string;
  line_no: number;
  po_line_id: string;
  git_line_id: string | null;
  item_id: string;
  item_name: string;

  // PO side
  po_qty: number;
  po_rate: number;
  po_value: number;

  // GRN side
  grn_qty: number;

  // Invoice side
  invoice_qty: number;
  invoice_rate: number;
  invoice_value: number;
  invoice_tax_pct: number;
  invoice_tax_value: number;
  invoice_total: number;

  // Variance
  qty_variance: number;
  rate_variance: number;
  total_variance: number;

  // Match
  match_status: LineMatchStatus;
  variance_reason: string;

  // QA (4-way)
  requires_inspection: boolean;
  qa_passed: boolean | null;

  // Sprint T-Phase-1.2.6f-d-1 · Block E · D-291 Parametric Hub backfill (optional)
  parameter_values?: Record<string, string>;
}

export interface BillPassingRecord {
  id: string;
  bill_no: string;
  bill_date: string;

  entity_id: string;
  branch_id: string | null;

  po_id: string;
  po_no: string;
  git_id: string | null;
  vendor_id: string;
  vendor_name: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;

  match_type: MatchType;
  qa_inspection_id: string | null;

  lines: BillPassingLine[];

  total_invoice_value: number;
  total_po_value: number;
  total_grn_value: number;
  total_variance: number;
  variance_pct: number;

  tolerance_pct: number;
  tolerance_amount: number;

  approver_user_id: string | null;
  approval_notes: string;
  approved_at: string | null;

  fcpi_voucher_id: string | null;
  fcpi_drafted_at: string | null;

  // 3-c-3 placeholder fields (CC masters wired in 3-c-3 · D-289)
  mode_of_payment_id: string | null;
  terms_of_payment_id: string | null;
  terms_of_delivery_id: string | null;
  narration: string;
  terms_conditions: string;

  status: BillPassingStatus;

  notes: string;
  created_at: string;
  updated_at: string;

  // T-Phase-1.A.3.b-T1 · D-NEW-AI · auto-derived at createBillPassing/runMatch
  // when GSTINs are available. All optional · backward-compatible.
  gst_breakdown?: import('@/lib/finance-pi-bridge').GstBreakdown | null;
  tds_breakdown?: import('@/lib/finance-pi-bridge').TdsBreakdown | null;
  rcm_breakdown?: import('@/lib/finance-pi-bridge').RcmBreakdown | null;
  vendor_gstin?: string;
  entity_gstin?: string;
}

export const billPassingKey = (entityCode: string): string =>
  `erp_bill_passing_${entityCode}`;
