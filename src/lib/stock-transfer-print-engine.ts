/**
 * stock-transfer-print-engine.ts — Build payload for ST print.
 *
 * Copy: 2 — Dispatch Dept / Receive Dept. Qty-only.
 * Status badge (IN TRANSIT / RECEIVED) is the prominent UI element.
 * From Dept → To Dept band uses dispatch_dept_name / receive_dept_name.
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

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
}

export function buildStockTransferPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_TRANSFER_COPY_CONFIG.default,
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
  };
}

export { formatDDMMMYYYY };
