/**
 * @file     payment-print-engine.ts
 * @purpose  Build print payload for Payment voucher · 2-copy (Accounts / Vendor) · GL-style print.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.1 · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.1 (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Accountant (accounts copy) · Vendor (vendor copy)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers PaymentPrint.tsx panel (2b.3b-B2 wires toggle-gating)
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

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildPaymentPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = PAYMENT_COPY_CONFIG.default,
  config?: PrintConfig,
): PaymentPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);
  const total = voucher.net_amount || 0;

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'payment');

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

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };

/**
 * @purpose   Transform Payment print payload into tabular ExportRows for CSV/XLSX export.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 1 sheet (meta + ledger lines + settlement lines)
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildPaymentExportRows(payload: PaymentPrintPayload): ExportRows {
  // [Concrete] Payment is header + ledger lines + optional settlement lines.
  const metaRows: (string | number | null)[][] = [
    ['Payment No',        payload.voucher_no],
    ['Date',              payload.voucher_date],
    ['Vendor',            payload.party_name],
    ['Vendor GSTIN',      payload.party_gstin ?? ''],
    ['Instrument',        payload.instrument],
    ['Instrument Ref No', payload.instrument_ref_no],
    ['Cheque Date',       payload.cheque_date ?? ''],
    ['Bank',              payload.bank_name ?? ''],
    ['Total Amount',      payload.total_amount],
    ['Amount in Words',   payload.amount_in_words],
    ['Narration',         payload.narration],
  ];

  const ledgerRows = payload.ledger_lines.map(l => [
    l.ledger_name,
    l.dr_amount || null,
    l.cr_amount || null,
    l.narration || '',
  ]);

  const settlementRows = payload.settlement_lines.map(s => [
    `Bill ${s.bill_no} (${s.bill_date})`,
    s.bill_amount,
    s.settled_amount,
    null,
  ]);

  const sheet: ExportSheet = {
    name: 'Payment',
    headers: ['Field / Ledger', 'Value / Debit', 'Credit', 'Narration'],
    rows: [
      ...metaRows.map(r => [r[0], r[1], null, null]),
      [null, null, null, null],
      ['— Ledger Lines —', null, null, null],
      ...ledgerRows,
      ...(settlementRows.length > 0
        ? [
            [null, null, null, null] as (string | number | null)[],
            ['— Settlements (Bill / Amount / Settled) —', null, null, null] as (string | number | null)[],
            ...settlementRows,
          ]
        : []),
    ],
  };

  return {
    voucherType: 'Payment',
    voucherNo: payload.voucher_no,
    sheets: [sheet],
  };
}
