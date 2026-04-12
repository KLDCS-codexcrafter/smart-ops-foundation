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
  numbering_method: 'automatic', numbering_prefix: '', numbering_width: 4, current_sequence: 1,
  behaviour_rules: [],
  print_after_save: false, use_for_pos: false, print_title: 'Sales Invoice',
  default_bank_ledger_id: null, default_jurisdiction: '', declaration_text: '',
  entity_id: null, created_at: now, updated_at: now,
  ...overrides,
});

const autoPostRule = (id: string, label: string, dr: string, cr: string): BehaviourRule => ({
  id, rule_type: 'auto_post', label, is_active: true, sequence: 1,
  config: { debit_ledger_code: dr, debit_ledger_name: dr, credit_ledger_code: cr, credit_ledger_name: cr, amount_mode: 'full' },
});

const settlementRule = (): BehaviourRule => ({
  id: 'rule-settle', rule_type: 'settlement', label: 'Auto-settle outstanding bills', is_active: true, sequence: 2,
  config: { auto_settle: true, settle_against: 'invoices', method: 'fifo', show_bill_by_bill: true },
});

const taxRule = (type: 'igst_only' | 'cgst_sgst' | 'auto_detect'): BehaviourRule => ({
  id: 'rule-tax', rule_type: 'tax_trigger', label: 'Apply GST calculation', is_active: true, sequence: 3,
  config: { apply_gst: true, tax_type: type, tds_applicable: false, tcs_applicable: false },
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
    behaviour_rules: [validationRule(true), settlementRule()],
  }),
  seed('vt-receipt', {
    name: 'Receipt', abbreviation: 'RC', base_voucher_type: 'Receipt', family: 'Accounting',
    is_active: true, activation_type: 'active',
    accounting_impact: true, inventory_impact: false,
    numbering_prefix: 'RC-', numbering_width: 4, current_sequence: 1,
    print_after_save: true,
    behaviour_rules: [validationRule(true), settlementRule()],
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
  seed('vt-physical-stock', {
    name: 'Physical Stock', abbreviation: 'PSV', base_voucher_type: 'Physical Stock', family: 'Inventory',
    is_active: false, activation_type: 'on_use',
    accounting_impact: false, inventory_impact: true,
    allow_line_narration: false,
    numbering_prefix: 'PSV-', numbering_width: 4, current_sequence: 1,
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
];
