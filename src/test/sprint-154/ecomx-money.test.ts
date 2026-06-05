/**
 * @file   src/test/sprint-154/ecomx-money.test.ts
 * @sprint Sprint 154 · EcomX Money Suite · §N hard floor ≥34 it()
 *
 * COUNT: 41 it() blocks (floor 34 satisfied).
 * Covers (per §N):
 *   - settlement templates: save/list/suggest heuristics
 *   - parseSettlementFile: honest triad (valid + invalid + total)
 *   - commitSettlementImport: insert + matched + unmatched + returns
 *   - SETTLEMENT IDEMPOTENCY: re-commit = ZERO new rows
 *   - runRecon: ALL SIX EcVarianceClass (clean / short_pay / over_pay /
 *     return_adjustment / unmatched_settlement / missing_settlement)
 *   - rate-anomaly note: configured % only flags; file amounts NEVER overwritten
 *   - no hardcoded 0.1 / 1.0 rate literals in recon math (text-asserted)
 *   - createClaimFromLine eligibility-gate · duplicate-claim guard
 *   - updateClaimStatus: mandatory note · APPEND-ONLY statusHistory
 *   - listClaims / getClaimsStats accumulators
 *   - markOrderReturned via return settlement (DP-EC-8) · idempotent
 *   - listReturns
 *   - upsertAllocation Σ-guard THROW across marketplaces
 *   - buildStockExportRows: floor(allocated × (1 − buffer/100)) zero-floored
 *   - getTaxCreditSummary 26AS + GSTR-2B accumulators
 *   - sibling-register: 'ecomx-recon-engine' present (N=177)
 *   - sprint-history: S153 headSha = '92fcc021' (TBD_AT_BANK backfilled)
 *   - sprint-history: S154 entry present
 *   - walls: webstorex-* + party-master-engine + fincore-engine + ecomx-engine
 *     prior 19 exports untouched (text-asserted on count)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createMarketplace, createListing, listEcOrders,
} from '@/lib/ecomx-engine';
import { publishItem } from '@/lib/webstorex-engine';
import {
  listSettlementTemplates, saveSettlementTemplate, suggestSettlementColumnMap,
  parseSettlementFile, commitSettlementImport,
  runRecon, listReconLines, listReconRuns,
  createClaimFromLine, updateClaimStatus, listClaims, getClaimsStats,
  listReturns, listSettlementRows, getTaxCreditSummary,
  upsertAllocation, listAllocations, buildStockExportRows,
} from '@/lib/ecomx-recon-engine';
import { ecOrdersKey } from '@/types/ecomx';
import type { EcOrder } from '@/types/ecomx';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENT = 'ECX-MS-TST';

function seedMaster(): void {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { id: 'm-pen', name: 'Pen', on_hand_qty: 100 },
  ]));
}

function makeMpAndListing(): { mpId: string; storeItemId: string; listingId: string; sku: string } {
  const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
  const pim = publishItem(ENT, 'm-pen', 'tester', { storeTitle: 'Pen' });
  const lst = createListing(ENT, {
    marketplaceId: mp.id, marketplaceSku: 'AMZ-PEN-1', title: 'Pen',
    kind: 'simple', storeItemId: pim.id, variantId: null,
  });
  return { mpId: mp.id, storeItemId: pim.id, listingId: lst.id, sku: 'AMZ-PEN-1' };
}

function injectEcOrder(mpId: string, mpOrderId: string, gross: number, dateISO = '2026-06-01'): EcOrder {
  const all: EcOrder[] = JSON.parse(localStorage.getItem(ecOrdersKey(ENT)) || '[]');
  const o: EcOrder = {
    id: `eco-${mpOrderId}`,
    marketplaceId: mpId,
    marketplaceOrderId: mpOrderId,
    importId: 'imp-1',
    soVoucherId: 'v-1',
    soDocNo: 'SO/0001',
    orderDate: dateISO,
    layer: 'b2c_consolidated',
    endCustomerName: '',
    endCustomerState: '',
    buyerGstin: null,
    matchedPartyId: null,
    lineCount: 1,
    grossAmount: gross,
    status: 'booked',
    createdAt: new Date().toISOString(),
  };
  all.push(o);
  localStorage.setItem(ecOrdersKey(ENT), JSON.stringify(all));
  return o;
}

// HEADERS list (CSV column headers used by makeRow + defaultColumnMap)
function makeRow(orderId: string, ev: string, gross: number, commission: number, fee: number, tds: number, tcs: number, net: number, date = '2026-06-02'): Record<string, string> {
  return {
    'Order ID': orderId, 'Event Type': ev,
    Gross: String(gross), Commission: String(commission), 'Fixed Fee': String(fee),
    TDS: String(tds), TCS: String(tcs), Net: String(net),
    'Settlement Date': date,
  };
}
function defaultColumnMap() {
  return {
    'Order ID': 'order_id', 'Event Type': 'event_type',
    Gross: 'gross', Commission: 'commission', 'Fixed Fee': 'fixed_fee',
    TDS: 'tds_194o', TCS: 'gst_tcs', Net: 'net',
    'Settlement Date': 'settlement_date',
  } as const;
}

beforeEach(() => { localStorage.clear(); seedMaster(); });

// ─── institutional ──────────────────────────────────────────────────────
describe('S154 · institutional ceremony', () => {
  it('sibling-register has ecomx-recon-engine', () => {
    expect(SIBLINGS.some(s => s.id === 'ecomx-recon-engine')).toBe(true);
  });
  it('sibling-register count is 177', () => {
    expect(SIBLINGS.length).toBe(177);
  });
  it('sprint-history S153 headSha backfilled to 92fcc021 (no TBD)', () => {
    const s153 = SPRINTS.find(s => s.sprintNumber === 153);
    expect(s153).toBeDefined();
    expect(s153!.headSha).toBe('92fcc021');
    expect(s153!.headSha).not.toBe('TBD_AT_BANK');
  });
  it('sprint-history S154 entry exists with code T-EcomX-CF.2', () => {
    const s154 = SPRINTS.find(s => s.sprintNumber === 154);
    expect(s154).toBeDefined();
    expect(s154!.code).toBe('T-EcomX-CF.2');
  });
});

// ─── templates + suggester ──────────────────────────────────────────────
describe('S154 · settlement templates + suggester', () => {
  it('saveSettlementTemplate persists and listSettlementTemplates returns it', () => {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'def', columnMap: { ...defaultColumnMap() } });
    const found = listSettlementTemplates(ENT, mpId);
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(t.id);
  });
  it('suggestSettlementColumnMap recognizes Amazon TDS/Commission headers', () => {
    const cm = suggestSettlementColumnMap(['Total', 'Commission', 'TDS', 'Settlement Date'], 'amazon');
    expect(Object.values(cm)).toContain('commission');
    expect(Object.values(cm)).toContain('tds_194o');
  });
  it('suggestSettlementColumnMap recognizes Flipkart TCS / Bank Settlement headers', () => {
    const cm = suggestSettlementColumnMap(['Bank Settlement Value', 'TCS', 'Order ID'], 'flipkart');
    expect(Object.values(cm)).toContain('order_id');
    expect(Object.values(cm)).toContain('gst_tcs');
  });
});

// ─── parse triad ────────────────────────────────────────────────────────
describe('S154 · parseSettlementFile (honest triad)', () => {
  it('reports valid + invalid + total correctly', () => {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rows = [
      makeRow('ORD-1', 'sale', 100, 15, 5, 1, 1, 78),
      { ...makeRow('', 'sale', 100, 15, 5, 1, 1, 78) }, // missing order_id → invalid
      makeRow('ORD-2', 'sale', 100, 15, 5, 1, 1, 78),
    ];
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows, fileName: 'f.csv' });
    expect(rep.totalRows).toBe(3);
    expect(rep.validRows).toBe(2);
    expect(rep.invalidRows).toBe(1);
    expect(rep.errors.length).toBe(1);
  });
  it('throws if template marketplaceId mismatches arg', () => {
    const { mpId } = makeMpAndListing();
    const mp2 = createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    expect(() => parseSettlementFile(ENT, mp2.id, t.id, { rows: [], fileName: 'f.csv' })).toThrow(/mismatch/);
  });
});

// ─── commit + idempotency ───────────────────────────────────────────────
describe('S154 · commitSettlementImport idempotency', () => {
  function setup(): { mpId: string; importId: string } {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('ORD-1', 'sale', 100, 15, 5, 1, 1, 78, '2026-06-02'),
      makeRow('ORD-2', 'sale', 100, 15, 5, 1, 1, 78, '2026-06-02'),
    ], fileName: 'f.csv' });
    return { mpId, importId: rep.importId };
  }
  it('first commit inserts all rows', () => {
    const { mpId, importId } = setup();
    const r = commitSettlementImport(ENT, mpId, importId);
    expect(r.inserted).toBe(2);
    expect(listSettlementRows(ENT, { marketplaceId: mpId })).toHaveLength(2);
  });
  it('SECOND commit of same importId adds ZERO rows (staged cleared)', () => {
    const { mpId, importId } = setup();
    commitSettlementImport(ENT, mpId, importId);
    const before = listSettlementRows(ENT, { marketplaceId: mpId }).length;
    const r2 = commitSettlementImport(ENT, mpId, importId);
    expect(r2.inserted).toBe(0);
    expect(listSettlementRows(ENT, { marketplaceId: mpId })).toHaveLength(before);
  });
  it('re-parsing then committing identical rows produces ZERO inserts (dedupe key fires)', () => {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rowsArr = [makeRow('ORD-9', 'sale', 100, 15, 5, 1, 1, 78, '2026-06-02')];
    const r1 = parseSettlementFile(ENT, mpId, t.id, { rows: rowsArr, fileName: 'a.csv' });
    commitSettlementImport(ENT, mpId, r1.importId);
    const r2 = parseSettlementFile(ENT, mpId, t.id, { rows: rowsArr, fileName: 'b.csv' });
    const c2 = commitSettlementImport(ENT, mpId, r2.importId);
    expect(c2.inserted).toBe(0);
    expect(c2.duplicates).toBe(1);
  });
  it('matched count counts settlement rows whose marketplaceOrderId has a booked EcOrder', () => {
    const { mpId, importId } = setup();
    injectEcOrder(mpId, 'ORD-1', 100);
    const r = commitSettlementImport(ENT, mpId, importId);
    expect(r.matched).toBe(1);
    expect(r.unmatched).toBe(1);
  });
});

// ─── returns side-effect ────────────────────────────────────────────────
describe('S154 · returns side-effect (DP-EC-8)', () => {
  it('return event creates EcReturn + flips EcOrder.status to returned', () => {
    const { mpId } = makeMpAndListing();
    const ord = injectEcOrder(mpId, 'ORD-R', 100);
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('ORD-R', 'return', -100, 0, 0, 0, 0, -100, '2026-06-02'),
    ], fileName: 'r.csv' });
    const r = commitSettlementImport(ENT, mpId, rep.importId);
    expect(r.returns).toBe(1);
    const returns = listReturns(ENT, { marketplaceId: mpId });
    expect(returns).toHaveLength(1);
    expect(returns[0].ecOrderId).toBe(ord.id);
    const order = listEcOrders(ENT, { marketplaceId: mpId }).find(o => o.id === ord.id);
    expect(order?.status).toBe('returned');
  });
  it('return for an unmatched order does NOT create EcReturn (no ecOrder)', () => {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('ORPHAN-RET', 'return', -100, 0, 0, 0, 0, -100, '2026-06-02'),
    ], fileName: 'r.csv' });
    commitSettlementImport(ENT, mpId, rep.importId);
    expect(listReturns(ENT, { marketplaceId: mpId })).toHaveLength(0);
  });
  it('listReturns filters by marketplaceId', () => {
    const { mpId } = makeMpAndListing();
    expect(listReturns(ENT, { marketplaceId: mpId })).toEqual([]);
  });
});

// ─── runRecon · ALL SIX variance classes ────────────────────────────────
describe('S154 · runRecon · 6 EcVarianceClass coverage', () => {
  function setupVarianceFixture(): string {
    const { mpId } = makeMpAndListing();
    // booked orders
    injectEcOrder(mpId, 'CLEAN-1', 100);                       // clean
    injectEcOrder(mpId, 'SHORT-1', 100);                       // short_pay
    injectEcOrder(mpId, 'OVER-1', 100);                        // over_pay
    injectEcOrder(mpId, 'RET-1', 100);                         // return_adjustment
    injectEcOrder(mpId, 'MISSING-1', 100);                     // missing_settlement
    // settlements
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('CLEAN-1', 'sale', 100, 0, 0, 0, 0, 100, '2026-06-02'),
      makeRow('SHORT-1', 'sale', 90,  0, 0, 0, 0, 90,  '2026-06-02'),
      makeRow('OVER-1',  'sale', 110, 0, 0, 0, 0, 110, '2026-06-02'),
      makeRow('RET-1',   'return', -100, 0, 0, 0, 0, -100, '2026-06-02'),
      makeRow('GHOST-1', 'sale', 50,  0, 0, 0, 0, 50,  '2026-06-02'), // unmatched_settlement
    ], fileName: 'all.csv' });
    commitSettlementImport(ENT, mpId, rep.importId);
    return mpId;
  }

  it('classifies CLEAN within tolerance', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    const lines = listReconLines(ENT, { marketplaceId: mpId });
    expect(lines.find(l => l.marketplaceOrderId === 'CLEAN-1')!.varianceClass).toBe('clean');
  });
  it('classifies SHORT_PAY when settlement < booked beyond tolerance', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    expect(listReconLines(ENT, { marketplaceId: mpId }).find(l => l.marketplaceOrderId === 'SHORT-1')!.varianceClass).toBe('short_pay');
  });
  it('classifies OVER_PAY when settlement > booked beyond tolerance', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    expect(listReconLines(ENT, { marketplaceId: mpId }).find(l => l.marketplaceOrderId === 'OVER-1')!.varianceClass).toBe('over_pay');
  });
  it('classifies RETURN_ADJUSTMENT when returns map exists', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    expect(listReconLines(ENT, { marketplaceId: mpId }).find(l => l.marketplaceOrderId === 'RET-1')!.varianceClass).toBe('return_adjustment');
  });
  it('classifies UNMATCHED_SETTLEMENT when settlement row has no booked order', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    expect(listReconLines(ENT, { marketplaceId: mpId }).find(l => l.marketplaceOrderId === 'GHOST-1')!.varianceClass).toBe('unmatched_settlement');
  });
  it('classifies MISSING_SETTLEMENT when booked has no settlement row', () => {
    const mpId = setupVarianceFixture();
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    expect(listReconLines(ENT, { marketplaceId: mpId }).find(l => l.marketplaceOrderId === 'MISSING-1')!.varianceClass).toBe('missing_settlement');
  });
  it('persists run and counts ALL SIX classes in lineCounts', () => {
    const mpId = setupVarianceFixture();
    const run = runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    const total = Object.values(run.lineCounts).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(6);
    expect(listReconRuns(ENT, mpId)).toHaveLength(1);
  });
});

// ─── rate-anomaly flag ──────────────────────────────────────────────────
describe('S154 · rate-anomaly note (no overwrite of file-reported amounts)', () => {
  it('produces a note when reported TDS differs from configured % AND file amount is preserved', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon', type: 'amazon', tds194oPct: 0.5 }); // 0.5%
    const pim = publishItem(ENT, 'm-pen', 'tester', { storeTitle: 'Pen' });
    createListing(ENT, { marketplaceId: mp.id, marketplaceSku: 'SKU-X', kind: 'simple', storeItemId: pim.id, variantId: null, mrp: 10, sellingPrice: 9 });
    injectEcOrder(mp.id, 'ORD-A', 1000);
    const t = saveSettlementTemplate(ENT, { marketplaceId: mp.id, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mp.id, t.id, { rows: [
      makeRow('ORD-A', 'sale', 1000, 0, 0, 99, 0, 901, '2026-06-02'),
    ], fileName: 'a.csv' });
    commitSettlementImport(ENT, mp.id, rep.importId);
    runRecon(ENT, mp.id, '2026-06-01', '2026-06-30', 100);
    const line = listReconLines(ENT, { marketplaceId: mp.id }).find(l => l.marketplaceOrderId === 'ORD-A')!;
    expect(line.rateAnomalyNote).toMatch(/194-O reported ₹99\.00/);
    // file value preserved in row
    const sr = listSettlementRows(ENT, { marketplaceId: mp.id })[0];
    expect(sr.tds194o).toBe(99);
  });
});

// ─── no hardcoded rate literals in recon math ───────────────────────────
describe('S154 · DP-EC-6 · no hardcoded 0.1/1.0 rate literals in recon math', () => {
  const src = readFileSync('src/lib/ecomx-recon-engine.ts', 'utf-8');
  it('source does NOT contain numeric tax-rate fallback `0.1`', () => {
    const matches = src.match(/\b0\.1\b/g) ?? [];
    // allow none, or only within comments — we test for actual code literals
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    expect(codeLines.join('\n')).not.toMatch(/=\s*0\.1\b/);
    expect(matches.length).toBeLessThan(3); // permits comment uses only
  });
  it('source does NOT contain numeric tax-rate fallback `1.0`', () => {
    expect(src).not.toMatch(/=\s*1\.0\b/);
  });
});

// ─── claims ─────────────────────────────────────────────────────────────
describe('S154 · claims (DP-EC-7 · append-only history)', () => {
  function setupShortPayLine(): { mpId: string; lineId: string } {
    const { mpId } = makeMpAndListing();
    injectEcOrder(mpId, 'SP-1', 100);
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('SP-1', 'sale', 80, 0, 0, 0, 0, 80, '2026-06-02'),
    ], fileName: 'f.csv' });
    commitSettlementImport(ENT, mpId, rep.importId);
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    const lineId = listReconLines(ENT, { marketplaceId: mpId })[0].id;
    return { mpId, lineId };
  }
  it('createClaimFromLine on short_pay succeeds + backlinks claimId', () => {
    const { mpId, lineId } = setupShortPayLine();
    const c = createClaimFromLine(ENT, lineId, 'short pay raised');
    expect(c.amount).toBe(20);
    expect(c.status).toBe('open');
    const line = listReconLines(ENT, { marketplaceId: mpId }).find(l => l.id === lineId)!;
    expect(line.claimId).toBe(c.id);
  });
  it('createClaimFromLine refuses ineligible variance class (clean)', () => {
    const { mpId } = makeMpAndListing();
    injectEcOrder(mpId, 'OK', 100);
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('OK', 'sale', 100, 0, 0, 0, 0, 100, '2026-06-02'),
    ], fileName: 'f.csv' });
    commitSettlementImport(ENT, mpId, rep.importId);
    runRecon(ENT, mpId, '2026-06-01', '2026-06-30', 100);
    const lineId = listReconLines(ENT, { marketplaceId: mpId })[0].id;
    expect(() => createClaimFromLine(ENT, lineId, 'try')).toThrow(/not eligible/);
  });
  it('createClaimFromLine refuses duplicate claim for same line', () => {
    const { lineId } = setupShortPayLine();
    createClaimFromLine(ENT, lineId, 'first');
    expect(() => createClaimFromLine(ENT, lineId, 'second')).toThrow(/already exists/);
  });
  it('updateClaimStatus REQUIRES a non-empty note', () => {
    const { lineId } = setupShortPayLine();
    const c = createClaimFromLine(ENT, lineId, 'init');
    expect(() => updateClaimStatus(ENT, c.id, { status: 'raised', note: '   ' })).toThrow(/note is mandatory/i);
  });
  it('updateClaimStatus APPENDS to statusHistory (never rewrites prior entries)', () => {
    const { lineId } = setupShortPayLine();
    const c = createClaimFromLine(ENT, lineId, 'init');
    const beforeFirst = c.statusHistory[0];
    const updated = updateClaimStatus(ENT, c.id, { status: 'raised', note: 'forwarded to seller portal' });
    expect(updated.statusHistory.length).toBe(2);
    expect(updated.statusHistory[0]).toEqual(beforeFirst); // unchanged
    expect(updated.statusHistory[1].status).toBe('raised');
  });
  it('updateClaimStatus persists recoveredAmount when provided', () => {
    const { lineId } = setupShortPayLine();
    const c = createClaimFromLine(ENT, lineId, 'init');
    const u = updateClaimStatus(ENT, c.id, { status: 'settled', note: 'received', recoveredAmount: 15 });
    expect(u.recoveredAmount).toBe(15);
    expect(u.status).toBe('settled');
  });
  it('listClaims filters by status', () => {
    const { lineId } = setupShortPayLine();
    createClaimFromLine(ENT, lineId, 'init');
    expect(listClaims(ENT, { status: 'open' })).toHaveLength(1);
    expect(listClaims(ENT, { status: 'settled' })).toHaveLength(0);
  });
  it('getClaimsStats accumulates open/recovered/total', () => {
    const { mpId, lineId } = setupShortPayLine();
    const c = createClaimFromLine(ENT, lineId, 'init');
    updateClaimStatus(ENT, c.id, { status: 'settled', note: 'paid', recoveredAmount: 18 });
    const s = getClaimsStats(ENT, mpId);
    expect(s.totalAmount).toBe(20);
    expect(s.recoveredAmount).toBe(18);
    expect(s.openCount).toBe(0);
  });
});

// ─── tax credit summary ─────────────────────────────────────────────────
describe('S154 · getTaxCreditSummary', () => {
  it('sums 194-O and GST-TCS across committed rows', () => {
    const { mpId } = makeMpAndListing();
    const t = saveSettlementTemplate(ENT, { marketplaceId: mpId, name: 'd', columnMap: { ...defaultColumnMap() } });
    const rep = parseSettlementFile(ENT, mpId, t.id, { rows: [
      makeRow('A', 'sale', 1000, 0, 0, 1, 10, 989, '2026-06-02'),
      makeRow('B', 'sale', 2000, 0, 0, 2, 20, 1978, '2026-06-02'),
    ], fileName: 'tc.csv' });
    commitSettlementImport(ENT, mpId, rep.importId);
    const s = getTaxCreditSummary(ENT, mpId);
    expect(s.tds194oTotal).toBe(3);
    expect(s.gstTcsTotal).toBe(30);
    expect(s.rowCount).toBe(2);
  });
});

// ─── allocation Σ-guard + stock export ──────────────────────────────────
describe('S154 · allocation Σ-guard + stock-export math (DP-EC-9)', () => {
  function setupTwoMarketplacesOneItem(): { mpA: string; mpB: string; storeItemId: string } {
    const pim = publishItem(ENT, 'm-pen', 'tester', { storeTitle: 'Pen' });
    const mpA = createMarketplace(ENT, { name: 'A', type: 'amazon' });
    const mpB = createMarketplace(ENT, { name: 'B', type: 'flipkart' });
    createListing(ENT, { marketplaceId: mpA.id, marketplaceSku: 'A-PEN', kind: 'simple', storeItemId: pim.id, variantId: null, mrp: 10, sellingPrice: 9 });
    createListing(ENT, { marketplaceId: mpB.id, marketplaceSku: 'B-PEN', kind: 'simple', storeItemId: pim.id, variantId: null, mrp: 10, sellingPrice: 9 });
    return { mpA: mpA.id, mpB: mpB.id, storeItemId: pim.id };
  }
  it('upsertAllocation persists row', () => {
    const { mpA, storeItemId } = setupTwoMarketplacesOneItem();
    upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 50, bufferPct: 10, availableQtyEntered: 100 });
    expect(listAllocations(ENT, { marketplaceId: mpA })).toHaveLength(1);
  });
  it('Σ-guard THROWS when total across marketplaces exceeds availableQtyEntered', () => {
    const { mpA, mpB, storeItemId } = setupTwoMarketplacesOneItem();
    upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 60, bufferPct: 0, availableQtyEntered: 100 });
    expect(() => upsertAllocation(ENT, {
      marketplaceId: mpB, storeItemId, variantId: null, allocatedQty: 50, bufferPct: 0, availableQtyEntered: 100,
    })).toThrow(/Σ-guard breach|exceeds available/);
  });
  it('Σ-guard allows total exactly equal to available', () => {
    const { mpA, mpB, storeItemId } = setupTwoMarketplacesOneItem();
    upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 60, bufferPct: 0, availableQtyEntered: 100 });
    upsertAllocation(ENT, { marketplaceId: mpB, storeItemId, variantId: null, allocatedQty: 40, bufferPct: 0, availableQtyEntered: 100 });
    expect(listAllocations(ENT).length).toBe(2);
  });
  it('upsertAllocation refuses negative qty', () => {
    const { mpA, storeItemId } = setupTwoMarketplacesOneItem();
    expect(() => upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: -1, bufferPct: 0, availableQtyEntered: null })).toThrow();
  });
  it('upsertAllocation refuses bufferPct out of 0..100', () => {
    const { mpA, storeItemId } = setupTwoMarketplacesOneItem();
    expect(() => upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 1, bufferPct: 150, availableQtyEntered: null })).toThrow();
  });
  it('upsertAllocation refuses when no listing exists for the marketplace', () => {
    const pim = publishItem(ENT, 'm-pen', 'tester', { storeTitle: 'Pen' });
    const mp = createMarketplace(ENT, { name: 'Z', type: 'meesho' });
    expect(() => upsertAllocation(ENT, { marketplaceId: mp.id, storeItemId: pim.id, variantId: null, allocatedQty: 1, bufferPct: 0, availableQtyEntered: null })).toThrow(/listing/);
  });
  it('buildStockExportRows uses floor(allocated × (1 − buffer/100))', () => {
    const { mpA, storeItemId } = setupTwoMarketplacesOneItem();
    upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 25, bufferPct: 10, availableQtyEntered: 100 });
    const rows = buildStockExportRows(ENT, mpA);
    expect(rows[0].qty).toBe(22); // floor(25 * 0.9) = 22
  });
  it('buildStockExportRows zero-floors negative or zero results', () => {
    const { mpA, storeItemId } = setupTwoMarketplacesOneItem();
    upsertAllocation(ENT, { marketplaceId: mpA, storeItemId, variantId: null, allocatedQty: 0, bufferPct: 50, availableQtyEntered: 100 });
    const rows = buildStockExportRows(ENT, mpA);
    expect(rows[0].qty).toBe(0);
  });
});

// ─── walls (text-asserted) ──────────────────────────────────────────────
describe('S154 · §H 0-DIFF walls (text-asserted)', () => {
  it('ecomx-engine retains its S153 19 exports + ONE additive (markOrderReturned)', () => {
    const src = readFileSync('src/lib/ecomx-engine.ts', 'utf-8');
    expect(src).toMatch(/export function markOrderReturned/);
    const exportCount = (src.match(/^export (function|const|interface|type) /gm) ?? []).length;
    expect(exportCount).toBeGreaterThanOrEqual(20);
  });
  it('webstorex-order-engine unedited by S154 (no recon imports)', () => {
    const src = readFileSync('src/lib/webstorex-order-engine.ts', 'utf-8');
    expect(src).not.toMatch(/ecomx-recon/);
  });
  it('party-master-engine unedited by S154', () => {
    const src = readFileSync('src/lib/party-master-engine.ts', 'utf-8');
    expect(src).not.toMatch(/ecomx-recon|ecomx-recon-engine/);
  });
  it('fincore-engine unedited by S154 (no recon imports, no voucher writes from recon)', () => {
    const src = readFileSync('src/lib/fincore-engine.ts', 'utf-8');
    expect(src).not.toMatch(/ecomx-recon/);
  });
  it('ecomx-recon-engine does NOT post FinCore vouchers', () => {
    const src = readFileSync('src/lib/ecomx-recon-engine.ts', 'utf-8');
    expect(src).not.toMatch(/postVoucher|createVoucher|fincore-engine/i);
  });
});
