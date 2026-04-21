/**
 * voucher.ts — Voucher transaction data model
 * Core types for the 4 storage keys + voucher header
 * [JWT] Replace with GET/POST /api/accounting/vouchers
 */
import type { VoucherBaseType } from './voucher-type';
import type { AssetUnitLine } from './fixed-asset';

export interface VoucherLedgerLine {
  id: string;
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  ledger_group_code: string;
  dr_amount: number;
  cr_amount: number;
  narration: string;
  bill_ref?: string;
  cost_centre_id?: string;
}

/**
 * Per-line item allocation when the line has multi-godown / batch / serial split.
 * Tally-Prime equivalent: "Stock Item Allocations" sub-screen rows.
 *
 * Rule: sum(allocations[].qty) MUST equal VoucherInventoryLine.qty.
 * Even simple single-godown lines should populate one allocation entry so that
 * downstream engines can read allocations[] as the source of truth.
 */
export interface ItemAllocation {
  id: string;
  godown_id: string;
  godown_name: string;
  batch_id?: string;
  batch_no?: string;
  serial_ids?: string[];       // multiple serials per allocation (bulk scan OK)
  qty: number;
  rate: number;
  discount_amount: number;     // absolute, after applying discount_percent of parent line
  taxable_value: number;       // = qty × rate − discount_amount
}

export interface VoucherInventoryLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  hsn_sac_code: string;
  godown_id: string;
  godown_name: string;
  batch_id?: string;
  serial_id?: string;
  qty: number;
  uom: string;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total: number;
  gst_type: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  gst_source: 'item' | 'stock_group' | 'ledger' | 'group' | 'none';
  // Sprint 15a — Production module hook (Charis, future)
  production_batch_id?: string | null;

  /** NEW (Sprint T10-pre.0) — Multi-allocation support. The legacy single-value
      godown_id/batch_id/serial_id fields above STAY for backwards compatibility
      but are derived from allocations[0] when there is exactly one allocation.
      Engines SHOULD treat allocations[] as the source of truth. */
  allocations?: ItemAllocation[];

  /** NEW (Sprint T10-pre.0) — Parametric Hub values captured at entry time.
      Keys are parameter_code from the ParameterEntry on the linked template. */
  parameter_values?: Record<string, string>;
}

export interface VoucherTaxLine {
  id: string;
  tax_type: 'cgst' | 'sgst' | 'igst' | 'cess' | 'tds' | 'tcs';
  rate: number;
  taxable_value: number;
  tax_amount: number;
  ledger_id: string;
  ledger_name: string;
}

export interface BillReference {
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  amount: number;
  type: 'new' | 'against_ref' | 'advance';
}

export interface TDSReceivableLine {
  customer_tan: string;
  tds_section: string;
  invoice_ref: string;
  invoice_date: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
}

// The voucher header – stored in erp_group_vouchers_{e}
export interface Voucher {
  id: string;
  voucher_no: string;
  voucher_type_id: string;
  voucher_type_name: string;
  base_voucher_type: VoucherBaseType;
  entity_id: string;
  date: string;
  invoice_mode?: 'item' | 'accounting';
  contra_mode?: 'bank_transfer' | 'cash_transfer';
  party_id?: string;
  party_code?: string;
  party_name?: string;
  party_gstin?: string;
  party_state_code?: string;
  place_of_supply?: string;
  is_inter_state?: boolean;
  department_id?: string;
  department_name?: string;
  purpose?: string;
  ledger_lines: VoucherLedgerLine[];
  inventory_lines?: VoucherInventoryLine[];
  tax_lines?: VoucherTaxLine[];
  gross_amount: number;
  total_discount: number;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  total_tax: number;
  round_off: number;
  net_amount: number;
  tds_applicable: boolean;
  tds_section?: string;
  tds_rate?: number;
  tds_amount?: number;
  deductee_pan?: string;          // vendor PAN at time of deduction
  deductee_type?: "individual" | "company" | "huf" | "no_pan";
  bill_references?: BillReference[];
  tds_receivable_lines?: TDSReceivableLine[];
  narration: string;
  terms_conditions: string;
  payment_enforcement: string;
  payment_instrument: string;
  ref_voucher_id?: string;
  ref_voucher_no?: string;
  vendor_bill_no?: string;
  vendor_bill_date?: string;
  grn_ref?: string;
  po_ref?: string;
  // ── SAM fields — populated from Sales Invoice SAM assignment ──────
  sam_salesman_id?: string | null;
  sam_salesman_name?: string | null;
  sam_agent_id?: string | null;
  sam_agent_name?: string | null;
  sam_reference_id?: string | null;
  sam_reference_name?: string | null;
  // Snapshot of commission calculation at post time (from sam-engine)
  sam_commission_results?: import('@/lib/sam-engine').CommissionResult[];
  so_ref?: string; // SO number that this Sales Invoice or Delivery Note fulfils
  vehicle_no?: string;
  transporter?: string;
  // Sprint 15a — Dispatch Hub integration
  transporter_id?: string;     // LogisticMaster.id
  lr_no?: string;              // Lorry Receipt number from transporter
  lr_date?: string;            // ISO date when transporter issued LR
  ewb_no?: string;
  irn?: string;
  irn_status?: 'pending' | 'generated' | 'cancelled' | 'failed';
  // Sprint 9 — IRN signed payload + EWB linkage
  irn_ack_no?: string;
  irn_ack_date?: string;
  irn_signed_qr?: string;
  ewb_status?: 'not_required' | 'pending' | 'generated' | 'expired' | 'extended' | 'cancelled';
  ewb_valid_until?: string;
  // Supplier/customer state for IRN engine + interstate detection
  supplier_gstin?: string;
  supplier_state_code?: string;
  customer_state_code?: string;
  from_ledger_name?: string;
  to_ledger_name?: string;
  party_registration_type?: string;
  party_country?: string;
  party_lut_number?: string;
  from_godown_name?: string;
  to_godown_name?: string;
  status: 'draft' | 'posted' | 'cancelled' | 'in_transit' | 'received';
  cancel_reason?: string;
  /** NEW (Sprint T10-pre.1a) — source department for Stock Transfer (replaces party for this base type). */
  dispatch_dept_id?: string;
  dispatch_dept_name?: string;
  /** NEW (Sprint T10-pre.1a) — destination department for Stock Transfer. */
  receive_dept_id?: string;
  receive_dept_name?: string;
  /** NEW — receiving confirmation; set when ST moves in_transit → received. */
  received_at?: string;
  received_by?: string;
  is_cancelled?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  posted_at?: string;
  asset_unit_lines?: AssetUnitLine[];

  /** NEW (Sprint T10-pre.0) — Reference document
      (e.g. customer PO, vendor invoice, original invoice for CN) */
  ref_no?: string;
  ref_date?: string;               // YYYY-MM-DD

  /** NEW (Sprint T10-pre.0) — Accounting effective date
      (may differ from document date — for accrual entries) */
  effective_date?: string;         // YYYY-MM-DD, defaults to voucher.date

  /** NEW (Sprint T10-pre.0) — Tally-Prime-style dispatch + addressing block */
  dispatch_details?: VoucherDispatchDetails;
}

/**
 * Tally-Prime-style dispatch + addressing block for a voucher.
 * Captured from <PartyDispatchDialog> after party selection.
 */
export interface VoucherDispatchDetails {
  // Dispatch
  tracking_no?: string;
  dispatch_doc_no?: string;
  dispatch_doc_date?: string;      // YYYY-MM-DD
  dispatch_through?: string;       // transporter name / courier
  vehicle_no?: string;
  destination?: string;

  // Addressing (IDs refer to addresses[] on the party master)
  bill_to_address_id?: string;
  ship_to_address_id?: string;

  // Snapshotted address text so voucher prints survive address edits later
  bill_to_snapshot?: string;
  ship_to_snapshot?: string;
}

// Journal entry line — stored in erp_journal_{e}
export interface JournalEntry {
  id: string;
  voucher_id: string;
  voucher_no: string;
  base_voucher_type: VoucherBaseType;
  entity_id: string;
  date: string;
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  ledger_group_code: string;
  dr_amount: number;
  cr_amount: number;
  narration: string;
  bill_ref?: string;
  bill_type?: 'new' | 'against_ref';
  party_id?: string;
  cost_centre_id?: string;
  is_cancelled: boolean;
  created_at: string;
}

// Stock ledger entry — stored in erp_stock_ledger_{e}
export interface StockEntry {
  id: string;
  voucher_id: string;
  voucher_no: string;
  base_voucher_type: VoucherBaseType;
  entity_id: string;
  date: string;
  item_id: string;
  item_code: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  batch_id?: string;
  serial_id?: string;
  inward_qty: number;
  outward_qty: number;
  rate: number;
  value: number;
  uom: string;
  is_cancelled: boolean;
  created_at: string;
}

// Outstanding entry — stored in erp_outstanding_{e}
export interface OutstandingEntry {
  id: string;
  entity_id: string;
  party_id: string;
  party_code: string;
  party_name: string;
  party_type: 'debtor' | 'creditor';
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  base_voucher_type: VoucherBaseType;
  original_amount: number;
  pending_amount: number;
  due_date: string;
  credit_days: number;
  currency: string;
  settled_amount: number;
  settlement_refs: Array<{ voucher_id: string; amount: number; date: string }>;
  status: 'open' | 'partial' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// GST register entry — stored in erp_gst_register_{e}
export interface GSTEntry {
  id: string;
  voucher_id: string;
  voucher_no: string;
  entity_id: string;
  date: string;
  base_voucher_type: VoucherBaseType;
  party_id: string;
  party_gstin: string;
  party_name: string;
  party_state_code: string;
  supply_type: 'B2B' | 'B2C' | 'B2BUR' | 'EXP_WP' | 'EXP_WOP' | 'SEZWP' | 'SEZWOP';
  hsn_code: string;
  taxable_value: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cess_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_tax: number;
  invoice_value: number;
  place_of_supply: string;
  is_inter_state: boolean;
  is_rcm: boolean;
  itc_eligible: boolean;
  itc_reversal: number;
  uqc: string;
  rcm_section?: string;
  qty?: number;
  line_item_id?: string;
  irn?: string;
  ewb_no?: string;
  is_cancelled: boolean;
  created_at: string;
}

export const VOUCHER_STORAGE_KEY = 'erp_group_vouchers';
