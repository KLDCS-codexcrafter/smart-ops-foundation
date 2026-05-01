/**
 * voucher-type-seed-data.ts
 * 24 Tally default voucher types — SSOT: Tally_VoucherType_Mapping_ERP_Claude_Ready.xlsx
 * Sheet: Tally_Default_Vouchers (24 rows) + ERP_Neutral_Behavior_Map + Behavior_Logic_Notes
 * [JWT] Replace seed load with GET /api/accounting/voucher-types when backend is ready
 */
import type { VoucherType, BehaviourRule } from '@/types/voucher-type';

const now = new Date().toISOString();
const seed = (id: string, overrides: Partial<VoucherType>): VoucherType => ({
  id,
  name: '', abbreviation: '', base_voucher_type: 'Journal', family: 'Accounting',
  is_active: false, is_system: true, activation_type: 'active',
  accounting_impact: false, inventory_impact: false,
  is_optional_default: false, use_effective_date: false,
  allow_zero_value: false, allow_narration: true, allow_line_narration: true,
  numbering_method: 'automatic', use_custom_series: false, numbering_prefix: '', numbering_suffix: '', numbering_start: 1, numbering_width: 4, numbering_prefill_zeros: true, prevent_duplicate_manual: true, insertion_deletion_behaviour: 'retain_original' as const, show_unused_numbers: false, current_sequence: 1,
  behaviour_rules: [],
  print_after_save: false, use_for_pos: false, print_title: 'Sales Invoice',
  default_bank_ledger_id: null, default_jurisdiction: '', declaration_text: '',
  entity_id: null, created_at: now, updated_at: now,
  ...overrides,
});

const _autoPostRule = (id: string, label: string, dr: string, cr: string): BehaviourRule => ({
  id, rule_type: 'auto_post', label, is_active: true, sequence: 1,
  config: { debit_ledger_code: dr, debit_ledger_name: dr, credit_ledger_code: cr, credit_ledger_name: cr, amount_mode: 'full' },
});
void _autoPostRule;

const settlementRule = (): BehaviourRule => ({
  id: 'rule-settle', rule_type: 'settlement', label: 'Auto-settle outstanding bills', is_active: true, sequence: 2,
  config: { auto_settle: true, settle_against: 'invoices', method: 'fifo', show_bill_by_bill: true },
});

const taxRule = (type: 'igst_only' | 'cgst_sgst' | 'auto_detect'): BehaviourRule => ({
  id: 'rule-tax', rule_type: 'tax_trigger', label: 'Apply GST calculation', is_active: true, sequence: 3,
  config: { apply_gst: true, tax_type: type, tds_applicable: false, tcs_applicable: false },
});

const forexCaptureRule = (rateType: 'selling' | 'buying' | 'standard'): BehaviourRule => ({
  id: `rule-forex-${rateType}`, rule_type: 'forex_capture',
  label: `Forex — ${rateType} rate (dual-amount GL)`, is_active: true, sequence: 10,
  config: { default_rate_type: rateType, allow_rate_override: true, require_rate_if_foreign: true, store_dual_amounts: true },
});

const forexSettlementRule = (revaluation = false): BehaviourRule => ({
  id: revaluation ? 'rule-forex-reval' : 'rule-forex-settle',
  rule_type: 'forex_settlement',
  label: revaluation ? 'Unrealized forex revaluation (AS-11)' : 'Realized forex gain/loss on settlement',
  is_active: true, sequence: 11,
  config: { calculate_realized_gain_loss: true, gain_ledger_code: 'FXGAIN-SYS', loss_ledger_code: 'FXLOSS-SYS', auto_reversal_on_next_period: revaluation },
});

const validationRule = (requireParty: boolean, minAmount = 0): BehaviourRule => ({
  id: 'rule-valid', rule_type: 'validation', label: 'Transaction validation', is_active: true, sequence: 1,
  config: { require_party: requireParty, require_narration: false, min_amount: minAmount, block_future_date: false, require_cost_centre: false },
});

export const VOUCHER_TYPE_SEEDS: VoucherType[] = [
  // ── ACCOUNTING FAMILY (Active by default) ──────────────────────────────────
  seed('vt-contra', {
    name: 'Contra', abbreviation: 'CTR', base_voucher_type: 'Contra', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'CTR-', numbering_width: 4, current_sequence: 1,
    allow_line_narration: true,
    behaviour_rules: [
      validationRule(false),
      { id: 'rule-contra', rule_type: 'validation', label: 'Restrict to Cash/Bank ledgers only', is_active: true, sequence: 2,
        config: { require_party: false, require_narration: false, block_future_date: false, require_cost_centre: false } },
    ],
  }),
  seed('vt-payment', {
    name: 'Payment', abbreviation: 'PY', base_voucher_type: 'Payment', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'PY-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [validationRule(true), settlementRule(), forexCaptureRule('buying'), forexSettlementRule(false)],
  }),
  seed('vt-receipt', {
    name: 'Receipt', abbreviation: 'RC', base_voucher_type: 'Receipt', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'RC-', numbering_width: 4, current_sequence: 1,
    print_after_save: true,
    behaviour_rules: [validationRule(true), settlementRule(), forexCaptureRule('selling'), forexSettlementRule(false)],
  }),
  seed('vt-journal', {
    name: 'Journal', abbreviation: 'JNL', base_voucher_type: 'Journal', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'JNL-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [validationRule(false)],
  }),
  seed('vt-sales', {
    name: 'Sales', abbreviation: 'SI', base_voucher_type: 'Sales', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: true,
    numbering_prefix: 'SI-', numbering_width: 4, current_sequence: 1,
    print_after_save: true, print_title: 'Sales Invoice', use_for_pos: false,
    behaviour_rules: [
      validationRule(true),
      taxRule('auto_detect'),
      forexCaptureRule('selling'),
      { id: 'rule-sales-settle', rule_type: 'settlement', label: 'Post to party receivable', is_active: true, sequence: 3,
        config: { auto_settle: false, settle_against: 'invoices', method: 'fifo', show_bill_by_bill: true } },
    ],
  }),
  seed('vt-purchase', {
    name: 'Purchase', abbreviation: 'PI', base_voucher_type: 'Purchase', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: true,
    numbering_prefix: 'PI-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [
      validationRule(true),
      taxRule('auto_detect'),
      forexCaptureRule('buying'),
      { id: 'rule-purch-settle', rule_type: 'settlement', label: 'Post to party payable', is_active: true, sequence: 3,
        config: { auto_settle: false, settle_against: 'bills', method: 'fifo', show_bill_by_bill: true } },
    ],
  }),
  seed('vt-debit-note', {
    name: 'Debit Note', abbreviation: 'DN', base_voucher_type: 'Debit Note', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'DN-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [validationRule(true), taxRule('auto_detect')],
  }),
  seed('vt-credit-note', {
    name: 'Credit Note', abbreviation: 'CN', base_voucher_type: 'Credit Note', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'CN-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [validationRule(true), taxRule('auto_detect')],
  }),
  // ── NON-ACCOUNTING FAMILY (Active by default, always optional) ─────────────
  seed('vt-memorandum', {
    name: 'Memorandum', abbreviation: 'MEM', base_voucher_type: 'Memorandum', family: 'Non-Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    is_optional_default: true,
    numbering_prefix: 'MEM-', numbering_width: 4, current_sequence: 1,
    allow_line_narration: true,
  }),
  seed('vt-reversing-journal', {
    name: 'Reversing Journal', abbreviation: 'RJN', base_voucher_type: 'Reversing Journal', family: 'Non-Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    is_optional_default: true, use_effective_date: true,
    numbering_prefix: 'RJN-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [
      { id: 'rule-rev', rule_type: 'auto_reversal', label: 'Auto-reverse on effective date', is_active: true, sequence: 1,
        config: { reversal_on: 'period_start', reversal_narration: 'Auto-reversal of {original_voucher_no}' } },
    ],
  }),
  // ── INVENTORY FAMILY (Inactive/On-use) ─────────────────────────────────────
  seed('vt-delivery-note', {
    name: 'Delivery Note', abbreviation: 'DLN', base_voucher_type: 'Delivery Note', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'DN-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-receipt-note', {
    name: 'Receipt Note (GRN)', abbreviation: 'GRN', base_voucher_type: 'Receipt Note', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'GRN-', numbering_width: 4, current_sequence: 1,
  }),
  // Sprint T-Phase-1.2.4 · GRN multi-variant (Domestic / Import / Subcontract)
  // All share base_voucher_type: 'Receipt Note' · different abbreviations + numbering for separate sequences
  seed('vt-receipt-note-domestic', {
    name: 'Goods Receipt Note (Domestic)', abbreviation: 'DGRN',
    base_voucher_type: 'Receipt Note', family: 'Inventory',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'DGRN-', numbering_width: 4, current_sequence: 1,
    print_after_save: true, print_title: 'Goods Receipt Note (Domestic)',
    behaviour_rules: [
      validationRule(true),
      {
        id: 'rule-dgrn-narration', rule_type: 'narration_template',
        label: 'Print narration parent > current > voucher no',
        is_active: true, sequence: 2,
        config: {
          template: '{base_voucher_type} > {voucher_type_name} > {voucher_no}',
          variables: ['base_voucher_type', 'voucher_type_name', 'voucher_no'],
        },
      },
    ],
  }),
  seed('vt-receipt-note-import', {
    name: 'Goods Receipt Note (Import)', abbreviation: 'IGRN',
    base_voucher_type: 'Receipt Note', family: 'Inventory',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'IGRN-', numbering_width: 4, current_sequence: 1,
    print_after_save: true, print_title: 'Goods Receipt Note (Import)',
    behaviour_rules: [
      validationRule(true),
      {
        id: 'rule-igrn-narration', rule_type: 'narration_template',
        label: 'Print narration parent > current > voucher no',
        is_active: true, sequence: 2,
        config: {
          template: '{base_voucher_type} > {voucher_type_name} > {voucher_no}',
          variables: ['base_voucher_type', 'voucher_type_name', 'voucher_no'],
        },
      },
    ],
  }),
  seed('vt-receipt-note-subcon', {
    name: 'Goods Receipt Note (Subcontract)', abbreviation: 'SCGRN',
    base_voucher_type: 'Receipt Note', family: 'Inventory',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'SCGRN-', numbering_width: 4, current_sequence: 1,
    print_after_save: true, print_title: 'Goods Receipt Note (Subcontract)',
    behaviour_rules: [
      validationRule(false),
      {
        id: 'rule-scgrn-narration', rule_type: 'narration_template',
        label: 'Print narration parent > current > voucher no',
        is_active: true, sequence: 2,
        config: {
          template: '{base_voucher_type} > {voucher_type_name} > {voucher_no}',
          variables: ['base_voucher_type', 'voucher_type_name', 'voucher_no'],
        },
      },
    ],
  }),
  seed('vt-rejections-in', {
    name: 'Rejections In', abbreviation: 'RJI', base_voucher_type: 'Rejections In', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'RJI-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-rejections-out', {
    name: 'Rejections Out', abbreviation: 'RJO', base_voucher_type: 'Rejections Out', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'RJO-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-stock-journal', {
    name: 'Stock Journal', abbreviation: 'SJ', base_voucher_type: 'Stock Journal', family: 'Inventory',
    is_active: true, activation_type: 'active',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'SJ-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-manufacturing-journal', {
    name: 'Manufacturing Journal', abbreviation: 'MJ', base_voucher_type: 'Manufacturing Journal', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: true, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'MJ-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-stock-transfer', {
    name: 'Stock Transfer', abbreviation: 'ST', base_voucher_type: 'Stock Transfer', family: 'Inventory',
    is_active: true, activation_type: 'active',
    accounting_impact: false, inventory_impact: true,   // stock moves between godowns; no GL hit
    use_effective_date: true,                            // in_transit → received uses effective date
    allow_zero_value: true,
    numbering_prefix: 'ST-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [
      validationRule(false),   // party not required — department is
      { id: 'rule-st-dept', rule_type: 'validation',
        label: 'Require dispatch and receive department',
        is_active: true, sequence: 2,
        config: { require_party: false, require_narration: false, block_future_date: false, require_cost_centre: false } },
    ],
  }),
  seed('vt-physical-stock', {
    name: 'Physical Stock', abbreviation: 'PSV', base_voucher_type: 'Physical Stock', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'PSV-', numbering_width: 4, current_sequence: 1,
  }),
  // Sprint T-Phase-1.1.1p-v2 · Sample / Demo Outward voucher types.
  // Phase 1: zero-touch. Phase 2 books expense for non-refundable samples.
  // Reuses 'Material Out' base type (D-128 — no edits to voucher-type.ts).
  seed('vt-sample-outward', {
    name: 'Sample Outward', abbreviation: 'SOM', base_voucher_type: 'Material Out', family: 'Inventory',
    is_active: true, activation_type: 'active',
    accounting_impact: false,   // Phase 2 books expense if non-refundable
    inventory_impact: true,     // stock moves to "Samples & Demos - Out with 3rd Party" godown
    allow_zero_value: false,
    numbering_prefix: 'SOM-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-demo-outward', {
    name: 'Demo Outward', abbreviation: 'DOM', base_voucher_type: 'Material Out', family: 'Inventory',
    is_active: true, activation_type: 'active',
    accounting_impact: false,
    inventory_impact: true,
    allow_zero_value: false,
    numbering_prefix: 'DOM-', numbering_width: 4, current_sequence: 1,
  }),
  // ── ORDER FAMILY (Inactive/On-use) ──────────────────────────────────────────
  seed('vt-sales-order', {
    name: 'Sales Order', abbreviation: 'SO', base_voucher_type: 'Sales Order', family: 'Order',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: false,
    allow_line_narration: false,
    numbering_prefix: 'SO-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-purchase-order', {
    name: 'Purchase Order', abbreviation: 'PO', base_voucher_type: 'Purchase Order', family: 'Order',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: false,
    allow_line_narration: false,
    numbering_prefix: 'PO-', numbering_width: 4, current_sequence: 1,
  }),
  // ── JOB WORK FAMILY (Feature-based) ─────────────────────────────────────────
  seed('vt-jw-in', {
    name: 'Job Work In Order', abbreviation: 'JWIO', base_voucher_type: 'Job Work In Order', family: 'Job Work',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: false,
    numbering_prefix: 'JWIO-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-jw-out', {
    name: 'Job Work Out Order', abbreviation: 'JWOO', base_voucher_type: 'Job Work Out Order', family: 'Job Work',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: false,
    numbering_prefix: 'JWOO-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-material-in', {
    name: 'Material In', abbreviation: 'MTI', base_voucher_type: 'Material In', family: 'Job Work',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: true,
    numbering_prefix: 'MTI-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-material-out', {
    name: 'Material Out', abbreviation: 'MTO', base_voucher_type: 'Material Out', family: 'Job Work',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: true,
    numbering_prefix: 'MTO-', numbering_width: 4, current_sequence: 1,
  }),
  // ── PAYROLL FAMILY (Feature-based) ──────────────────────────────────────────
  seed('vt-attendance', {
    name: 'Attendance', abbreviation: 'ATT', base_voucher_type: 'Attendance', family: 'Payroll',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: false, inventory_impact: false,
    numbering_prefix: 'ATT-', numbering_width: 4, current_sequence: 1,
  }),
  seed('vt-payroll', {
    name: 'Payroll', abbreviation: 'PAY', base_voucher_type: 'Payroll', family: 'Payroll',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'PAY-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [
      { id: 'rule-pay', rule_type: 'auto_post', label: 'Post salary to payable ledger', is_active: true, sequence: 1,
        config: { debit_ledger_code: 'SALARY_EXP', debit_ledger_name: 'Salary Expense', credit_ledger_code: 'SALP', credit_ledger_name: 'Salary Payable', amount_mode: 'full' } },
    ],
  }),
  // ── PROJECT BILLING FAMILY (Feature-based · activates when ProjX card enabled per entity) ─────
  // Note: family 'Accounting' + base 'Sales'/'Receipt' used to honor D-128 byte-identical schemas.
  // Logical family identity is encoded via id-prefix + name + abbreviation; UI can group by abbreviation.
  seed('vt-project-invoice', {
    name: 'Project Invoice', abbreviation: 'PINV',
    base_voucher_type: 'Sales', family: 'Accounting',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'PINV-', numbering_width: 4, current_sequence: 1,
    print_after_save: true, print_title: 'Project Invoice',
    behaviour_rules: [
      validationRule(true),
      taxRule('auto_detect'),
      settlementRule(),
    ],
  }),
  seed('vt-project-advance-receipt', {
    name: 'Project Advance Receipt', abbreviation: 'PADV',
    base_voucher_type: 'Receipt', family: 'Accounting',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'PADV-', numbering_width: 4, current_sequence: 1,
    print_after_save: false, print_title: 'Project Advance Receipt',
    behaviour_rules: [
      validationRule(true),
      taxRule('auto_detect'),
    ],
  }),
  seed('vt-retention-settlement', {
    name: 'Retention Settlement', abbreviation: 'RETN',
    base_voucher_type: 'Receipt', family: 'Accounting',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'RETN-', numbering_width: 4, current_sequence: 1,
    print_after_save: false, print_title: 'Retention Settlement',
    behaviour_rules: [
      validationRule(true),
    ],
  }),
  // ── CONSUMPTION FAMILY (Feature-based · Sprint T-Phase-1.2.2 — The MOAT sprint) ───────
  // CE = Consumption Entry. Tags material consumption to a Job/Project/Overhead/Site so that
  // departmental accountability becomes possible (the gap no Indian ERP fills today).
  // Base type 'Stock Journal' so Phase 2 GL posting (Stock A/c Cr · WIP/Cost Centre Dr) is trivial.
  // accounting_impact: true — consumption hits P&L via cost-centre / overhead ledger.
  // Activation: feature_based — flipped active by entity-setup-service when InventoryHub is provisioned.
  seed('vt-consumption-entry', {
    name: 'Consumption Entry', abbreviation: 'CE',
    base_voucher_type: 'Stock Journal', family: 'Inventory',
    is_active: false, activation_type: 'feature_based',
    accounting_impact: true,        // consumption hits P&L (Phase 2 wiring)
    inventory_impact: true,         // stock decrements
    allow_zero_value: false,
    numbering_prefix: 'CE-', numbering_width: 4, current_sequence: 1,
    behaviour_rules: [
      validationRule(false),
      { id: 'rule-ce-mode', rule_type: 'validation',
        label: 'Require consumption mode (Job · Overhead · Site)',
        is_active: true, sequence: 2,
        config: { require_party: false, require_narration: false, block_future_date: false, require_cost_centre: true } },
    ],
  }),
];
