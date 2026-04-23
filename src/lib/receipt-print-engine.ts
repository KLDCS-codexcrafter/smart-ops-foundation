/**
 * receipt-print-engine.ts — Build the flat print payload for a Receipt voucher.
 *
 * Receipts have: party block, instrument (cash/cheque/NEFT/UPI) details,
 * settlement against bills, optional TDS deduction, narration, signatory.
 *
 * Copy config: 2 copies — Accounts Copy (default), Party Copy.
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

export const RECEIPT_COPY_CONFIG: PrintCopyConfig = {
  keys: ['accounts', 'party'],
  labels: {
    accounts: 'ACCOUNTS COPY',
    party: 'PARTY COPY',
  },
  default: 'accounts',
};

export interface ReceiptPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;

  party_name: string;
  party_gstin: string | null;

  instrument: string;
  instrument_ref_no: string;
  cheque_date: string | null;
  bank_name: string | null;

  ledger_lines: {
    ledger_name: string;
    dr_amount: number;
    cr_amount: number;
    narration: string;
  }[];

  settlement_lines: {
    bill_no: string;
    bill_date: string;
    bill_amount: number;
    settled_amount: number;
  }[];

  total_amount: number;
  amount_in_words: string;

  narration: string;
  authorised_signatory: string;
}

export function buildReceiptPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = RECEIPT_COPY_CONFIG.default,
): ReceiptPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const total = voucher.net_amount || 0;

  return {
    copy_key: copyKey,
    copy_label: RECEIPT_COPY_CONFIG.labels[copyKey] ?? RECEIPT_COPY_CONFIG.labels[RECEIPT_COPY_CONFIG.default],

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,

    party_name: voucher.party_name || '',
    party_gstin: voucher.party_gstin ?? null,

    instrument: voucher.instrument_type || voucher.payment_instrument || 'Cash',
    instrument_ref_no: voucher.instrument_ref_no || '',
    cheque_date: voucher.cheque_date ?? null,
    bank_name: voucher.bank_name ?? null,

    ledger_lines: (voucher.ledger_lines ?? []).map(l => ({
      ledger_name: l.ledger_name,
      dr_amount: l.dr_amount || 0,
      cr_amount: l.cr_amount || 0,
      narration: l.narration || '',
    })),

    settlement_lines: (voucher.bill_references ?? []).map(b => ({
      bill_no: b.voucher_no || '',
      bill_date: b.voucher_date || '',
      bill_amount: b.amount || 0,
      settled_amount: b.amount || 0,
    })),

    total_amount: total,
    amount_in_words: amountInWords(total),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),
  };
}

// Re-export formatters for the print panel
export { formatINR, formatDDMMMYYYY };
