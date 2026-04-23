/**
 * @file     receipt-note-print-engine.ts
 * @purpose  Build print payload for GRN (Receipt Note) · 2-copy (Stores / Accounts).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Stores (receiving) · Accountant (audit)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers ReceiptNotePrint.tsx panel (2b.3b-B2 wires toggle-gating)
 */

import type { Voucher } from '@/types/voucher';
import {
  buildSupplierBlock, formatSupplierAddress,
  formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';

export const RECEIPT_NOTE_COPY_CONFIG: PrintCopyConfig = {
  keys: ['stores', 'accounts'],
  labels: {
    stores: 'STORES COPY',
    accounts: 'ACCOUNTS COPY',
  },
  default: 'stores',
};

export interface ReceiptNotePrintLine {
  sl_no: number;
  item_code: string;
  item_description: string;
  qty: number;
  uom: string;
  rate: number;
  value: number;
  godown: string;
  batch: string;
}

export interface ReceiptNotePrintPayload {
  copy_key: string;
  copy_label: string;

  // Buyer = us
  buyer: PrintSupplierBlock;
  buyer_address: string;

  // Vendor
  vendor_name: string;
  vendor_gstin: string | null;

  // Voucher meta
  voucher_no: string;
  voucher_date: string;
  vendor_challan_no: string;
  vendor_challan_date: string;
  receive_godown: string;

  // Transport
  transporter: string;
  vehicle_no: string;

  lines: ReceiptNotePrintLine[];
  total_qty: number;
  total_value: number;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildReceiptNotePrintPayload(
  voucher: Voucher,
  buyerGst: EntityGSTConfig,
  copyKey: string = RECEIPT_NOTE_COPY_CONFIG.default,
  config?: PrintConfig,
): ReceiptNotePrintPayload {
  const buyer = buildSupplierBlock(buyerGst);

  const lines: ReceiptNotePrintLine[] = (voucher.inventory_lines ?? []).map((l, i) => ({
    sl_no: i + 1,
    item_code: l.item_code || '',
    item_description: l.item_name || '',
    qty: l.qty || 0,
    uom: l.uom || '',
    rate: l.rate || 0,
    value: (l.qty || 0) * (l.rate || 0),
    godown: l.godown_name || '',
    batch: l.batch_id || '',
  }));

  const total_qty = lines.reduce((s, l) => s + l.qty, 0);
  const total_value = lines.reduce((s, l) => s + l.value, 0);

  // [Convergent] Resolve toggles via single source: DEFAULT_TOGGLES + per-voucher overrides.
  // Config absent → DEFAULT_TOGGLES for this voucher type (100% backward compat).
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'receipt_note');

  return {
    copy_key: copyKey,
    copy_label: RECEIPT_NOTE_COPY_CONFIG.labels[copyKey] ?? RECEIPT_NOTE_COPY_CONFIG.labels[RECEIPT_NOTE_COPY_CONFIG.default],

    buyer,
    buyer_address: formatSupplierAddress(buyer),

    vendor_name: voucher.party_name || '',
    vendor_gstin: voucher.party_gstin ?? null,

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    vendor_challan_no: voucher.ref_voucher_no || voucher.vendor_bill_no || '',
    vendor_challan_date: voucher.vendor_bill_date || '',
    receive_godown: voucher.to_godown_name || '',

    transporter: voucher.transporter || '',
    vehicle_no: voucher.vehicle_no || '',

    lines,
    total_qty,
    total_value,

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (buyer.legal_name || buyer.trade_name),

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };
