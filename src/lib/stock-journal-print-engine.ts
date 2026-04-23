/**
 * stock-journal-print-engine.ts — Build payload for SJ print.
 *
 * Copy: 1 — Stores. Qty-only. Purpose from voucher.purpose header.
 * Side-by-side Consumption (qty<0) vs Production (qty>0) tables.
 * mfg_line_type flag now present (2b.3a) enables semantic rendering.
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

export const STOCK_JOURNAL_COPY_CONFIG: PrintCopyConfig = {
  keys: ['stores'],
  labels: { stores: 'STORES COPY' },
  default: 'stores',
};

export interface StockJournalPrintLine {
  sl_no: number;
  item_name: string;
  godown: string;
  qty: number;
  uom: string;
}

export interface StockJournalPrintPayload {
  copy_key: string;
  copy_label: string;

  supplier: PrintSupplierBlock;
  supplier_address: string;

  voucher_no: string;
  voucher_date: string;
  purpose: string;
  department: string;
  reference_no: string;

  consumption_lines: StockJournalPrintLine[];
  production_lines: StockJournalPrintLine[];
  total_consumption_qty: number;
  total_production_qty: number;

  narration: string;
  authorised_signatory: string;
}

export function buildStockJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_JOURNAL_COPY_CONFIG.default,
): StockJournalPrintPayload {
  const supplier = buildSupplierBlock(supplierGst);

  const all = voucher.inventory_lines ?? [];

  // Prefer mfg_line_type flag (2b.3a+); fallback to qty sign for legacy vouchers.
  const isConsumption = (l: VoucherInventoryLine) =>
    l.mfg_line_type === 'consumption' || (l.mfg_line_type == null && (l.qty || 0) < 0);
  const isProduction = (l: VoucherInventoryLine) =>
    l.mfg_line_type === 'production' || (l.mfg_line_type == null && (l.qty || 0) > 0);

  const consumption_lines: StockJournalPrintLine[] = all.filter(isConsumption).map((l, i) => ({
    sl_no: i + 1, item_name: l.item_name || '', godown: l.godown_name || '',
    qty: Math.abs(l.qty || 0), uom: l.uom || '',
  }));
  const production_lines: StockJournalPrintLine[] = all.filter(isProduction).map((l, i) => ({
    sl_no: i + 1, item_name: l.item_name || '', godown: l.godown_name || '',
    qty: Math.abs(l.qty || 0), uom: l.uom || '',
  }));

  return {
    copy_key: copyKey,
    copy_label: STOCK_JOURNAL_COPY_CONFIG.labels[copyKey] ?? STOCK_JOURNAL_COPY_CONFIG.labels.stores,

    supplier,
    supplier_address: formatSupplierAddress(supplier),

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    purpose: voucher.purpose || '',
    department: voucher.department_name || '',
    reference_no: voucher.ref_voucher_no || '',

    consumption_lines,
    production_lines,
    total_consumption_qty: consumption_lines.reduce((s, l) => s + l.qty, 0),
    total_production_qty: production_lines.reduce((s, l) => s + l.qty, 0),

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (supplier.legal_name || supplier.trade_name),
  };
}

export { formatDDMMMYYYY };
