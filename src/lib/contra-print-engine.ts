/**
 * @file     contra-print-engine.ts
 * @purpose  Build print payload for Contra voucher (cash↔bank, bank↔bank) · 1-copy (Accounts).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.1 · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.1 (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Accountant (accounts copy)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers ContraPrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher } from '@/types/voucher';
import type { ExportRows, ExportSheet } from '@/lib/voucher-export-engine';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

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

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildContraPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = CONTRA_COPY_CONFIG.default,
  config?: PrintConfig,
): ContraPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const total = voucher.net_amount || 0;

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'contra');

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

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };

/**
 * @purpose   Transform Contra print payload into tabular ExportRows for CSV/XLSX export.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 1 sheet (meta + ledger lines)
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildContraExportRows(payload: ContraPrintPayload): ExportRows {
  // [Concrete] Contra is header + ledger lines (cash↔bank, bank↔bank).
  const metaRows: (string | number | null)[][] = [
    ['Contra No',        payload.voucher_no],
    ['Date',             payload.voucher_date],
    ['From Ledger',      payload.from_ledger],
    ['To Ledger',        payload.to_ledger],
    ['Instrument',       payload.instrument],
    ['Instrument Ref No', payload.instrument_ref_no],
    ['Total Amount',     payload.total_amount],
    ['Amount in Words',  payload.amount_in_words],
    ['Narration',        payload.narration],
  ];

  const ledgerRows = payload.ledger_lines.map(l => [
    l.ledger_name,
    l.dr_amount || null,
    l.cr_amount || null,
    l.narration || '',
  ]);

  // [Analytical] Single sheet: meta rows + blank + labeled ledger section.
  const sheet: ExportSheet = {
    name: 'Contra',
    headers: ['Field / Ledger', 'Value / Debit', 'Credit', 'Narration'],
    rows: [
      ...metaRows.map(r => [r[0], r[1], null, null]),
      [null, null, null, null],
      ['— Ledger Lines —', null, null, null],
      ...ledgerRows,
    ],
  };

  return {
    voucherType: 'Contra',
    voucherNo: payload.voucher_no,
    sheets: [sheet],
  };
}
