/**
 * wms1-block-behavioral.test.ts — Sprint WMS1 · behavioral (≥20 it())
 *
 * House posture: no mocks of localStorage internals, real engine reads
 * and writes through a jsdom-backed `localStorage`. Each test starts
 * with a fresh storage namespace.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  generatePicklists,
  getOpenPickableOrders,
  confirmPick,
  createPackGroup,
  markPacked,
  getPickPackSummary,
  classifyBucket,
  classifyOrderSource,
  isOrderPickable,
  _resetCounters,
} from '@/lib/wms-pick-pack-engine';
import {
  picklistsKey,
  packGroupsKey,
} from '@/types/wms-pick-pack';
import { ordersKey, type Order } from '@/types/order';
import { packingSlipsKey, type PackingSlip } from '@/types/packing-slip';
import type { BinLabel } from '@/types/bin-label';
import type { PackingBOM } from '@/types/packing-bom';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

import * as wmsEngine from '@/lib/wms-pick-pack-engine';
import * as bomEngine from '@/lib/packing-bom-engine';
import * as slipEngine from '@/lib/packing-slip-engine';

const E = 'TESTENT';

function makeOrder(o: Partial<Order> & { id: string }): Order {
  const { id: _id, ...rest } = o;
  return {
    id: o.id,
    order_no: o.order_no ?? `SO/${o.id}`,
    base_voucher_type: 'Sales Order',
    entity_id: E,
    date: '2026-06-01',
    party_id: 'p1', party_name: 'P One',
    lines: [],
    gross_amount: 0, total_tax: 0, net_amount: 0,
    narration: o.narration ?? '',
    terms_conditions: '',
    status: o.status ?? 'open',
    created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
    ...rest,
  } as Order;
}

function seedOrders(orders: Order[]): void {
  localStorage.setItem(ordersKey(E), JSON.stringify(orders));
}

beforeEach(() => {
  localStorage.clear();
  _resetCounters();
});

describe('WMS1 · Block · types + engine + UI integration', () => {
  it('isOrderPickable: only open/partial orders with pending lines', () => {
    expect(isOrderPickable(makeOrder({ id: 'a', status: 'closed', lines: [{ pending_qty: 5 } as never] }))).toBe(false);
    expect(isOrderPickable(makeOrder({ id: 'b', status: 'open', lines: [{ pending_qty: 0 } as never] }))).toBe(false);
    expect(isOrderPickable(makeOrder({ id: 'c', status: 'open', lines: [{ pending_qty: 1 } as never] }))).toBe(true);
    expect(isOrderPickable(makeOrder({ id: 'd', status: 'partial', lines: [{ pending_qty: 3 } as never] }))).toBe(true);
  });

  it('classifyOrderSource: narration prefix sniff', () => {
    expect(classifyOrderSource(makeOrder({ id: '1', narration: 'EcomX · Amazon · ABC' }))).toBe('ecomx');
    expect(classifyOrderSource(makeOrder({ id: '2', narration: 'WebStoreX order · …' }))).toBe('webstorex');
    expect(classifyOrderSource(makeOrder({ id: '3', narration: 'manual SO entry' }))).toBe('salesx');
    expect(classifyOrderSource(makeOrder({ id: '4', narration: '' }))).toBe('salesx');
  });

  it('classifyBucket: 3 buckets from synthetic orders', () => {
    const single = makeOrder({ id: 's', lines: [{ pending_qty: 1 } as never] });
    const multi = makeOrder({ id: 'm', lines: [{ pending_qty: 2 } as never, { pending_qty: 3 } as never] });
    const bulk = makeOrder({ id: 'b', lines: [{ pending_qty: 60 } as never] });
    expect(classifyBucket(single, 'salesx')).toBe('single_item');
    expect(classifyBucket(multi, 'ecomx')).toBe('multi_item');
    expect(classifyBucket(bulk, 'salesx')).toBe('b2b_bulk');
    // EcomX with same large qty does NOT get bulk (consumer channel)
    expect(classifyBucket(bulk, 'ecomx')).toBe('multi_item');
  });

  it('getOpenPickableOrders reads ordersKey only and tags source', () => {
    seedOrders([
      makeOrder({ id: 'o1', narration: 'EcomX · Amazon', lines: [{ pending_qty: 2 } as never] }),
      makeOrder({ id: 'o2', narration: 'WebStoreX order', lines: [{ pending_qty: 1 } as never] }),
      makeOrder({ id: 'o3', narration: 'manual', lines: [{ pending_qty: 5 } as never] }),
      makeOrder({ id: 'o4', narration: '', status: 'closed', lines: [{ pending_qty: 0 } as never] }),
    ]);
    const out = getOpenPickableOrders(E);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.source).sort()).toEqual(['ecomx', 'salesx', 'webstorex']);
  });

  it('generatePicklists creates per-bucket lists with item-first walk grouping', () => {
    seedOrders([
      makeOrder({ id: 'oA', narration: 'manual', lines: [
        { id: 'lA1', item_id: 'iZ', item_name: 'Zeta', pending_qty: 2 } as never,
        { id: 'lA2', item_id: 'iA', item_name: 'Alpha', pending_qty: 1 } as never,
      ] }),
      makeOrder({ id: 'oB', narration: 'manual', lines: [
        { id: 'lB1', item_id: 'iA', item_name: 'Alpha', pending_qty: 3 } as never,
      ] }),
    ]);
    const pls = generatePicklists(E);
    expect(pls.length).toBeGreaterThan(0);
    const multi = pls.find((p) => p.bucket === 'multi_item');
    expect(multi).toBeTruthy();
    // First 2 lines should be the same item-id (iA) because of item-first sort
    const items = multi!.lines.map((l) => l.item_id);
    expect(items[0]).toBe('iA');
    expect(items[1]).toBe('iA');
  });

  it('generatePicklists persists to picklistsKey', () => {
    seedOrders([makeOrder({ id: 'oP', narration: 'manual', lines: [{ pending_qty: 1 } as never] })]);
    generatePicklists(E);
    const raw = localStorage.getItem(picklistsKey(E));
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).length).toBeGreaterThan(0);
  });

  it('new Picklist born with retention_policy + created_by (P8.6 floor)', () => {
    seedOrders([makeOrder({ id: 'oR', narration: 'manual', lines: [{ pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    expect(pl.retention_policy).toBe('operational_log_only');
    expect(typeof pl.created_by).toBe('string');
    expect(pl.created_by!.length).toBeGreaterThan(0);
  });

  it('retention map: picklist + pack-group → operational_log_only', () => {
    expect(getDefaultPolicyForRecordType('picklist')).toBe('operational_log_only');
    expect(getDefaultPolicyForRecordType('pack-group')).toBe('operational_log_only');
  });

  it('bin_hint honest: BinLabel match returns hint, no match returns blank', () => {
    const labels: BinLabel[] = [{
      id: 'bl1', godown_id: 'g1', godown_name: 'Main',
      location_code: 'A-1-1', location_type: 'storage',
      barcode_type: 'QR', items_assigned: ['itemHit'],
      status: 'active', printed: false,
      created_at: '', updated_at: '',
    } as BinLabel];
    localStorage.setItem('erp_bin_labels', JSON.stringify(labels));
    seedOrders([makeOrder({ id: 'oH', narration: 'manual', lines: [
      { item_id: 'itemHit', item_name: 'Hit', pending_qty: 1 } as never,
      { item_id: 'itemMiss', item_name: 'Miss', pending_qty: 1 } as never,
    ] })]);
    const [pl] = generatePicklists(E);
    const hit = pl.lines.find((l) => l.item_id === 'itemHit');
    const miss = pl.lines.find((l) => l.item_id === 'itemMiss');
    expect(hit?.bin_hint).toContain('Main');
    expect(miss?.bin_hint).toBe('');
  });

  it('source_summary counts all three sources from mixed orders', () => {
    seedOrders([
      makeOrder({ id: 'mx1', narration: 'EcomX · M', lines: [{ pending_qty: 2 } as never, { pending_qty: 1 } as never] }),
      makeOrder({ id: 'mx2', narration: 'WebStoreX order', lines: [{ pending_qty: 2 } as never, { pending_qty: 1 } as never] }),
      makeOrder({ id: 'mx3', narration: 'manual', lines: [{ pending_qty: 2 } as never, { pending_qty: 1 } as never] }),
    ]);
    const pls = generatePicklists(E);
    const totals = pls.reduce((s, p) => ({
      salesx: s.salesx + p.source_summary.salesx,
      ecomx: s.ecomx + p.source_summary.ecomx,
      webstorex: s.webstorex + p.source_summary.webstorex,
    }), { salesx: 0, ecomx: 0, webstorex: 0 });
    expect(totals.salesx).toBe(1);
    expect(totals.ecomx).toBe(1);
    expect(totals.webstorex).toBe(1);
  });

  it('confirmPick full quantity → picked status; picklist completes when all lines done', () => {
    seedOrders([makeOrder({ id: 'oC', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 5 } as never] })]);
    const [pl] = generatePicklists(E);
    const after = confirmPick(E, pl.id, pl.lines[0].id, 5);
    expect(after!.lines[0].status).toBe('picked');
    expect(after!.status).toBe('completed');
  });

  it('confirmPick short → short status; picklist completes only when no pending', () => {
    seedOrders([makeOrder({ id: 'oS', narration: 'manual', lines: [
      { id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 5 } as never,
      { id: 'l2', item_id: 'i2', item_name: 'Y', pending_qty: 3 } as never,
    ] })]);
    const [pl] = generatePicklists(E);
    const after1 = confirmPick(E, pl.id, pl.lines[0].id, 2);
    expect(after1!.lines[0].status).toBe('short');
    expect(after1!.status).toBe('in_progress');
    const after2 = confirmPick(E, pl.id, pl.lines[1].id, 3);
    expect(after2!.status).toBe('completed');
  });

  it('createPackGroup requires completed picklist', () => {
    seedOrders([makeOrder({ id: 'oP1', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    expect(createPackGroup(E, pl.id)).toBeNull();
    confirmPick(E, pl.id, pl.lines[0].id, 1);
    const pg = createPackGroup(E, pl.id);
    expect(pg).toBeTruthy();
    expect(pg!.status).toBe('open');
    expect(pg!.lines).toHaveLength(1);
  });

  it('new PackGroup born with retention_policy + created_by (P8.6 floor)', () => {
    seedOrders([makeOrder({ id: 'oP2', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    confirmPick(E, pl.id, pl.lines[0].id, 1);
    const pg = createPackGroup(E, pl.id)!;
    expect(pg.retention_policy).toBe('operational_log_only');
    expect(pg.created_by!.length).toBeGreaterThan(0);
  });

  it('createPackGroup applies BOM when one matches', () => {
    const bom: PackingBOM = {
      id: 'bom-1', entity_id: E, item_id: 'i1', item_code: 'I1', item_name: 'X',
      lines: [], total_packing_cost_paise: 0, active: true,
      effective_from: '2026-01-01', effective_to: null,
      created_at: '', updated_at: '', created_by: '',
    };
    localStorage.setItem(`erp_packing_boms_${E}`, JSON.stringify([bom]));
    seedOrders([makeOrder({ id: 'oB1', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    confirmPick(E, pl.id, pl.lines[0].id, 1);
    const pg = createPackGroup(E, pl.id)!;
    expect(pg.bom_applied).toBe('bom-1');
  });

  it('markPacked generates packing slip via existing engine + links id', () => {
    seedOrders([makeOrder({ id: 'oM1', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    confirmPick(E, pl.id, pl.lines[0].id, 1);
    const pg = createPackGroup(E, pl.id)!;
    const result = markPacked(E, pg.id);
    expect(result).toBeTruthy();
    expect(result!.packGroup.status).toBe('packed');
    expect(result!.packGroup.packing_slip_id).toBe(result!.packingSlip.id);
    // Persisted in EXISTING packing-slips store (not a parallel one)
    const slips: PackingSlip[] = JSON.parse(localStorage.getItem(packingSlipsKey(E)) ?? '[]');
    expect(slips.some((s) => s.id === result!.packingSlip.id)).toBe(true);
  });

  it('markPacked is idempotent — second call returns null', () => {
    seedOrders([makeOrder({ id: 'oM2', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    const [pl] = generatePicklists(E);
    confirmPick(E, pl.id, pl.lines[0].id, 1);
    const pg = createPackGroup(E, pl.id)!;
    markPacked(E, pg.id);
    expect(markPacked(E, pg.id)).toBeNull();
  });

  it('getPickPackSummary aggregates open orders + picklists + pack groups', () => {
    seedOrders([
      makeOrder({ id: 'sm1', narration: 'EcomX', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] }),
      makeOrder({ id: 'sm2', narration: 'manual', lines: [{ id: 'l2', item_id: 'i2', item_name: 'Y', pending_qty: 1 } as never] }),
    ]);
    const before = getPickPackSummary(E);
    expect(before.openOrders.total).toBe(2);
    expect(before.picklists.open).toBe(0);
    generatePicklists(E);
    const after = getPickPackSummary(E);
    expect(after.picklists.open).toBeGreaterThan(0);
  });

  it('§H import-shape guard · packing-bom-engine exports preserved', () => {
    expect(typeof bomEngine.resolveActiveBOM).toBe('function');
    expect(typeof bomEngine.expandDLN).toBe('function');
  });

  it('§H import-shape guard · packing-slip-engine exports preserved', () => {
    expect(typeof slipEngine.computePackingSlip).toBe('function');
  });

  it('§H wall · BinLabel storage is read-only by wms engine (no write)', () => {
    const labels: BinLabel[] = [];
    localStorage.setItem('erp_bin_labels', JSON.stringify(labels));
    const before = localStorage.getItem('erp_bin_labels');
    seedOrders([makeOrder({ id: 'oRO', narration: 'manual', lines: [{ id: 'l1', item_id: 'i1', item_name: 'X', pending_qty: 1 } as never] })]);
    generatePicklists(E);
    const after = localStorage.getItem('erp_bin_labels');
    expect(after).toBe(before);
  });

  it('engine exposes all 7 required public functions', () => {
    expect(typeof wmsEngine.getOpenPickableOrders).toBe('function');
    expect(typeof wmsEngine.generatePicklists).toBe('function');
    expect(typeof wmsEngine.confirmPick).toBe('function');
    expect(typeof wmsEngine.createPackGroup).toBe('function');
    expect(typeof wmsEngine.markPacked).toBe('function');
    expect(typeof wmsEngine.getPickPackSummary).toBe('function');
    expect(typeof wmsEngine.classifyBucket).toBe('function');
  });

  it('Pack Group storage key matches `erp_wms_pack_groups_<entity>`', () => {
    expect(packGroupsKey(E)).toBe(`erp_wms_pack_groups_${E}`);
  });

  it('Picklist storage key matches `erp_wms_picklists_<entity>`', () => {
    expect(picklistsKey(E)).toBe(`erp_wms_picklists_${E}`);
  });

  it('sprint-history seeds WMS1 row + flips P8.7 to 9ac7e41f', () => {
    const wms1 = SPRINTS.find((s) => s.code === 'T-WMS1-Pick-Pack');
    expect(wms1).toBeTruthy();
    expect(wms1!.predecessorSha).toBe('9ac7e41f');
    expect(wms1!.newSiblings).toEqual(['wms-pick-pack-engine']);
    const p87 = SPRINTS.find((s) => s.code === 'T-P87-DeptId-Bridge-Retrofit');
    expect(p87!.headSha).toBe('9ac7e41f');
  });

  it('sprint-history WMS1 narrative contains the canonical headline', () => {
    const src = JSON.stringify(SPRINTS);
    expect(src).toContain('T-WMS1-Pick-Pack');
    expect(src).toContain('wms-pick-pack-engine');
  });

  it('sibling-register includes wms-pick-pack-engine row', () => {
    const sib = SIBLINGS.find((s) => s.name === 'WMS Pick-Pack Engine');
    expect(sib).toBeTruthy();
    expect(sib!.path).toBe('src/lib/wms-pick-pack-engine.ts');
  });
});
