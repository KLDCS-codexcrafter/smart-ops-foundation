/**
 * invoice-dispute.ts — Distributor-initiated dispute on invoice line
 * Sprint 11a. Short supply / damaged / wrong item / mislabelled.
 */

export type DisputeReason =
  | 'short_supply'    // received less than billed
  | 'damaged'         // arrived damaged
  | 'wrong_item'      // different SKU sent
  | 'rate_mismatch'   // billed rate differs from quoted
  | 'quality_issue'   // product quality below spec
  | 'other';

export type DisputeStatus =
  | 'open'            // distributor raised, waiting ops
  | 'under_review'    // ops assigned, investigating
  | 'approved'        // valid, credit note to be issued
  | 'credit_noted'    // CN posted, dispute closed
  | 'rejected'        // not valid, closed
  | 'partial';        // partial credit granted

export interface InvoiceDispute {
  id: string;
  entity_id: string;
  dispute_no: string;              // DSP/YYYY/0001
  dispute_date: string;
  distributor_id: string;
  customer_id: string;
  voucher_id: string;              // FK to Voucher (sales_invoice)
  voucher_no: string;
  line_id: string | null;          // specific line or whole invoice
  reason: DisputeReason;
  billed_quantity: number;
  received_quantity: number;
  disputed_amount_paise: number;
  distributor_remarks: string;     // min 20 chars
  photo_urls: string[];            // base64 data URLs (client compressed)
  // Workflow
  status: DisputeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_type: 'credit_note' | 'replacement' | 'rejection' | null;
  credit_note_voucher_id: string | null;
  approved_amount_paise: number | null;
  rejection_reason: string | null;
  internal_remarks: string;
  created_at: string;
  updated_at: string;
}

export const disputesKey = (e: string) => `erp_invoice_disputes_${e}`;

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  short_supply: 'Short Supply',
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  rate_mismatch: 'Rate Mismatch',
  quality_issue: 'Quality Issue',
  other: 'Other',
};

export const DISPUTE_STATUS_COLOURS: Record<DisputeStatus, string> = {
  open: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  under_review: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  credit_noted: 'bg-green-600/15 text-green-700 border-green-600/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  partial: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  approved: 'Approved',
  credit_noted: 'Credit Noted',
  rejected: 'Rejected',
  partial: 'Partial',
};
