/**
 * grn.ts — Goods Receipt Note
 * Sprint T-Phase-1.2.1 · Inventory Hub owns the physical receiving transaction.
 * Procure360 (Card #3) owns PR/PO/financial authorization.
 * Pattern: PO (Procure360) → GRN (Inventory Hub) → stock credited to godown
 *
 * D-128 boundary: GRN is NOT a voucher. It is an authorization document.
 * The actual accounting voucher (Purchase Entry) is posted by FineCore/Procure360 in Phase 2.
 * Phase 1: GRN records physical receipt; stock balance updates in localStorage.
 *
 * D-127 boundary: GRN form lives in src/pages/erp/inventory/transactions/ (NOT finecore).
 *
 * [JWT] GET/POST/PATCH /api/inventory/grns
 */

export type GRNStatus = 'draft' | 'received' | 'inspected' | 'posted' | 'cancelled' | 'in_transit';

export type GRNQCResult = 'pending' | 'pass' | 'fail' | 'partial';

export interface GRNLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  uom: string;
  ordered_qty: number;         // from PO (0 if no PO)
  received_qty: number;        // physically received
  accepted_qty: number;        // after QC (≤ received_qty)
  rejected_qty: number;        // failed QC
  unit_rate: number;           // ₹ per uom · from PO or manually entered
  line_total: number;          // accepted_qty × unit_rate · Decimal.js
  batch_no: string | null;     // for batch-tracked items
  serial_nos: string[];        // for serial-tracked items
  /** Sprint 1.2.1 · Sinha-critical: mill heat/cast number on steel & metal Raw Material */
  heat_no: string | null;
  bin_id: string | null;       // which bin to put away to
  qc_result: GRNQCResult | null;
  qc_notes: string;
}

export interface GRN {
  id: string;
  entity_id: string;
  grn_no: string;              // GRN/YY-YY/NNNN via generateDocNo('GRN', entityCode)
  status: GRNStatus;

  // Source linkage (Procure360 integration · Phase 2 populates from PO)
  po_id: string | null;        // FK to PurchaseOrder (Procure360 Card #3)
  po_no: string | null;
  vendor_id: string;
  vendor_name: string;
  vendor_invoice_no: string | null;
  vendor_invoice_date: string | null;

  // Receipt details
  receipt_date: string;        // YYYY-MM-DD
  vehicle_no: string | null;
  lr_no: string | null;        // Lorry Receipt number
  received_by_id: string;      // SAMPerson.id
  received_by_name: string;

  // Destination
  godown_id: string;           // which godown receives this GRN
  godown_name: string;

  // Project tagging (for project-specific procurement)
  project_centre_id: string | null;

  // Lines
  lines: GRNLine[];

  // Financials (Decimal.js)
  total_qty: number;
  total_value: number;
  has_discrepancy: boolean;    // received_qty ≠ ordered_qty on any line

  // Narration
  narration: string;

  /** Sprint T-Phase-1.2.5h-b1 · CGST Rule 56(8) edit/delete chain */
  superseded_by?: string | null;
  version?: number;

  // Sprint T-Phase-1.2.4 · Multi-variant + GIT support
  /** FK to VoucherType.id — 'vt-receipt-note-domestic' / 'import' / 'subcon'. Optional for backward compat. */
  voucher_type_id?: string | null;
  voucher_type_name?: string | null;
  /** Receipt mode — 'direct' (current behavior) or 'two_stage' (invoice first, GRN later) */
  receipt_mode?: 'direct' | 'two_stage';
  /** Stage 1: invoice-received-material-pending date · Stage 2 confirmation moves stock GIT → destination */
  invoice_received_at?: string | null;
  /** Stage 2: physical receipt confirmation timestamp */
  physical_received_at?: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  posted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export const grnsKey = (entityCode: string) => `erp_grns_${entityCode}`;

/**
 * Stock balance is a flat ledger projection per (item, godown) pair.
 * GRN.post() adds to it; future MIN.post() (1.2.2) deducts from it.
 */
export interface StockBalanceEntry {
  item_id: string;
  item_code: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  qty: number;
  value: number;             // weighted-avg value · Decimal.js
  weighted_avg_rate: number; // ₹ per UOM · derived from GRN history
  last_grn_id: string | null;
  last_grn_no: string | null;
  updated_at: string;
}

export const stockBalanceKey = (entityCode: string) => `erp_stock_balance_${entityCode}`;

export const GRN_STATUS_LABELS: Record<GRNStatus, string> = {
  draft:      'Draft',
  received:   'Received',
  inspected:  'Inspected',
  posted:     'Posted',
  cancelled:  'Cancelled',
  in_transit: 'In Transit (Invoice Booked, Material Pending)',
};

export const GRN_STATUS_COLORS: Record<GRNStatus, string> = {
  draft:      'bg-slate-500/10 text-slate-600',
  received:   'bg-blue-500/10 text-blue-700',
  inspected:  'bg-amber-500/10 text-amber-700',
  posted:     'bg-emerald-500/10 text-emerald-700',
  cancelled:  'bg-rose-500/10 text-rose-700',
  in_transit: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};
