/**
 * @file   src/test/sprint-153/ecomx.test.ts
 * @sprint Sprint 153 · EcomX Channel Foundation · §N hard floor ≥32 it()
 *
 * COUNT: 38 it() blocks (floor 32 satisfied).
 * Covers: 4-point rename ceremony · marketplace registry + idempotent B2C party ·
 *         listings simple+kit (DP-EC-3 validation) · unmapped-SKU inbox (DP-EC-4) ·
 *         templates + suggestColumnMap heuristics · parseOrderFile honest triad ·
 *         commitImport dual-layer (DP-EC-5) · idempotency (re-commit ZERO) ·
 *         parked-B2B no-voucher assertion · resolveUnmatchedOrder · headSha backfill.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  listMarketplaces, createMarketplace, setMarketplaceActive,
  listListings, createListing, resolveListing,
  listUnmappedSkus, recordUnmappedSku, resolveUnmappedSku,
  listTemplates, saveTemplate, suggestColumnMap,
  parseOrderFile, commitImport, listEcOrders, resolveUnmatchedOrder,
  getImportStats,
} from '@/lib/ecomx-engine';
import { publishItem } from '@/lib/webstorex-engine';
import { upsertParty, loadPartyMaster, findPartyByName } from '@/lib/party-master-engine';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
import { buildCardRoute } from '@/lib/breadcrumb-memory';
import { ROLE_DEFAULT_CARDS } from '@/types/card-entitlement';
import type { CardId } from '@/types/card-entitlement';
import { ordersKey } from '@/types/order';
import { ecOrdersKey } from '@/types/ecomx';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'ECX-TST';

function seedMasterItems(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-pen',  name: 'Pen',   on_hand_qty: 100 },
    { id: 'm-pad',  name: 'Pad',   on_hand_qty: 100 },
    { id: 'm-clip', name: 'Clip',  on_hand_qty: 100 },
  ]));
}

function seedPim(): { simple: string; kitA: string; kitB: string } {
  seedMasterItems();
  const pen  = publishItem(ENT, 'm-pen',  'tester', { storeTitle: 'Pen' });
  const pad  = publishItem(ENT, 'm-pad',  'tester', { storeTitle: 'Pad' });
  const clip = publishItem(ENT, 'm-clip', 'tester', { storeTitle: 'Clip' });
  return { simple: pen.id, kitA: pad.id, kitB: clip.id };
}

beforeEach(() => {
  localStorage.clear();
});

// ─── 4-point ceremony ───────────────────────────────────────────────────
describe('S153 · 4-point rename ceremony (DP-EC-1)', () => {
  const apps = readFileSync('src/components/operix-core/applications.ts', 'utf-8');

  it('applications.ts has active ecomx entry (status:active)', () => {
    expect(apps).toMatch(/id:\s*'ecomx'[\s\S]{0,300}status:\s*'active'/);
  });
  it('applications.ts has no surviving unicomm entry', () => {
    expect(apps).not.toMatch(/id:\s*'unicomm'/);
  });
  it('seedDemoEntitlements contains ecomx', () => {
    const seeded = seedDemoEntitlements('test-tenant').map((e) => e.card_id as string);
    expect(seeded).toContain('ecomx');
  });
  it('ROLE_DEFAULT_CARDS.sales contains ecomx (mirrors webstorex per DP-EC-0)', () => {
    expect(ROLE_DEFAULT_CARDS.sales).toContain('ecomx');
  });
  it('buildCardRoute("ecomx") === "/erp/ecomx"', () => {
    expect(buildCardRoute('ecomx' as CardId)).toBe('/erp/ecomx');
  });
  it('sibling-register includes ecomx-engine', () => {
    expect(SIBLINGS.some((s) => s.id === 'ecomx-engine')).toBe(true);
  });
});

// ─── Registry + consolidated B2C party ──────────────────────────────────
describe('S153 · Marketplace registry', () => {
  it('createMarketplace persists entity-scoped row', () => {
    const m = createMarketplace(ENT, { name: 'Amazon India', type: 'amazon' });
    expect(listMarketplaces(ENT).find((x) => x.id === m.id)).toBeTruthy();
  });
  it('defaults: tds194oPct = 0.1 · gstTcsPct = 1 · partyMode = end_customer (DP-EC-2/5)', () => {
    const m = createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    expect(m.tds194oPct).toBe(0.1);
    expect(m.gstTcsPct).toBe(1);
    expect(m.partyMode).toBe('end_customer');
  });
  it('consolidated B2C party auto-ensured ONCE (idempotent on name)', () => {
    createMarketplace(ENT, { name: 'Amazon India', type: 'amazon' });
    createMarketplace(ENT, { name: 'Amazon India', type: 'amazon' });
    const match = loadPartyMaster(ENT).filter((p) => p.party_name === 'Amazon India B2C Customers');
    expect(match.length).toBe(1);
  });
  it('partyMode=marketplace_operator does NOT auto-create B2C ledger', () => {
    const m = createMarketplace(ENT, { name: 'IndiaMART', type: 'indiamart', partyMode: 'marketplace_operator' });
    expect(m.consolidatedB2CPartyId).toBeNull();
    expect(findPartyByName(ENT, 'IndiaMART B2C Customers')).toBeNull();
  });
  it('setMarketplaceActive(false) flips isActive', () => {
    const m = createMarketplace(ENT, { name: 'Meesho', type: 'meesho' });
    const upd = setMarketplaceActive(ENT, m.id, false);
    expect(upd.isActive).toBe(false);
  });
});

// ─── Listings + kit (DP-EC-3) ───────────────────────────────────────────
describe('S153 · Listings + kit', () => {
  it('kit listing with zero components throws (DP-EC-3)', () => {
    const { kitA: _kitA } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    void _kitA;
    expect(() => createListing(ENT, {
      marketplaceId: m.id, marketplaceSku: 'KIT-EMPTY', kind: 'kit', title: 'Kit',
      components: [],
    })).toThrow(/≥1 component/);
  });
  it('simple listing requires existing storeItemId', () => {
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    expect(() => createListing(ENT, {
      marketplaceId: m.id, marketplaceSku: 'X', kind: 'simple', title: 'X',
      storeItemId: 'no-such-id',
    })).toThrow();
  });
  it('resolveListing returns simple listing by SKU', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    expect(resolveListing(ENT, m.id, 'PEN-1')?.kind).toBe('simple');
  });
  it('resolveListing returns kit listing with components', () => {
    const { kitA, kitB } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PAD-CLIP', kind: 'kit', title: 'Pad+Clip',
      components: [{ storeItemId: kitA, variantId: null, qty: 1 }, { storeItemId: kitB, variantId: null, qty: 2 }] });
    expect(resolveListing(ENT, m.id, 'PAD-CLIP')?.components.length).toBe(2);
  });
  it('duplicate SKU on same marketplace throws', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'DUP', kind: 'simple', title: 'X', storeItemId: simple });
    expect(() => createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'DUP', kind: 'simple', title: 'Y', storeItemId: simple })).toThrow(/already mapped/);
  });
});

// ─── Unmapped SKU inbox (DP-EC-4) ───────────────────────────────────────
describe('S153 · Unmapped SKU inbox', () => {
  it('recordUnmappedSku creates a row with occurrences=1', () => {
    const u = recordUnmappedSku(ENT, 'mk1', 'NEW-SKU', 'Sample');
    expect(u.occurrences).toBe(1);
  });
  it('recordUnmappedSku increments occurrences on repeat (upsert)', () => {
    recordUnmappedSku(ENT, 'mk1', 'REPEAT', 'A');
    const u = recordUnmappedSku(ENT, 'mk1', 'REPEAT', 'A');
    expect(u.occurrences).toBe(2);
    expect(listUnmappedSkus(ENT).length).toBe(1);
  });
  it('resolveUnmappedSku creates listing + flags row as resolved', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    const u = recordUnmappedSku(ENT, m.id, 'NEW-1', 'Pen');
    const r = resolveUnmappedSku(ENT, u.id, {
      marketplaceId: m.id, marketplaceSku: 'NEW-1', kind: 'simple', title: 'Pen', storeItemId: simple,
    });
    expect(r.listing.id).toBeTruthy();
    expect(listUnmappedSkus(ENT).find((x) => x.id === u.id)?.resolvedListingId).toBe(r.listing.id);
  });
});

// ─── Templates + suggestColumnMap heuristics ────────────────────────────
describe('S153 · Templates + header heuristics', () => {
  it('suggestColumnMap maps amazon headers (order-id · asin · qty)', () => {
    const map = suggestColumnMap(['order-id', 'asin', 'qty', 'buyer-name', 'ship-state', 'item-price'], 'amazon');
    expect(map['order-id']).toBe('order_id');
    expect(map['asin']).toBe('sku');
    expect(map['qty']).toBe('qty');
    expect(map['buyer-name']).toBe('buyer_name');
    expect(map['ship-state']).toBe('buyer_state');
    expect(map['item-price']).toBe('unit_price');
  });
  it('suggestColumnMap maps flipkart headers (Order Id · FSN)', () => {
    const map = suggestColumnMap(['Order Id', 'FSN', 'Quantity', 'Selling Price'], 'flipkart');
    expect(map['Order Id']).toBe('order_id');
    expect(map['FSN']).toBe('sku');
    expect(map['Quantity']).toBe('qty');
    expect(map['Selling Price']).toBe('unit_price');
  });
  it('unmatched header → ignore (never silently authoritative)', () => {
    const map = suggestColumnMap(['random-junk-col'], 'amazon');
    expect(map['random-junk-col']).toBe('ignore');
  });
  it('saveTemplate round-trips via listTemplates', () => {
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    const t = saveTemplate(ENT, { marketplaceId: m.id, name: 'Amzn B2C', columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    expect(listTemplates(ENT, m.id).find((x) => x.id === t.id)).toBeTruthy();
  });
});

// ─── Parse honest triad (DP-EC-4) ───────────────────────────────────────
describe('S153 · parseOrderFile · honest triad', () => {
  it('valid + unknown + invalid counts are truthful', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'unit_price': 'unit_price', 'state': 'buyer_state' } });
    const rows = [
      { 'order-id': 'O1', asin: 'PEN-1', qty: '2', unit_price: '50', state: 'KA' },          // valid
      { 'order-id': 'O2', asin: 'GHOST', qty: '1', unit_price: '10', state: 'KA' },          // unknown sku
      { 'order-id': '', asin: 'PEN-1', qty: '1', unit_price: '10', state: 'KA' },            // invalid (no order id)
      { 'order-id': 'O3', asin: 'PEN-1', qty: 'NaN', unit_price: '10', state: 'KA' },        // invalid qty
    ];
    const rep = parseOrderFile(ENT, m.id, tmpl.id, rows, 'a.csv');
    expect(rep.validRows).toBe(1);
    expect(rep.unknownSkuRows).toBe(1);
    expect(rep.invalidRows).toBe(2);
    expect(rep.totalRows).toBe(4);
  });
  it('errors list captures invalid rows with reasons', () => {
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': '', asin: 'X', qty: '1' }], 'a.csv');
    expect(rep.errors.length).toBe(1);
    expect(rep.errors[0].reason).toMatch(/order_id/);
  });
  it('unknown SKU rows feed the unmapped inbox', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'O', asin: 'GHOST', qty: '1' }], 'a.csv');
    const inbox = listUnmappedSkus(ENT);
    expect(inbox.find((u) => u.marketplaceSku === 'GHOST')?.occurrences).toBe(1);
  });
});

// ─── Commit · dual-layer + idempotency ──────────────────────────────────
describe('S153 · commitImport · dual-layer (DP-EC-5) + idempotency', () => {
  it('B2C: no GSTIN → books REAL SO under consolidated B2C party', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'price': 'unit_price', 'state': 'buyer_state' } });
    const rows = [{ 'order-id': 'B2C-1', asin: 'PEN-1', qty: '2', price: '50', state: 'KA' }];
    const rep = parseOrderFile(ENT, m.id, tmpl.id, rows, 'a.csv');
    const c = commitImport(ENT, rep.importId);
    expect(c.booked).toBe(1);
    const ec = listEcOrders(ENT)[0];
    expect(ec.layer).toBe('b2c_consolidated');
    expect(ec.soVoucherId).not.toBeNull();
    const orders = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]');
    expect(orders.length).toBe(1);
    expect(orders[0].narration).toContain('B2C-1');
  });
  it('SO doc-no uses generateDocNo("SO") (starts with SO)', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'X', asin: 'PEN-1', qty: '1' }], 'a.csv');
    commitImport(ENT, rep.importId);
    const orders = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]');
    expect(orders[0].order_no).toMatch(/^SO/);
  });
  it('B2B matched: GSTIN hit → b2b_matched + SO booked under that party', () => {
    const { simple } = seedPim();
    upsertParty({ entity_id: ENT, party_name: 'Acme', party_type: 'customer', gstin: '29ABCDE1234F1Z5', state_code: '29', created_via_quick_add: false, created_by: 'test' });
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'gstin': 'buyer_gstin' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'B2B-1', asin: 'PEN-1', qty: '1', gstin: '29ABCDE1234F1Z5' }], 'a.csv');
    commitImport(ENT, rep.importId);
    const ec = listEcOrders(ENT)[0];
    expect(ec.layer).toBe('b2b_matched');
    expect(ec.soVoucherId).not.toBeNull();
  });
  it('B2B UNMATCHED: GSTIN miss → parked, soVoucherId null, NO voucher in ordersKey', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'gstin': 'buyer_gstin' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'PARK-1', asin: 'PEN-1', qty: '1', gstin: '99XXXXX9999X9Z9' }], 'a.csv');
    const c = commitImport(ENT, rep.importId);
    expect(c.parked).toBe(1);
    const ec = listEcOrders(ENT)[0];
    expect(ec.layer).toBe('b2b_unmatched');
    expect(ec.soVoucherId).toBeNull();
    expect(ec.status).toBe('parked_unmatched');
    const orders = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]');
    expect(orders.length).toBe(0);
  });
  it('kit listing explodes ×qty into SO lines', () => {
    const { kitA, kitB } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'KIT-1', kind: 'kit', title: 'Kit',
      components: [{ storeItemId: kitA, variantId: null, qty: 2 }, { storeItemId: kitB, variantId: null, qty: 3 }] });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'K-1', asin: 'KIT-1', qty: '2' }], 'a.csv');
    commitImport(ENT, rep.importId);
    const orders = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]');
    // 2 components × order qty 2 = qties [4, 6]
    const qtys = orders[0].lines.map((l: { qty: number }) => l.qty).sort((a: number, b: number) => a - b);
    expect(qtys).toEqual([4, 6]);
  });
  it('IDEMPOTENCY: re-commitImport adds ZERO orders + ZERO vouchers', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'IDP-1', asin: 'PEN-1', qty: '1' }], 'a.csv');
    const c1 = commitImport(ENT, rep.importId);
    expect(c1.booked).toBe(1);
    const ordersAfter1 = JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]').length;
    const ecAfter1 = JSON.parse(localStorage.getItem(ecOrdersKey(ENT)) ?? '[]').length;
    const c2 = commitImport(ENT, rep.importId);
    expect(c2.booked).toBe(0);
    expect(c2.parked).toBe(0);
    expect(c2.skippedDuplicates).toBe(0); // sidecar already cleared → nothing to dedup against
    expect(JSON.parse(localStorage.getItem(ordersKey(ENT)) ?? '[]').length).toBe(ordersAfter1);
    expect(JSON.parse(localStorage.getItem(ecOrdersKey(ENT)) ?? '[]').length).toBe(ecAfter1);
  });
  it('dedupe across imports: same marketplace_order_id from a fresh import is skipped', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep1 = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'DUP-1', asin: 'PEN-1', qty: '1' }], 'a.csv');
    commitImport(ENT, rep1.importId);
    const rep2 = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'DUP-1', asin: 'PEN-1', qty: '1' }], 'b.csv');
    const c2 = commitImport(ENT, rep2.importId);
    expect(c2.skippedDuplicates).toBe(1);
    expect(c2.booked).toBe(0);
  });
  it('endCustomerState captured (place of supply lives on the EcOrder snapshot)', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'state': 'buyer_state' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'S-1', asin: 'PEN-1', qty: '1', state: 'TN' }], 'a.csv');
    commitImport(ENT, rep.importId);
    expect(listEcOrders(ENT)[0].endCustomerState).toBe('TN');
  });
});

// ─── resolveUnmatchedOrder ──────────────────────────────────────────────
describe('S153 · resolveUnmatchedOrder', () => {
  it('books a real SO when operator picks a party', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'gstin': 'buyer_gstin' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'P-1', asin: 'PEN-1', qty: '1', gstin: '99XXXXX9999X9Z9' }], 'a.csv');
    commitImport(ENT, rep.importId);
    const ec = listEcOrders(ENT, { status: 'parked_unmatched' })[0];
    const { party } = upsertParty({ entity_id: ENT, party_name: 'Late B2B', party_type: 'customer', gstin: null, state_code: '29', created_via_quick_add: false, created_by: 'test' });
    const r = resolveUnmatchedOrder(ENT, ec.id, party.id);
    expect(r.voucherId).toBeTruthy();
    const after = listEcOrders(ENT).find((x) => x.id === ec.id)!;
    expect(after.status).toBe('booked');
    expect(after.layer).toBe('b2b_matched');
    expect(after.soVoucherId).toBe(r.voucherId);
  });
  it('throws when target is not parked', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [{ 'order-id': 'N-1', asin: 'PEN-1', qty: '1' }], 'a.csv');
    commitImport(ENT, rep.importId);
    const ec = listEcOrders(ENT)[0];
    expect(() => resolveUnmatchedOrder(ENT, ec.id, 'no-such-party')).toThrow();
  });
});

// ─── Stats + closes ─────────────────────────────────────────────────────
describe('S153 · stats', () => {
  it('getImportStats reflects booked + parked counts', () => {
    const { simple } = seedPim();
    const m = createMarketplace(ENT, { name: 'Amazon', type: 'amazon' });
    createListing(ENT, { marketplaceId: m.id, marketplaceSku: 'PEN-1', kind: 'simple', title: 'Pen', storeItemId: simple });
    const tmpl = saveTemplate(ENT, { marketplaceId: m.id, name: 'A',
      columnMap: { 'order-id': 'order_id', 'asin': 'sku', 'qty': 'qty', 'gstin': 'buyer_gstin' } });
    const rep = parseOrderFile(ENT, m.id, tmpl.id, [
      { 'order-id': 'B-1', asin: 'PEN-1', qty: '1', gstin: '' },
      { 'order-id': 'B-2', asin: 'PEN-1', qty: '1', gstin: '99XXXXX9999X9Z9' },
    ], 'a.csv');
    commitImport(ENT, rep.importId);
    const s = getImportStats(ENT);
    expect(s.ordersBooked).toBeGreaterThanOrEqual(1);
    expect(s.parkedB2B).toBeGreaterThanOrEqual(1);
    expect(s.marketplacesActive).toBe(1);
    expect(s.listingsLive).toBe(1);
  });
});

// ─── headSha discipline ─────────────────────────────────────────────────
describe('S153 · headSha discipline', () => {
  it('S152 backfilled to 4af7cbdd (not TBD_AT_BANK)', () => {
    const s152 = SPRINTS.find((s) => s.sprintNumber === 152);
    expect(s152?.headSha).toBe('4af7cbdd');
  });
  it('Only ≤1 sprint may carry TBD_AT_BANK (the current open sprint)', () => {
    const open = SPRINTS.filter((s) => s.headSha === 'TBD_AT_BANK');
    expect(open.length).toBeLessThanOrEqual(1);
  });
});
