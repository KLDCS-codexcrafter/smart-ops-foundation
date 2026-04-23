/**
 * payment-print-engine.ts — Build the flat print payload for a Payment voucher.
 *
 * Mirror of receipt-print-engine. Copy config: 2 copies — Accounts (default),
 * Vendor.
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

export const PAYMENT_COPY_CONFIG: PrintCopyConfig = {
  keys: ['accounts', 'vendor'],
  labels: {
    accounts: 'ACCOUNTS COPY',
    vendor: 'VENDOR COPY',
  },
  default: 'accounts',
};

export interface PaymentPrintPayload {
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

export function buildPaymentPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = PAYMENT_COPY_CONFIG.default,
): PaymentPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const total = voucher.net_amount || 0;

  return {
    copy_key: copyKey,
    copy_label: PAYMENT_COPY_CONFIG.labels[copyKey] ?? PAYMENT_COPY_CONFIG.labels[PAYMENT_COPY_CONFIG.default],

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

export { formatINR, formatDDMMMYYYY };
