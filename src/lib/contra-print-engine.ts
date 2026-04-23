/**
 * contra-print-engine.ts — Contra voucher (cash↔bank, bank↔bank).
 * Single "ACCOUNTS COPY" only — internal fund movement.
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

export const CONTRA_COPY_CONFIG: PrintCopyConfig = {
  keys: ['accounts'],
  labels: { accounts: 'ACCOUNTS COPY' },
  default: 'accounts',
};

export interface ContraPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;

  from_ledger: string;
  to_ledger: string;

  ledger_lines: {
    ledger_name: string;
    dr_amount: number;
    cr_amount: number;
    narration: string;
  }[];

  instrument: string;
  instrument_ref_no: string;

  total_amount: number;
  amount_in_words: string;

  narration: string;
  authorised_signatory: string;
}

export function buildContraPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = CONTRA_COPY_CONFIG.default,
): ContraPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const total = voucher.net_amount || 0;

  return {
    copy_key: copyKey,
    copy_label: CONTRA_COPY_CONFIG.labels[copyKey] ?? CONTRA_COPY_CONFIG.labels.accounts,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,

    from_ledger: voucher.from_ledger_name || '',
    to_ledger: voucher.to_ledger_name || '',

    ledger_lines: (voucher.ledger_lines ?? []).map(l => ({
      ledger_name: l.ledger_name,
      dr_amount: l.dr_amount || 0,
      cr_amount: l.cr_amount || 0,
      narration: l.narration || '',
    })),

    instrument: voucher.instrument_type || voucher.payment_instrument || '',
    instrument_ref_no: voucher.instrument_ref_no || '',

    total_amount: total,
    amount_in_words: amountInWords(total),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),
  };
}

export { formatINR, formatDDMMMYYYY };
