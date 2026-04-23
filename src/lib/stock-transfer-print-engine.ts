/**
 * @file     stock-transfer-print-engine.ts
 * @purpose  Build print payload for Stock Transfer voucher · 2-copy (Dispatch / Receive) · qty-only.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles), T10-pre.2c (exportRows)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Dispatch dept · Receive dept
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers StockTransferPrint.tsx panel (2b.3b-B2 wires toggle-gating)
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

export const STOCK_TRANSFER_COPY_CONFIG: PrintCopyConfig = {
  keys: ['dispatch', 'receive'],
  labels: {
    dispatch: 'DISPATCH DEPT COPY',
    receive: 'RECEIVE DEPT COPY',
  },
  default: 'dispatch',
};

export interface StockTransferPrintLine {
  sl_no: number;
  item_name: string;
  qty: number;
  uom: string;
  godown: string;
  batch: string;
}

export interface StockTransferPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;
  ref_no: string;

  from_dept: string;
  to_dept: string;
  status: 'IN TRANSIT' | 'RECEIVED';

  lines: StockTransferPrintLine[];
  total_qty: number;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildStockTransferPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_TRANSFER_COPY_CONFIG.default,
  config?: PrintConfig,
): StockTransferPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);

  const lines: StockTransferPrintLine[] = (voucher.inventory_lines ?? []).map((l, i) => ({
    sl_no: i + 1,
    item_name: l.item_name || '',
    qty: Math.abs(l.qty || 0),
    uom: l.uom || '',
    godown: l.godown_name || '',
    batch: l.batch_id || '',
  }));

  const total_qty = lines.reduce((s, l) => s + l.qty, 0);

  const status: 'IN TRANSIT' | 'RECEIVED' =
    voucher.status === 'in_transit' ? 'IN TRANSIT' : 'RECEIVED';

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'stock_transfer');

  return {
    copy_key: copyKey,
    copy_label: STOCK_TRANSFER_COPY_CONFIG.labels[copyKey] ?? STOCK_TRANSFER_COPY_CONFIG.labels.dispatch,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    ref_no: voucher.ref_no || '',

    from_dept: voucher.dispatch_dept_name || '',
    to_dept: voucher.receive_dept_name || '',
    status,

    lines,
    total_qty,

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),

    resolved_toggles,
  };
}

export { formatDDMMMYYYY };

/**
 * @purpose   Transform Stock Transfer payload into tabular ExportRows for CSV/XLSX export.
 * @param     payload — already-built print payload
 * @returns   ExportRows with 1 sheet (meta + line items + totals)
 * @iso       Functional Suitability (HIGH) · Maintainability (HIGH — single source for "what cells")
 */
export function buildStockTransferExportRows(payload: StockTransferPrintPayload): ExportRows {
  const metaRows: (string | number | null)[][] = [
    ['Transfer No', payload.voucher_no],
    ['Date',        payload.voucher_date],
    ['Ref No',      payload.ref_no],
    ['From Dept',   payload.from_dept],
    ['To Dept',     payload.to_dept],
    ['Status',      payload.status],
  ];

  const lineRows = payload.lines.map(l => [
    l.sl_no,
    l.item_name,
    l.qty,
    l.uom,
    l.godown,
    l.batch,
  ]);

  const headers = ['#', 'Item', 'Qty', 'UOM', 'Godown', 'Batch'];
  const sheet: ExportSheet = {
    name: 'Stock Transfer',
    headers,
    rows: [
      ...metaRows.map(r => [r[0], r[1], null, null, null, null]),
      [null, null, null, null, null, null],
      ['— Line Items —', null, null, null, null, null],
      ...lineRows,
      [null, null, null, null, null, null],
      ['TOTAL', null, payload.total_qty, null, null, null],
    ],
  };

  return {
    voucherType: 'Stock Transfer',
    voucherNo: payload.voucher_no,
    sheets: [sheet],
  };
}
