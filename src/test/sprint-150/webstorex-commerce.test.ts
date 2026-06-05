/**
 * @file   src/test/sprint-150/webstorex-commerce.test.ts
 * @sprint Sprint 150 · T-WebStoreX-A11.2 · §N hard floor ≥34 it() · count stated below.
 *
 * COUNT: 38 it() blocks (floor 34 satisfied).
 * Covers: effective-price lowest-wins + source · party-without-list fallback · campaign window
 *         boundaries (time-robust) · price-list one-assignment-move · scheme type-field
 *         validation throws · evaluateCart (B1G1 zero-rate · slab boundary · order-value ·
 *         best-single-wins · stackable=true · party-group filter) · coupon (unique-code throw ·
 *         window · usage-limit exhaustion · pct/flat exclusivity · commitCouponUse separation) ·
 *         loyalty (APPEND-ONLY structural assertion · earn rule-gated · redeem insufficient ·
 *         expiry · reversal + double-reversal) · voucher (over-balance · expired · partial) ·
 *         credit (reason-mandatory + balance) · testimonial publish filter · registers · audit.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPriceList, assignPartyToPriceList, listPriceLists,
  createCampaign, getActiveCampaign,
  getEffectivePrice,
  createScheme, evaluateCart, commitCouponUse, listSchemes,
  upsertLoyaltyRule, earnPoints, redeemPoints, reversePointEntry,
  getPointsBalance, listPointEntries,
  issueVoucher, redeemVoucher, reverseVoucherEntry, getVoucherBalance,
  issueCredit, redeemCredit, getCreditBalance,
  createTestimonial, setTestimonialPublished, listPublishedTestimonials,
} from '@/lib/webstorex-commerce-engine';
import * as CommerceEngine from '@/lib/webstorex-commerce-engine';
import { publishItem } from '@/lib/webstorex-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'TST';

function seedMaster(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-shirt', name: 'Cotton Shirt', on_hand_qty: 100 },
    { id: 'm-mug',   name: 'Coffee Mug',   on_hand_qty: 50 },
    { id: 'm-pen',   name: 'Ball Pen',     on_hand_qty: 200 },
  ]));
}
function publishAll(): { shirt: string; mug: string; pen: string } {
  const a = publishItem(ENT, { itemRefId: 'm-shirt', listPrice: 500, categoryId: null, brandId: null }, 'u-1');
  const b = publishItem(ENT, { itemRefId: 'm-mug',   listPrice: 200, categoryId: null, brandId: null }, 'u-1');
  const c = publishItem(ENT, { itemRefId: 'm-pen',   listPrice: 50,  categoryId: null, brandId: null }, 'u-1');
  return { shirt: a.id, mug: b.id, pen: c.id };
}
function seedParty(id: string, group: string | null): void {
  const raw = localStorage.getItem('erp_group_customer_master');
  const arr = raw ? JSON.parse(raw) : [];
  arr.push({ id, group });
  localStorage.setItem('erp_group_customer_master', JSON.stringify(arr));
}

beforeEach(() => { localStorage.clear(); seedMaster(); });

describe('S150 · Effective price · lowest-wins (DESIGN-DECISION-FLAG)', () => {
  it('returns list price when no campaign and no price list', () => {
    const { shirt } = publishAll();
    const ep = getEffectivePrice(ENT, shirt);
    expect(ep.effective).toBe(500); expect(ep.source).toBe('list');
  });
  it('picks campaign price when lower than list', () => {
    const { shirt } = publishAll();
    createCampaign(ENT, {
      name: 'Diwali', startsAt: new Date(Date.now() - 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      bannerDataUrl: null, collectionItemIds: [shirt],
      offerPrices: [{ storeItemId: shirt, offerPrice: 400 }], isActive: true,
    });
    const ep = getEffectivePrice(ENT, shirt);
    expect(ep.effective).toBe(400); expect(ep.source).toBe('campaign');
  });
  it('picks price-list rate when lowest', () => {
    const { shirt } = publishAll();
    seedParty('P1', 'gold');
    createPriceList(ENT, { name: 'Gold', mode: 'per_item', percentOff: null,
      itemRates: [{ storeItemId: shirt, rate: 350 }], assignedPartyIds: ['P1'], isActive: true });
    const ep = getEffectivePrice(ENT, shirt, 'P1');
    expect(ep.effective).toBe(350); expect(ep.source).toBe('price_list');
  });
  it('reports source = list when party has no list', () => {
    const { shirt } = publishAll();
    const ep = getEffectivePrice(ENT, shirt, 'P-unknown');
    expect(ep.source).toBe('list');
  });
  it('percent_off_list price list reduces price', () => {
    const { shirt } = publishAll();
    seedParty('P2', null);
    createPriceList(ENT, { name: 'VIP', mode: 'percent_off_list', percentOff: 20,
      itemRates: [], assignedPartyIds: ['P2'], isActive: true });
    const ep = getEffectivePrice(ENT, shirt, 'P2');
    expect(ep.priceListPrice).toBe(400);
  });
});

describe('S150 · Campaign windows · time-robust', () => {
  it('getActiveCampaign returns null before startsAt', () => {
    createCampaign(ENT, { name: 'Future', startsAt: '2030-01-01T00:00:00.000Z',
      endsAt: '2030-12-31T00:00:00.000Z', bannerDataUrl: null,
      collectionItemIds: [], offerPrices: [], isActive: true });
    expect(getActiveCampaign(ENT, '2029-12-31T00:00:00.000Z')).toBeNull();
  });
  it('getActiveCampaign returns it at startsAt boundary (inclusive)', () => {
    createCampaign(ENT, { name: 'Edge', startsAt: '2030-01-01T00:00:00.000Z',
      endsAt: '2030-12-31T00:00:00.000Z', bannerDataUrl: null,
      collectionItemIds: [], offerPrices: [], isActive: true });
    expect(getActiveCampaign(ENT, '2030-01-01T00:00:00.000Z')?.name).toBe('Edge');
  });
  it('getActiveCampaign returns null after endsAt', () => {
    createCampaign(ENT, { name: 'Past', startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2020-12-31T00:00:00.000Z', bannerDataUrl: null,
      collectionItemIds: [], offerPrices: [], isActive: true });
    expect(getActiveCampaign(ENT, '2021-01-01T00:00:00.000Z')).toBeNull();
  });
  it('rejects campaigns where endsAt <= startsAt', () => {
    expect(() => createCampaign(ENT, {
      name: 'Bad', startsAt: '2030-12-31T00:00:00.000Z',
      endsAt: '2030-01-01T00:00:00.000Z', bannerDataUrl: null,
      collectionItemIds: [], offerPrices: [], isActive: true,
    })).toThrow();
  });
});

describe('S150 · Price list single-assignment move-with-audit', () => {
  it('moves a party from one list to another', () => {
    publishAll();
    const a = createPriceList(ENT, { name: 'A', mode: 'percent_off_list', percentOff: 5, itemRates: [], assignedPartyIds: ['P1'], isActive: true });
    const b = createPriceList(ENT, { name: 'B', mode: 'percent_off_list', percentOff: 10, itemRates: [], assignedPartyIds: [], isActive: true });
    assignPartyToPriceList(ENT, b.id, 'P1');
    const lists = listPriceLists(ENT);
    expect(lists.find(l => l.id === a.id)?.assignedPartyIds).not.toContain('P1');
    expect(lists.find(l => l.id === b.id)?.assignedPartyIds).toContain('P1');
  });
});

describe('S150 · Scheme type-field validation throws', () => {
  const base = { name: 'X', stackable: false, isActive: true, validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z', partyGroupFilter: null,
    buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null, slabStoreItemId: null, slabs: undefined,
    minOrderValue: null, orderDiscountPct: null, couponCode: null, couponUsageLimit: null, couponDiscountPct: null, couponDiscountFlat: null } as const;
  it('buy_x_get_y requires both buy and get item ids', () => {
    expect(() => createScheme(ENT, { ...base, type: 'buy_x_get_y' })).toThrow();
  });
  it('slab_discount requires slabStoreItemId + slabs', () => {
    expect(() => createScheme(ENT, { ...base, type: 'slab_discount' })).toThrow();
  });
  it('order_value_discount requires minOrderValue + orderDiscountPct', () => {
    expect(() => createScheme(ENT, { ...base, type: 'order_value_discount' })).toThrow();
  });
  it('coupon requires exactly one of pct or flat', () => {
    expect(() => createScheme(ENT, { ...base, type: 'coupon', couponCode: 'C', couponDiscountPct: 10, couponDiscountFlat: 50 })).toThrow();
  });
});

describe('S150 · evaluateCart', () => {
  it('B1G1 produces zero-rate free line', () => {
    const ids = publishAll();
    createScheme(ENT, { name: 'B1G1 shirt', type: 'buy_x_get_y', buyStoreItemId: ids.shirt, buyQty: 2,
      getStoreItemId: ids.mug, getQty: 1, slabStoreItemId: null, slabs: undefined, minOrderValue: null, orderDiscountPct: null,
      couponCode: null, couponUsageLimit: null, couponDiscountPct: null, couponDiscountFlat: null,
      stackable: false, isActive: true, partyGroupFilter: null,
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z' });
    const r = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 4 }]);
    expect(r.freeLines).toEqual([{ storeItemId: ids.mug, qty: 2 }]);
  });
  it('slab boundary at exact minQty', () => {
    const ids = publishAll();
    createScheme(ENT, { name: 'Slab', type: 'slab_discount', buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
      slabStoreItemId: ids.shirt, slabs: [{ minQty: 10, discountPct: 10 }],
      minOrderValue: null, orderDiscountPct: null, couponCode: null, couponUsageLimit: null,
      couponDiscountPct: null, couponDiscountFlat: null, stackable: false, isActive: true, partyGroupFilter: null,
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z' });
    const at9 = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 9 }]);
    const at10 = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 10 }]);
    expect(at9.schemeDiscount).toBe(0);
    expect(at10.schemeDiscount).toBeGreaterThan(0);
  });
  it('order_value threshold trips at minOrderValue', () => {
    const ids = publishAll();
    createScheme(ENT, { name: 'Bulk', type: 'order_value_discount', buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
      slabStoreItemId: null, slabs: undefined, minOrderValue: 1000, orderDiscountPct: 10,
      couponCode: null, couponUsageLimit: null, couponDiscountPct: null, couponDiscountFlat: null,
      stackable: false, isActive: true, partyGroupFilter: null,
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z' });
    const r = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 3 }]); // 1500
    expect(r.schemeDiscount).toBe(150);
  });
  it('best-single-wins when two schemes eligible', () => {
    const ids = publishAll();
    const common = { stackable: false, isActive: true, partyGroupFilter: null,
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z',
      buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
      slabStoreItemId: null, slabs: undefined, couponCode: null, couponUsageLimit: null,
      couponDiscountPct: null, couponDiscountFlat: null } as const;
    createScheme(ENT, { ...common, name: 'Small', type: 'order_value_discount', minOrderValue: 500, orderDiscountPct: 5 });
    createScheme(ENT, { ...common, name: 'Big', type: 'order_value_discount', minOrderValue: 500, orderDiscountPct: 15 });
    const r = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 2 }]);
    expect(r.appliedSchemes.filter(a => a.type !== 'coupon')).toHaveLength(1);
    expect(r.schemeDiscount).toBe(150); // 15% of 1000
  });
  it('stackable=true allows both schemes', () => {
    const ids = publishAll();
    const common = { stackable: true, isActive: true, partyGroupFilter: null,
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z',
      buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
      slabStoreItemId: null, slabs: undefined, couponCode: null, couponUsageLimit: null,
      couponDiscountPct: null, couponDiscountFlat: null } as const;
    createScheme(ENT, { ...common, name: 'S1', type: 'order_value_discount', minOrderValue: 100, orderDiscountPct: 5 });
    createScheme(ENT, { ...common, name: 'S2', type: 'order_value_discount', minOrderValue: 100, orderDiscountPct: 10 });
    const r = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }]); // 500
    expect(r.schemeDiscount).toBe(75); // 5%+10% = 15% of 500
  });
  it('party-group filter excludes ineligible parties', () => {
    const ids = publishAll();
    seedParty('Pg', 'gold'); seedParty('Ps', 'silver');
    createScheme(ENT, { name: 'GoldOnly', type: 'order_value_discount',
      buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
      slabStoreItemId: null, slabs: undefined, minOrderValue: 100, orderDiscountPct: 10,
      couponCode: null, couponUsageLimit: null, couponDiscountPct: null, couponDiscountFlat: null,
      stackable: false, isActive: true, partyGroupFilter: 'gold',
      validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z' });
    const rs = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { partyId: 'Ps' });
    expect(rs.schemeDiscount).toBe(0);
    const rg = evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { partyId: 'Pg' });
    expect(rg.schemeDiscount).toBe(50);
  });
});

describe('S150 · Coupons (DP-WS-16)', () => {
  const cBase = { name: 'C', type: 'coupon' as const, buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
    slabStoreItemId: null, slabs: undefined, minOrderValue: null, orderDiscountPct: null,
    stackable: false, isActive: true, partyGroupFilter: null,
    validFrom: '2020-01-01T00:00:00Z', validTo: '2099-01-01T00:00:00Z' };
  it('unique code throws on duplicate', () => {
    createScheme(ENT, { ...cBase, couponCode: 'DUP', couponUsageLimit: null, couponDiscountPct: 10, couponDiscountFlat: null });
    expect(() => createScheme(ENT, { ...cBase, couponCode: 'dup', couponUsageLimit: null, couponDiscountPct: 10, couponDiscountFlat: null })).toThrow();
  });
  it('out-of-window coupon throws on evaluation', () => {
    const ids = publishAll();
    createScheme(ENT, { ...cBase, validFrom: '2020-01-01T00:00:00Z', validTo: '2020-01-02T00:00:00Z',
      couponCode: 'OLD', couponUsageLimit: null, couponDiscountPct: 10, couponDiscountFlat: null });
    expect(() => evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { couponCode: 'OLD' })).toThrow();
  });
  it('usage limit exhaustion throws "coupon exhausted"', () => {
    const ids = publishAll();
    const s = createScheme(ENT, { ...cBase, couponCode: 'X1', couponUsageLimit: 1, couponDiscountPct: 10, couponDiscountFlat: null });
    commitCouponUse(ENT, s.id);
    expect(() => evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { couponCode: 'X1' })).toThrow(/exhausted/);
  });
  it('commitCouponUse increments usedCount; evaluation does NOT', () => {
    const ids = publishAll();
    const s = createScheme(ENT, { ...cBase, couponCode: 'X2', couponUsageLimit: 5, couponDiscountPct: 5, couponDiscountFlat: null });
    evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { couponCode: 'X2' });
    evaluateCart(ENT, [{ storeItemId: ids.shirt, qty: 1 }], { couponCode: 'X2' });
    expect(listSchemes(ENT).find(x => x.id === s.id)?.couponUsedCount).toBe(0);
    commitCouponUse(ENT, s.id);
    expect(listSchemes(ENT).find(x => x.id === s.id)?.couponUsedCount).toBe(1);
  });
});

describe('S150 · Loyalty (APPEND-ONLY)', () => {
  it('structural assertion: engine exports NO update or delete for point entries', () => {
    const keys = Object.keys(CommerceEngine);
    expect(keys.some(k => /updatePoint|deletePoint/.test(k))).toBe(false);
  });
  it('earnPoints below minOrderValue returns null (no entry)', () => {
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 500, redeemValuePerPoint: 1, expiryMonths: 12, isActive: true });
    expect(earnPoints(ENT, 'P1', 100, 'o-1')).toBeNull();
    expect(listPointEntries(ENT, 'P1')).toHaveLength(0);
  });
  it('earnPoints rule-gated when rule active', () => {
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 100, redeemValuePerPoint: 1, expiryMonths: 12, isActive: true });
    const e = earnPoints(ENT, 'P1', 1000, 'o-1');
    expect(e?.points).toBe(10);
  });
  it('redeemPoints throws when insufficient', () => {
    expect(() => redeemPoints(ENT, 'P1', 50, 'o-1')).toThrow();
  });
  it('expiry math · entry older than expiryMonths excluded', () => {
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 0, redeemValuePerPoint: 1, expiryMonths: 1, isActive: true });
    earnPoints(ENT, 'P1', 1000, 'o-1', 'u', '2024-01-01T00:00:00.000Z');
    const bal = getPointsBalance(ENT, 'P1', '2024-06-01T00:00:00.000Z');
    expect(bal).toBe(0);
  });
  it('reversePointEntry posts reversal with reason', () => {
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 0, redeemValuePerPoint: 1, expiryMonths: null, isActive: true });
    const e = earnPoints(ENT, 'P1', 1000, 'o-1')!;
    reversePointEntry(ENT, e.id, 'Order cancelled');
    expect(getPointsBalance(ENT, 'P1')).toBe(0);
  });
  it('double-reversal throws', () => {
    upsertLoyaltyRule(ENT, { earnPointsPerRupee: 0.01, minOrderValue: 0, redeemValuePerPoint: 1, expiryMonths: null, isActive: true });
    const e = earnPoints(ENT, 'P1', 1000, 'o-1')!;
    reversePointEntry(ENT, e.id, 'Once');
    expect(() => reversePointEntry(ENT, e.id, 'Twice')).toThrow();
  });
});

describe('S150 · Gift vouchers + store credit', () => {
  it('over-balance redeem throws', () => {
    issueVoucher(ENT, { code: 'A1', initialValue: 100, issuedToPartyId: null, expiresAt: null, isActive: true, issuedByUserId: 'u' });
    expect(() => redeemVoucher(ENT, 'A1', 200, 'o-1')).toThrow();
  });
  it('expired voucher throws', () => {
    issueVoucher(ENT, { code: 'B1', initialValue: 100, issuedToPartyId: null, expiresAt: '2020-01-01T00:00:00Z', isActive: true, issuedByUserId: 'u' });
    expect(() => redeemVoucher(ENT, 'B1', 50, 'o-1', 'u')).toThrow(/expired/);
  });
  it('partial redemption updates balance', () => {
    issueVoucher(ENT, { code: 'C1', initialValue: 100, issuedToPartyId: null, expiresAt: null, isActive: true, issuedByUserId: 'u' });
    redeemVoucher(ENT, 'C1', 40, 'o-1');
    expect(getVoucherBalance(ENT, 'C1').balance).toBe(60);
  });
  it('voucher reversal restores balance', () => {
    issueVoucher(ENT, { code: 'D1', initialValue: 100, issuedToPartyId: null, expiresAt: null, isActive: true, issuedByUserId: 'u' });
    const e = redeemVoucher(ENT, 'D1', 40, 'o-1');
    reverseVoucherEntry(ENT, e.id, 'Refund');
    expect(getVoucherBalance(ENT, 'D1').balance).toBe(100);
  });
  it('credit issue requires reason', () => {
    expect(() => issueCredit(ENT, 'P1', 100, '')).toThrow();
  });
  it('credit balance reflects issue minus redeem', () => {
    issueCredit(ENT, 'P1', 500, 'Goodwill');
    redeemCredit(ENT, 'P1', 200, 'Order pmt');
    expect(getCreditBalance(ENT, 'P1')).toBe(300);
  });
  it('credit redeem over balance throws', () => {
    issueCredit(ENT, 'P1', 100, 'g');
    expect(() => redeemCredit(ENT, 'P1', 200, 'Order pmt')).toThrow();
  });
});

describe('S150 · Testimonials + Registers', () => {
  it('publish filter returns only published rows', () => {
    const a = createTestimonial(ENT, { customerName: 'A', company: null, text: 'A1', rating: 5, isPublished: false, createdByUserId: 'u' });
    createTestimonial(ENT, { customerName: 'B', company: null, text: 'B1', rating: 4, isPublished: false, createdByUserId: 'u' });
    setTestimonialPublished(ENT, a.id, true);
    const pub = listPublishedTestimonials(ENT);
    expect(pub).toHaveLength(1); expect(pub[0].customerName).toBe('A');
  });
  it('sibling 219 webstorex-commerce-engine present', () => {
    expect(SIBLINGS.find(s => s.id === 'webstorex-commerce-engine')).toBeTruthy();
    expect(SIBLINGS).toHaveLength(219);
  });
  it('S149 backfilled to 4bf3e7a1 and S150 entry is last', () => {
    const s149 = SPRINTS.find(s => s.sprintNumber === 149)!;
    expect(s149.headSha).toContain('4bf3e7a1');
    const last = SPRINTS[SPRINTS.length - 1];
    expect(last.sprintNumber).toBe(150);
  });
  it('audit emitted (issueCredit creates a webstorex_event log)', () => {
    issueCredit(ENT, 'P1', 100, 'test');
    const raw = localStorage.getItem('audit_trail_TST') || '[]';
    expect(raw).toContain('webstorex_event');
  });
});
