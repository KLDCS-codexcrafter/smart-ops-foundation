/**
 * @file     stock-adjustment-print-engine.ts
 * @purpose  Build print payload for Stock Adjustment voucher · 1-copy (Stores) · qty-only.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Stores (write-on / write-off audit trail)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers StockAdjustmentPrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher } from '@/types/voucher';
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

export const STOCK_ADJUSTMENT_COPY_CONFIG: PrintCopyConfig = {
  keys: ['stores'],
  labels: { stores: 'STORES COPY' },
  default: 'stores',
};

export interface StockAdjustmentPrintLine {
  sl_no: number;
  item_name: string;
  godown: string;
  direction: 'Write-Off' | 'Write-On';
  qty: number;
  uom: string;
  reason: string;
}

export interface StockAdjustmentPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;
  department: string;
  ref_no: string;

  lines: StockAdjustmentPrintLine[];
  total_write_off_qty: number;
  total_write_on_qty: number;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildStockAdjustmentPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_ADJUSTMENT_COPY_CONFIG.default,
  config?: PrintConfig,
): StockAdjustmentPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);

  const lines: StockAdjustmentPrintLine[] = (voucher.inventory_lines ?? []).map((l, i) => ({
    sl_no: i + 1,
    item_name: l.item_name || '',
    godown: l.godown_name || '',
    direction: (l.qty || 0) < 0 ? 'Write-Off' : 'Write-On',
    qty: Math.abs(l.qty || 0),
    uom: l.uom || '',
    reason: l.reason_code || '—',
  }));

  const total_write_off_qty = lines.filter(l => l.direction === 'Write-Off').reduce((s, l) => s + l.qty, 0);
  const total_write_on_qty = lines.filter(l => l.direction === 'Write-On').reduce((s, l) => s + l.qty, 0);

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'stock_adjustment');

  return {
    copy_key: copyKey,
    copy_label: STOCK_ADJUSTMENT_COPY_CONFIG.labels[copyKey] ?? STOCK_ADJUSTMENT_COPY_CONFIG.labels.stores,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    department: voucher.department_name || '',
    ref_no: voucher.ref_no || '',

    lines,
    total_write_off_qty,
    total_write_on_qty,

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),

    resolved_toggles,
  };
}

export { formatDDMMMYYYY };

/**
 * @purpose   Transform Stock Adjustment payload into tabular ExportRows for CSV/XLSX export.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 1 sheet (meta + line items + totals)
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildStockAdjustmentExportRows(payload: StockAdjustmentPrintPayload): ExportRows {
  const metaRows: (string | number | null)[][] = [
    ['Adjustment No', payload.voucher_no],
    ['Date',          payload.voucher_date],
    ['Department',    payload.department],
    ['Ref No',        payload.ref_no],
  ];

  const lineRows = payload.lines.map(l => [
    l.sl_no,
    l.item_name,
    l.godown,
    l.direction,
    l.qty,
    l.uom,
    l.reason,
  ]);

  const headers = ['#', 'Item', 'Godown', 'Direction', 'Qty', 'UOM', 'Reason'];
  const sheet: ExportSheet = {
    name: 'Stock Adjustment',
    headers,
    rows: [
      ...metaRows.map(r => [r[0], r[1], null, null, null, null, null]),
      [null, null, null, null, null, null, null],
      ['— Line Items —', null, null, null, null, null, null],
      ...lineRows,
      [null, null, null, null, null, null, null],
      ['TOTALS', null, null, 'Write-Off', payload.total_write_off_qty, null, null],
      [null, null, null, 'Write-On', payload.total_write_on_qty, null, null],
    ],
  };

  return {
    voucherType: 'Stock Adjustment',
    voucherNo: payload.voucher_no,
    sheets: [sheet],
  };
}
