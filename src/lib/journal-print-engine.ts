/**
 * @file     journal-print-engine.ts
 * @purpose  Build print payload for General Journal voucher · 1-copy (Accounts) · ledger-only.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.1 · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.1 (original), T10-pre.2b.3b-B1 (config param + resolved_toggles)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Accountant (accounts copy)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers JournalPrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  sumDebits, sumCredits,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

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

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = JOURNAL_COPY_CONFIG.default,
  config?: PrintConfig,
): JournalPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const totalDr = sumDebits(voucher);
  const totalCr = sumCredits(voucher);

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'journal');

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

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };
