/**
 * commission-register.ts — SAM commission payable register
 * Commission is earned on amount RECEIVED, not on invoice booking.
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

  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export const commissionRegisterKey = (e: string) => `erp_commission_register_${e}`;
