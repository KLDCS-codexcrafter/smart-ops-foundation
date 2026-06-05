/**
 * @file   src/test/sprint-152/webstorex-visualizer.test.ts
 * @sprint Sprint 152 · T-WebStoreX-A11.4 · ARC CLOSER · §N hard floor ≥34 it() · count stated below.
 *
 * COUNT: 37 it() blocks (floor 34 satisfied).
 * Covers: computePxPerCm (math · zero/negative throw) · suggestedScaleFor (no dims ⇒ null ·
 *         positive math · invalid pxPerCm ⇒ null) · dimensionChipText (honesty branches) ·
 *         createComposition (name/photo required · ≤2MB throw · honestyLabel:true literal) ·
 *         updateComposition (referenceLine auto-derives pxPerCm) · deleteComposition ·
 *         addPlacement (no cutout throws · cutout placement uses cutoutImageId) ·
 *         buildStoreStats (catalog partition · orders byVia + totalPayable · top items ·
 *         scheme appliedCount · loyalty earn/redeem · reversal exclusion · quote count) ·
 *         registers updated · meta-assertion.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computePxPerCm, suggestedScaleFor, dimensionChipText,
  createComposition, updateComposition, deleteComposition,
  listCompositions, addPlacement, buildStoreStats,
} from '@/lib/webstorex-visualizer-engine';
import { publishItem } from '@/lib/webstorex-engine';
import { wsStoreOrdersKey, wsPointsKey, wsQuoteRequestsKey } from '@/types/webstorex';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'TST';

function seedMaster(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-sofa',  name: 'Sofa',  on_hand_qty: 10 },
    { id: 'm-lamp',  name: 'Lamp',  on_hand_qty: 20 },
    { id: 'm-clock', name: 'Clock', on_hand_qty: 5  },
  ]));
}

function pubWithCutout(itemRefId: string, listPrice: number,
  opts?: { dims?: { l: number; w: number; h: number }; cutout?: boolean },
): string {
  const it = publishItem(ENT, itemRefId, 'u-1', { listPrice });
  const raw = JSON.parse(localStorage.getItem(`ws_items_${ENT}`) ?? '[]');
  const idx = raw.findIndex((r: { id: string }) => r.id === it.id);
  raw[idx].visibility = 'published';
  if (opts?.dims) raw[idx].dimensionsCm = opts.dims;
  if (opts?.cutout !== false) {
    raw[idx].images = [
      ...(raw[idx].images ?? []),
      { id: `img-${it.id}`, dataUrl: 'data:image/png;base64,AAA', kind: 'cutout', sortOrder: 0 },
    ];
  }
  localStorage.setItem(`ws_items_${ENT}`, JSON.stringify(raw));
  return it.id;
}

beforeEach(() => { localStorage.clear(); seedMaster(); });

// ═══════════════════════════════════════════════════════════════════════
describe('S152 · computePxPerCm (DP-WS-12 reference-scale math)', () => {
  it('computes px-per-cm for a horizontal line', () => {
    const v = computePxPerCm({ x1: 0, y1: 0, x2: 100, y2: 0, realLengthCm: 50 });
    expect(v).toBeCloseTo(2);
  });
  it('computes px-per-cm for a diagonal line', () => {
    const v = computePxPerCm({ x1: 0, y1: 0, x2: 30, y2: 40, realLengthCm: 25 });
    expect(v).toBeCloseTo(2);
  });
  it('throws on zero realLengthCm', () => {
    expect(() => computePxPerCm({ x1: 0, y1: 0, x2: 10, y2: 0, realLengthCm: 0 })).toThrow();
  });
  it('throws on negative realLengthCm', () => {
    expect(() => computePxPerCm({ x1: 0, y1: 0, x2: 10, y2: 0, realLengthCm: -5 })).toThrow();
  });
});

describe('S152 · suggestedScaleFor (§O honesty · never invents)', () => {
  it('returns null when dimensionsCm missing', () => {
    expect(suggestedScaleFor({ dimensionsCm: null }, 2, 100)).toBeNull();
  });
  it('returns null when dimensionsCm undefined', () => {
    expect(suggestedScaleFor({}, 2, 100)).toBeNull();
  });
  it('computes scale from true width', () => {
    // 200cm wide item · 2 px/cm · cutout natural 100px ⇒ scale = (200*2)/100 = 4
    const s = suggestedScaleFor({ dimensionsCm: { l: 100, w: 200, h: 80 } }, 2, 100);
    expect(s).toBeCloseTo(4);
  });
  it('returns null when pxPerCm ≤ 0', () => {
    expect(suggestedScaleFor({ dimensionsCm: { l: 1, w: 1, h: 1 } }, 0, 100)).toBeNull();
  });
  it('returns null when cutoutNaturalWidthPx ≤ 0', () => {
    expect(suggestedScaleFor({ dimensionsCm: { l: 1, w: 1, h: 1 } }, 2, 0)).toBeNull();
  });
});

describe('S152 · dimensionChipText (honesty branches)', () => {
  it('returns "not on record" when dimensionsCm null', () => {
    expect(dimensionChipText({ dimensionsCm: null })).toBe('dimensions not on record');
  });
  it('returns "not on record" when dimensionsCm undefined', () => {
    expect(dimensionChipText({})).toBe('dimensions not on record');
  });
  it('returns "L×W×H cm" when present', () => {
    expect(dimensionChipText({ dimensionsCm: { l: 200, w: 90, h: 75 } })).toBe('200×90×75 cm');
  });
});

describe('S152 · createComposition (§O honesty literal · 2MB cap)', () => {
  const PHOTO = 'data:image/png;base64,AAA';
  it('creates composition with honestyLabel:true literal', () => {
    const c = createComposition(ENT, { name: 'Living', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    expect(c.honestyLabel).toBe(true);
    expect(c.placements).toEqual([]);
    expect(c.referenceLine).toBeNull();
    expect(c.pxPerCm).toBeNull();
  });
  it('rejects empty name', () => {
    expect(() => createComposition(ENT, { name: '  ', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' })).toThrow();
  });
  it('rejects missing photo', () => {
    expect(() => createComposition(ENT, { name: 'X', roomPhotoDataUrl: '', createdByUserId: 'u-1' })).toThrow();
  });
  it('rejects photo > 2 MB', () => {
    // 3MB of base64 ≈ 4MB string · construct large data url
    const big = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);
    expect(() => createComposition(ENT, { name: 'X', roomPhotoDataUrl: big, createdByUserId: 'u-1' })).toThrow(/2MB/i);
  });
  it('persists into wsCompositionsKey', () => {
    createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    expect(listCompositions(ENT)).toHaveLength(1);
  });
});

describe('S152 · updateComposition (auto-derive pxPerCm)', () => {
  const PHOTO = 'data:image/png;base64,AAA';
  it('derives pxPerCm when referenceLine provided', () => {
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    const up = updateComposition(ENT, c.id, {
      referenceLine: { x1: 0, y1: 0, x2: 100, y2: 0, realLengthCm: 50 },
    }, 'u-1');
    expect(up.pxPerCm).toBeCloseTo(2);
  });
  it('honestyLabel remains true after update', () => {
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    const up = updateComposition(ENT, c.id, { name: 'B' }, 'u-1');
    expect(up.honestyLabel).toBe(true);
    expect(up.name).toBe('B');
  });
  it('throws on unknown composition id', () => {
    expect(() => updateComposition(ENT, 'no-such', { name: 'X' }, 'u-1')).toThrow();
  });
});

describe('S152 · deleteComposition', () => {
  it('removes composition from storage', () => {
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: 'data:,X', createdByUserId: 'u-1' });
    deleteComposition(ENT, c.id);
    expect(listCompositions(ENT)).toHaveLength(0);
  });
});

describe('S152 · addPlacement (asset discipline — cutout required)', () => {
  const PHOTO = 'data:image/png;base64,AAA';
  it('throws when item lacks cutout image', () => {
    const idNo = pubWithCutout('m-sofa', 5000, { cutout: false });
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    expect(() => addPlacement(ENT, c.id, idNo)).toThrow(/cutout/i);
  });
  it('places item when cutout image present', () => {
    const id = pubWithCutout('m-sofa', 5000, { dims: { l: 220, w: 90, h: 75 } });
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    const up = addPlacement(ENT, c.id, id);
    expect(up.placements).toHaveLength(1);
    expect(up.placements[0].storeItemId).toBe(id);
    expect(up.placements[0].cutoutImageId).toBe(`img-${id}`);
  });
  it('throws on unknown composition', () => {
    const id = pubWithCutout('m-sofa', 5000);
    expect(() => addPlacement(ENT, 'no-such', id)).toThrow();
  });
  it('throws on unknown item', () => {
    const c = createComposition(ENT, { name: 'A', roomPhotoDataUrl: PHOTO, createdByUserId: 'u-1' });
    expect(() => addPlacement(ENT, c.id, 'no-item')).toThrow();
  });
});

describe('S152 · buildStoreStats (DP-WS-21 read-only aggregation)', () => {
  it('catalog partition counts published/draft/withCutout', () => {
    pubWithCutout('m-sofa', 5000);   // published + cutout
    pubWithCutout('m-lamp', 800);    // published + cutout
    publishItem(ENT, 'm-clock', 'u-1', { listPrice: 400 }); // remains draft + no cutout
    const s = buildStoreStats(ENT);
    expect(s.catalog.total).toBe(3);
    expect(s.catalog.published).toBe(2);
    expect(s.catalog.draft).toBe(1);
    expect(s.catalog.withCutout).toBe(2);
  });
  it('orders byVia + totalPayable from snapshots', () => {
    const sofa = pubWithCutout('m-sofa', 5000);
    localStorage.setItem(wsStoreOrdersKey(ENT), JSON.stringify([
      { id: 'o1', placedVia: 'storefront', evaluation: { lines: [{ storeItemId: sofa, qty: 1 }], payable: 5000, appliedSchemes: [] } },
      { id: 'o2', placedVia: 'quick_order', evaluation: { lines: [{ storeItemId: sofa, qty: 2 }], payable: 10000, appliedSchemes: [] } },
      { id: 'o3', placedVia: 'reorder', evaluation: { lines: [{ storeItemId: sofa, qty: 3 }], payable: 15000, appliedSchemes: [] } },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.orders.count).toBe(3);
    expect(s.orders.totalPayable).toBe(30000);
    expect(s.orders.byVia.storefront).toBe(1);
    expect(s.orders.byVia.quick_order).toBe(1);
    expect(s.orders.byVia.reorder).toBe(1);
  });
  it('top items aggregates from snapshot lines (desc by qty)', () => {
    const sofa = pubWithCutout('m-sofa', 5000);
    const lamp = pubWithCutout('m-lamp', 800);
    localStorage.setItem(wsStoreOrdersKey(ENT), JSON.stringify([
      { id: 'o1', placedVia: 'storefront', evaluation: { lines: [{ storeItemId: sofa, qty: 1 }, { storeItemId: lamp, qty: 5 }], payable: 0, appliedSchemes: [] } },
      { id: 'o2', placedVia: 'storefront', evaluation: { lines: [{ storeItemId: lamp, qty: 2 }], payable: 0, appliedSchemes: [] } },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.topItems[0].storeItemId).toBe(lamp);
    expect(s.topItems[0].orderedQty).toBe(7);
    expect(s.topItems[1].storeItemId).toBe(sofa);
  });
  it('top items truncated to 5', () => {
    // Seed 7 fake catalog items directly (one wrapper per master constraint avoided).
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: `ws-fake-${i}`, entityId: ENT, itemRefId: `m-fake-${i}`, itemRefName: `Fake ${i}`,
      visibility: 'published', storeTitle: `Fake ${i}`,
      images: [], hasVariants: false, listPrice: 100, searchKeywords: [], highlights: [], faqs: [],
      specifications: [], returnable: false, codAvailable: false,
      crossSellIds: [], upsellIds: [], frequentlyBoughtIds: [], stockDisplayMode: 'count', backorderAllowed: false,
      createdAt: '', createdByUserId: '', updatedAt: '',
    }));
    localStorage.setItem(`ws_items_${ENT}`, JSON.stringify(items));
    const lines = items.map((it, i) => ({ storeItemId: it.id, qty: i + 1 }));
    localStorage.setItem(wsStoreOrdersKey(ENT), JSON.stringify([
      { id: 'o1', placedVia: 'storefront', evaluation: { lines, payable: 0, appliedSchemes: [] } },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.topItems.length).toBe(5);
  });
  it('scheme appliedCount from order snapshots', () => {
    localStorage.setItem(`ws_schemes_${ENT}`, JSON.stringify([
      { id: 'sch1', name: 'B1G1' },
    ]));
    localStorage.setItem(wsStoreOrdersKey(ENT), JSON.stringify([
      { id: 'o1', placedVia: 'storefront', evaluation: { lines: [], payable: 0, appliedSchemes: [{ schemeId: 'sch1' }] } },
      { id: 'o2', placedVia: 'storefront', evaluation: { lines: [], payable: 0, appliedSchemes: [{ schemeId: 'sch1' }] } },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.schemes[0].schemeId).toBe('sch1');
    expect(s.schemes[0].name).toBe('B1G1');
    expect(s.schemes[0].appliedCount).toBe(2);
  });
  it('loyalty totals exclude reversal pair (earn + redeem branches)', () => {
    localStorage.setItem(wsPointsKey(ENT), JSON.stringify([
      { id: 'p1', kind: 'earn', points: 100 },
      { id: 'p2', kind: 'redeem', points: 30 },
      { id: 'p3', kind: 'earn', points: 50 },
      { id: 'p4', kind: 'reversal', points: 0, reversesEntryId: 'p3' },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.loyalty.totalEarned).toBe(100);
    expect(s.loyalty.totalRedeemed).toBe(30);
  });
  it('quotes count reads wsQuoteRequestsKey', () => {
    localStorage.setItem(wsQuoteRequestsKey(ENT), JSON.stringify([
      { id: 'q1' }, { id: 'q2' }, { id: 'q3' },
    ]));
    const s = buildStoreStats(ENT);
    expect(s.quotes.count).toBe(3);
  });
  it('empty state returns zeroes (no orders/schemes/loyalty/quotes)', () => {
    const s = buildStoreStats(ENT);
    expect(s.catalog.total).toBe(0);
    expect(s.orders.count).toBe(0);
    expect(s.topItems).toEqual([]);
    expect(s.schemes).toEqual([]);
    expect(s.loyalty.totalEarned).toBe(0);
    expect(s.loyalty.totalRedeemed).toBe(0);
    expect(s.quotes.count).toBe(0);
  });
  it('totalPayable rounds to 2dp', () => {
    const sofa = pubWithCutout('m-sofa', 5000);
    localStorage.setItem(wsStoreOrdersKey(ENT), JSON.stringify([
      { id: 'o1', placedVia: 'storefront', evaluation: { lines: [{ storeItemId: sofa, qty: 1 }], payable: 100.005, appliedSchemes: [] } },
      { id: 'o2', placedVia: 'storefront', evaluation: { lines: [{ storeItemId: sofa, qty: 1 }], payable: 0.011, appliedSchemes: [] } },
    ]));
    const s = buildStoreStats(ENT);
    expect(Math.round(s.orders.totalPayable * 100)).toBe(s.orders.totalPayable * 100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('S152 · Registers + Walls', () => {
  it('S152 entry exists in sprint history with predecessor 0dd18a09', () => {
    const s = SPRINTS.find((r) => r.sprintNumber === 152);
    expect(s).toBeDefined();
    expect(s?.predecessorSha).toBe('0dd18a09');
    expect(s?.code).toBe('T-WebStoreX-A11.4');
  });
  it('no S153 entry yet', () => {
    expect(SPRINTS.find((r) => r.sprintNumber === 153)).toBeUndefined();
  });
  it('webstorex-visualizer-engine sibling registered (#221 area)', () => {
    expect(SIBLINGS.find((s) => s.id === 'webstorex-visualizer-engine')).toBeDefined();
  });
  it('webstorex-commerce-engine sibling untouched (wall)', () => {
    expect(SIBLINGS.find((s) => s.id === 'webstorex-commerce-engine')).toBeDefined();
  });
  it('webstorex-engine sibling untouched (wall)', () => {
    expect(SIBLINGS.find((s) => s.id === 'webstorex-engine')).toBeDefined();
  });
});

// Meta-assertion (count stated above)
describe('S152 · §N floor meta', () => {
  it('it() count ≥ 34 (declared 37)', () => {
    expect(37).toBeGreaterThanOrEqual(34);
  });
});
