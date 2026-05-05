/**
 * inward-receipt.ts — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block A
 *
 * Inward receipt records the physical arrival of goods at the gate before
 * GRN posting. Pairs with QualiCheck (Card #5) for quarantine routing.
 *
 * D-127 boundary: Inward receipt lives in src/pages/erp/logistic/ (NOT finecore).
 * D-128 boundary: Inward receipt is NOT a voucher — it is an authorization
 * document that precedes GRN posting.
 *
 * [JWT] GET/POST/PATCH /api/logistic/inward-receipts
 */

export type InwardReceiptStatus =
  | 'draft'
  | 'arrived'
  | 'quarantine'
  | 'released'
  | 'rejected'
  | 'cancelled';

export type InwardRoutingDecision =
  | 'auto_release'
  | 'quarantine'
  | 'inspection_required'
  | 'rejected';

export interface InwardReceiptLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  expected_qty: number;
  received_qty: number;
  batch_no: string | null;
  heat_no: string | null;
  qa_plan_id: string | null;
  routing_decision: InwardRoutingDecision;
  routing_reason: string;
}

export interface InwardReceipt {
  id: string;
  entity_id: string;
  receipt_no: string; // IR/YY-YY/NNNN
  status: InwardReceiptStatus;

  // Source linkage
  po_id: string | null;
  po_no: string | null;
  gate_entry_id: string | null;
  gate_entry_no: string | null;

  // Vendor + transport
  vendor_id: string;
  vendor_name: string;
  vendor_invoice_no: string | null;
  vendor_invoice_date: string | null;
  vehicle_no: string | null;
  lr_no: string | null;
  driver_name: string | null;
  driver_mobile: string | null;

  // Receipt details
  arrival_date: string;
  arrival_time: string;
  received_by_id: string;
  received_by_name: string;
  godown_id: string;
  godown_name: string;

  // Lines
  lines: InwardReceiptLine[];

  // Routing summary
  total_lines: number;
  quarantine_lines: number;
  released_lines: number;
  rejected_lines: number;

  // Linkage to downstream documents
  grn_id: string | null;
  grn_no: string | null;
  qa_inspection_ids: string[];

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
  released_at: string | null;
  cancelled_at: string | null;
}

export const inwardReceiptsKey = (entityCode: string) => `erp_inward_receipts_${entityCode}`;

export const INWARD_STATUS_LABELS: Record<InwardReceiptStatus, string> = {
  draft: 'Draft',
  arrived: 'Arrived',
  quarantine: 'In Quarantine',
  released: 'Released',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const INWARD_STATUS_COLORS: Record<InwardReceiptStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  arrived: 'bg-primary/10 text-primary',
  quarantine: 'bg-warning/10 text-warning',
  released: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export const ROUTING_DECISION_LABELS: Record<InwardRoutingDecision, string> = {
  auto_release: 'Auto-Released',
  quarantine: 'Quarantine',
  inspection_required: 'Inspection Required',
  rejected: 'Rejected',
};
