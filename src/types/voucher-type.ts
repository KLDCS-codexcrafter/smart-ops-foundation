/**
 * voucher-type.ts — VoucherType data model
 * Based on: Tally_VoucherType_Mapping_ERP_Claude_Ready.xlsx
 * Excel SSOT: Tally_Default_Vouchers (24 types) + VoucherType_Field_Map (18 fields)
 * Claude_Ready_Handover normalized model + Behavior_Logic_Notes rules
 */

export type VoucherBaseType =
  | 'Contra' | 'Payment' | 'Receipt' | 'Journal'
  | 'Sales' | 'Purchase' | 'Debit Note' | 'Credit Note'
  | 'Memorandum' | 'Reversing Journal'
  | 'Delivery Note' | 'Receipt Note'
  | 'Rejections In' | 'Rejections Out'
  | 'Stock Journal' | 'Stock Transfer' | 'Physical Stock' | 'Manufacturing Journal'
  | 'Sales Order' | 'Purchase Order'
  | 'Job Work In Order' | 'Job Work Out Order'
  | 'Material In' | 'Material Out'
  | 'Attendance' | 'Payroll'
  | 'Capital Purchase' | 'Put To Use' | 'Depreciation'
  | 'Asset Transfer' | 'Asset Verification'
  | 'Asset Write Off' | 'Capital Sale'
  | 'Custodian Change' | 'Expense Booking';

export type VoucherFamily =
  | 'Accounting'
  | 'Non-Accounting'
  | 'Inventory'
  | 'Order'
  | 'Job Work'
  | 'Payroll';

export type NumberingMethod =
  | 'automatic'
  | 'automatic_manual_override'
  | 'manual'
  | 'multi_user_auto'
  | 'none';

export type ActivationType = 'active' | 'on_use' | 'feature_based';

export type BehaviourRuleType =
  | 'auto_post'
  | 'validation'
  | 'settlement'
  | 'tax_trigger'
  | 'approval_gate'
  | 'auto_reversal'
  | 'narration_template'
  | 'forex_capture'      // capture exchange rate + dual amounts at transaction time
  | 'forex_settlement';  // calculate realized gain/loss at settlement

export interface AutoPostConfig {
  debit_ledger_code: string;
  debit_ledger_name: string;
  credit_ledger_code: string;
  credit_ledger_name: string;
  amount_mode: 'full' | 'percentage' | 'fixed';
  percentage?: number;
  fixed_amount?: number;
  condition?: string;
}

export interface ValidationConfig {
  require_party: boolean;
  require_narration: boolean;
  min_amount?: number;
  max_amount?: number;
  block_future_date: boolean;
  require_cost_centre: boolean;
}

export interface SettlementConfig {
  auto_settle: boolean;
  settle_against: 'invoices' | 'bills' | 'advances' | 'any';
  method: 'fifo' | 'lifo' | 'manual';
  show_bill_by_bill: boolean;
}

export interface TaxTriggerConfig {
  apply_gst: boolean;
  tax_type: 'igst_only' | 'cgst_sgst' | 'auto_detect';
  tds_applicable: boolean;
  tcs_applicable: boolean;
}

export interface ApprovalGateConfig {
  requires_approval: boolean;
  threshold_amount: number;
  approver_role: string;
}

export interface AutoReversalConfig {
  reversal_on: 'next_day' | 'period_start' | 'specific_date';
  reversal_date?: string;
  reversal_narration: string;
}

export interface NarrationTemplateConfig {
  template: string;
  variables: string[];
}

export interface ForexCaptureConfig {
  /**
   * Which rate type to auto-fill from Currency Master on the voucher date.
   * selling = export (Sales Invoice, Receipt — you receive foreign currency)
   * buying  = import (Purchase Invoice, Payment — you pay in foreign currency)
   * standard = reference only (Journal, FXADJ)
   */
  default_rate_type: 'selling' | 'buying' | 'standard';
  /** Allow accountant to override the pre-filled rate at transaction entry */
  allow_rate_override: boolean;
  /** Block save if currency ≠ base and no rate found for the transaction date */
  require_rate_if_foreign: boolean;
  /**
   * Store dual amounts on every GL line for this voucher:
   *   debit_base / credit_base  — in company base currency (e.g. ₹)
   *   debit_foreign / credit_foreign — in transaction currency (e.g. $)
   *   exchange_rate — the rate used at posting time
   */
  store_dual_amounts: boolean;
}

export interface ForexSettlementConfig {
  /**
   * When this voucher settles a prior transaction (Receipt vs Invoice, Payment vs Bill):
   * calculate the difference between the booking rate and the settlement rate
   * and auto-post to forex gain/loss ledgers.
   */
  calculate_realized_gain_loss: boolean;
  /** Ledger code for realized forex gain (default: FXGAIN-SYS) */
  gain_ledger_code: string;
  /** Ledger code for realized forex loss (default: FXLOSS-SYS) */
  loss_ledger_code: string;
  /**
   * For period-end revaluation (unrealized gain/loss — AS-11 / IAS-21):
   * auto-create a reversal entry at the start of the next period.
   * Used on FXADJ (Forex Adjustment Journal) only.
   */
  auto_reversal_on_next_period: boolean;
}

export interface BehaviourRule {
  id: string;
  rule_type: BehaviourRuleType;
  label: string;
  is_active: boolean;
  sequence: number;
  config: AutoPostConfig | ValidationConfig | SettlementConfig | TaxTriggerConfig | ApprovalGateConfig | AutoReversalConfig | NarrationTemplateConfig | ForexCaptureConfig | ForexSettlementConfig;
}

export interface VoucherType {
  id: string;
  // Identity
  name: string;
  abbreviation: string;
  base_voucher_type: VoucherBaseType;
  family: VoucherFamily;
  // Activation
  is_active: boolean;
  is_system: boolean;
  activation_type: ActivationType;
  // Behaviour flags
  accounting_impact: boolean;
  inventory_impact: boolean;
  is_optional_default: boolean;
  use_effective_date: boolean;
  allow_zero_value: boolean;
  allow_narration: boolean;
  allow_line_narration: boolean;
  // Numbering
  numbering_method: NumberingMethod;
  use_custom_series: boolean;           // toggle — OFF=auto prefix from abbr, ON=custom form below
  numbering_prefix: string;
  numbering_suffix: string;             // NEW — suffix text appended after number
  numbering_start: number;              // starting number for series
  numbering_width: number;
  numbering_prefill_zeros: boolean;     // pre-fill with zeros e.g. 0001 not 1
  prevent_duplicate_manual: boolean;    // for Manual method only — reject duplicate numbers
  insertion_deletion_behaviour: 'retain_original' | 'renumber'; // Tally: Retain vs Renumber
  show_unused_numbers: boolean;         // show gaps in transaction entry (retain_original only)
  current_sequence: number;
  // Embedded behaviour rules
  behaviour_rules: BehaviourRule[];
  // Print & declaration
  print_after_save: boolean;
  use_for_pos: boolean;
  print_title: string;
  default_bank_ledger_id: string | null;
  default_jurisdiction: string;
  declaration_text: string;
  // Metadata
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Constraint maps from VoucherType_Field_Map sheet ──────────────────────
// Line narration NOT supported for these 8 base types (Excel: VoucherType_Field_Map row 9)
export const NO_LINE_NARRATION_TYPES: VoucherBaseType[] = [
  'Delivery Note', 'Receipt Note', 'Sales Order', 'Purchase Order',
  'Physical Stock', 'Stock Journal', 'Rejections In', 'Rejections Out',
];

// Optional flag is ALWAYS true and cannot be changed for these 2 types
export const ALWAYS_OPTIONAL_TYPES: VoucherBaseType[] = ['Memorandum', 'Reversing Journal'];

// POS, Print Title, Default Bank — Sales base type ONLY
export const SALES_ONLY_FIELDS: VoucherBaseType[] = ['Sales'];

// Effective date ONLY meaningful for these
export const EFFECTIVE_DATE_RELEVANT: VoucherBaseType[] = ['Reversing Journal'];

// Family color map for UI
export const FAMILY_COLORS: Record<VoucherFamily, { border: string; bg: string; text: string; dot: string }> = {
  'Accounting':     { border: 'border-l-teal-500',   bg: 'bg-teal-500/8',    text: 'text-teal-600 dark:text-teal-400',   dot: 'bg-teal-500'   },
  'Non-Accounting': { border: 'border-l-slate-400',   bg: 'bg-slate-500/8',   text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400'  },
  'Inventory':      { border: 'border-l-amber-500',   bg: 'bg-amber-500/8',   text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500'  },
  'Order':          { border: 'border-l-blue-500',    bg: 'bg-blue-500/8',    text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500'   },
  'Job Work':       { border: 'border-l-purple-500',  bg: 'bg-purple-500/8',  text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500'},
  'Payroll':        { border: 'border-l-rose-500',    bg: 'bg-rose-500/8',    text: 'text-rose-600 dark:text-rose-400',   dot: 'bg-rose-500'   },
};
