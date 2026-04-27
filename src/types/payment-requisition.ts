/**
 * @file     payment-requisition.ts
 * @purpose  Universal Payment Requisition schema · 21 payment types · 2-level
 *           hardcoded approval state machine.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.4-Requisition-Universal (Group B Sprint B.4)
 * @sprint   T-T8.4-Requisition-Universal
 * @phase    Phase 1 client-side · localStorage · same join contract for Phase 2.
 * @whom     payment-requisition-engine.ts · PaymentRequisitionEntry.tsx ·
 *           RequisitionInbox.tsx · RequisitionHistory.tsx
 * @depends  org-structure (Department.head_email · Q-W a approver) ·
 *           employee-finance (linked LoanApplication / SalaryAdvance / ExpenseClaim) ·
 *           compliance (linked AdvanceEntry · ChallanRecord) ·
 *           voucher (final linked Payment voucher created via payment-engine).
 *
 * Locked per founder Q-FF (a) Universal · 21 payment types · cross-module integration.
 * Per Q-HH (a) sophisticated approval workflow · email/SMS/WhatsApp · RBAC · delegation
 *   all DEFERRED to Support & Back Office horizon.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capability 1, 2, 3.
 */

/** 21 payment request types · covers all founder-asked categories. */
export type PaymentRequestType =
  | 'vendor_invoice'              // Pay against booked Purchase Invoice
  | 'vendor_advance'              // Advance to vendor before invoice
  | 'employee_reimbursement'      // Reimburse expense claim
  | 'employee_advance'            // Travel/site advance
  | 'employee_loan_disbursement'  // Loan disbursal
  | 'statutory_tds'               // TDS challan payment
  | 'statutory_gst'               // GST payment
  | 'statutory_pf'                // PF ECR
  | 'statutory_esi'               // ESI
  | 'statutory_pt'                // Professional Tax
  | 'loan_emi'                    // EMI to bank/lender
  | 'director_remuneration'       // Director salary/sitting fee
  | 'director_drawings'           // Partner/proprietor drawings
  | 'customer_refund'             // Refund overpayment
  | 'petty_cash_refill'           // Petty cash refill
  | 'capital_expenditure'         // Capex purchase
  | 'professional_fees'           // CA/lawyer/consultant
  | 'subscription_utility'        // Recurring/utility/rent
  | 'inter_company_transfer'      // Inter-entity transfer
  | 'donation_csr'                // Donation/CSR
  | 'other_adhoc';                // Catchall

/** Status state machine. */
export type RequisitionStatus =
  | 'draft'
  | 'pending_dept_head'
  | 'pending_accounts'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'on_hold';

/** Single approval action entry (immutable post-write · audit trail). */
export interface ApprovalEntry {
  level: number;                  // 1 (Department-head) · 2 (Accounts) · etc.
  approver_id: string;
  approver_name: string;
  approver_role: 'department_head' | 'accounts' | 'founder' | 'system';
  action: 'submit' | 'approve' | 'reject' | 'hold' | 'resume' | 'paid';
  comment: string;
  timestamp: string;
}

/** Universal Payment Requisition record. */
export interface PaymentRequisition {
  id: string;
  entity_id: string;
  request_type: PaymentRequestType;

  // Requester context
  requested_by: string;
  requested_by_name: string;
  department_id: string;
  department_name: string;
  division_id?: string;

  // Common payment fields
  amount: number;
  currency?: string;              // default INR · multi-currency reserved Phase 2
  purpose: string;
  attachments: string[];          // doc URLs · placeholder Phase 1
  cost_center_suggestion?: string;
  gl_account_suggestion?: string;
  notes?: string;

  // Type-specific links (only one populated per request)
  linked_purchase_invoice_id?: string;
  linked_purchase_invoice_no?: string;
  linked_expense_claim_id?: string;
  linked_loan_application_id?: string;
  linked_salary_advance_id?: string;
  linked_emi_schedule_id?: string;
  linked_cwip_entry_id?: string;
  linked_challan_id?: string;
  linked_receipt_voucher_id?: string;     // for customer_refund (refers to original Receipt)
  linked_subsidiary_entity_id?: string;   // for inter_company_transfer

  // Vendor / payee context (for vendor types)
  vendor_id?: string;
  vendor_name?: string;
  // Employee context (for employee types)
  employee_id?: string;
  employee_name?: string;

  // Workflow state
  status: RequisitionStatus;
  approval_chain: ApprovalEntry[];

  // Resume helper (set when on_hold · used by resumeRequisition)
  resume_to?: 'pending_dept_head' | 'pending_accounts';

  // Final voucher link (set when status='paid')
  linked_payment_voucher_id?: string;
  linked_payment_voucher_no?: string;

  created_at: string;
  updated_at: string;
}

/** localStorage key for payment requisitions per entity. */
export const paymentRequisitionsKey = (entityCode: string): string =>
  `erp_payment_requisitions_${entityCode}`;

/** Display labels for payment types · used in PaymentRequisitionEntry type picker. */
export const PAYMENT_TYPE_LABELS: Record<PaymentRequestType, string> = {
  vendor_invoice: 'Vendor Invoice Payment',
  vendor_advance: 'Vendor Advance',
  employee_reimbursement: 'Employee Reimbursement',
  employee_advance: 'Employee Advance',
  employee_loan_disbursement: 'Employee Loan Disbursement',
  statutory_tds: 'TDS Payment',
  statutory_gst: 'GST Payment',
  statutory_pf: 'PF (EPF) Payment',
  statutory_esi: 'ESI Payment',
  statutory_pt: 'Professional Tax Payment',
  loan_emi: 'Loan EMI Payment',
  director_remuneration: 'Director Remuneration',
  director_drawings: 'Director / Partner Drawings',
  customer_refund: 'Customer Refund',
  petty_cash_refill: 'Petty Cash Refill',
  capital_expenditure: 'Capital Expenditure',
  professional_fees: 'Professional Fees',
  subscription_utility: 'Subscription / Utility / Rent',
  inter_company_transfer: 'Inter-Company Transfer',
  donation_csr: 'Donation / CSR',
  other_adhoc: 'Other (Ad-hoc)',
};

/** Category grouping for type picker UX. */
export type PaymentTypeCategory = 'vendor' | 'employee' | 'statutory' | 'director' | 'other';

export const PAYMENT_TYPE_CATEGORY: Record<PaymentRequestType, PaymentTypeCategory> = {
  vendor_invoice: 'vendor',
  vendor_advance: 'vendor',
  employee_reimbursement: 'employee',
  employee_advance: 'employee',
  employee_loan_disbursement: 'employee',
  statutory_tds: 'statutory',
  statutory_gst: 'statutory',
  statutory_pf: 'statutory',
  statutory_esi: 'statutory',
  statutory_pt: 'statutory',
  loan_emi: 'other',
  director_remuneration: 'director',
  director_drawings: 'director',
  customer_refund: 'other',
  petty_cash_refill: 'other',
  capital_expenditure: 'other',
  professional_fees: 'other',
  subscription_utility: 'other',
  inter_company_transfer: 'other',
  donation_csr: 'other',
  other_adhoc: 'other',
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  draft:              'bg-slate-500/10 text-slate-600 border-slate-400/30',
  pending_dept_head:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  pending_accounts:   'bg-blue-500/10 text-blue-700 border-blue-500/30',
  approved:           'bg-violet-500/10 text-violet-700 border-violet-500/30',
  paid:               'bg-green-500/10 text-green-700 border-green-500/30',
  rejected:           'bg-red-500/10 text-red-700 border-red-500/30',
  on_hold:            'bg-orange-500/10 text-orange-700 border-orange-500/30',
};
