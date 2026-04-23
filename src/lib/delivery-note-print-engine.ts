/**
 * @file     delivery-note-print-engine.ts
 * @purpose  Build print payload for Delivery Note · 3-copy (Consignee / Transporter / Consignor).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B1 — resolved_toggles added)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B1 (config param + resolved_toggles)
 * @iso      Maintainability (HIGH) · Functional Suitability (HIGH) · Reliability (HIGH backward-compat) · Compatibility (HIGH — purely additive)
 * @whom     Consignee (customer) · Transporter · Consignor (us)
 * @depends  voucher-print-shared.ts · Voucher · EntityGSTConfig · print-config.ts · print-config-storage.ts
 * @consumers DeliveryNotePrint.tsx panel (2b.3b-B2 wires toggle-gating)
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

export const DELIVERY_NOTE_COPY_CONFIG: PrintCopyConfig = {
  keys: ['consignee', 'transporter', 'consignor'],
  labels: {
    consignee: 'CONSIGNEE COPY',
    transporter: 'TRANSPORTER COPY',
    consignor: 'CONSIGNOR COPY',
  },
  default: 'consignee',
};

export interface DeliveryNotePrintLine {
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

export interface DeliveryNotePrintPayload {
  copy_key: string;
  copy_label: string;

  consignor: PrintSupplierBlock;
  consignor_address: string;

  consignee_name: string;
  consignee_gstin: string | null;

  voucher_no: string;
  voucher_date: string;
  against_invoice: string;

  transporter: string;
  vehicle_no: string;
  distance: string | null;
  lr_no: string | null;

  lines: DeliveryNotePrintLine[];
  total_qty: number;
  total_value: number;

  narration: string;
  authorised_signatory: string;

  /** Resolved print toggles for renderer use. Populated by engine from optional PrintConfig; falls back to DEFAULT_TOGGLES when config absent. */
  resolved_toggles: PrintToggles;
}

export function buildDeliveryNotePrintPayload(
  voucher: Voucher,
  consignorGst: EntityGSTConfig,
  copyKey: string = DELIVERY_NOTE_COPY_CONFIG.default,
  config?: PrintConfig,
): DeliveryNotePrintPayload {
  const consignor = buildSupplierBlock(consignorGst);

  const lines: DeliveryNotePrintLine[] = (voucher.inventory_lines ?? []).map((l, i) => ({
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
  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'delivery_note');

  return {
    copy_key: copyKey,
    copy_label: DELIVERY_NOTE_COPY_CONFIG.labels[copyKey] ?? DELIVERY_NOTE_COPY_CONFIG.labels[DELIVERY_NOTE_COPY_CONFIG.default],

    consignor,
    consignor_address: formatSupplierAddress(consignor),

    consignee_name: voucher.party_name || '',
    consignee_gstin: voucher.party_gstin ?? null,

    voucher_no: voucher.voucher_no,
    voucher_date: voucher.date,
    against_invoice: voucher.ref_voucher_no || '',

    transporter: voucher.transporter || '',
    vehicle_no: voucher.vehicle_no || '',
    distance: null,
    lr_no: voucher.lr_no ?? null,

    lines,
    total_qty,
    total_value,

    narration: voucher.narration || '',
    authorised_signatory: 'For ' + (consignor.legal_name || consignor.trade_name),

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };
