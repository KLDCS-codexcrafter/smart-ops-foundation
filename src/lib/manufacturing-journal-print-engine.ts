/**
 * @file     manufacturing-journal-print-engine.ts
 * @purpose  Build print payload for Manufacturing Journal voucher · 1-copy (Stores) · 3-section (Consumption / Production / Byproduct).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Stores (BOM execution audit trail)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers ManufacturingJournalPrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { ExportRows, ExportSheet } from '@/lib/voucher-export-engine';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

export const MFG_JOURNAL_COPY_CONFIG: PrintCopyConfig = {
  keys: ['stores'],
  labels: { stores: 'STORES COPY' },
  default: 'stores',
};

export interface MfgJournalPrintLine {
  sl_no: number;
  item_code: string;
  item_name: string;
  godown: string;
  qty: number;
  uom: string;
  is_sub_bom: boolean;
}

export interface MfgJournalPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;
  department: string;

  bom_id: string;
  bom_version_no: number | null;
  batch_multiple: number;
  overhead_ledger_name: string;

  consumption_lines: MfgJournalPrintLine[];
  production_lines: MfgJournalPrintLine[];
  byproduct_lines: MfgJournalPrintLine[];

  total_consumption_qty: number;
  total_production_qty: number;
  total_byproduct_qty: number;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildMfgJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = MFG_JOURNAL_COPY_CONFIG.default,
  config?: PrintConfig,
): MfgJournalPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);

  const all = voucher.inventory_lines ?? [];

  // Primary: mfg_line_type (2b.3a+). Fallback: qty sign + byproduct narration heuristic.
  const byproductByNarration = new Set(
    (voucher.ledger_lines ?? [])
      .filter(ll => ll.ledger_name?.startsWith('Byproduct Recovery'))
      .map(ll => ll.ledger_name?.replace(/^Byproduct Recovery\s*—\s*/, '') ?? ''),
  );

  const classify = (l: VoucherInventoryLine): 'consumption' | 'production' | 'byproduct' => {
    if (l.mfg_line_type) return l.mfg_line_type;
    if ((l.qty || 0) < 0) return 'consumption';
    if (byproductByNarration.has(l.item_name ?? '')) return 'byproduct';
    return 'production';
  };

  const mapLine = (l: VoucherInventoryLine, i: number): MfgJournalPrintLine => ({
    sl_no: i + 1,
    item_code: l.item_code || '',
    item_name: l.item_name || '',
    godown: l.godown_name || '',
    qty: Math.abs(l.qty || 0),
    uom: l.uom || '',
    is_sub_bom: false,
  });

  const consumption_lines = all.filter(l => classify(l) === 'consumption').map(mapLine);
  const production_lines = all.filter(l => classify(l) === 'production').map(mapLine);
  const byproduct_lines = all.filter(l => classify(l) === 'byproduct').map(mapLine);

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'mfg_journal');

  return {
    copy_key: copyKey,
    copy_label: MFG_JOURNAL_COPY_CONFIG.labels[copyKey] ?? MFG_JOURNAL_COPY_CONFIG.labels.stores,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    department: voucher.department_name || '',

    bom_id: voucher.bom_id || '',
    bom_version_no: voucher.bom_version_no ?? null,
    batch_multiple: voucher.batch_multiple || 1,
    overhead_ledger_name: voucher.overhead_ledger_name || '',

    consumption_lines,
    production_lines,
    byproduct_lines,

    total_consumption_qty: consumption_lines.reduce((s, l) => s + l.qty, 0),
    total_production_qty: production_lines.reduce((s, l) => s + l.qty, 0),
    total_byproduct_qty: byproduct_lines.reduce((s, l) => s + l.qty, 0),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),

    resolved_toggles,
  };
}

export { formatDDMMMYYYY };

/**
 * @purpose   Transform Manufacturing Journal payload into tabular ExportRows for CSV/XLSX export.
 *            Multi-sheet: Consumption + Production + Byproduct for clarity in Excel.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 3 sheets
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildMfgJournalExportRows(payload: MfgJournalPrintPayload): ExportRows {
  const metaRows: (string | number | null)[][] = [
    ['Mfg Journal No',  payload.voucher_no],
    ['Date',            payload.voucher_date],
    ['Department',      payload.department],
    ['BOM',             payload.bom_id],
    ['BOM Version',     payload.bom_version_no ?? ''],
    ['Batch Multiple',  payload.batch_multiple],
    ['Overhead Ledger', payload.overhead_ledger_name],
  ];

  const headers = ['#', 'Code', 'Item', 'Godown', 'Qty', 'UOM'];

  const mapLine = (l: typeof payload.consumption_lines[number]) =>
    [l.sl_no, l.item_code, l.item_name, l.godown, l.qty, l.uom];

  const consumptionSheet: ExportSheet = {
    name: 'Consumption',
    headers,
    rows: [
      ...metaRows.map(r => [r[0], r[1], null, null, null, null]),
      [null, null, null, null, null, null],
      ['— Consumption Lines —', null, null, null, null, null],
      ...payload.consumption_lines.map(mapLine),
      [null, null, null, null, null, null],
      ['TOTAL', null, null, null, payload.total_consumption_qty, null],
    ],
  };

  const productionSheet: ExportSheet = {
    name: 'Production',
    headers,
    rows: [
      ['— Production Lines —', null, null, null, null, null],
      ...payload.production_lines.map(mapLine),
      [null, null, null, null, null, null],
      ['TOTAL', null, null, null, payload.total_production_qty, null],
    ],
  };

  const byproductSheet: ExportSheet = {
    name: 'Byproduct',
    headers,
    rows: [
      ['— Byproduct Lines —', null, null, null, null, null],
      ...payload.byproduct_lines.map(mapLine),
      [null, null, null, null, null, null],
      ['TOTAL', null, null, null, payload.total_byproduct_qty, null],
    ],
  };

  return {
    voucherType: 'Manufacturing Journal',
    voucherNo: payload.voucher_no,
    sheets: [consumptionSheet, productionSheet, byproductSheet],
  };
}
