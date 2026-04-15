/**
 * voucher.ts — Voucher transaction data model
 * [JWT] Replace with GET/POST /api/accounting/vouchers
 */

export interface Voucher {
  id: string;
  voucher_no: string;
  voucher_type: string;
  date: string;
  party_name: string;
  ref_voucher_no: string;
  vendor_bill_no: string;
  net_amount: number;
  narration: string;
  terms_conditions: string;
  payment_enforcement: string;
  payment_instrument: string;
  from_ledger_name: string;
  to_ledger_name: string;
  from_godown_name: string;
  to_godown_name: string;
  status: 'draft' | 'posted' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export const VOUCHER_STORAGE_KEY = 'erp_group_vouchers';
