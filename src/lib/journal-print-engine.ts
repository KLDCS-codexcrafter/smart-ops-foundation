/**
 * journal-print-engine.ts — General Journal voucher print payload.
 * Single "ACCOUNTS COPY" — no party, no instrument. Just ledger lines + narration.
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  sumDebits, sumCredits,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

export const JOURNAL_COPY_CONFIG: PrintCopyConfig = {
  keys: ['accounts'],
  labels: { accounts: 'ACCOUNTS COPY' },
  default: 'accounts',
};

export interface JournalPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;

  ledger_lines: {
    ledger_name: string;
    dr_amount: number;
    cr_amount: number;
    narration: string;
  }[];

  total_debit: number;
  total_credit: number;
  amount_in_words: string;

  narration: string;
  authorised_signatory: string;
}

export function buildJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = JOURNAL_COPY_CONFIG.default,
): JournalPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const totalDr = sumDebits(voucher);
  const totalCr = sumCredits(voucher);

  return {
    copy_key: copyKey,
    copy_label: JOURNAL_COPY_CONFIG.labels[copyKey] ?? JOURNAL_COPY_CONFIG.labels.accounts,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,

    ledger_lines: (voucher.ledger_lines ?? []).map(l => ({
      ledger_name: l.ledger_name,
      dr_amount: l.dr_amount || 0,
      cr_amount: l.cr_amount || 0,
      narration: l.narration || '',
    })),

    total_debit: totalDr,
    total_credit: totalCr,
    amount_in_words: amountInWords(Math.max(totalDr, totalCr)),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),
  };
}

export { formatINR, formatDDMMMYYYY };
