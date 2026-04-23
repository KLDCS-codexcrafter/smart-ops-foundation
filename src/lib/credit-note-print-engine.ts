/**
 * @file     credit-note-print-engine.ts
 * @purpose  Build print payload for sales-side Credit Note · 3-copy (Original / Duplicate / Triplicate).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.2 · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.2 (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Customer (recipient) · Transporter · Supplier (us)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers CreditNotePrint.tsx panel (2b.3b-B2 wires toggle-gating)
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

export const CREDIT_NOTE_COPY_CONFIG: PrintCopyConfig = {
  keys: ['original', 'duplicate', 'triplicate'],
  labels: {
    original: 'ORIGINAL FOR RECIPIENT',
    duplicate: 'DUPLICATE FOR TRANSPORTER',
    triplicate: 'TRIPLICATE FOR SUPPLIER',
  },
  default: 'original',
};

export interface CreditNotePrintLine {
  sl_no: number;
  item_code: string;
  item_description: string;
  hsn_sac: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  discount: number;
  taxable_value: number;
  cgst_rate: number; cgst_amount: number;
  sgst_rate: number; sgst_amount: number;
  igst_rate: number; igst_amount: number;
}

export interface CreditNotePrintHsnSummary {
  hsn_sac: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface CreditNotePrintPayload {
  copy_key: string;
  copy_label: string;

  // Issuer = us
  issuer: PrintSupplierBlock;
  issuer_address: string;

  // Recipient = customer
  recipient_name: string;
  recipient_gstin: string | null;
  recipient_state: string;

  voucher_no: string;
  voucher_date: string;
  against_invoice_no: string;
  against_invoice_date: string | null;
  reason_code: string;
  place_of_supply: string;

  lines: CreditNotePrintLine[];
  hsn_summary: CreditNotePrintHsnSummary[];

  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  round_off: number;
  grand_total: number;
  amount_in_words: string;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildCreditNotePrintPayload(
  voucher: Voucher,
  issuerGst: EntityGSTConfig,
  copyKey: string = CREDIT_NOTE_COPY_CONFIG.default,
  config?: PrintConfig,
): CreditNotePrintPayload {
  const issuer = buildSupplierBlock(issuerGst);

  const lines: CreditNotePrintLine[] = (voucher.inventory_lines ?? []).map((l, i) => ({
    sl_no: i + 1,
    item_code: l.item_code || '',
    item_description: l.item_name || '',
    hsn_sac: l.hsn_sac_code || '',
    qty: l.qty || 0,
    uom: l.uom || '',
    rate: l.rate || 0,
    amount: (l.qty || 0) * (l.rate || 0),
    discount: l.discount_amount || 0,
    taxable_value: l.taxable_value || 0,
    cgst_rate: l.cgst_rate || 0, cgst_amount: l.cgst_amount || 0,
    sgst_rate: l.sgst_rate || 0, sgst_amount: l.sgst_amount || 0,
    igst_rate: l.igst_rate || 0, igst_amount: l.igst_amount || 0,
  }));

  const hsnMap = new Map<string, CreditNotePrintHsnSummary>();
  for (const l of lines) {
    const ex = hsnMap.get(l.hsn_sac) ?? {
      hsn_sac: l.hsn_sac, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
    };
    ex.taxable += l.taxable_value;
    ex.cgst += l.cgst_amount;
    ex.sgst += l.sgst_amount;
    ex.igst += l.igst_amount;
    ex.total += l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount;
    hsnMap.set(l.hsn_sac, ex);
  }

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'credit_note');

  return {
    copy_key: copyKey,
    copy_label: CREDIT_NOTE_COPY_CONFIG.labels[copyKey] ?? CREDIT_NOTE_COPY_CONFIG.labels[CREDIT_NOTE_COPY_CONFIG.default],

    issuer,
    issuer_address: formatSupplierAddress(issuer),

    recipient_name: voucher.party_name || '',
    recipient_gstin: voucher.party_gstin ?? null,
    recipient_state: voucher.customer_state_code ?? voucher.party_state_code ?? '',

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    against_invoice_no: voucher.ref_voucher_no || '',
    against_invoice_date: null,
    reason_code: '—',
    place_of_supply: voucher.place_of_supply ?? '',

    lines,
    hsn_summary: Array.from(hsnMap.values()),

    total_taxable: voucher.total_taxable || 0,
    total_cgst: voucher.total_cgst || 0,
    total_sgst: voucher.total_sgst || 0,
    total_igst: voucher.total_igst || 0,
    total_cess: voucher.total_cess || 0,
    round_off: voucher.round_off || 0,
    grand_total: voucher.net_amount || 0,
    amount_in_words: amountInWords(voucher.net_amount || 0),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (issuer.legal_name || issuer.trade_name),

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };

/**
 * @purpose   Transform Credit Note payload into tabular ExportRows for CSV/XLSX export.
 *            Multi-sheet: Credit Note (lines) + HSN Summary.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 2 sheets
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildCreditNoteExportRows(payload: CreditNotePrintPayload): ExportRows {
  const metaRows: (string | number | null)[][] = [
    ['Credit Note No',  payload.voucher_no],
    ['Date',            payload.voucher_date],
    ['Copy',            payload.copy_label],
    ['Issuer',          payload.issuer.legal_name],
    ['Issuer GSTIN',    payload.issuer.gstin ?? ''],
    ['Recipient',       payload.recipient_name],
    ['Recipient GSTIN', payload.recipient_gstin ?? ''],
    ['Recipient State', payload.recipient_state],
    ['Against Invoice', payload.against_invoice_no],
    ['Reason',          payload.reason_code],
    ['Place of Supply', payload.place_of_supply],
  ];

  const lineHeaders = ['#', 'Description', 'HSN', 'Qty', 'UOM', 'Rate', 'Discount', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'];
  const lineRows = payload.lines.map(l => [
    l.sl_no,
    l.item_description,
    l.hsn_sac,
    l.qty,
    l.uom,
    l.rate,
    l.discount,
    l.taxable_value,
    l.cgst_amount,
    l.sgst_amount,
    l.igst_amount,
    l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount,
  ]);

  const blank = (): (string | number | null)[] => Array(lineHeaders.length).fill(null);

  const noteSheet: ExportSheet = {
    name: 'Credit Note',
    headers: lineHeaders,
    rows: [
      ...metaRows.map(r => [r[0], r[1], ...Array(lineHeaders.length - 2).fill(null)]),
      blank(),
      ['— Line Items —', ...Array(lineHeaders.length - 1).fill(null)],
      ...lineRows,
      blank(),
      ['TOTALS', null, null, null, null, null, null,
        payload.total_taxable, payload.total_cgst, payload.total_sgst, payload.total_igst,
        payload.grand_total],
      ['Round Off',  null, null, null, null, null, null, null, null, null, null, payload.round_off],
      ['Grand Total', null, null, null, null, null, null, null, null, null, null, payload.grand_total],
      ['Amount in Words', payload.amount_in_words, ...Array(lineHeaders.length - 2).fill(null)],
    ],
  };

  const hsnSheet: ExportSheet = {
    name: 'HSN Summary',
    headers: ['HSN', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'],
    rows: payload.hsn_summary.map(h => [
      h.hsn_sac || '',
      h.taxable,
      h.cgst,
      h.sgst,
      h.igst,
      h.total,
    ]),
  };

  return {
    voucherType: 'Credit Note',
    voucherNo: payload.voucher_no,
    sheets: [noteSheet, hsnSheet],
  };
}
