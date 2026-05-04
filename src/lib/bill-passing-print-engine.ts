/**
 * @file     bill-passing-print-engine.ts
 * @purpose  Build print payload for Bill Passing 3-way Match record (internal review copy).
 * @sprint   T-Phase-1.2.6f-d-1 · Block C · D-290 Track 2 partial
 * @who      Operix Engineering (Lovable-generated, Founder-owned)
 * @iso      Maintainability (HIGH) · Compatibility (HIGH — purely additive)
 * @whom     Accountant / Approver (internal match-review record)
 * @depends  voucher-print-shared.ts · types/bill-passing.ts · types/entity-gst.ts · types/print-config.ts · print-config-storage.ts
 * @consumers MatchReviewPanel (Print button → Dialog) · panels.tsx
 */

import type { BillPassingRecord, BillPassingLine } from '@/types/bill-passing';
import type { EntityGSTConfig } from '@/types/entity-gst';
import type { PrintConfig, PrintToggles } from '@/types/print-config';
import { DEFAULT_PRINT_CONFIG } from '@/types/print-config';
import { resolveToggles } from '@/lib/print-config-storage';
import {
  buildSupplierBlock, formatSupplierAddress,
  amountInWords, formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';

export const BILL_PASSING_COPY_CONFIG: PrintCopyConfig = {
  keys: ['internal'],
  labels: { internal: 'INTERNAL COPY — BILL PASSING MATCH REVIEW' },
  default: 'internal',
};

export interface BillPassingPrintLine {
  sl_no: number;
  item_name: string;

  po_qty: number;
  po_rate: number;
  po_value: number;

  grn_qty: number;

  invoice_qty: number;
  invoice_rate: number;
  invoice_value: number;
  invoice_total: number;

  qty_variance: number;
  rate_variance: number;
  total_variance: number;

  match_status: string;
  variance_reason: string;
}

export interface BillPassingPrintPayload {
  copy_key: string;
  copy_label: string;

  buyer: PrintSupplierBlock;
  buyer_address: string;

  // Bill identity
  bill_no: string;
  bill_date: string;
  vendor_name: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  po_no: string;
  match_type: string;
  status: string;

  // Lines + totals
  lines: BillPassingPrintLine[];
  total_invoice_value: number;
  total_po_value: number;
  total_grn_value: number;
  total_variance: number;
  variance_pct: number;
  amount_in_words: string;

  // Footer
  approval_notes: string;
  authorised_signatory: string;

  /** Resolved toggles for renderer use. */
  resolved_toggles: PrintToggles;
}

export function buildBillPassingPrintPayload(
  bill: BillPassingRecord,
  buyerGst: EntityGSTConfig,
  copyKey: string = BILL_PASSING_COPY_CONFIG.default,
  config?: PrintConfig,
): BillPassingPrintPayload {
  const buyer = buildSupplierBlock(buyerGst);

  const lines: BillPassingPrintLine[] = (bill.lines ?? []).map((l: BillPassingLine, i: number) => ({
    sl_no: i + 1,
    item_name: l.item_name || '',
    po_qty: l.po_qty || 0,
    po_rate: l.po_rate || 0,
    po_value: l.po_value || 0,
    grn_qty: l.grn_qty || 0,
    invoice_qty: l.invoice_qty || 0,
    invoice_rate: l.invoice_rate || 0,
    invoice_value: l.invoice_value || 0,
    invoice_total: l.invoice_total || 0,
    qty_variance: l.qty_variance || 0,
    rate_variance: l.rate_variance || 0,
    total_variance: l.total_variance || 0,
    match_status: l.match_status,
    variance_reason: l.variance_reason || '',
  }));

  const resolved_toggles = resolveToggles(config ?? DEFAULT_PRINT_CONFIG, 'bill_passing');

  return {
    copy_key: copyKey,
    copy_label: BILL_PASSING_COPY_CONFIG.labels[copyKey] ?? BILL_PASSING_COPY_CONFIG.labels[BILL_PASSING_COPY_CONFIG.default],

    buyer,
    buyer_address: formatSupplierAddress(buyer),

    bill_no: bill.bill_no,
    bill_date: bill.bill_date,
    vendor_name: bill.vendor_name || '',
    vendor_invoice_no: bill.vendor_invoice_no || '',
    vendor_invoice_date: bill.vendor_invoice_date || '',
    po_no: bill.po_no || '',
    match_type: bill.match_type,
    status: bill.status,

    lines,
    total_invoice_value: bill.total_invoice_value || 0,
    total_po_value: bill.total_po_value || 0,
    total_grn_value: bill.total_grn_value || 0,
    total_variance: bill.total_variance || 0,
    variance_pct: bill.variance_pct || 0,
    amount_in_words: amountInWords(bill.total_invoice_value || 0),

    approval_notes: bill.approval_notes || '',
    authorised_signatory: 'For ' + (buyer.legal_name || buyer.trade_name),

    resolved_toggles,
  };
}

export { formatINR, formatDDMMMYYYY };
