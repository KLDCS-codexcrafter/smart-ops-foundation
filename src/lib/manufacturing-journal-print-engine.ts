/**
 * manufacturing-journal-print-engine.ts — Build payload for Mfg JV print.
 *
 * Copy: 1 — Stores. Qty-only. 3 sections: Consumption, Production, Byproducts.
 * Header shows BOM ref, batch multiple, overhead ledger (all new 2b.3a fields).
 * mfg_line_type flag (2b.3a) drives section routing; qty sign is fallback.
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';

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
}

export function buildMfgJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = MFG_JOURNAL_COPY_CONFIG.default,
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
  };
}

export { formatDDMMMYYYY };
