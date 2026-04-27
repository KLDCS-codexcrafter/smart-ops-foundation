/**
 * @file     smart-ap.ts
 * @purpose  Smart AP schemas — Bulk Pay batches · Maker-Checker · Auto-Pay rules ·
 *           Cash-Flow projection · Payment forecast · 12-Bank file format spec.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @phase    Phase 1 client-side · localStorage · Phase 2 swap to backend with same join contract.
 * @whom     bulk-pay-engine · auto-pay-engine · cash-flow-engine · bank-file-engine ·
 *           SmartAPHub · BulkPayBuilder · AutoPayRulesEditor · CashFlowDashboard
 * @depends  payment-requisition (B.4 · FK target) · voucher (B.0 unchanged)
 *
 * Per founder lock Q-FF (a) Universal coverage (12 banks · 5 industry-first features).
 * Per Q-HH (a) sophisticated approval / RBAC / notifications DEFERRED — Phase 1 ships
 *   soft separation-of-duties via `maker_user_id !== checker_user_id` field check.
 *
 * [DEFERRED · Support & Back Office] Sophisticated approval workflow on batches ·
 *   email/SMS/WhatsApp notifications on batch status changes · hard RBAC permission
 *   gates · delegation/escalation/reminders. See:
 *   /Future_Task_Register_Support_BackOffice.md · Capabilities 1, 2, 3.
 *
 * [DEFERRED · Phase 2 backend] Actual bank REST API integration · backend cron for
 *   auto-pay scheduling · See:
 *   /Future_Task_Register_Support_BackOffice.md · Capabilities 7, 8.
 */

// ─────────────────────────────────────────────────────────────────────
// Bulk Pay · Maker-Checker
// ─────────────────────────────────────────────────────────────────────

/** State machine for a BulkPaymentBatch. */
export type BulkBatchStatus =
  | 'draft'
  | 'maker_signed'
  | 'checker_approved'
  | 'executed'
  | 'failed_during_execution'
  | 'rejected_at_maker'
  | 'rejected_at_checker';

/** Single approval action on a BulkPaymentBatch · audit trail entry. */
export interface BatchApprovalEntry {
  level: 'maker' | 'checker' | 'system';
  user_id: string;
  user_name: string;
  action: 'create' | 'maker_sign' | 'checker_approve' | 'execute' | 'reject';
  comment: string;
  timestamp: string;
}

/** Per-requisition execution result captured during executeBatch. */
export interface BatchExecutionResult {
  requisition_id: string;
  ok: boolean;
  voucher_id?: string;
  voucher_no?: string;
  error?: string;
}

/** Bank file format · used by BulkPaymentBatch + bank-file-engine. */
export type BankFileFormat = 'NEFT' | 'RTGS' | 'IMPS';

/** 12 supported Indian bank codes · drives bank-format-specs.ts. */
export type BankCode =
  | 'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'KOTAK' | 'YES'
  | 'INDUSIND' | 'FEDERAL' | 'RBL' | 'BOB' | 'PNB' | 'CANARA';

/** Bulk payment batch · groups N approved PaymentRequisitions. */
export interface BulkPaymentBatch {
  id: string;
  entity_id: string;
  batch_no: string;
  created_by: string;
  created_by_name: string;
  requisition_ids: string[];          // FK · approved B.4 PaymentRequisition.id
  total_amount: number;
  count: number;
  status: BulkBatchStatus;
  maker_user_id?: string;
  maker_user_name?: string;
  maker_signed_at?: string;
  checker_user_id?: string;
  checker_user_name?: string;
  checker_approved_at?: string;
  approval_chain: BatchApprovalEntry[];
  individual_results: BatchExecutionResult[];
  target_bank_code?: BankCode;
  file_format?: BankFileFormat;
  source_bank_ledger_id?: string;     // payer's bank · feeds payment-engine
  source_bank_ledger_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────
// Auto-Pay Rules
// ─────────────────────────────────────────────────────────────────────

export type AutoPayTriggerType = 'recurring' | 'threshold' | 'on_invoice_post';

export interface RecurringSchedule {
  cadence: 'monthly' | 'weekly' | 'daily';
  day_of_month?: number;             // 1..28
  day_of_week?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface AutoPayRule {
  id: string;
  entity_id: string;
  name: string;
  enabled: boolean;
  trigger_type: AutoPayTriggerType;
  recurring_schedule?: RecurringSchedule;
  threshold_amount?: number;         // auto-pay if requisition <= this
  // FK to a PaymentRequisition acting as template (B.4 · DO NOT MODIFY)
  payment_template_id?: string;
  payment_template_label?: string;
  vendor_id?: string;                // optional · scopes threshold trigger
  vendor_name?: string;
  last_executed_at?: string;
  next_run_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Result of evaluateRulesNow · rule + reason it is ready to fire. */
export interface AutoPayCandidate {
  rule: AutoPayRule;
  reason: string;
  matched_requisition_id?: string;   // for threshold trigger
}

// ─────────────────────────────────────────────────────────────────────
// Cash-Flow Projection · Payment Forecast
// ─────────────────────────────────────────────────────────────────────

export interface BankBalanceRow {
  ledger_id: string;
  ledger_name: string;
  balance: number;
  ifsc?: string;
  account_no?: string;
}

export interface CashFlowProjection {
  date: string;                      // YYYY-MM-DD
  opening_balance: number;
  receivables: number;               // expected inflow
  committed_payments: number;        // approved reqs + auto-pay due
  suggested_payments: number;        // optimizer-recommended
  closing_balance: number;
  is_negative_warning: boolean;
  is_msme_breach_week: boolean;
}

export interface PaymentTimingSuggestion {
  requisition_id: string;
  vendor_name: string;
  amount: number;
  suggested_date: string;
  reason: string;
  msme_priority: boolean;
}

export interface PaymentForecastWeek {
  week_start: string;                // YYYY-MM-DD (Mon)
  week_end: string;                  // YYYY-MM-DD (Sun)
  committed: number;
  auto_pay_predicted: number;
  receivables: number;
  net: number;                       // receivables - committed - auto_pay_predicted
  is_negative: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Bank File Format Spec (12 banks)
// ─────────────────────────────────────────────────────────────────────

export type BankFileDelimiter = ',' | '|' | '\t';

/** Logical column keys mapped to per-bank header labels. */
export type BankFileColumnKey =
  | 'beneficiary_name'
  | 'beneficiary_account_no'
  | 'beneficiary_ifsc'
  | 'amount'
  | 'remitter_name'
  | 'remitter_account_no'
  | 'remarks'
  | 'transaction_type'
  | 'value_date'
  | 'reference_no';

export interface BankFileSpec {
  bank_code: BankCode;
  bank_name: string;
  supported_formats: BankFileFormat[];
  delimiter: BankFileDelimiter;
  header_required: boolean;
  /** Ordered logical columns · column_mappings provides per-bank header label. */
  column_order: BankFileColumnKey[];
  column_mappings: Partial<Record<BankFileColumnKey, string>>;
  /** Optional file extension override · default csv. */
  file_extension?: 'csv' | 'txt';
}

export interface GeneratedBankFile {
  filename: string;
  content: string;
  mimeType: string;
  row_count: number;
  total_amount: number;
}

export interface BankFileValidationError {
  requisition_id: string;
  vendor_name: string;
  field: 'bankAccountNo' | 'bankIfsc' | 'bankAccountHolder' | 'amount';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────
// localStorage keys (single key per entity per concept)
// ─────────────────────────────────────────────────────────────────────

export const smartApBatchesKey = (entityCode: string): string =>
  `erp_smart_ap_batches_${entityCode}`;

export const autoPayRulesKey = (entityCode: string): string =>
  `erp_smart_ap_auto_pay_rules_${entityCode}`;

// ─────────────────────────────────────────────────────────────────────
// Display helpers (UI tone tokens)
// ─────────────────────────────────────────────────────────────────────

export const BULK_BATCH_STATUS_COLORS: Record<BulkBatchStatus, string> = {
  draft:                    'bg-slate-500/10 text-slate-600 border-slate-400/30',
  maker_signed:             'bg-blue-500/10 text-blue-700 border-blue-500/30',
  checker_approved:         'bg-violet-500/10 text-violet-700 border-violet-500/30',
  executed:                 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  failed_during_execution:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected_at_maker:        'bg-red-500/10 text-red-700 border-red-500/30',
  rejected_at_checker:      'bg-red-500/10 text-red-700 border-red-500/30',
};

export const BULK_BATCH_STATUS_LABEL: Record<BulkBatchStatus, string> = {
  draft:                    'Draft',
  maker_signed:             'Maker Signed',
  checker_approved:         'Checker Approved',
  executed:                 'Executed',
  failed_during_execution:  'Failed (partial)',
  rejected_at_maker:        'Rejected · Maker',
  rejected_at_checker:      'Rejected · Checker',
};
