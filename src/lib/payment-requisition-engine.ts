/**
 * @file     payment-requisition-engine.ts
 * @purpose  Universal Payment Requisition orchestrator · state machine ·
 *           hardcoded 2-level routing (Department-head → Accounts) ·
 *           audit trail · creates Payment voucher via existing payment-engine
 *           on Accounts approval.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.4-Requisition-Universal (Group B Sprint B.4)
 * @sprint   T-T8.4-Requisition-Universal
 * @phase    Phase 1 · localStorage · same engine API surface for Phase 2 backend swap.
 * @whom     PaymentRequisitionEntry.tsx · RequisitionInbox.tsx · RequisitionHistory.tsx
 * @depends  payment-requisition (types) · payment-engine (processVendorPayment) ·
 *           auth-helpers (getCurrentUser).
 *
 * IMPORTANT — Per founder lock Q-HH (a):
 *   This engine uses HARDCODED ROUTING_RULES per payment type · NO configurable
 *   workflow master · NO RBAC permission gates · NO email/SMS/WhatsApp ·
 *   NO delegation · NO escalation · NO threshold-based dynamic routing.
 *
 * [DEFERRED · Support & Back Office] Sophisticated approval workflow engine ·
 *   configurable routing per payment type · N-level chains · threshold-based
 *   routing · dynamic approver from RBAC · delegation · escalation ·
 *   email/SMS/WhatsApp notifications · approval analytics dashboard.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capabilities 1, 2, 3
 */

import type {
  PaymentRequestType, PaymentRequisition, RequisitionStatus, ApprovalEntry,
} from '@/types/payment-requisition';
import { paymentRequisitionsKey, PAYMENT_TYPE_LABELS } from '@/types/payment-requisition';
import { processVendorPayment, type VendorPaymentResult } from '@/lib/payment-engine';
import { getCurrentUser } from '@/lib/auth-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED ROUTING RULES · per Q-HH (a) · DEFERRED to Support & Back Office.
// ─────────────────────────────────────────────────────────────────────────────

export type ApproverRole = 'department_head' | 'accounts' | 'founder';

export interface RoutingRule {
  levels: 0 | 1 | 2;
  level1?: ApproverRole;
  level2?: ApproverRole;
  autoApprove?: boolean;
}

export const ROUTING_RULES: Record<PaymentRequestType, RoutingRule> = {
  // 2-level approval (Department-head → Accounts) — most common
  vendor_invoice:               { levels: 2, level1: 'department_head', level2: 'accounts' },
  vendor_advance:               { levels: 2, level1: 'department_head', level2: 'accounts' },
  employee_reimbursement:       { levels: 2, level1: 'department_head', level2: 'accounts' },
  employee_advance:             { levels: 2, level1: 'department_head', level2: 'accounts' },
  employee_loan_disbursement:   { levels: 2, level1: 'department_head', level2: 'accounts' },
  loan_emi:                     { levels: 2, level1: 'department_head', level2: 'accounts' },
  customer_refund:              { levels: 2, level1: 'department_head', level2: 'accounts' },
  petty_cash_refill:            { levels: 2, level1: 'department_head', level2: 'accounts' },
  capital_expenditure:          { levels: 2, level1: 'department_head', level2: 'accounts' },
  professional_fees:            { levels: 2, level1: 'department_head', level2: 'accounts' },
  subscription_utility:         { levels: 2, level1: 'department_head', level2: 'accounts' },
  inter_company_transfer:       { levels: 2, level1: 'department_head', level2: 'accounts' },
  donation_csr:                 { levels: 2, level1: 'department_head', level2: 'accounts' },
  other_adhoc:                  { levels: 2, level1: 'department_head', level2: 'accounts' },

  // Auto-approved (statutory · no human approval needed · queued for payment)
  statutory_tds:                { levels: 0, autoApprove: true },
  statutory_gst:                { levels: 0, autoApprove: true },
  statutory_pf:                 { levels: 0, autoApprove: true },
  statutory_esi:                { levels: 0, autoApprove: true },
  statutory_pt:                 { levels: 0, autoApprove: true },

  // Founder approval mandatory (1-level only · founder is the approver)
  director_remuneration:        { levels: 1, level1: 'founder' },
  director_drawings:            { levels: 1, level1: 'founder' },
};

export function getRoutingForType(type: PaymentRequestType): RoutingRule {
  return ROUTING_RULES[type];
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function readAll(entityCode: string): PaymentRequisition[] {
  try {
    // [JWT] GET /api/payment-requisitions?entity={entityCode}
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, items: PaymentRequisition[]): void {
  // [JWT] PUT /api/payment-requisitions/bulk
  localStorage.setItem(paymentRequisitionsKey(entityCode), JSON.stringify(items));
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeEntry(
  level: number,
  role: ApprovalEntry['approver_role'],
  action: ApprovalEntry['action'],
  comment: string,
): ApprovalEntry {
  const u = getCurrentUser();
  return {
    level,
    approver_id: role === 'system' ? 'system' : u.id,
    approver_name: role === 'system' ? 'System (auto)' : u.displayName,
    approver_role: role,
    action,
    comment,
    timestamp: nowIso(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export function listRequisitions(entityCode: string): PaymentRequisition[] {
  return readAll(entityCode);
}

export function getRequisition(entityCode: string, reqId: string): PaymentRequisition | null {
  return readAll(entityCode).find(r => r.id === reqId) ?? null;
}

/** Returns queue for the given approver role · used by RequisitionInbox. */
export function getRequisitionsForApprover(
  entityCode: string,
  role: ApproverRole,
): PaymentRequisition[] {
  const all = readAll(entityCode);
  if (role === 'department_head') {
    return all.filter(r => r.status === 'pending_dept_head');
  }
  if (role === 'accounts') {
    return all.filter(r => r.status === 'pending_accounts');
  }
  if (role === 'founder') {
    // director_* types route to founder at level 1 → status pending_dept_head with rule.level1==='founder'
    return all.filter(r =>
      r.status === 'pending_dept_head' &&
      ROUTING_RULES[r.request_type].level1 === 'founder'
    );
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<RequisitionStatus, RequisitionStatus[]> = {
  draft:              ['pending_dept_head', 'approved'],
  pending_dept_head:  ['pending_accounts', 'approved', 'rejected', 'on_hold'],
  pending_accounts:   ['approved', 'rejected', 'on_hold'],
  approved:           ['paid'],
  paid:               [],
  rejected:           [],
  on_hold:            ['pending_dept_head', 'pending_accounts'],
};

function assertTransition(from: RequisitionStatus, to: RequisitionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`[payment-requisition-engine] Invalid transition: ${from} → ${to}`);
  }
}

function persist(entityCode: string, req: PaymentRequisition): void {
  const all = readAll(entityCode);
  const idx = all.findIndex(r => r.id === req.id);
  req.updated_at = nowIso();
  if (idx === -1) all.push(req);
  else all[idx] = req;
  writeAll(entityCode, all);
}

// ─────────────────────────────────────────────────────────────────────────────
// createRequisition · entry point for cross-module buttons + entry screen
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRequisitionInput {
  entityCode: string;
  request_type: PaymentRequestType;
  department_id: string;
  department_name: string;
  division_id?: string;
  amount: number;
  purpose: string;
  attachments?: string[];
  notes?: string;
  cost_center_suggestion?: string;
  gl_account_suggestion?: string;
  vendor_id?: string;
  vendor_name?: string;
  employee_id?: string;
  employee_name?: string;
  linked_purchase_invoice_id?: string;
  linked_purchase_invoice_no?: string;
  linked_expense_claim_id?: string;
  linked_loan_application_id?: string;
  linked_salary_advance_id?: string;
  linked_emi_schedule_id?: string;
  linked_cwip_entry_id?: string;
  linked_challan_id?: string;
  linked_receipt_voucher_id?: string;
  linked_subsidiary_entity_id?: string;
}

export interface CreateRequisitionResult {
  ok: boolean;
  requisitionId?: string;
  status?: RequisitionStatus;
  voucherNo?: string;
  errors?: string[];
}

export function createRequisition(input: CreateRequisitionInput): CreateRequisitionResult {
  const errors: string[] = [];
  if (!input.entityCode) errors.push('entityCode required');
  if (!input.request_type) errors.push('request_type required');
  if (!input.amount || input.amount <= 0) errors.push('amount must be > 0');
  if (!input.purpose?.trim()) errors.push('purpose required');
  if (errors.length) return { ok: false, errors };

  const u = getCurrentUser();
  const rule = ROUTING_RULES[input.request_type];

  const req: PaymentRequisition = {
    id: newId(),
    entity_id: input.entityCode,
    request_type: input.request_type,
    requested_by: u.id,
    requested_by_name: u.displayName,
    department_id: input.department_id,
    department_name: input.department_name,
    division_id: input.division_id,
    amount: input.amount,
    currency: 'INR',
    purpose: input.purpose,
    attachments: input.attachments ?? [],
    cost_center_suggestion: input.cost_center_suggestion,
    gl_account_suggestion: input.gl_account_suggestion,
    notes: input.notes,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    employee_id: input.employee_id,
    employee_name: input.employee_name,
    linked_purchase_invoice_id: input.linked_purchase_invoice_id,
    linked_purchase_invoice_no: input.linked_purchase_invoice_no,
    linked_expense_claim_id: input.linked_expense_claim_id,
    linked_loan_application_id: input.linked_loan_application_id,
    linked_salary_advance_id: input.linked_salary_advance_id,
    linked_emi_schedule_id: input.linked_emi_schedule_id,
    linked_cwip_entry_id: input.linked_cwip_entry_id,
    linked_challan_id: input.linked_challan_id,
    linked_receipt_voucher_id: input.linked_receipt_voucher_id,
    linked_subsidiary_entity_id: input.linked_subsidiary_entity_id,
    status: 'draft',
    approval_chain: [],
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  // Initial submit entry · always recorded
  req.approval_chain.push(makeEntry(0, 'system', 'submit', `Requisition created · ${PAYMENT_TYPE_LABELS[input.request_type]}`));

  // Auto-approved (statutory) · transition draft → approved → paid via voucher
  if (rule.autoApprove) {
    assertTransition(req.status, 'approved');
    req.status = 'approved';
    req.approval_chain.push(makeEntry(0, 'system', 'approve', 'Auto-approved · statutory payment per hardcoded routing'));
    persist(input.entityCode, req);
    // Try to create the voucher immediately (best-effort · stays approved if it fails)
    tryCreatePaymentVoucher(input.entityCode, req.id);
    const final = getRequisition(input.entityCode, req.id);
    return { ok: true, requisitionId: req.id, status: final?.status ?? req.status, voucherNo: final?.linked_payment_voucher_no };
  }

  // Human approval path · move to pending state for level 1
  assertTransition(req.status, 'pending_dept_head');
  req.status = 'pending_dept_head';
  req.approval_chain.push(makeEntry(1, 'system', 'submit', `Submitted for ${rule.level1} approval`));
  persist(input.entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status };
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals
// ─────────────────────────────────────────────────────────────────────────────

export function approveDeptLevel(entityCode: string, reqId: string, comment: string): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  const rule = ROUTING_RULES[req.request_type];

  // 1-level routing (founder) ends here → goes to pending_accounts skipped → approved
  if (rule.levels === 1) {
    assertTransition(req.status, 'approved');
    req.status = 'approved';
    req.approval_chain.push(makeEntry(1, rule.level1 ?? 'founder', 'approve', comment || 'Approved'));
    persist(entityCode, req);
    tryCreatePaymentVoucher(entityCode, req.id);
    const final = getRequisition(entityCode, req.id);
    return { ok: true, requisitionId: req.id, status: final?.status ?? req.status, voucherNo: final?.linked_payment_voucher_no };
  }

  // 2-level routing → move to pending_accounts
  assertTransition(req.status, 'pending_accounts');
  req.status = 'pending_accounts';
  req.approval_chain.push(makeEntry(1, rule.level1 ?? 'department_head', 'approve', comment || 'Approved by department head'));
  persist(entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status };
}

export function approveAccountsLevel(entityCode: string, reqId: string, comment: string): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  assertTransition(req.status, 'approved');
  req.status = 'approved';
  req.approval_chain.push(makeEntry(2, 'accounts', 'approve', comment || 'Approved by accounts'));
  persist(entityCode, req);
  tryCreatePaymentVoucher(entityCode, req.id);
  const final = getRequisition(entityCode, req.id);
  return { ok: true, requisitionId: req.id, status: final?.status ?? req.status, voucherNo: final?.linked_payment_voucher_no };
}

export function rejectRequisition(entityCode: string, reqId: string, reason: string): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  assertTransition(req.status, 'rejected');
  const fromLevel = req.status === 'pending_accounts' ? 2 : 1;
  const fromRole: ApprovalEntry['approver_role'] = req.status === 'pending_accounts' ? 'accounts'
    : (ROUTING_RULES[req.request_type].level1 === 'founder' ? 'founder' : 'department_head');
  req.status = 'rejected';
  req.approval_chain.push(makeEntry(fromLevel, fromRole, 'reject', reason || 'Rejected'));
  persist(entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status };
}

export function holdRequisition(entityCode: string, reqId: string, reason: string): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  if (req.status !== 'pending_dept_head' && req.status !== 'pending_accounts') {
    return { ok: false, errors: [`Cannot hold from status ${req.status}`] };
  }
  req.resume_to = req.status;
  const fromLevel = req.status === 'pending_accounts' ? 2 : 1;
  const fromRole: ApprovalEntry['approver_role'] = req.status === 'pending_accounts' ? 'accounts'
    : (ROUTING_RULES[req.request_type].level1 === 'founder' ? 'founder' : 'department_head');
  req.status = 'on_hold';
  req.approval_chain.push(makeEntry(fromLevel, fromRole, 'hold', reason || 'Put on hold'));
  persist(entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status };
}

export function resumeRequisition(entityCode: string, reqId: string): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  if (req.status !== 'on_hold') return { ok: false, errors: ['Not on hold'] };
  const target: RequisitionStatus = req.resume_to ?? 'pending_dept_head';
  assertTransition(req.status, target);
  req.status = target;
  req.resume_to = undefined;
  const lvl = target === 'pending_accounts' ? 2 : 1;
  req.approval_chain.push(makeEntry(lvl, 'system', 'resume', `Resumed to ${target}`));
  persist(entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status };
}

// ─────────────────────────────────────────────────────────────────────────────
// Voucher creation (called on approval) · delegates to existing payment-engine
// ─────────────────────────────────────────────────────────────────────────────

function tryCreatePaymentVoucher(entityCode: string, reqId: string): void {
  const req = getRequisition(entityCode, reqId);
  if (!req || req.status !== 'approved') return;

  // Phase 1 placeholder bank ledger · Phase 2 will surface picker in Accounts inbox UI.
  // [JWT] GET /api/ledgers/bank-default
  const today = new Date().toISOString().slice(0, 10);

  const result: VendorPaymentResult = processVendorPayment({
    entityCode,
    vendorId: req.vendor_id ?? `payee-${req.id}`,
    vendorName: req.vendor_name ?? req.employee_name ?? PAYMENT_TYPE_LABELS[req.request_type],
    bankCashLedgerId: 'bank-default',
    bankCashLedgerName: 'Bank (default)',
    amount: req.amount,
    date: today,
    paymentMode: 'bank',
    instrumentType: 'NEFT',
    instrumentRef: '',
    narration: `Auto-paid via requisition ${req.id} (${PAYMENT_TYPE_LABELS[req.request_type]}): ${req.purpose}`,
    billReferences: [],
    applyTDS: false,
    deducteeType: 'company',
    departmentId: req.department_id,
    divisionId: req.division_id,
  });

  if (result.ok && result.voucherId && result.voucherNo) {
    linkRequisitionToVoucher(entityCode, reqId, result.voucherId, result.voucherNo);
  } else {
    // Voucher creation failed · stay 'approved' · operator can retry from inbox.
    console.warn('[payment-requisition-engine] Voucher creation failed for', reqId, result.errors);
  }
}

export function linkRequisitionToVoucher(
  entityCode: string,
  reqId: string,
  voucherId: string,
  voucherNo: string,
): CreateRequisitionResult {
  const req = getRequisition(entityCode, reqId);
  if (!req) return { ok: false, errors: ['Requisition not found'] };
  if (req.status !== 'approved') return { ok: false, errors: [`Cannot mark paid from ${req.status}`] };
  assertTransition(req.status, 'paid');
  req.status = 'paid';
  req.linked_payment_voucher_id = voucherId;
  req.linked_payment_voucher_no = voucherNo;
  req.approval_chain.push(makeEntry(3, 'system', 'paid', `Payment voucher ${voucherNo} created`));
  persist(entityCode, req);
  return { ok: true, requisitionId: req.id, status: req.status, voucherNo };
}
