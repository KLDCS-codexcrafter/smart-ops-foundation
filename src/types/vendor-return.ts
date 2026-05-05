/**
 * vendor-return.ts — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block A
 *
 * Vendor return records goods being returned to vendor — typically driven by
 * QualiCheck rejection, quarantine release-to-reject, or supersession.
 *
 * D-127: Lives in src/pages/erp/logistic/ (NOT finecore).
 * D-128: Vendor return is NOT a voucher; the financial debit note is posted
 * by FineCore in Phase 2.
 *
 * [JWT] GET/POST/PATCH /api/logistic/vendor-returns
 */

export type VendorReturnStatus =
  | 'draft'
  | 'approved'
  | 'dispatched'
  | 'acknowledged'
  | 'closed'
  | 'cancelled';

export type VendorReturnReason =
  | 'qa_rejected'
  | 'quarantine_reject'
  | 'wrong_item'
  | 'damaged'
  | 'short_supply'
  | 'expired'
  | 'other';

export interface VendorReturnLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  return_qty: number;
  unit_rate: number;
  line_total: number;
  batch_no: string | null;
  heat_no: string | null;
  reason: VendorReturnReason;
  reason_notes: string;
  source_grn_id: string | null;
  source_grn_no: string | null;
  source_inspection_id: string | null;
}

export interface VendorReturn {
  id: string;
  entity_id: string;
  return_no: string; // RTV/YY-YY/NNNN
  status: VendorReturnStatus;

  // Vendor
  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string | null;

  // Source linkage
  source_grn_id: string | null;
  source_grn_no: string | null;
  source_po_id: string | null;
  source_po_no: string | null;

  // Dispatch details
  return_date: string;
  vehicle_no: string | null;
  lr_no: string | null;
  transporter_name: string | null;

  // Reason summary
  primary_reason: VendorReturnReason;
  reason_notes: string;

  // Lines
  lines: VendorReturnLine[];

  // Financials
  total_qty: number;
  total_value: number;

  // Linkage to downstream
  debit_note_id: string | null;
  debit_note_no: string | null;
  vendor_acknowledgement_no: string | null;
  vendor_acknowledgement_date: string | null;

  // Narration
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
  closed_at: string | null;
  cancelled_at: string | null;
}

export const vendorReturnsKey = (entityCode: string) => `erp_vendor_returns_${entityCode}`;

export const VENDOR_RETURN_STATUS_LABELS: Record<VendorReturnStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  dispatched: 'Dispatched',
  acknowledged: 'Acknowledged',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const VENDOR_RETURN_STATUS_COLORS: Record<VendorReturnStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-primary/10 text-primary',
  dispatched: 'bg-warning/10 text-warning',
  acknowledged: 'bg-accent/10 text-accent-foreground',
  closed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

export const VENDOR_RETURN_REASON_LABELS: Record<VendorReturnReason, string> = {
  qa_rejected: 'QA Rejected',
  quarantine_reject: 'Quarantine Reject',
  wrong_item: 'Wrong Item Supplied',
  damaged: 'Damaged in Transit',
  short_supply: 'Short Supply',
  expired: 'Expired Stock',
  other: 'Other',
};
