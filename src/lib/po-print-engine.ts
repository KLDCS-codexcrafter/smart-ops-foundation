/**
 * @file     po-print-engine.ts
 * @purpose  Build print payload for Procure360 Purchase Order (vendor copy + office copy).
 * @sprint   T-Phase-1.2.6f-d-1 · Block B · D-290 Track 2 partial
 * @who      Operix Engineering (Lovable-generated, Founder-owned)
 * @iso      Maintainability (HIGH) · Compatibility (HIGH — purely additive · D-127 ZERO TOUCH)
 * @whom     Buyer (vendor copy) · Internal (office copy)
 * @depends  voucher-print-shared.ts · types/po.ts · types/entity-gst.ts · types/print-config.ts · print-config-storage.ts
 * @consumers PoListPanel (Print button → Dialog) · panels.tsx
 * @notes    READS Procure360 PurchaseOrderRecord (sibling of voucher schema) · D-127 PurchaseOrder.tsx UNTOUCHED.
 */

import type { PurchaseOrderRecord, PurchaseOrderLine } from '@/types/po';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';

export const PO_COPY_CONFIG: PrintCopyConfig = {
  keys: ['vendor', 'office'],
  labels: {
    vendor: 'VENDOR COPY',
    office: 'OFFICE COPY',
  },
  default: 'vendor',
};

export interface PoPrintLine {
  sl_no: number;
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  rate: number;
  basic_value: number;
  tax_pct: number;
  tax_value: number;
  amount_after_tax: number;
}

export interface PoPrintPayload {
  copy_key: string;
  copy_label: string;

  // Buyer (us)
  buyer: PrintSupplierBlock;
  buyer_address: string;

  // Vendor
  vendor_name: string;

  // PO identity
  po_no: string;
  po_date: string;
  expected_delivery_date: string;
  delivery_address: string;
  status: string;

  // Lines + totals
  lines: PoPrintLine[];
  total_basic_value: number;
  total_tax_value: number;
  total_after_tax: number;
  amount_in_words: string;

  // Footer
  notes: string;
  authorised_signatory: string;

  /** Resolved toggles for renderer use. */
  resolved_toggles: PrintToggles;
}

export function buildPoPrintPayload(
  po: PurchaseOrderRecord,
  buyerGst: EntityGSTConfig,
  copyKey: string = PO_COPY_CONFIG.default,
  config?: PrintConfig,
): PoPrintPayload {
  const buyer = buildSupplierBlock(buyerGst);

  const lines: PoPrintLine[] = (po.lines ?? []).map((l: PurchaseOrderLine, i: number) => ({
    sl_no: i + 1,
    item_code: l.item_id || '',
    item_name: l.item_name || '',
    qty: l.qty || 0,
    uom: l.uom || '',
    rate: l.rate || 0,
    basic_value: l.basic_value || 0,
    tax_pct: l.tax_pct || 0,
    tax_value: l.tax_value || 0,
    amount_after_tax: l.amount_after_tax || 0,
  }));

  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'purchase_order');

  return {
    copy_key: copyKey,
    copy_label: PO_COPY_CONFIG.labels[copyKey] ?? PO_COPY_CONFIG.labels[PO_COPY_CONFIG.default],

    buyer,
    buyer_address: formatSupplierAddress(buyer),

    vendor_name: po.vendor_name || '',

    po_no: po.po_no,
    po_date: po.po_date,
    expected_delivery_date: po.expected_delivery_date || '',
    delivery_address: po.delivery_address || '',
    status: po.status,

    lines,
    total_basic_value: po.total_basic_value || 0,
    total_tax_value: po.total_tax_value || 0,
    total_after_tax: po.total_after_tax || 0,
    amount_in_words: amountInWords(po.total_after_tax || 0),

    notes: po.notes || '',
    authorised_signatory: 'For ' + (buyer.legal_name || buyer.trade_name),

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };
