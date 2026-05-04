/**
 * @file     print-config.ts
 * @purpose  PrintConfig type, default values, and toggle metadata for per-voucher print customization (Tally F12-style).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2b.3b-A
 * @sprint   T10-pre.2b.3b-A
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat)
 * @whom     Accountants (trim prints) · Stores (more detail) · Customers (clean copies) · Entity admins (configure once per entity)
 * @depends  — (pure types, no runtime deps)
 * @consumers print-config-storage.ts · PrintConfigPage.tsx · (future: all 14 print engines in 2b.3b-B1)
 */

// [Abstract] VoucherTypeCode is the single key under which per-voucher toggles live.
// Adding a new voucher type = add one literal here + one row in DEFAULT_PRINT_CONFIG.
export type VoucherTypeCode =
  | 'invoice'
  | 'receipt'
  | 'payment'
  | 'contra'
  | 'journal'
  | 'purchase_invoice'
  | 'credit_note'
  | 'debit_note'
  | 'delivery_note'
  | 'receipt_note'
  | 'stock_adjustment'
  | 'stock_journal'
  | 'stock_transfer'
  | 'mfg_journal'
  // Sprint T-Phase-1.2.6f-d-1 · D-290 Track 2 partial — Procure360 print engines.
  | 'purchase_order'
  | 'bill_passing';

// [Abstract] The 20 universal toggle keys. Not every toggle applies to every voucher —
// the applicability matrix is in PRINT_TOGGLES below. Engine consumers check applicability
// before reading the flag.
export interface PrintToggles {
  // Header block (T-01 to T-03)
  showHeaderGstin: boolean;
  showHeaderPan: boolean;
  showHeaderStateCode: boolean;

  // Line-item columns (T-04 to T-09)
  showRate: boolean;
  showValue: boolean;
  showGodown: boolean;
  showBatch: boolean;
  showHsnSac: boolean;
  showDiscountColumn: boolean;

  // Voucher-footer blocks (T-10 to T-14)
  showNarration: boolean;
  showAmountInWords: boolean;
  showAuthorisedSignatory: boolean;
  showRoundOff: boolean;
  showTermsAndConditions: boolean;

  // GST-specific (T-15 to T-18)
  showPlaceOfSupply: boolean;
  showHsnSummary: boolean;
  showReverseChargeFlag: boolean;
  showEInvoiceQr: boolean;

  // Transport-specific (T-19 to T-20)
  showTransporterDetails: boolean;
  showEwayBillInfo: boolean;
}

export interface PrintConfig {
  /** Version bump invalidates old stored configs; bump when PrintToggles shape changes breakingly. */
  version: 1;
  /** Per-voucher toggle sets. Partial<PrintToggles> allowed; missing keys fall back to DEFAULT_TOGGLES. */
  byVoucherType: Partial<Record<VoucherTypeCode, Partial<PrintToggles>>>;
  /** ISO timestamp of last update — used by editor dirty-check + future audit trail. */
  updatedAt: string;
}

// [Concrete] Current print-engine behavior translated to flags. These defaults ensure
// an absent PrintConfig produces the SAME output as today — zero regression by construction.
export const DEFAULT_TOGGLES: PrintToggles = {
  showHeaderGstin: true,
  showHeaderPan: true,
  showHeaderStateCode: true,
  showRate: true,
  showValue: true,
  showGodown: true,
  showBatch: true,
  showHsnSac: true,
  showDiscountColumn: true,
  showNarration: true,
  showAmountInWords: true,
  showAuthorisedSignatory: true,
  showRoundOff: true,
  showTermsAndConditions: true,
  showPlaceOfSupply: true,
  showHsnSummary: true,
  showReverseChargeFlag: true,
  showEInvoiceQr: true,
  showTransporterDetails: true,
  showEwayBillInfo: false, // [Concrete] not yet implemented in any engine — off by default
};

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  version: 1,
  byVoucherType: {},
  updatedAt: '1970-01-01T00:00:00.000Z',
};

// [Abstract] Toggle metadata — labels, groups, and which voucher types each toggle applies to.
// Drives the editor UI AND documents applicability for future engine implementers.
export type ToggleGroup = 'header' | 'line_columns' | 'footer' | 'gst' | 'transport';

export interface ToggleMeta {
  /** Key into PrintToggles. */
  key: keyof PrintToggles;
  /** Tally-style label shown in editor. */
  label: string;
  /** Helper text describing effect. */
  description: string;
  /** Grouping for UI accordion. */
  group: ToggleGroup;
  /** Which voucher types does this toggle affect? Controls editor disable state. */
  appliesTo: VoucherTypeCode[];
}

const ALL_VOUCHERS: VoucherTypeCode[] = [
  'invoice', 'receipt', 'payment', 'contra', 'journal',
  'purchase_invoice', 'credit_note', 'debit_note',
  'delivery_note', 'receipt_note',
  'stock_adjustment', 'stock_journal', 'stock_transfer', 'mfg_journal',
  'purchase_order', 'bill_passing',
];

const GL_VOUCHERS: VoucherTypeCode[] = ['receipt', 'payment', 'contra', 'journal'];
const GST_VOUCHERS: VoucherTypeCode[] = ['invoice', 'purchase_invoice', 'credit_note', 'debit_note'];
const INV_VOUCHERS: VoucherTypeCode[] = [
  'invoice', 'purchase_invoice', 'credit_note', 'debit_note',
  'delivery_note', 'receipt_note',
  'stock_adjustment', 'stock_journal', 'stock_transfer', 'mfg_journal',
  'purchase_order', 'bill_passing',
];
const TRANSPORT_VOUCHERS: VoucherTypeCode[] = ['invoice', 'delivery_note', 'receipt_note'];

export const PRINT_TOGGLES: ToggleMeta[] = [
  // Header group (T-01 to T-03)
  { key: 'showHeaderGstin', label: 'Show GSTIN', description: 'Display supplier/buyer GSTIN in header block.', group: 'header', appliesTo: ALL_VOUCHERS },
  { key: 'showHeaderPan', label: 'Show PAN', description: 'Display supplier/buyer PAN below GSTIN.', group: 'header', appliesTo: ALL_VOUCHERS },
  { key: 'showHeaderStateCode', label: 'Show State Code', description: 'Display state name/code in supplier block.', group: 'header', appliesTo: ALL_VOUCHERS },

  // Line columns (T-04 to T-09)
  { key: 'showRate', label: 'Show Rate Column', description: 'Display per-line Rate column (Qty-only prints hide this).', group: 'line_columns', appliesTo: INV_VOUCHERS },
  { key: 'showValue', label: 'Show Value Column', description: 'Display per-line Value = Qty × Rate column.', group: 'line_columns', appliesTo: INV_VOUCHERS },
  { key: 'showGodown', label: 'Show Godown Column', description: 'Display per-line Godown source/destination.', group: 'line_columns', appliesTo: INV_VOUCHERS },
  { key: 'showBatch', label: 'Show Batch Column', description: 'Display per-line Batch number.', group: 'line_columns', appliesTo: INV_VOUCHERS },
  { key: 'showHsnSac', label: 'Show HSN/SAC Column', description: 'Display per-line HSN (goods) or SAC (services) code.', group: 'line_columns', appliesTo: GST_VOUCHERS },
  { key: 'showDiscountColumn', label: 'Show Discount Column', description: 'Display per-line discount % or amount column.', group: 'line_columns', appliesTo: GST_VOUCHERS },

  // Footer (T-10 to T-14)
  { key: 'showNarration', label: 'Show Narration', description: 'Display voucher narration block below lines.', group: 'footer', appliesTo: ALL_VOUCHERS },
  { key: 'showAmountInWords', label: 'Show Amount In Words', description: 'Display grand total spelled out in Indian English.', group: 'footer', appliesTo: [...GL_VOUCHERS, ...GST_VOUCHERS] },
  { key: 'showAuthorisedSignatory', label: 'Show Authorised Signatory', description: '"For <Entity Name>" signature line at bottom-right.', group: 'footer', appliesTo: ALL_VOUCHERS },
  { key: 'showRoundOff', label: 'Show Round-Off Line', description: 'Display round-off adjustment in totals block.', group: 'footer', appliesTo: [...GL_VOUCHERS, ...GST_VOUCHERS] },
  { key: 'showTermsAndConditions', label: 'Show Terms & Conditions', description: 'Display T&C block at bottom of print.', group: 'footer', appliesTo: GST_VOUCHERS },

  // GST group (T-15 to T-18)
  { key: 'showPlaceOfSupply', label: 'Show Place of Supply', description: 'Display Place of Supply above line-items (GST compliance).', group: 'gst', appliesTo: GST_VOUCHERS },
  { key: 'showHsnSummary', label: 'Show HSN Summary Table', description: 'Display HSN-wise tax summary table above totals.', group: 'gst', appliesTo: GST_VOUCHERS },
  { key: 'showReverseChargeFlag', label: 'Show Reverse Charge Flag', description: '"Reverse Charge: Yes/No" label in header.', group: 'gst', appliesTo: ['invoice', 'purchase_invoice'] },
  { key: 'showEInvoiceQr', label: 'Show e-Invoice QR', description: 'Display e-invoice IRN QR code (when IRN is present).', group: 'gst', appliesTo: ['invoice', 'credit_note', 'debit_note'] },

  // Transport (T-19 to T-20)
  { key: 'showTransporterDetails', label: 'Show Transporter Details', description: 'Display transporter name, vehicle no, LR no, distance.', group: 'transport', appliesTo: TRANSPORT_VOUCHERS },
  { key: 'showEwayBillInfo', label: 'Show e-Way Bill Info', description: 'Display e-way bill no + expiry (future; off by default).', group: 'transport', appliesTo: TRANSPORT_VOUCHERS },
];

// Convenience display map for editor + future consumers.
export const VOUCHER_TYPE_LABELS: Record<VoucherTypeCode, string> = {
  invoice: 'Sales Invoice',
  receipt: 'Receipt',
  payment: 'Payment',
  contra: 'Contra Entry',
  journal: 'Journal Entry',
  purchase_invoice: 'Purchase Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_note: 'Delivery Note',
  receipt_note: 'Receipt Note (GRN)',
  stock_adjustment: 'Stock Adjustment',
  stock_journal: 'Stock Journal',
  stock_transfer: 'Stock Transfer',
  mfg_journal: 'Manufacturing Journal',
};

export const TOGGLE_GROUP_LABELS: Record<ToggleGroup, string> = {
  header: 'Header Block',
  line_columns: 'Line-Item Columns',
  footer: 'Footer Blocks',
  gst: 'GST Compliance',
  transport: 'Transport / e-Way',
};
