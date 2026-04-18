/**
 * partner-order-engine.ts — Pure functions for tier pricing, credit checks,
 * smart reorder, and order-number sequencing.
 * Sprint 10. NO React, NO localStorage in computation (callers pass data in).
 */
import type { PriceList, PriceListItem } from '@/types/price-list';
import type { Voucher } from '@/types/voucher';
import type {
  PartnerCart,
  PartnerOrder,
  PartnerOrderLine,
  PartnerOrderStatus,
} from '@/types/partner-order';
import type { Partner } from '@/types/partner';

/**
 * resolveTierPrice — given the partner's price list and an item, return the
 * tier-specific rate in paise. Falls back to listFallbackPaise when the item
 * is not on the list (defensive — UI hides off-list items).
 */
export function resolveTierPrice(
  itemId: string,
  priceListId: string | null,
  allItems: PriceListItem[],
  listFallbackPaise: number,
): { rate_paise: number; min_qty: number; discount_percent: number; on_list: boolean } {
  if (!priceListId) {
    return { rate_paise: listFallbackPaise, min_qty: 1, discount_percent: 0, on_list: false };
  }
  const row = allItems.find(p => p.price_list_id === priceListId && p.item_id === itemId);
  if (!row) {
    return { rate_paise: listFallbackPaise, min_qty: 1, discount_percent: 0, on_list: false };
  }
  return {
    rate_paise: Math.round(row.price * 100),  // PriceListItem.price is rupees → paise
    min_qty: row.min_qty ?? 1,
    discount_percent: row.discount_percent ?? 0,
    on_list: true,
  };
}

/**
 * calcLineTotals — pure GST split. interstate=true → IGST only; else CGST+SGST.
 * gstRate is whole percent (e.g. 18 for 18%). All amounts in paise.
 */
export function calcLineTotals(
  qty: number,
  ratePaise: number,
  discountPercent: number,
  gstRate: number,
  interstate: boolean,
): Pick<PartnerOrderLine, 'taxable_paise' | 'cgst_paise' | 'sgst_paise' | 'igst_paise' | 'total_paise'> {
  const gross = qty * ratePaise;
  const discount = Math.round(gross * (discountPercent / 100));
  const taxable = gross - discount;
  const taxTotal = Math.round(taxable * (gstRate / 100));
  if (interstate) {
    return {
      taxable_paise: taxable,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: taxTotal,
      total_paise: taxable + taxTotal,
    };
  }
  const halfTax = Math.round(taxTotal / 2);
  return {
    taxable_paise: taxable,
    cgst_paise: halfTax,
    sgst_paise: taxTotal - halfTax,
    igst_paise: 0,
    total_paise: taxable + taxTotal,
  };
}

/**
 * checkCreditAvailable — pure credit-limit gate.
 * Returns OK if (outstanding + cart_total) <= credit_limit.
 */
export function checkCreditAvailable(
  partner: Partner,
  cartTotalPaise: number,
): { ok: boolean; available_paise: number; would_exceed_by_paise: number } {
  const available = partner.credit_limit_paise - partner.outstanding_paise;
  const after = partner.outstanding_paise + cartTotalPaise;
  return {
    ok: after <= partner.credit_limit_paise,
    available_paise: Math.max(0, available),
    would_exceed_by_paise: Math.max(0, after - partner.credit_limit_paise),
  };
}

/**
 * suggestReorderQty — days-of-cover math. NO ML.
 *
 *   bought_30d = sum(qty over last 30 days for this item, this partner)
 *   daily_run  = bought_30d / 30
 *   suggested  = ceil(daily_run * cover_days) - on_hand_estimate
 *
 * Returns 0 if no recent purchases (don't pester the user).
 */
export function suggestReorderQty(
  itemId: string,
  recentInvoices: Voucher[],
  partnerCustomerId: string,
  onHandEstimate: number,
  coverDays: number = 30,
): { suggested: number; bought_last_30d: number; daily_run_rate: number } {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let bought30 = 0;
  for (const v of recentInvoices) {
    if (v.party_id !== partnerCustomerId) continue;
    if (new Date(v.date).getTime() < cutoff) continue;
    for (const ln of v.inventory_lines ?? []) {
      if (ln.item_id === itemId) bought30 += ln.qty ?? 0;
    }
  }
  const daily = bought30 / 30;
  const target = Math.ceil(daily * coverDays);
  const suggested = Math.max(0, target - onHandEstimate);
  return {
    suggested,
    bought_last_30d: bought30,
    daily_run_rate: Math.round(daily * 100) / 100,
  };
}

/**
 * cartToOrder — converts a draft cart into a submittable PartnerOrder.
 * Pure: caller persists the result and clears the cart.
 */
export function cartToOrder(
  cart: PartnerCart,
  partner: Partner,
  orderNo: string,
  now: string = new Date().toISOString(),
): PartnerOrder {
  const totalTaxable = cart.lines.reduce((s, l) => s + l.taxable_paise, 0);
  const totalTax = cart.lines.reduce(
    (s, l) => s + l.cgst_paise + l.sgst_paise + l.igst_paise, 0);
  const grand = cart.lines.reduce((s, l) => s + l.total_paise, 0);
  return {
    id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    order_no: orderNo,
    partner_id: partner.id,
    partner_code: partner.partner_code,
    partner_name: partner.legal_name,
    entity_code: cart.entity_code,
    status: 'submitted' as PartnerOrderStatus,
    lines: cart.lines,
    total_taxable_paise: totalTaxable,
    total_tax_paise: totalTax,
    grand_total_paise: grand,
    notes: cart.notes,
    delivery_address: cart.delivery_address,
    expected_delivery_date: cart.expected_delivery_date,
    rejection_reason: null,
    linked_invoice_id: null,
    submitted_at: now,
    reviewed_at: null,
    reviewed_by: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * nextOrderNumber — pure sequence helper. Format: PO/YYYY/00001.
 * Caller passes the current order list; we look at the max for this year.
 */
export function nextOrderNumber(existingOrders: PartnerOrder[], year: number = new Date().getFullYear()): string {
  const prefix = `PO/${year}/`;
  const maxSeq = existingOrders
    .filter(o => o.order_no.startsWith(prefix))
    .map(o => parseInt(o.order_no.slice(prefix.length), 10))
    .filter(n => !Number.isNaN(n))
    .reduce((m, n) => Math.max(m, n), 0);
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

/**
 * pickActivePriceList — pure tier→price-list resolver.
 * If partner.price_list_id is set, use it. Otherwise pick the one matching
 * `list_type='distributor'` and is_default=true.
 */
export function pickActivePriceList(partner: Partner, allLists: PriceList[]): string | null {
  if (partner.price_list_id) return partner.price_list_id;
  const defaultList = allLists.find(l => l.list_type === 'distributor' && l.is_default && l.status === 'active');
  return defaultList?.id ?? null;
}
