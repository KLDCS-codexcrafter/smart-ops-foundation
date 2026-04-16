/**
 * opening-balance.ts — Types for Opening Balance modules
 * - OpeningBillEntry: bill-by-bill party ledger opening
 * - OpeningLoanEntry: employee loans, advances, and borrowings opening
 * [JWT] Replace localStorage keys with REST endpoints
 */

export interface OpeningBillEntry {
  id: string;
  entity_id: string;
  ledger_id: string;
  ledger_name: string;
  party_type: 'debtor' | 'creditor';
  bill_type: 'invoice' | 'advance' | 'credit_note' | 'debit_note';
  bill_no: string;
  bill_date: string;
  due_date?: string;
  credit_days?: number;
  dr_cr: 'Dr' | 'Cr';
  amount: number;
  // TDS — only for advances where TDS was already deducted
  tds_applicable: boolean;
  tds_section?: string;
  tds_amount?: number;
  tds_rate?: number;
  party_pan?: string;
  party_tan?: string;
  status: 'draft' | 'posted';
  created_at: string;
}

export interface OpeningLoanEntry {
  id: string;
  entity_id: string;
  entry_type: 'loan_receivable' | 'advance_receivable' | 'loan_payable';
  employee_id?: string;
  person_name: string;
  person_code?: string;
  loan_type_id?: string;
  loan_type_name?: string;
  disbursement_date: string;
  original_amount: number;
  recovered_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  next_emi_date?: string;
  remaining_tenure_months: number;
  ledger_id: string;
  status: 'draft' | 'posted';
  created_at: string;
}

export interface OpeningStatusFlag {
  ledger_balances_posted: boolean;
  party_bills_posted: boolean;
  employee_loans_posted: boolean;
  posted_at?: string;
}

export const openingBillsKey   = (e: string) => `erp_opening_bills_${e}`;
export const openingLoansKey   = (e: string) => `erp_opening_loans_${e}`;
export const openingStatusKey  = (e: string) => `erp_opening_status_${e}`;
