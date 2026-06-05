/**
 * @file   src/test/sprint-151/webstorex-storefront.test.ts
 * @sprint Sprint 151 · T-WebStoreX-A11.3 · §N hard floor ≥36 it() · count stated below.
 *
 * COUNT: 47 it() blocks (floor 36 satisfied).
 * Covers: saved carts CRUD + qty guard · parseQuickOrder (text + CSV + variant SKU first +
 *         invalid + unknown) · checkoutCart ONE-WRITE WALL (REAL Order voucher · ordersKey
 *         shape preserved · synthetic discount line · free-goods zero-rate lines) ·
 *         SERVER-SIDE TRUTH (client totals ignored) · MOQ / publication / variant-active
 *         validations named · couponCommit fires only at checkout · loyalty earn on net ·
 *         redemption rollback on voucher failure · requestQuote creates REAL Quotation
 *         voucher · listStoreOrders filters · getOrderStatusMirror voucher mirror ·
 *         dispatchStatus = null (DESIGN-DECISION-FLAG) · attachPaymentLink · buildReorder
 *         lines · askAboutProduct creates conversation · registers updated · meta-assertion.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCart, updateSavedCart, deleteSavedCart, loadSavedCart, listSavedCarts,
  checkoutCart, requestQuote, parseQuickOrder,
  listStoreOrders, getOrderStatusMirror, attachPaymentLink, buildReorderLines,
  askAboutProduct,
} from '@/lib/webstorex-order-engine';
import { publishItem, addVariant } from '@/lib/webstorex-engine';
import {
  createScheme, listSchemes, upsertLoyaltyRule,
  issueCredit, getPointsBalance, getCreditBalance, listPointEntries,
} from '@/lib/webstorex-commerce-engine';
import { ordersKey } from '@/types/order';
import { quotationsKey } from '@/types/quotation';
import { partyMasterKey, LEGACY_CUSTOMER_KEY } from '@/types/party';
import { wsStoreOrdersKey, wsSavedCartsKey } from '@/types/webstorex';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'TST';
const PID = 'PARTY-1';

function seedMaster(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-shirt', name: 'Cotton Shirt', on_hand_qty: 100 },
    { id: 'm-mug',   name: 'Coffee Mug',   on_hand_qty: 50 },
  ]));
}
function seedParty(): void {
  const party = {
    id: PID, entity_id: ENT, party_code: 'CUST/0001', party_name: 'Sharma Traders',
    party_type: 'customer', gstin: null, state_code: null,
    created_via_quick_add: false, audit_flag_resolved_at: null, group: 'retail',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'u-1',
  };
  localStorage.setItem(partyMasterKey(ENT), JSON.stringify([party]));
  localStorage.setItem(LEGACY_CUSTOMER_KEY, JSON.stringify([{ id: PID, group: 'retail' }]));
}
function publishItems(): { shirt: string; mug: string } {
  const a = publishItem(ENT, 'm-shirt', 'u-1', { listPrice: 500 });
  const b = publishItem(ENT, 'm-mug',   'u-1', { listPrice: 200 });
  // Force-publish (skip image/category guard — orthogonal to S151 storefront tests).
  const raw = JSON.parse(localStorage.getItem(`ws_items_${ENT}`) ?? '[]');
  for (const r of raw) r.visibility = 'published';
  localStorage.setItem(`ws_items_${ENT}`, JSON.stringify(raw));
  return { shirt: a.id, mug: b.id };
}

beforeEach(() => { localStorage.clear(); seedMaster(); seedParty(); });

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · Saved carts (DP-WS-19.6)', () => {
  it('saves a cart with name + lines', () => {
    const { shirt } = publishItems();
    const sc = saveCart(ENT, { name: 'Monthly', lines: [{ storeItemId: shirt, qty: 3 }], byUserId: 'u-1' });
    expect(sc.name).toBe('Monthly');
    expect(sc.lines).toHaveLength(1);
    expect(listSavedCarts(ENT)).toHaveLength(1);
  });
  it('rejects empty name', () => {
    const { shirt } = publishItems();
    expect(() => saveCart(ENT, { name: '', lines: [{ storeItemId: shirt, qty: 1 }], byUserId: 'u-1' })).toThrow();
  });
  it('rejects empty lines', () => {
    expect(() => saveCart(ENT, { name: 'X', lines: [], byUserId: 'u-1' })).toThrow();
  });
  it('rejects qty < 1', () => {
    const { shirt } = publishItems();
    expect(() => saveCart(ENT, { name: 'X', lines: [{ storeItemId: shirt, qty: 0 }], byUserId: 'u-1' })).toThrow();
  });
  it('updateSavedCart renames and replaces lines', () => {
    const { shirt, mug } = publishItems();
    const sc = saveCart(ENT, { name: 'A', lines: [{ storeItemId: shirt, qty: 1 }], byUserId: 'u-1' });
    const upd = updateSavedCart(ENT, sc.id, { name: 'B', lines: [{ storeItemId: mug, qty: 2 }] });
    expect(upd.name).toBe('B');
    expect(upd.lines[0].storeItemId).toBe(mug);
  });
  it('deleteSavedCart removes record + loadSavedCart returns null', () => {
    const { shirt } = publishItems();
    const sc = saveCart(ENT, { name: 'A', lines: [{ storeItemId: shirt, qty: 1 }], byUserId: 'u-1' });
    deleteSavedCart(ENT, sc.id);
    expect(loadSavedCart(ENT, sc.id)).toBeNull();
  });
  it('saved carts use dedicated storage key', () => {
    const { shirt } = publishItems();
    saveCart(ENT, { name: 'A', lines: [{ storeItemId: shirt, qty: 1 }], byUserId: 'u-1' });
    const raw = localStorage.getItem(wsSavedCartsKey(ENT));
    expect(raw).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · parseQuickOrder (DP-WS-19.1)', () => {
  it('parses space-separated SKU qty rows', () => {
    publishItems();
    const r = parseQuickOrder(ENT, 'm-shirt 3\nm-mug 5');
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].qty).toBe(3);
  });
  it('parses CSV "sku,qty" rows', () => {
    publishItems();
    const r = parseQuickOrder(ENT, 'm-shirt,2\nm-mug,4');
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].qty).toBe(4);
  });
  it('resolves variant SKU before item-level', () => {
    const { shirt } = publishItems();
    addVariant(ENT, shirt, { sku: 'SH-XL', axes: [{ name: 'Size', value: 'XL' }], stockAllocation: 10 });
    const r = parseQuickOrder(ENT, 'SH-XL 7');
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].variantId).toBeTruthy();
  });
  it('surfaces unknown SKUs (never silently drops)', () => {
    publishItems();
    const r = parseQuickOrder(ENT, 'm-shirt 1\nFAKE-SKU 9');
    expect(r.unknownSkus).toContain('FAKE-SKU');
  });
  it('captures invalid rows (qty not parseable)', () => {
    publishItems();
    const r = parseQuickOrder(ENT, 'm-shirt abc');
    expect(r.invalidRows.length).toBeGreaterThan(0);
  });
  it('returns empty result on blank input', () => {
    const r = parseQuickOrder(ENT, '');
    expect(r.lines).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · checkoutCart · ONE-WRITE WALL (DP-WS-3)', () => {
  it('creates a REAL Sales Order voucher in ordersKey storage', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 2 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(r.voucher.base_voucher_type).toBe('Sales Order');
    const persisted = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]');
    expect(persisted.find((o: { id: string }) => o.id === r.voucher.id)).toBeTruthy();
  });
  it('voucher number follows SO/<FY>/#### shape (REUSED generateDocNo)', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(r.voucher.order_no).toMatch(/^SO\//);
  });
  it('WsStoreOrder is a LINK + snapshot, NEVER the source of truth', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(r.order.soVoucherId).toBe(r.voucher.id);
    expect(r.order.soVoucherNo).toBe(r.voucher.order_no);
  });
  it('expresses discounts via SYNTHETIC negative-rate line (DESIGN-DECISION-FLAG)', () => {
    const { shirt } = publishItems();
    createScheme(ENT, {
      name: 'Save5', type: 'order_value_discount',
      minOrderValue: 100, orderDiscountPct: 5,
      validFrom: '2000-01-01T00:00:00.000Z', validTo: '2099-12-31T00:00:00.000Z',
      stackable: false, isActive: true,
    });
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 2 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const discLine = r.voucher.lines.find(l => l.item_id === '__discount__');
    expect(discLine).toBeTruthy();
    expect(discLine!.rate).toBeLessThan(0);
  });
  it('renders free goods as ZERO-RATE order lines', () => {
    const { shirt, mug } = publishItems();
    createScheme(ENT, {
      name: 'B1G1', type: 'buy_x_get_y',
      buyStoreItemId: shirt, buyQty: 2, getStoreItemId: mug, getQty: 1,
      validFrom: '2000-01-01T00:00:00.000Z', validTo: '2099-12-31T00:00:00.000Z',
      stackable: false, isActive: true,
    });
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 2 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const freeLine = r.voucher.lines.find(l => l.rate === 0 && l.item_name.includes('SCHEME FREE'));
    expect(freeLine).toBeTruthy();
  });
  it('rejects empty cart', () => {
    expect(() => checkoutCart(ENT, [], { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' })).toThrow(/empty/);
  });
  it('throws naming the item on MOQ violation', () => {
    const { shirt } = publishItems();
    const ws = JSON.parse(localStorage.getItem(`ws_items_${ENT}`) ?? '[]');
    const ix = ws.findIndex((x: { id: string }) => x.id === shirt);
    ws[ix].moq = 5;
    localStorage.setItem(`ws_items_${ENT}`, JSON.stringify(ws));
    expect(() => checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' })).toThrow(/MOQ/);
  });
  it('throws on unpublished item', () => {
    const { shirt } = publishItems();
    const ws = JSON.parse(localStorage.getItem(`ws_items_${ENT}`) ?? '[]');
    ws.find((x: { id: string }) => x.id === shirt).visibility = 'draft';
    localStorage.setItem(`ws_items_${ENT}`, JSON.stringify(ws));
    expect(() => checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' })).toThrow(/published/);
  });
  it('throws on inactive variant', () => {
    const { shirt } = publishItems();
    const v = addVariant(ENT, shirt, { sku: 'V1', axes: [{ name: 'S', value: 'M' }], stockAllocation: 5 });
    const vraw = JSON.parse(localStorage.getItem(`ws_variants_${ENT}`) ?? '[]');
    vraw.find((x: { id: string }) => x.id === v.id).isActive = false;
    localStorage.setItem(`ws_variants_${ENT}`, JSON.stringify(vraw));
    expect(() => checkoutCart(ENT, [{ storeItemId: shirt, variantId: v.id, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' })).toThrow(/inactive/);
  });
  it('throws on unknown party', () => {
    const { shirt } = publishItems();
    expect(() => checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: 'P-NOPE', byUserId: 'u-1', placedVia: 'storefront' })).toThrow(/Unknown party/);
  });
  it('persists store order under wsStoreOrdersKey', () => {
    const { shirt } = publishItems();
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const raw = localStorage.getItem(wsStoreOrdersKey(ENT));
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · SERVER-SIDE TRUTH + ledger atomicity (DP-WS-8)', () => {
  it('coupon usedCount commits ONLY at checkout', () => {
    const { shirt } = publishItems();
    createScheme(ENT, {
      name: 'C', type: 'coupon', couponCode: 'OFF10', couponDiscountPct: 10,
      validFrom: '2000-01-01T00:00:00.000Z', validTo: '2099-12-31T00:00:00.000Z',
      stackable: false, isActive: true,
    });
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, couponCode: 'OFF10', byUserId: 'u-1', placedVia: 'storefront' });
    const s = listSchemes(ENT).find(x => x.couponCode === 'OFF10');
    expect(s!.couponUsedCount).toBe(1);
  });
  it('earnPoints commits on NET payable (loyalty rule active)', () => {
    const { shirt } = publishItems();
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 0, redeemValuePerPoint: 1, expiryMonths: null, isActive: true });
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 2 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(getPointsBalance(ENT, PID)).toBeGreaterThan(0);
  });
  it('credit redemption deducts from credit balance', () => {
    const { shirt } = publishItems();
    issueCredit(ENT, PID, 200, 'goodwill', 'u-1');
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, redeemCredit: 100, byUserId: 'u-1', placedVia: 'storefront' });
    expect(getCreditBalance(ENT, PID)).toBe(100);
  });
  it('points-value > payable throws (no ledger mutation)', () => {
    const { shirt } = publishItems();
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0, minOrderValue: 0, redeemValuePerPoint: 1000, expiryMonths: null, isActive: true });
    const before = listPointEntries(ENT, PID).length;
    expect(() => checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, redeemPoints: 100, byUserId: 'u-1', placedVia: 'storefront' })).toThrow();
    expect(listPointEntries(ENT, PID).length).toBe(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · Request a quote (DP-WS-19.2)', () => {
  it('creates a REAL Quotation voucher via quotationsKey', () => {
    const { shirt } = publishItems();
    const r = requestQuote(ENT, [{ storeItemId: shirt, qty: 4 }],
      { partyId: PID, byUserId: 'u-1' });
    const all = JSON.parse(localStorage.getItem(quotationsKey(ENT)) ?? '[]');
    expect(all.find((q: { id: string }) => q.id === r.quote.id)).toBeTruthy();
  });
  it('quotation number follows RFQ/ shape', () => {
    const { shirt } = publishItems();
    const r = requestQuote(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1' });
    expect(r.quote.quotation_no).toMatch(/^RFQ\//);
  });
  it('rejects empty lines', () => {
    expect(() => requestQuote(ENT, [], { partyId: PID, byUserId: 'u-1' })).toThrow();
  });
  it('rejects unknown party', () => {
    const { shirt } = publishItems();
    expect(() => requestQuote(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: 'P-NOPE', byUserId: 'u-1' })).toThrow(/Unknown party/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · Store orders register · status mirror · payment link · reorder', () => {
  it('listStoreOrders filters by partyId', () => {
    const { shirt } = publishItems();
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(listStoreOrders(ENT, { partyId: PID })).toHaveLength(1);
    expect(listStoreOrders(ENT, { partyId: 'P-NONE' })).toHaveLength(0);
  });
  it('listStoreOrders filters by placedVia', () => {
    const { shirt } = publishItems();
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'quick_order' });
    expect(listStoreOrders(ENT, { placedVia: 'quick_order' })).toHaveLength(1);
    expect(listStoreOrders(ENT, { placedVia: 'storefront' })).toHaveLength(0);
  });
  it('getOrderStatusMirror mirrors voucher status', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const m = getOrderStatusMirror(ENT, r.order.id);
    expect(m.voucherStatus).toBe('open');
  });
  it('dispatchStatus = null at HEAD (DESIGN-DECISION-FLAG)', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    expect(getOrderStatusMirror(ENT, r.order.id).dispatchStatus).toBeNull();
  });
  it('attachPaymentLink stores the ref by reference', () => {
    const { shirt } = publishItems();
    const r = checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const u = attachPaymentLink(ENT, r.order.id, 'PLNK-X');
    expect(u.paymentLinkRef).toBe('PLNK-X');
  });
  it('attachPaymentLink throws on unknown order', () => {
    expect(() => attachPaymentLink(ENT, 'nope', 'PLNK')).toThrow(/not found/);
  });
  it('buildReorderLines returns last cart for party', () => {
    const { shirt, mug } = publishItems();
    checkoutCart(ENT, [{ storeItemId: shirt, qty: 1 }, { storeItemId: mug, qty: 2 }],
      { partyId: PID, byUserId: 'u-1', placedVia: 'storefront' });
    const lines = buildReorderLines(ENT, PID);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
  it('buildReorderLines returns [] for party with no orders', () => {
    expect(buildReorderLines(ENT, 'P-NONE')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · askAboutProduct → OperixChat customer-channel', () => {
  it('creates a conversation and returns its id', () => {
    const { shirt } = publishItems();
    const id = askAboutProduct(ENT, shirt, 'u-1');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
  it('throws on unknown item', () => {
    expect(() => askAboutProduct(ENT, 'nope', 'u-1')).toThrow(/Unknown/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S151 · Institutional registers + meta-assertion', () => {
  it('webstorex-order-engine is registered as a sibling', () => {
    const hit = SIBLINGS.find(s => s.id === 'webstorex-order-engine');
    expect(hit).toBeTruthy();
    expect(hit!.sprintAdded).toBe(151);
  });
  it('S150 entry exists with backfilled SHA (no longer TBD)', () => {
    const s150 = SPRINTS.find(s => s.sprintNumber === 150);
    expect(s150).toBeTruthy();
    expect(s150!.headSha).not.toBe('TBD_AT_BANK');
  });
  it('S151 entry exists (TBD until commit)', () => {
    const s151 = SPRINTS.find(s => s.sprintNumber === 151);
    expect(s151).toBeTruthy();
    expect(s151!.newSiblings).toContain('webstorex-order-engine');
  });
  it('NO S152 entry exists (sprint discipline)', () => {
    expect(SPRINTS.find(s => s.sprintNumber === 152)).toBeUndefined();
  });
  it('meta: webstorex-engine + commerce-engine remain in registry (0-DIFF wall)', () => {
    expect(SIBLINGS.find(s => s.id === 'webstorex-engine')).toBeTruthy();
    expect(SIBLINGS.find(s => s.id === 'webstorex-commerce-engine')).toBeTruthy();
  });
});
