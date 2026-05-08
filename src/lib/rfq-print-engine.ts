/**
 * @file     rfq-print-engine.ts
 * @purpose  Build print payload for Procure360 Material RFQ (vendor copy + office copy).
 * @sprint   T-Phase-1.A.3.d · Block G · per D-NEW-AT
 * @iso      Maintainability (HIGH) · Compatibility (HIGH — additive · D-127 ZERO TOUCH · D-246 hybrid)
 * @whom     Vendor (vendor copy) · Internal (office copy)
 * @depends  voucher-print-shared · types/rfq · types/procurement-enquiry · types/entity-gst
 * @consumers MaterialRfqPrintPanel.tsx
 * @notes    RFQ is per-(vendor × parent enquiry). Lines join enquiry.lines via rfq.line_item_ids.
 *           2-arg signature (rfqId, entityCode) per D-246 reality.
 * @[JWT]    GET /api/procure360/rfqs/:id (localStorage-backed in Phase 1)
 */

import type { RFQ } from '@/types/rfq';
import type { ProcurementEnquiry } from '@/types/procurement-enquiry';
import { getRfq } from '@/lib/rfq-engine';
import { getEnquiry } from '@/lib/procurement-enquiry-engine';
import {
  buildSupplierBlock, formatSupplierAddress, loadEntityGst,
  formatINR, formatDDMMMYYYY,
  type PrintSupplierBlock, type PrintCopyConfig,
} from '@/lib/voucher-print-shared';

export const RFQ_COPY_CONFIG: PrintCopyConfig = {
  keys: ['vendor', 'office'],
  labels: { vendor: 'VENDOR COPY', office: 'OFFICE COPY' },
  default: 'vendor',
};

export interface RfqPrintLine {
  sl_no: number;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  required_date: string;
  remarks: string;
}

export interface RfqPrintPayload {
  copy_key: string;
  copy_label: string;

  buyer: PrintSupplierBlock;
  buyer_address: string;

  vendor_name: string;

  rfq_no: string;
  parent_enquiry_no: string;
  sent_at: string;
  deadline_at: string;
  delivery_terms: string;
  payment_terms: string;

  lines: RfqPrintLine[];
  notes: string;

  authorised_signatory: string;
}

export function buildRfqPrintPayload(
  rfqId: string,
  entityCode: string,
  copyKey: string = RFQ_COPY_CONFIG.default,
): RfqPrintPayload | null {
  const rfq: RFQ | null = getRfq(rfqId, entityCode);
  if (!rfq) return null;
  const enquiry: ProcurementEnquiry | null = getEnquiry(rfq.parent_enquiry_id, entityCode);

  const buyer = buildSupplierBlock(loadEntityGst(entityCode));
  const idSet = new Set(rfq.line_item_ids);
  const enqLines = enquiry?.lines.filter(l => idSet.has(l.id)) ?? [];

  const lines: RfqPrintLine[] = enqLines.map((l, i) => ({
    sl_no: i + 1,
    item_code: l.item_id || '',
    item_name: l.item_name || '',
    uom: l.uom || '',
    qty: l.required_qty || 0,
    required_date: l.required_date ? formatDDMMMYYYY(l.required_date) : '',
    remarks: l.remarks || '',
  }));

  return {
    copy_key: copyKey,
    copy_label: RFQ_COPY_CONFIG.labels[copyKey] ?? RFQ_COPY_CONFIG.labels[RFQ_COPY_CONFIG.default],

    buyer,
    buyer_address: formatSupplierAddress(buyer),

    vendor_name: rfq.vendor_name || '',

    rfq_no: rfq.rfq_no,
    parent_enquiry_no: enquiry?.enquiry_no ?? '',
    sent_at: rfq.sent_at ? formatDDMMMYYYY(rfq.sent_at) : '',
    deadline_at: rfq.timeout_at ? formatDDMMMYYYY(rfq.timeout_at) : '',
    delivery_terms: 'Standard',
    payment_terms: 'Net 30',

    lines,
    notes: '',

    authorised_signatory: 'For ' + (buyer.legal_name || buyer.trade_name),
  };
}

export { formatINR, formatDDMMMYYYY };
