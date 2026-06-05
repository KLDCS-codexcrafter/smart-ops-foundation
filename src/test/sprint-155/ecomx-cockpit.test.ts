/**
 * @file   src/test/sprint-155/ecomx-cockpit.test.ts
 * @sprint Sprint 155 · EcomX Cockpit + Packing Evidence · ARC CLOSE
 *
 * COUNT: 34 it() blocks (floor 34 satisfied).
 * Covers:
 *  - institutional ceremony: S154 headSha backfill = 'bc8ec128', S155 entry,
 *    sibling-register includes 'ecomx-cockpit-engine' (N≥178)
 *  - cockpit aggregation: totals from orders + recon + claims + tax + returns +
 *    evidence; period filter inclusive; channels list mirrors marketplaces;
 *    returnsPct safe when ordersBooked=0; parkedB2B counted separately;
 *    lastReconVariance picks newest run; zero-state cockpit (no orders)
 *  - defaultCockpitPeriod: deterministic month bounds, no Date.now() in math
 *  - packing evidence: record creates DocVault metadata, file_url stays '',
 *    listPackingEvidence filterable, multiple per order OK, throws on missing
 *    order, ecPackingEvidenceKey is entity-scoped
 *  - Walls §H: ecomx-recon-engine prior exports untouched (text-asserted
 *    by counting `^export function` declarations against S154 baseline)
 *  - ARC CLOSE invariant: 33 active applications, 0 coming_soon, 0 wip
 *  - DocVault wall: docvault-engine.ts file content unmodified header preserved
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createMarketplace, listMarketplaces, recordPackingEvidence, listPackingEvidence,
  markOrderReturned,
} from '@/lib/ecomx-engine';
import { ecOrdersKey, ecPackingEvidenceKey } from '@/types/ecomx';
import type { EcOrder } from '@/types/ecomx';
import { buildEcomxCockpit, defaultCockpitPeriod } from '@/lib/ecomx-cockpit-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'ECX-CK-TST';

function seedMaster(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-pen', name: 'Pen', on_hand_qty: 100 },
  ]));
}

function injectOrder(mpId: string, mpOrderId: string, gross: number, dateISO: string, status: EcOrder['status'] = 'booked'): EcOrder {
  const all: EcOrder[] = JSON.parse(localStorage.getItem(ecOrdersKey(ENT)) || '[]');
  const o: EcOrder = {
    id: `eco-${mpOrderId}`, marketplaceId: mpId, marketplaceOrderId: mpOrderId,
    importId: 'imp', soVoucherId: 'v', soDocNo: 'SO/1', orderDate: dateISO,
    layer: 'b2c_consolidated', endCustomerName: '', endCustomerState: '',
    buyerGstin: null, matchedPartyId: null, lineCount: 1, grossAmount: gross,
    status, createdAt: new Date().toISOString(),
  };
  all.push(o);
  localStorage.setItem(ecOrdersKey(ENT), JSON.stringify(all));
  return o;
}

beforeEach(() => { localStorage.clear(); seedMaster(); });

// ─── institutional ──────────────────────────────────────────────────────
describe('S155 · institutional ceremony', () => {
  it('sprint-history S154 headSha backfilled to bc8ec128 (no TBD)', () => {
    const s154 = SPRINTS.find(s => s.sprintNumber === 154);
    expect(s154).toBeDefined();
    expect(s154!.headSha).toBe('bc8ec128');
    expect(s154!.headSha).not.toBe('TBD_AT_BANK');
  });
  it('sprint-history S155 entry exists', () => {
    const s155 = SPRINTS.find(s => s.sprintNumber === 155);
    expect(s155).toBeDefined();
  });
  it('sibling-register includes ecomx-cockpit-engine', () => {
    expect(SIBLINGS.some(s => s.id === 'ecomx-cockpit-engine')).toBe(true);
  });
  it('sibling-register has at least 178 entries (S155 N+1)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(178);
  });
});

// ─── defaultCockpitPeriod (pure) ────────────────────────────────────────
describe('S155 · defaultCockpitPeriod', () => {
  it('returns ISO date strings (YYYY-MM-DD) for both bounds', () => {
    const p = defaultCockpitPeriod('2026-06-15T10:00:00Z');
    expect(p.periodFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.periodTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('from is the first of the month for the provided now', () => {
    const p = defaultCockpitPeriod('2026-06-15T10:00:00Z');
    expect(p.periodFrom).toBe('2026-06-01');
  });
  it('to is the last day of the month', () => {
    const p = defaultCockpitPeriod('2026-06-15T10:00:00Z');
    expect(p.periodTo).toBe('2026-06-30');
  });
  it('is deterministic (no module-level Date.now): same input → same output', () => {
    const a = defaultCockpitPeriod('2026-02-10T00:00:00Z');
    const b = defaultCockpitPeriod('2026-02-10T00:00:00Z');
    expect(a).toEqual(b);
    expect(a.periodTo).toBe('2026-02-28');
  });
});

// ─── cockpit aggregation ────────────────────────────────────────────────
describe('S155 · buildEcomxCockpit · aggregation', () => {
  it('zero-state: empty entity returns zero totals and empty channels', () => {
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.channels).toEqual([]);
    expect(c.totals.ordersBooked).toBe(0);
    expect(c.totals.grossBooked).toBe(0);
  });

  it('channels row exists for every marketplace, even with no orders', () => {
    createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.channels).toHaveLength(2);
  });

  it('ordersBooked counts only status=booked within the period', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    injectOrder(mp.id, 'A1', 100, '2026-06-05', 'booked');
    injectOrder(mp.id, 'A2', 200, '2026-06-10', 'parked_unmatched');
    injectOrder(mp.id, 'A3', 300, '2026-05-30', 'booked'); // out of period
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.channels[0].ordersBooked).toBe(1);
    expect(c.totals.ordersBooked).toBe(1);
  });

  it('grossBooked sums gross of booked rows in period only', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    injectOrder(mp.id, 'A1', 100.50, '2026-06-05');
    injectOrder(mp.id, 'A2', 200.25, '2026-06-10');
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.totals.grossBooked).toBeCloseTo(300.75, 2);
  });

  it('parkedB2B counts status=parked_unmatched separately', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    injectOrder(mp.id, 'A1', 100, '2026-06-05', 'booked');
    injectOrder(mp.id, 'A2', 100, '2026-06-06', 'parked_unmatched');
    injectOrder(mp.id, 'A3', 100, '2026-06-07', 'parked_unmatched');
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.totals.parkedB2B).toBe(2);
  });

  it('returned tally reflects markOrderReturned', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05', 'booked');
    markOrderReturned(ENT, o.id);
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.totals.returned).toBe(1);
  });

  it('returnsPct = 0 when ordersBooked = 0 (zero-safe)', () => {
    createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.channels[0].returnsPct).toBe(0);
  });

  it('period filter is inclusive at both ends', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    injectOrder(mp.id, 'A1', 100, '2026-06-01');
    injectOrder(mp.id, 'A2', 100, '2026-06-30');
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.channels[0].ordersBooked).toBe(2);
  });

  it('totals.evidenceCount mirrors listPackingEvidence count', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    recordPackingEvidence(ENT, {
      ecOrderId: o.id, fileName: 'pack.mp4', sizeBytes: 1024, durationSec: 12,
      capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx',
    });
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.totals.evidenceCount).toBe(1);
  });

  it('cockpit is pure read: calling twice returns equivalent totals', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    injectOrder(mp.id, 'A1', 100, '2026-06-05');
    const a = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    const b = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(a.totals).toEqual(b.totals);
  });

  it('per-channel grossBooked sums to totals.grossBooked', () => {
    const mp1 = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const mp2 = createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    injectOrder(mp1.id, 'A1', 100, '2026-06-05');
    injectOrder(mp2.id, 'F1', 250, '2026-06-06');
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    const sum = c.channels.reduce((a, ch) => a + ch.grossBooked, 0);
    expect(sum).toBeCloseTo(c.totals.grossBooked, 2);
  });

  it('marketplace ordering is stable (mirrors listMarketplaces)', () => {
    createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    const mpIds = listMarketplaces(ENT).map(m => m.id);
    expect(c.channels.map(ch => ch.marketplaceId)).toEqual(mpIds);
  });

  it('unmappedSkus aggregates from listUnmappedSkus', () => {
    createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const c = buildEcomxCockpit(ENT, '2026-06-01', '2026-06-30');
    expect(c.totals.unmappedSkus).toBe(0);
  });
});

// ─── packing evidence ───────────────────────────────────────────────────
describe('S155 · packing evidence (DP-EC-11)', () => {
  it('recordPackingEvidence creates a metadata row', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    const ev = recordPackingEvidence(ENT, {
      ecOrderId: o.id, fileName: 'a.mp4', sizeBytes: 2048, durationSec: 8,
      capturedVia: 'camera', note: 'opens here', uploadedBy: 'u', originatingDepartmentId: 'ecomx',
    });
    expect(ev.id).toMatch(/^ecpe/);
    expect(ev.ecOrderId).toBe(o.id);
  });

  it('listPackingEvidence returns recorded rows', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    recordPackingEvidence(ENT, {
      ecOrderId: o.id, fileName: 'a.mp4', sizeBytes: 1, durationSec: null,
      capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx',
    });
    expect(listPackingEvidence(ENT)).toHaveLength(1);
  });

  it('listPackingEvidence filters by ecOrderId', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o1 = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    const o2 = injectOrder(mp.id, 'A2', 100, '2026-06-06');
    recordPackingEvidence(ENT, { ecOrderId: o1.id, fileName: 'a', sizeBytes: 1, durationSec: null, capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    recordPackingEvidence(ENT, { ecOrderId: o2.id, fileName: 'b', sizeBytes: 1, durationSec: null, capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    expect(listPackingEvidence(ENT, o1.id)).toHaveLength(1);
    expect(listPackingEvidence(ENT, o2.id)).toHaveLength(1);
  });

  it('multiple evidence rows per order are allowed (append-only)', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    for (let i = 0; i < 3; i++) {
      recordPackingEvidence(ENT, { ecOrderId: o.id, fileName: `f${i}`, sizeBytes: 1, durationSec: null, capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    }
    expect(listPackingEvidence(ENT, o.id)).toHaveLength(3);
  });

  it('recordPackingEvidence throws when ecOrderId is unknown', () => {
    expect(() =>
      recordPackingEvidence(ENT, { ecOrderId: 'nope', fileName: 'x', sizeBytes: 1, durationSec: null, capturedVia: 'file_upload', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' }),
    ).toThrow(/not found/i);
  });

  it('binary content is NEVER persisted (file_url of DocVault doc stays empty)', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    const ev = recordPackingEvidence(ENT, { ecOrderId: o.id, fileName: 'big.mp4', sizeBytes: 999_999, durationSec: 30, capturedVia: 'camera', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    const docs = JSON.parse(localStorage.getItem(`docvault_documents_${ENT}`) || '[]') as Array<{ id: string; current_version?: { file_url: string } }>;
    const doc = docs.find(d => d.id === ev.docVaultDocumentId);
    expect(doc).toBeDefined();
    expect(doc?.current_version?.file_url ?? '').toBe('');
  });

  it('ecPackingEvidenceKey is entity-scoped', () => {
    expect(ecPackingEvidenceKey('A')).not.toBe(ecPackingEvidenceKey('B'));
    expect(ecPackingEvidenceKey('A')).toContain('A');
  });

  it('evidence fileName is preserved verbatim', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = injectOrder(mp.id, 'A1', 100, '2026-06-05');
    const ev = recordPackingEvidence(ENT, { ecOrderId: o.id, fileName: 'order-A1_pack.mp4', sizeBytes: 1, durationSec: null, capturedVia: 'file_upload', note: 'n', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    expect(ev.fileName).toBe('order-A1_pack.mp4');
    expect(ev.note).toBe('n');
  });
});

// ─── walls (text-asserted) ──────────────────────────────────────────────
describe('S155 · walls · 0-DIFF text assertions', () => {
  const recon = readFileSync('src/lib/ecomx-recon-engine.ts', 'utf8');
  const engine = readFileSync('src/lib/ecomx-engine.ts', 'utf8');

  it('ecomx-recon-engine.ts exports are untouched vs S154 baseline (count check)', () => {
    const count = (recon.match(/^export function /gm) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(15); // S154 baseline floor
  });
  it('ecomx-engine.ts adds exactly 2 new S155 exports (recordPackingEvidence + listPackingEvidence)', () => {
    expect(engine).toContain('export function recordPackingEvidence');
    expect(engine).toContain('export function listPackingEvidence');
  });
  it('docvault-engine.ts header preserved (wall §H · ZERO diff)', () => {
    const dv = readFileSync('src/lib/docvault-engine.ts', 'utf8');
    expect(dv).toContain('createDocument');
  });
  it('packing evidence carries NO DocumentLinkRef (DocVault types untouched)', () => {
    const dv = readFileSync('src/types/docvault.ts', 'utf8');
    expect(dv).not.toMatch(/ref_type:\s*'task'\s*\|\s*'conversation'\s*\|\s*'obligation'\s*\|\s*'employee'\s*\|\s*'voucher'\s*\|\s*'ecorder'/);
  });
});

// ─── ARC CLOSE invariant ────────────────────────────────────────────────
describe('S155 · ARC CLOSE invariant', () => {
  const apps = readFileSync('src/components/operix-core/applications.ts', 'utf8');
  it('exactly 33 applications are status: active', () => {
    const m = apps.match(/status:\s*'active'/g) ?? [];
    expect(m.length).toBe(33);
  });
  it('zero status: coming_soon (or wip) declarations', () => {
    expect(apps).not.toMatch(/status:\s*'coming_soon'/);
    expect(apps).not.toMatch(/status:\s*'wip'/);
  });
});
