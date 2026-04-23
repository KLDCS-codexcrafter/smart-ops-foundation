/**
 * @file     stock-journal-print-engine.ts
 * @purpose  Build print payload for Stock Journal voucher · 1-copy (Stores) · qty-only · consumption / production split.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Stores (consumption/production audit trail)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers StockJournalPrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

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

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildStockJournalPrintPayload(
  voucher: Voucher,
  supplierGst: EntityGSTConfig,
  copyKey: string = STOCK_JOURNAL_COPY_CONFIG.default,
  config?: PrintConfig,
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

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'stock_journal');

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

    resolved_toggles,
  };
}

export { formatDDMMMYYYY };
