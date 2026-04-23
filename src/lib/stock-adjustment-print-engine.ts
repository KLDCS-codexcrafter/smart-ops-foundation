/**
 * stock-adjustment-print-engine.ts — Build payload for SA print.
 *
 * Copy: 1 — Stores. Qty-only (Rate/Value default OFF per D-087).
 * Direction derived from qty sign (negative = write_off, positive = write_on).
 * Reason read from voucher.inventory_lines[].reason_code (new field, T10-pre.2b.3a).
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

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
}

export function buildStockAdjustmentPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_ADJUSTMENT_COPY_CONFIG.default,
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
  };
}

export { formatDDMMMYYYY };
