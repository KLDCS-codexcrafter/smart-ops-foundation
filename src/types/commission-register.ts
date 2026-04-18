/**
 * commission-register.ts — SAM commission payable register
 * Commission is earned on amount RECEIVED, not on invoice booking.
 * Sprint 4: CN reversal, GL voucher ref, agent invoice reconciliation,
 *           catch-up TDS, reversed status.
 * [JWT] GET/POST/PATCH /api/salesx/commission-register
 */

// One payment installment — mirrors AdvanceAdjustment
export interface CommissionPayment {
  id: string;
  payment_date: string;
  receipt_voucher_id: string | null;
  receipt_voucher_no: string | null;
  amount_received: number;
  commission_on_receipt: number;
  tds_rate: number;
  tds_amount: number;
  net_commission_paid: number;
  tds_deduction_entry_id: string | null;
  created_at: string;
}

// Append-only credit-note reversal reference (Sprint 4)
export interface CommissionCreditNoteRef {
  credit_note_id: string;
  credit_note_no: string;
  credit_note_date: string;
  credit_note_amount: number;
  commission_reversed: number;
  tds_reversal_entry_id: string | null;
}

// Commission register row — one per SAM person per Sales Invoice
export interface CommissionEntry {
  id: string;
  entity_id: string;

  // Invoice linkage
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  customer_id: string | null;
  customer_name: string;

  // SAM Person
  person_id: string;
  person_name: string;
  person_type: string;
  person_pan: string | null;
  deductee_type: 'individual' | 'company' | 'huf' | 'no_pan';

  // Commission basis
  invoice_amount: number;
  base_amount: number;
  commission_rate: number;
  total_commission: number;
  method: string;

  // TDS configuration
  tds_applicable: boolean;
  tds_section: string | null;
  tds_rate: number;

  // Running balance
  amount_received_to_date: number;
  commission_earned_to_date: number;
  tds_deducted_to_date: number;
  net_paid_to_date: number;

  // Append-only payment history
  payments: CommissionPayment[];

  // ── Sprint 4 — Credit note reversal (Scenarios 1-4) ───────────────
  credit_note_amount: number;              // cumulative CN value; init: 0
  credit_note_refs: CommissionCreditNoteRef[];
  net_invoice_amount: number;              // invoice_amount - credit_note_amount
  net_total_commission: number;            // adjusted for CN

  // Commission expense ledger (from SAMPerson Tab 4)
  commission_expense_ledger_id: string | null;
  commission_expense_ledger_name: string | null;

  // GL voucher reference (set after Post GL Voucher)
  commission_expense_voucher_id: string | null;
  commission_expense_voucher_no: string | null;

  // Agent GST invoice reconciliation
  agent_invoice_no: string | null;
  agent_invoice_date: string | null;
  agent_invoice_gross_amount: number | null;
  agent_invoice_gst_amount: number | null;
  agent_invoice_status: 'pending' | 'received' | 'reconciled' | 'disputed' | null;
  agent_invoice_variance: number | null;
  agent_invoice_dispute_reason: string | null;

  // Catch-up TDS (Scenario 8)
  catchup_tds_required: boolean;
  catchup_tds_amount: number;

  status: 'pending' | 'partial' | 'paid' | 'reversed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export const commissionRegisterKey = (e: string) => `erp_commission_register_${e}`;
