/**
 * @file     register-config.ts
 * @purpose  RegisterConfig type, default values, toggle metadata, and grouping options
 *           for per-register column customization (Tally F12-equivalent for register views).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-A
 * @sprint   T10-pre.2d-A
 * @iso      Maintainability (HIGH — single source for register-config shape)
 *           Functional Suitability (HIGH — supports all 13 register types)
 *           Reliability (HIGH — Partial shape for forward-compat, parallel to PrintConfig pattern)
 * @whom     Entity admins (configure) · (future 2d-C) 13 register pages
 * @depends  — (pure types, no runtime deps)
 * @consumers register-config-storage.ts · RegisterConfigPage.tsx · (future 2d-C) 13 register pages
 */

// [Abstract] RegisterTypeCode is the single key under which per-register toggles live.
// Adding a new register type = add one literal here + one row in DEFAULT_REGISTER_GROUP + REGISTER_LABELS.
export type RegisterTypeCode =
  | 'sales_register'
  | 'purchase_register'
  | 'receipt_register'
  | 'payment_register'
  | 'contra_register'
  | 'journal_register'
  | 'credit_note_register'
  | 'debit_note_register'
  | 'delivery_note_register'
  | 'receipt_note_register'
  | 'stock_adjustment_register'
  | 'stock_journal_register'
  | 'stock_transfer_register';

// [Abstract] 11 universal toggle keys for column visibility + row behavior. Not every toggle
// applies to every register — the applicability matrix is in REGISTER_TOGGLES below.
// Consumers check applicability via REGISTER_TOGGLES before reading the flag.
export interface RegisterToggles {
  // Column visibility (RT-01 to RT-07)
  showPartyColumn: boolean;
  showNarrationColumn: boolean;
  showStatusColumn: boolean;
  showLineItemCount: boolean;
  showTaxColumns: boolean;            // CGST/SGST/IGST breakdown — applies to GST registers
  showHsnColumn: boolean;              // applies to GST registers
  showGodownColumn: boolean;           // applies to inventory registers

  // Row behavior (RT-08 to RT-11)
  showExpandableLines: boolean;        // inline line-item drill-down (vs. navigate to voucher)
  showSummaryStrip: boolean;           // 5-card summary header (matches DayBook pattern)
  showRunningBalance: boolean;         // applies to Receipt/Payment (cashbook-style)
  showDrCrColumns: boolean;            // applies to GL registers (Journal, Contra)
}

// [Creative] Grouping dimensions for rows. Different default per register makes sense:
// Sales Register groups naturally by customer; Receipt Register by bank; Journal by date only.
export type RegisterGroupKey =
  | 'none'        // flat chronological (DayBook default)
  | 'party'       // group by customer/vendor (applies to Sales/Purchase/Receipt/Payment/CN/DN)
  | 'ledger'      // group by ledger (applies to GL registers)
  | 'status'      // group by draft/posted/cancelled (applies to all)
  | 'godown'      // group by godown (applies to inventory registers)
  | 'bank';       // group by bank ledger (applies to Receipt/Payment)

export interface RegisterConfig {
  /** Version bump invalidates old stored configs; bump when shape changes breakingly. */
  version: 1;
  /** Per-register toggle + grouping overrides. Partial allowed; missing keys fall back to DEFAULT_REGISTER_TOGGLES + DEFAULT_REGISTER_GROUP. */
  byRegisterType: Partial<Record<RegisterTypeCode, {
    toggles?: Partial<RegisterToggles>;
    defaultGroup?: RegisterGroupKey;
  }>>;
}

// [Concrete] Default toggle values — sensible "show most things" for discovery, user trims later.
export const DEFAULT_REGISTER_TOGGLES: RegisterToggles = {
  showPartyColumn: true,
  showNarrationColumn: true,
  showStatusColumn: true,
  showLineItemCount: true,
  showTaxColumns: true,
  showHsnColumn: false,         // off by default — only accountants doing GST reconciliation want HSN in register view
  showGodownColumn: true,
  showExpandableLines: false,   // off by default — adds visual density; opt-in
  showSummaryStrip: true,
  showRunningBalance: false,    // off by default — performance impact on large receipt/payment sets
  showDrCrColumns: true,
};

// [Concrete] Default grouping per register — chosen to match common accountant workflow.
// Sales/Purchase: flat chronological (accountants scan date-wise). Receipt/Payment: grouped by bank
// (cashbook mental model). GL registers: flat. Inventory: flat.
export const DEFAULT_REGISTER_GROUP: Record<RegisterTypeCode, RegisterGroupKey> = {
  sales_register: 'none',
  purchase_register: 'none',
  receipt_register: 'bank',
  payment_register: 'bank',
  contra_register: 'none',
  journal_register: 'none',
  credit_note_register: 'party',
  debit_note_register: 'party',
  delivery_note_register: 'none',
  receipt_note_register: 'none',
  stock_adjustment_register: 'godown',
  stock_journal_register: 'none',
  stock_transfer_register: 'godown',
};

// [Concrete] Empty default config — all registers fall back to DEFAULT_REGISTER_TOGGLES + DEFAULT_REGISTER_GROUP.
export const DEFAULT_REGISTER_CONFIG: RegisterConfig = {
  version: 1,
  byRegisterType: {},
};

// [Abstract] Applicability matrix — which toggles apply to which register types.
// Register consumers (2d-C) read this to hide inapplicable toggles in the UI,
// and to skip reading flags that don't apply.
interface RegisterToggleMeta {
  key: keyof RegisterToggles;
  label: string;
  description: string;
  appliesTo: ReadonlyArray<RegisterTypeCode>;
}

// All 13 register codes, for the "appliesTo: all" cases.
const ALL_REGISTERS: ReadonlyArray<RegisterTypeCode> = [
  'sales_register', 'purchase_register', 'receipt_register', 'payment_register',
  'contra_register', 'journal_register', 'credit_note_register', 'debit_note_register',
  'delivery_note_register', 'receipt_note_register', 'stock_adjustment_register',
  'stock_journal_register', 'stock_transfer_register',
] as const;

const GST_REGISTERS: ReadonlyArray<RegisterTypeCode> = [
  'sales_register', 'purchase_register', 'credit_note_register', 'debit_note_register',
] as const;

const INVENTORY_REGISTERS: ReadonlyArray<RegisterTypeCode> = [
  'delivery_note_register', 'receipt_note_register', 'stock_adjustment_register',
  'stock_journal_register', 'stock_transfer_register',
] as const;

const GL_REGISTERS: ReadonlyArray<RegisterTypeCode> = [
  'receipt_register', 'payment_register', 'contra_register', 'journal_register',
] as const;

export const REGISTER_TOGGLES: ReadonlyArray<RegisterToggleMeta> = [
  { key: 'showPartyColumn',       label: 'Show Party Column',      description: 'Display customer/vendor name column',           appliesTo: ALL_REGISTERS },
  { key: 'showNarrationColumn',   label: 'Show Narration',         description: 'Display narration/description column',          appliesTo: ALL_REGISTERS },
  { key: 'showStatusColumn',      label: 'Show Status',            description: 'Display posted/draft/cancelled status',         appliesTo: ALL_REGISTERS },
  { key: 'showLineItemCount',     label: 'Show Line Item Count',   description: 'Display number of line items per voucher',      appliesTo: [...GST_REGISTERS, ...INVENTORY_REGISTERS] as ReadonlyArray<RegisterTypeCode> },
  { key: 'showTaxColumns',        label: 'Show Tax Breakdown',     description: 'Display CGST/SGST/IGST columns',                 appliesTo: GST_REGISTERS },
  { key: 'showHsnColumn',         label: 'Show HSN Column',        description: 'Display HSN/SAC code column',                    appliesTo: GST_REGISTERS },
  { key: 'showGodownColumn',      label: 'Show Godown',            description: 'Display godown/location column',                 appliesTo: INVENTORY_REGISTERS },
  { key: 'showExpandableLines',   label: 'Expandable Line Items',  description: 'Allow row expansion to show line-item detail',   appliesTo: [...GST_REGISTERS, ...INVENTORY_REGISTERS] as ReadonlyArray<RegisterTypeCode> },
  { key: 'showSummaryStrip',      label: 'Show Summary Strip',     description: 'Display 5-card summary at top of register',      appliesTo: ALL_REGISTERS },
  { key: 'showRunningBalance',    label: 'Show Running Balance',   description: 'Cashbook-style running balance column',          appliesTo: [...GL_REGISTERS] as ReadonlyArray<RegisterTypeCode> },
  { key: 'showDrCrColumns',       label: 'Show Dr/Cr Columns',     description: 'Display debit/credit amount columns',            appliesTo: GL_REGISTERS },
] as const;

// [Abstract] Grouping options metadata — which group keys apply to which registers.
interface GroupMeta {
  key: RegisterGroupKey;
  label: string;
  appliesTo: ReadonlyArray<RegisterTypeCode>;
}

export const REGISTER_GROUPS: ReadonlyArray<GroupMeta> = [
  { key: 'none',   label: 'No grouping (flat chronological)', appliesTo: ALL_REGISTERS },
  { key: 'party',  label: 'Group by Party',                   appliesTo: [...GST_REGISTERS, 'receipt_register', 'payment_register'] as ReadonlyArray<RegisterTypeCode> },
  { key: 'ledger', label: 'Group by Ledger',                  appliesTo: GL_REGISTERS },
  { key: 'status', label: 'Group by Status',                  appliesTo: ALL_REGISTERS },
  { key: 'godown', label: 'Group by Godown',                  appliesTo: INVENTORY_REGISTERS },
  { key: 'bank',   label: 'Group by Bank',                    appliesTo: ['receipt_register', 'payment_register'] as ReadonlyArray<RegisterTypeCode> },
] as const;

// [Abstract] Human-readable register labels for UI.
export const REGISTER_LABELS: Record<RegisterTypeCode, string> = {
  sales_register:           'Sales Register',
  purchase_register:        'Purchase Register',
  receipt_register:         'Receipt Register',
  payment_register:         'Payment Register',
  contra_register:          'Contra Register',
  journal_register:         'Journal Register',
  credit_note_register:     'Credit Note Register',
  debit_note_register:      'Debit Note Register',
  delivery_note_register:   'Delivery Note Register',
  receipt_note_register:    'Receipt Note Register',
  stock_adjustment_register:'Stock Adjustment Register',
  stock_journal_register:   'Stock Journal Register',
  stock_transfer_register:  'Stock Transfer Register',
};
