/**
 * @file        src/types/tt-payment.ts
 * @purpose     TTPayment · 10th sibling · TT outward workflow · 4-way integration peak
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q1=b sibling · EX-8-Q8=a 4-way integration · EX-8-Q12=a composition
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped localStorage · FR-80 exhaustive switch
 */

export type TTPaymentStatus =
  | 'draft'
  | 'pending_15ca_15cb'
  | 'pending_bank_approval'
  | 'submitted_to_bank'
  | 'in_transit'
  | 'credited_to_beneficiary'
  | 'rejected'
  | 'cancelled';

export const TT_VALID_TRANSITIONS: Record<TTPaymentStatus, TTPaymentStatus[]> = {
  draft: ['pending_15ca_15cb', 'cancelled'],
  pending_15ca_15cb: ['pending_bank_approval', 'cancelled'],
  pending_bank_approval: ['submitted_to_bank', 'rejected', 'cancelled'],
  submitted_to_bank: ['in_transit', 'rejected'],
  in_transit: ['credited_to_beneficiary', 'rejected'],
  credited_to_beneficiary: [],
  rejected: [],
  cancelled: [],
};

export interface TTPayment {
  id: string;
  tt_payment_no: string;
  entity_id: string;
  status: TTPaymentStatus;

  related_import_po_id: string;
  related_import_po_no: string;
  related_foreign_vendor_id: string;
  related_form_15ca_submission_id: string | null;
  related_auto_posted_voucher_id: string | null;

  ad_bank_code: string;
  ad_bank_name: string;
  beneficiary_bank_name: string;
  beneficiary_account_no: string;
  beneficiary_swift_code: string;

  currency_code: string;
  amount_foreign: number;
  buying_rate_applied: number;
  amount_inr: number;
  bank_charges_inr: number;
  total_debit_inr: number;

  rbi_purpose_code: string;
  rbi_purpose_description: string;

  initiated_at: string;
  pending_15ca_15cb_at: string | null;
  submitted_to_bank_at: string | null;
  in_transit_at: string | null;
  credited_at: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const ttPaymentKey = (entityCode: string): string =>
  `erp_${entityCode}_tt_payments`;
