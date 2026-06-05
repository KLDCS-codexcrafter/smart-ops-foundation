/**
 * @file        src/lib/webstorex-order-engine.ts
 * @purpose     S151 · Storefront orders · DP-WS-3 ONE-WRITE WALL · checkout creates REAL Sales Order
 *              voucher via the existing useOrders.createOrder data path (Order shape + ordersKey
 *              storage consumed verbatim · Quotation→SO precedent) · DP-WS-8 server-side re-evaluation
 *              via evaluateCart at commit · Quick-Order Pad · Request-a-Quote (REAL Quotation voucher
 *              via quotationsKey + generateDocNo('RFQ', ...) — same path useQuotations.createQuotation
 *              uses) · saved carts CRUD · reorder · store-orders register w/ status mirror +
 *              payment-link attach · askAboutProduct → OperixChat customer-channel conversation.
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-3/8/19/22
 * @reads-from  webstorex-engine (CALL ONLY) · webstorex-commerce-engine (CALL ONLY) ·
 *              party-master-engine (CALL ONLY) · operix-chat-engine (CALL ONLY) ·
 *              fincore-engine.generateDocNo / fyForDate (CALL ONLY) · audit-trail-engine.logAudit
 * @walls       webstorex-engine.ts + webstorex-commerce-engine.ts + receivx + salesx engines 0-DIFF.
 *              Order + Quotation TYPES verbatim. NO parallel order object as source of truth —
 *              WsStoreOrder is a LINK + evaluation snapshot only.
 * @JWT         P2BB: customer auth · real payment capture (DP-WS-20 register).
 */
import type { Order, OrderLine } from '@/types/order';
import { ordersKey } from '@/types/order';
import type { Quotation, QuotationItem } from '@/types/quotation';
import { quotationsKey } from '@/types/quotation';
import { generateDocNo, fyForDate } from '@/lib/fincore-engine';
import {
  getStoreItem, listVariants, listStoreItems,
} from '@/lib/webstorex-engine';
import {
  evaluateCart, commitCouponUse, getEffectivePrice,
  earnPoints, redeemPoints, redeemVoucher, redeemCredit,
  reversePointEntry, reverseVoucherEntry, reverseCreditEntry,
  getLoyaltyRule, listSchemes,
} from '@/lib/webstorex-commerce-engine';
import { loadPartyMaster } from '@/lib/party-master-engine';
import { createConversation, sendMessage } from '@/lib/operix-chat-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import type {
  WsCartLine, WsSavedCart, WsStoreOrder, WsQuoteRequest,
  QuickOrderParseResult, CartEvaluation,
} from '@/types/webstorex';
import {
  wsSavedCartsKey, wsStoreOrdersKey, wsQuoteRequestsKey,
} from '@/types/webstorex';

// ─── tiny LS helpers (matches the existing useOrders/useQuotations pattern) ───
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}
function nowIso(nowISO?: string): string { return nowISO ?? new Date().toISOString(); }
function newId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }

function safeAudit(
  entityCode: string, action: 'create' | 'update' | 'cancel',
  recordId: string, label: string,
  before: Record<string, unknown> | null, after: Record<string, unknown> | null,
  reason?: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'webstorex_event',
      recordId, recordLabel: label,
      beforeState: before, afterState: after,
      reason: reason ?? null, sourceModule: 'webstorex-order-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// SAVED CARTS (DP-WS-19.6)
// ═══════════════════════════════════════════════════════════════════════
export function listSavedCarts(entityCode: string, partyId?: string): WsSavedCart[] {
  const all = ls<WsSavedCart>(wsSavedCartsKey(entityCode));
  return partyId ? all.filter((c) => c.partyId === partyId) : all;
}

export function saveCart(
  entityCode: string,
  input: { name: string; lines: WsCartLine[]; partyId?: string | null; byUserId: string },
  nowISO?: string,
): WsSavedCart {
  if (!input.name?.trim()) throw new Error('saved cart name required');
  if (!input.lines.length) throw new Error('saved cart requires ≥1 line');
  for (const l of input.lines) {
    if (l.qty < 1) throw new Error(`line qty must be ≥1 (storeItem ${l.storeItemId})`);
  }
  const ts = nowIso(nowISO);
  const rec: WsSavedCart = {
    id: newId('sc'), entityId: entityCode,
    partyId: input.partyId ?? null, name: input.name.trim(),
    lines: input.lines.map((l) => ({ ...l })),
    createdAt: ts, updatedAt: ts, createdByUserId: input.byUserId,
  };
  const all = ls<WsSavedCart>(wsSavedCartsKey(entityCode));
  ss(wsSavedCartsKey(entityCode), [...all, rec]);
  safeAudit(entityCode, 'create', rec.id, `Saved cart · ${rec.name}`, null, rec as unknown as Record<string, unknown>);
  return rec;
}

export function updateSavedCart(
  entityCode: string, id: string,
  patch: { name?: string; lines?: WsCartLine[] }, nowISO?: string,
): WsSavedCart {
  const all = ls<WsSavedCart>(wsSavedCartsKey(entityCode));
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('saved cart not found');
  const before = { ...all[idx] };
  if (patch.lines) {
    for (const l of patch.lines) if (l.qty < 1) throw new Error('line qty must be ≥1');
  }
  const updated: WsSavedCart = {
    ...all[idx],
    name: patch.name?.trim() || all[idx].name,
    lines: patch.lines ? patch.lines.map((l) => ({ ...l })) : all[idx].lines,
    updatedAt: nowIso(nowISO),
  };
  all[idx] = updated;
  ss(wsSavedCartsKey(entityCode), all);
  safeAudit(entityCode, 'update', id, `Saved cart · ${updated.name}`, before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

export function deleteSavedCart(entityCode: string, id: string): void {
  const all = ls<WsSavedCart>(wsSavedCartsKey(entityCode));
  const target = all.find((c) => c.id === id);
  if (!target) return;
  ss(wsSavedCartsKey(entityCode), all.filter((c) => c.id !== id));
  safeAudit(entityCode, 'cancel', id, `Saved cart deleted · ${target.name}`, target as unknown as Record<string, unknown>, null);
}

export function loadSavedCart(entityCode: string, id: string): WsSavedCart | null {
  return ls<WsSavedCart>(wsSavedCartsKey(entityCode)).find((c) => c.id === id) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// CHECKOUT  — the arc's keystone · ONE-WRITE WALL + SERVER-SIDE TRUTH
// ═══════════════════════════════════════════════════════════════════════
export interface CheckoutOpts {
  partyId: string;
  couponCode?: string | null;
  redeemPoints?: number;
  voucherCode?: string | null;
  redeemCredit?: number;
  byUserId: string;
  placedVia: 'storefront' | 'quick_order' | 'reorder';
  nowISO?: string;
}

export interface CheckoutResult {
  order: WsStoreOrder;
  voucher: Order;
  evaluation: CartEvaluation;
}

export function checkoutCart(
  entityCode: string,
  lines: WsCartLine[],
  opts: CheckoutOpts,
): CheckoutResult {
  if (!lines.length) throw new Error('cart is empty');

  // 1. Validate party
  const party = loadPartyMaster(entityCode).find((p) => p.id === opts.partyId);
  if (!party) throw new Error(`Unknown party: ${opts.partyId}`);
  const partyName = party.party_name;

  // 2. Validate items: published + variant active + MOQ (named)
  for (const l of lines) {
    if (l.qty < 1) throw new Error(`line qty must be ≥1 (storeItem ${l.storeItemId})`);
    const item = getStoreItem(entityCode, l.storeItemId);
    if (!item) throw new Error(`Unknown store item: ${l.storeItemId}`);
    if (item.visibility !== 'published') {
      throw new Error(`Item not published: ${item.storeTitle}`);
    }
    if (item.moq && l.qty < item.moq) {
      throw new Error(`MOQ violated: ${item.storeTitle} requires ≥${item.moq}`);
    }
    if (l.variantId) {
      const variants = listVariants(entityCode, l.storeItemId);
      const v = variants.find((x) => x.id === l.variantId);
      if (!v) throw new Error(`Unknown variant: ${l.variantId}`);
      if (!v.isActive) throw new Error(`Variant inactive: ${v.sku}`);
    }
  }

  // 3. SERVER-SIDE TRUTH — re-evaluate (client totals never trusted)
  const evalLines = lines.map((l) => ({ storeItemId: l.storeItemId, qty: l.qty }));
  const evaluation = evaluateCart(entityCode, evalLines, {
    partyId: opts.partyId,
    couponCode: opts.couponCode ?? undefined,
    nowISO: opts.nowISO,
  });

  // 4. Apply redemptions through the LEDGERS — any throw ABORTS atomically.
  const ts = nowIso(opts.nowISO);
  const orderRef = newId('wsord');
  const rollback: Array<() => void> = [];
  let pointsRedeemed = 0;
  let voucherCodeUsed: string | null = null;
  let creditRedeemed = 0;
  let pointsValue = 0;
  let voucherValue = 0;

  try {
    let payable = evaluation.payable;
    const rule = getLoyaltyRule(entityCode);

    if (opts.redeemPoints && opts.redeemPoints > 0) {
      const pts = Math.floor(opts.redeemPoints);
      const ptValue = rule ? +(pts * rule.redeemValuePerPoint).toFixed(2) : 0;
      if (ptValue > payable) throw new Error('points value exceeds payable');
      const entry = redeemPoints(entityCode, opts.partyId, pts, orderRef, opts.byUserId, opts.nowISO);
      rollback.push(() => { try { reversePointEntry(entityCode, entry.id, 'checkout aborted', opts.byUserId, opts.nowISO); } catch { /* */ } });
      pointsRedeemed = pts; pointsValue = ptValue;
      payable = Math.max(0, +(payable - ptValue).toFixed(2));
    }

    if (opts.voucherCode) {
      const amt = Math.min(payable, evaluation.payable);
      if (amt > 0) {
        const ve = redeemVoucher(entityCode, opts.voucherCode, amt, orderRef, opts.byUserId, opts.nowISO);
        rollback.push(() => { try { reverseVoucherEntry(entityCode, ve.id, 'checkout aborted', opts.byUserId, opts.nowISO); } catch { /* */ } });
        voucherCodeUsed = opts.voucherCode; voucherValue = amt;
        payable = Math.max(0, +(payable - amt).toFixed(2));
      }
    }

    if (opts.redeemCredit && opts.redeemCredit > 0) {
      const amt = Math.min(opts.redeemCredit, payable);
      if (amt > 0) {
        const ce = redeemCredit(entityCode, opts.partyId, amt, `Order ${orderRef}`, orderRef, opts.byUserId, opts.nowISO);
        rollback.push(() => { try { reverseCreditEntry(entityCode, ce.id, 'checkout aborted', opts.byUserId, opts.nowISO); } catch { /* */ } });
        creditRedeemed = amt;
        payable = Math.max(0, +(payable - amt).toFixed(2));
      }
    }

    // 5. Create the REAL SO voucher via the existing path.
    const voucher = writeSalesOrderVoucher(
      entityCode, partyName, opts.partyId, lines, evaluation,
      opts.couponCode ?? null, opts.byUserId, opts.nowISO,
    );

    // 6. Commit side-effects only after voucher success.
    if (opts.couponCode) {
      const scheme = listSchemes(entityCode).find((s) => s.couponCode === opts.couponCode);
      if (scheme) commitCouponUse(entityCode, scheme.id);
    }
    const netForEarn = Math.max(0, +(evaluation.payable - pointsValue - voucherValue - creditRedeemed).toFixed(2));
    earnPoints(entityCode, opts.partyId, netForEarn, voucher.id, opts.byUserId, opts.nowISO);

    // 7. Write the WsStoreOrder snapshot.
    const so: WsStoreOrder = {
      id: orderRef, entityId: entityCode,
      soVoucherId: voucher.id, soVoucherNo: voucher.order_no,
      partyId: opts.partyId, partyName,
      evaluation,
      couponSchemeId: opts.couponCode
        ? (listSchemes(entityCode).find((s) => s.couponCode === opts.couponCode)?.id ?? null)
        : null,
      pointsRedeemed, voucherCodeUsed, creditRedeemed,
      paymentLinkRef: null,
      placedVia: opts.placedVia,
      createdAt: ts, createdByUserId: opts.byUserId,
    };
    const allOrders = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode));
    ss(wsStoreOrdersKey(entityCode), [...allOrders, so]);
    safeAudit(entityCode, 'create', so.id, `WebStoreX order · ${voucher.order_no}`, null, so as unknown as Record<string, unknown>);

    return { order: so, voucher, evaluation };
  } catch (err) {
    for (const rb of rollback.reverse()) rb();
    throw err;
  }
}

// ─── REAL SO voucher writer (mirrors useOrders.createOrder · same key + shape) ───
function writeSalesOrderVoucher(
  entityCode: string,
  partyName: string, partyId: string,
  cartLines: WsCartLine[],
  evaluation: CartEvaluation,
  couponCode: string | null,
  _byUserId: string,
  nowISO?: string,
): Order {
  const ts = nowIso(nowISO);
  const dateOnly = ts.split('T')[0];
  const orderNo = generateDocNo('SO', entityCode);

  const lines: OrderLine[] = [];
  let lineSeq = 0;

  for (const cl of cartLines) {
    const item = getStoreItem(entityCode, cl.storeItemId);
    if (!item) continue;
    const eff = getEffectivePrice(entityCode, cl.storeItemId, partyId, nowISO);
    const rate = eff.effective;
    let descrSuffix = '';
    if (cl.variantId) {
      const v = listVariants(entityCode, cl.storeItemId).find((x) => x.id === cl.variantId);
      if (v) descrSuffix = ` [${v.axes.map((a) => `${a.name}:${a.value}`).join(', ')}]`;
    }
    lineSeq += 1;
    lines.push({
      id: `ol-${Date.now()}-${lineSeq}`,
      item_id: item.itemRefId, item_code: item.itemRefId.slice(0, 20).toUpperCase(),
      item_name: item.storeTitle + descrSuffix,
      hsn_sac_code: '',
      qty: cl.qty, uom: 'NOS',
      rate, discount_percent: 0,
      taxable_value: +(cl.qty * rate).toFixed(2),
      gst_rate: 0,
      pending_qty: cl.qty, fulfilled_qty: 0,
      status: 'open',
    });
  }

  // FREE GOODS as zero-rate lines (DP-WS-3 — scheme-driven freebies).
  for (const fl of evaluation.freeLines) {
    const item = getStoreItem(entityCode, fl.storeItemId);
    if (!item) continue;
    lineSeq += 1;
    lines.push({
      id: `ol-${Date.now()}-${lineSeq}`,
      item_id: item.itemRefId, item_code: item.itemRefId.slice(0, 20).toUpperCase(),
      item_name: `${item.storeTitle} [SCHEME FREE]`,
      hsn_sac_code: '',
      qty: fl.qty, uom: 'NOS',
      rate: 0, discount_percent: 0,
      taxable_value: 0, gst_rate: 0,
      pending_qty: fl.qty, fulfilled_qty: 0,
      status: 'open',
    });
  }

  // DESIGN-DECISION-FLAG · Order shape lacks an order-level discount field — discounts
  // (scheme + coupon + redemptions) are expressed as a SYNTHETIC LINE with negative rate.
  const totalDiscount = evaluation.totalDiscount;
  if (totalDiscount > 0) {
    lineSeq += 1;
    lines.push({
      id: `ol-${Date.now()}-${lineSeq}`,
      item_id: '__discount__', item_code: 'DISC',
      item_name: `Scheme/Coupon Discount${couponCode ? ` · ${couponCode}` : ''}`,
      hsn_sac_code: '',
      qty: 1, uom: 'NOS',
      rate: -totalDiscount, discount_percent: 0,
      taxable_value: -totalDiscount, gst_rate: 0,
      pending_qty: 0, fulfilled_qty: 0,
      status: 'open',
    });
  }

  const grossAmount = lines.reduce((s, l) => s + Math.max(0, l.taxable_value), 0);
  const netAmount = evaluation.payable;

  const order: Order = {
    id: `ord-${Date.now()}`,
    order_no: orderNo,
    base_voucher_type: 'Sales Order',
    entity_id: entityCode,
    fiscal_year_id: `FY-20${fyForDate(dateOnly, entityCode)}`,
    date: dateOnly,
    party_id: partyId, party_name: partyName,
    ref_no: '', ref_date: '',
    quotation_id: null, quotation_no: null,
    lines,
    gross_amount: grossAmount,
    total_tax: 0,
    net_amount: netAmount,
    narration: `WebStoreX order · schemes: ${evaluation.appliedSchemes.map((s) => s.schemeName).join(', ') || 'none'}`,
    terms_conditions: '',
    status: 'open',
    created_at: ts, updated_at: ts,
  };

  // [JWT] POST /api/orders — written into the SAME ordersKey storage useOrders uses.
  const all = ls<Order>(ordersKey(entityCode));
  all.push(order);
  ss(ordersKey(entityCode), all);

  try {
    logAudit({
      entityCode, action: 'create', entityType: 'order',
      recordId: order.id, recordLabel: order.order_no,
      beforeState: null, afterState: { ...order } as unknown as Record<string, unknown>,
      sourceModule: 'webstorex-order-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }

  return order;
}

// ═══════════════════════════════════════════════════════════════════════
// REQUEST A QUOTE — creates REAL Quotation voucher (DP-WS-19.2)
// ═══════════════════════════════════════════════════════════════════════
export function requestQuote(
  entityCode: string,
  lines: WsCartLine[],
  opts: { partyId: string; note?: string | null; byUserId: string; nowISO?: string },
): { quote: Quotation; request: WsQuoteRequest } {
  if (!lines.length) throw new Error('quote request needs ≥1 line');
  const party = loadPartyMaster(entityCode).find((p) => p.id === opts.partyId);
  if (!party) throw new Error(`Unknown party: ${opts.partyId}`);
  const partyName = party.party_name;

  const ts = nowIso(opts.nowISO);
  const items: QuotationItem[] = lines.map((cl, idx) => {
    const item = getStoreItem(entityCode, cl.storeItemId);
    if (!item) throw new Error(`Unknown store item: ${cl.storeItemId}`);
    const eff = getEffectivePrice(entityCode, cl.storeItemId, opts.partyId, opts.nowISO);
    const rate = eff.effective;
    const subTotal = +(cl.qty * rate).toFixed(2);
    let descrSuffix = '';
    if (cl.variantId) {
      const v = listVariants(entityCode, cl.storeItemId).find((x) => x.id === cl.variantId);
      if (v) descrSuffix = ` [${v.axes.map((a) => `${a.name}:${a.value}`).join(', ')}]`;
    }
    return {
      id: `qi-${Date.now()}-${idx}`,
      item_name: item.storeTitle + descrSuffix,
      description: null,
      qty: cl.qty, uom: 'NOS',
      rate, discount_pct: 0,
      sub_total: subTotal,
      tax_pct: 0, tax_amount: 0,
      amount: subTotal,
    };
  });

  const subTotal = items.reduce((s, i) => s + i.sub_total, 0);
  const quote: Quotation = {
    id: `q-${Date.now()}`,
    entity_id: entityCode,
    quotation_no: generateDocNo('RFQ', entityCode),
    quotation_date: ts.split('T')[0],
    quotation_type: 'original', quotation_stage: 'draft',
    enquiry_id: null, enquiry_no: null,
    customer_id: opts.partyId, customer_name: partyName,
    valid_until_days: 30, valid_until_date: null,
    original_quotation_no: null, last_quotation_no: null, last_quotation_date: null,
    revision_number: 0, revision_history: [],
    items,
    sub_total: subTotal, tax_amount: 0, total_amount: subTotal,
    notes: opts.note ?? null, terms_conditions: null,
    proforma_no: null, proforma_date: null, proforma_converted_at: null,
    so_id: null, so_no: null, so_converted_at: null,
    project_id: null,
    is_active: true,
    created_at: ts, updated_at: ts,
  };
  const allQ = ls<Quotation>(quotationsKey(entityCode));
  ss(quotationsKey(entityCode), [...allQ, quote]);

  const request: WsQuoteRequest = {
    id: newId('wsqr'), entityId: entityCode,
    quotationVoucherId: quote.id, quotationVoucherNo: quote.quotation_no,
    partyId: opts.partyId, partyName,
    lines: lines.map((l) => ({ ...l })),
    note: opts.note ?? null,
    createdAt: ts, createdByUserId: opts.byUserId,
  };
  const allR = ls<WsQuoteRequest>(wsQuoteRequestsKey(entityCode));
  ss(wsQuoteRequestsKey(entityCode), [...allR, request]);

  safeAudit(entityCode, 'create', request.id, `WebStoreX quote request · ${quote.quotation_no}`, null, request as unknown as Record<string, unknown>);
  return { quote, request };
}

// ═══════════════════════════════════════════════════════════════════════
// QUICK-ORDER PARSER (DP-WS-19.1) — accepts "SKU qty" lines AND CSV "sku,qty"
// ═══════════════════════════════════════════════════════════════════════
export function parseQuickOrder(entityCode: string, rawText: string): QuickOrderParseResult {
  const result: QuickOrderParseResult = { lines: [], unknownSkus: [], invalidRows: [] };
  if (!rawText) return result;

  const allItems = listStoreItems(entityCode);

  const rows = rawText.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  for (const row of rows) {
    const parts = row.includes(',') ? row.split(',').map((p) => p.trim()) : row.split(/\s+/);
    if (parts.length < 2) { result.invalidRows.push(row); continue; }
    const sku = parts[0];
    const qty = parseInt(parts[1], 10);
    if (!sku || !Number.isFinite(qty) || qty < 1) { result.invalidRows.push(row); continue; }

    // 1. resolve variant SKU first
    let matched = false;
    for (const it of allItems) {
      const variants = listVariants(entityCode, it.id);
      const v = variants.find((x) => x.sku.toLowerCase() === sku.toLowerCase());
      if (v) {
        result.lines.push({ storeItemId: it.id, variantId: v.id, qty });
        matched = true;
        break;
      }
    }
    // 2. item-level resolve (itemRefId match or title prefix)
    if (!matched) {
      const it = allItems.find((i) =>
        i.itemRefId.toLowerCase() === sku.toLowerCase()
        || i.storeTitle.toLowerCase().startsWith(sku.toLowerCase()));
      if (it) { result.lines.push({ storeItemId: it.id, qty }); matched = true; }
    }
    if (!matched) result.unknownSkus.push(sku);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// REORDER · STORE ORDERS REGISTER · STATUS MIRROR · PAYMENT LINK
// ═══════════════════════════════════════════════════════════════════════
export function buildReorderLines(entityCode: string, partyId: string): WsCartLine[] {
  const all = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode));
  const mine = all.filter((o) => o.partyId === partyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = mine[0];
  if (!latest) return [];
  return latest.evaluation.lines.map((l) => ({ storeItemId: l.storeItemId, qty: l.qty }));
}

export interface StoreOrderFilter {
  partyId?: string;
  placedVia?: WsStoreOrder['placedVia'];
  dateFrom?: string; dateTo?: string;
}

export function listStoreOrders(entityCode: string, filter: StoreOrderFilter = {}): WsStoreOrder[] {
  let result = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode));
  if (filter.partyId) result = result.filter((o) => o.partyId === filter.partyId);
  if (filter.placedVia) result = result.filter((o) => o.placedVia === filter.placedVia);
  if (filter.dateFrom) result = result.filter((o) => o.createdAt >= filter.dateFrom!);
  if (filter.dateTo) result = result.filter((o) => o.createdAt <= filter.dateTo!);
  return result;
}

export interface StatusMirror {
  storeOrder: WsStoreOrder | null;
  voucherStatus: Order['status'] | null;
  dispatchStatus: null;     // DESIGN-DECISION-FLAG · S151: no readable dispatch surface at HEAD
}

export function getOrderStatusMirror(entityCode: string, storeOrderId: string): StatusMirror {
  const so = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode)).find((o) => o.id === storeOrderId);
  if (!so) return { storeOrder: null, voucherStatus: null, dispatchStatus: null };
  const v = ls<Order>(ordersKey(entityCode)).find((o) => o.id === so.soVoucherId);
  return { storeOrder: so, voucherStatus: v?.status ?? null, dispatchStatus: null };
}

export function attachPaymentLink(entityCode: string, storeOrderId: string, paymentLinkRef: string): WsStoreOrder {
  // [JWT] capture · ReceivX PaymentLink attach-by-reference
  const all = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode));
  const idx = all.findIndex((o) => o.id === storeOrderId);
  if (idx < 0) throw new Error('store order not found');
  const before = { ...all[idx] };
  const updated: WsStoreOrder = { ...all[idx], paymentLinkRef };
  all[idx] = updated;
  ss(wsStoreOrdersKey(entityCode), all);
  safeAudit(entityCode, 'update', storeOrderId, `Payment link attached · ${paymentLinkRef}`, before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

// ═══════════════════════════════════════════════════════════════════════
// ASK ABOUT PRODUCT — OperixChat customer-channel conversation
// ═══════════════════════════════════════════════════════════════════════
export function askAboutProduct(
  entityCode: string, storeItemId: string, byUserId: string,
): string {
  const item = getStoreItem(entityCode, storeItemId);
  if (!item) throw new Error(`Unknown store item: ${storeItemId}`);
  const conv = createConversation(entityCode, {
    channelType: 'customer',
    ownerId: byUserId, createdByUserId: byUserId,
    participantUserIds: [byUserId],
    linkedRefs: [{ type: 'customer', id: storeItemId, label: `Enquiry: ${item.storeTitle}` }],
    title: `Enquiry: ${item.storeTitle}`,
  });
  try {
    sendMessage(entityCode, conv.id, {
      senderId: byUserId, type: 'text',
      content: `Enquiry: ${item.storeTitle}`,
    });
  } catch { /* opening message is best-effort */ }
  return conv.id;
}
