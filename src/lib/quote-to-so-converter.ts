/**
 * quote-to-so-converter.ts — Convert a Quotation into Sales Order shape
 * Pure function — no React, no hooks. Caller invokes useOrders.createOrder + useQuotations.markConvertedToSO.
 * Sprint T-Phase-1.1.1k-followup
 */
import type { Quotation, QuotationItem } from '@/types/quotation';
import type { Order, OrderLine } from '@/types/order';

/** Build an OrderLine array from quotation items */
export function quotationItemsToOrderLines(items: QuotationItem[]): OrderLine[] {
  return items.map((q, idx) => ({
    id: `ol-${Date.now()}-${idx}`,
    item_id: q.id,                                     // QuotationItem.id used as item ref (Phase 1)
    item_code: q.item_name.slice(0, 20).toUpperCase(),
    item_name: q.item_name,
    hsn_sac_code: '',                                  // not on QuotationItem; user fills in SO if needed
    qty: q.qty,
    uom: q.uom ?? 'NOS',
    rate: q.rate,
    discount_percent: q.discount_pct,
    taxable_value: q.sub_total,
    gst_rate: q.tax_pct,
    pending_qty: q.qty,
    fulfilled_qty: 0,
    status: 'open' as const,
  }));
}

/** Build the input shape required by useOrders.createOrder */
export function quotationToOrderInput(
  q: Quotation,
  entityCode: string,
): Omit<Order, 'id' | 'order_no' | 'status' | 'created_at' | 'updated_at'> {
  return {
    base_voucher_type: 'Sales Order',
    entity_id: entityCode,
    date: new Date().toISOString().split('T')[0],
    valid_till: q.valid_until_date ?? undefined,
    party_id: q.customer_id ?? '',
    party_name: q.customer_name ?? '',
    ref_no: q.quotation_no,
    ref_date: q.quotation_date,
    quotation_id: q.id,
    quotation_no: q.quotation_no,
    lines: quotationItemsToOrderLines(q.items),
    gross_amount: q.sub_total,
    total_tax: q.tax_amount,
    net_amount: q.total_amount,
    narration: `Converted from Quotation ${q.quotation_no}`,
    terms_conditions: q.terms_conditions ?? '',
  };
}
