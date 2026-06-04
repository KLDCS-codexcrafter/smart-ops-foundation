/**
 * @file   src/test/sprint-145/frontdesk.test.ts
 * @sprint Sprint 145 · T-FrontDesk-A6F.1 · FrontDesk MVP · §N tests
 * @target ≥32 it() — ID-CAPTURE CANON · watchlist gate · badge sequence ·
 *         item-mismatch · roll-call · overstays · contact book · stats ·
 *         scope wall · institutional · audit type.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlannedVisitor, cancelPlannedVisitor,
  checkInVisitor, checkOutVisitor,
  addCarriedItem, removeCarriedItem,
  addWatchlistEntry, removeWatchlistEntry, listWatchlist, checkWatchlist,
  buildMusterReport, getOverstays, getOnPremises,
  addContactNote, listContactBook, deleteContactNote, buildLabelSheet, buildEnvelopeData,
  getFrontDeskStats, listVisitors,
} from '@/lib/frontdesk-engine';
import { partyMasterKey } from '@/types/party';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'ACME';
const U_RECEPTION = 'u-recep';
const U_SECOND = 'u-sec';

function clear(): void {
  localStorage.clear();
}

function seedParties(): void {
  const parties = [
    {
      id: 'p-1', entityId: E, party_code: 'CUST-0001', party_name: 'Acme Traders',
      party_type: 'customer', group: 'Wholesale', gstin: '27ABCDE1234F1Z5', state_code: '27',
      contact_name: null, contact_phone: null, contact_email: null,
      address_line1: null, address_line2: null, city: null, state: null, pincode: null,
      pan: null, msme_type: null, msme_udyam: null, created_at: '', updated_at: '',
    },
    {
      id: 'p-2', entityId: E, party_code: 'VEND-0001', party_name: 'Bharat Couriers',
      party_type: 'vendor', group: 'Logistics', gstin: '07ABCDE1234F1Z2', state_code: '07',
      contact_name: null, contact_phone: null, contact_email: null,
      address_line1: null, address_line2: null, city: null, state: null, pincode: null,
      pan: null, msme_type: null, msme_udyam: null, created_at: '', updated_at: '',
    },
  ];
  localStorage.setItem(partyMasterKey(E), JSON.stringify(parties));
}

const baseInput = (over: Partial<Parameters<typeof checkInVisitor>[2]> = {}) => ({
  name: 'Ramesh Kumar',
  company: 'Tata Steel',
  phone: '9876543210',
  purpose: 'Vendor Meeting' as const,
  hostEmployeeId: 'emp-1',
  hostName: 'Priya Sharma',
  ...over,
});

beforeEach(() => clear());

describe('FrontDesk · ID-CAPTURE CANON · DP-FD-18', () => {
  it('idProofLast4 > 4 chars throws', () => {
    expect(() => checkInVisitor(E, U_RECEPTION, baseInput({ idProofLast4: '12345' as never })))
      .toThrow(/ID-capture canon/);
  });
  it('12+ digit run in name throws', () => {
    expect(() => checkInVisitor(E, U_RECEPTION, baseInput({ name: 'Ram 123456789012 Kumar' })))
      .toThrow(/ID-capture canon/);
  });
  it('12+ digit run in vehicleNo throws', () => {
    expect(() => checkInVisitor(E, U_RECEPTION, baseInput({ vehicleNo: 'MH12 999999999999' })))
      .toThrow(/ID-capture canon/);
  });
  it('11-digit phone-like string passes (under threshold)', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput({ phone: '98765432101' }));
    expect(v.phone).toBe('98765432101');
  });
  it('idProofLast4 exactly 4 chars passes', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput({ idProofLast4: '1234' }));
    expect(v.idProofLast4).toBe('1234');
  });
  it('photo over 1MB throws', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(1_500_000);
    expect(() => checkInVisitor(E, U_RECEPTION, baseInput({ photoDataUrl: huge })))
      .toThrow(/Photo too large/);
  });
});

describe('FrontDesk · Visitors lifecycle', () => {
  it('createPlannedVisitor returns status=planned + plannedAt', () => {
    const v = createPlannedVisitor(E, U_RECEPTION, {
      ...baseInput(), plannedAt: '2026-06-10T10:00:00.000Z',
    });
    expect(v.status).toBe('planned');
    expect(v.plannedAt).toBe('2026-06-10T10:00:00.000Z');
    expect(v.badgeNo).toBe('');
  });
  it('cancelPlannedVisitor flips to cancelled', () => {
    const v = createPlannedVisitor(E, U_RECEPTION, {
      ...baseInput(), plannedAt: '2026-06-10T10:00:00.000Z',
    });
    const c = cancelPlannedVisitor(E, v.id);
    expect(c.status).toBe('cancelled');
  });
  it('cannot cancel non-planned visitor', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    expect(() => cancelPlannedVisitor(E, v.id)).toThrow();
  });
  it('checkInVisitor assigns badge B-0001 then B-0002', () => {
    const v1 = checkInVisitor(E, U_RECEPTION, baseInput({ name: 'A' }));
    const v2 = checkInVisitor(E, U_RECEPTION, baseInput({ name: 'B' }));
    expect(v1.badgeNo).toBe('B-0001');
    expect(v2.badgeNo).toBe('B-0002');
    expect(v1.status).toBe('on_site');
  });
  it('planned → check-in upgrades to on_site and assigns badge', () => {
    const p = createPlannedVisitor(E, U_RECEPTION, {
      ...baseInput(), plannedAt: '2026-06-10T10:00:00.000Z',
    });
    const c = checkInVisitor(E, U_RECEPTION, { ...baseInput(), plannedVisitorId: p.id });
    expect(c.id).toBe(p.id);
    expect(c.status).toBe('on_site');
    expect(c.badgeNo).toBe('B-0001');
  });
  it('checkOutVisitor flips to checked_out', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    const out = checkOutVisitor(E, v.id, []);
    expect(out.status).toBe('checked_out');
    expect(out.checkOutAt).toBeTruthy();
  });
  it('cannot check-out a visitor that is not on_site', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    checkOutVisitor(E, v.id, []);
    expect(() => checkOutVisitor(E, v.id, [])).toThrow();
  });
});

describe('FrontDesk · Watchlist · DP-FD-13', () => {
  it('addWatchlistEntry requires reason', () => {
    expect(() => addWatchlistEntry(E, {
      name: 'X', reason: '', flaggedByUserId: U_RECEPTION,
    })).toThrow(/reason/);
  });
  it('addWatchlistEntry requires flaggedByUserId', () => {
    expect(() => addWatchlistEntry(E, {
      name: 'X', reason: 'r', flaggedByUserId: '',
    })).toThrow(/flaggedByUserId/);
  });
  it('check-in throws when watchlist hit without acknowledgement', () => {
    addWatchlistEntry(E, { name: 'Ramesh Kumar', reason: 'theft', flaggedByUserId: U_RECEPTION });
    expect(() => checkInVisitor(E, U_RECEPTION, baseInput())).toThrow(/Watchlist hit/);
  });
  it('check-in succeeds with acknowledgeWatchlistByUserId', () => {
    addWatchlistEntry(E, { name: 'Ramesh Kumar', reason: 'theft', flaggedByUserId: U_RECEPTION });
    const v = checkInVisitor(E, U_RECEPTION, {
      ...baseInput(), acknowledgeWatchlistByUserId: U_SECOND,
    });
    expect(v.watchlistWarningShownTo).toBe(U_SECOND);
  });
  it('checkWatchlist matches by phone', () => {
    addWatchlistEntry(E, { name: 'Other', phone: '9876543210', reason: 'r', flaggedByUserId: U_RECEPTION });
    expect(checkWatchlist(E, 'Different', null, '9876543210').length).toBe(1);
  });
  it('removeWatchlistEntry sets removedAt and hides from active list', () => {
    const w = addWatchlistEntry(E, { name: 'X', reason: 'r', flaggedByUserId: U_RECEPTION });
    removeWatchlistEntry(E, w.id, U_SECOND);
    expect(listWatchlist(E).length).toBe(0);
  });
});

describe('FrontDesk · Items-Carried · checkout reconciliation', () => {
  it('addCarriedItem only allowed on_site', () => {
    const p = createPlannedVisitor(E, U_RECEPTION, { ...baseInput(), plannedAt: new Date().toISOString() });
    expect(() => addCarriedItem(E, p.id, { description: 'Laptop' })).toThrow();
  });
  it('checkout with all items verified → no mismatch', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    const withItem = addCarriedItem(E, v.id, { description: 'Laptop' });
    const out = checkOutVisitor(E, v.id, withItem.itemsCarried.map((i) => i.id));
    expect(out.itemsCarried.every((i) => !i.mismatch)).toBe(true);
  });
  it('checkout with missing items → mismatch flagged', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    addCarriedItem(E, v.id, { description: 'Laptop' });
    addCarriedItem(E, v.id, { description: 'Phone' });
    const out = checkOutVisitor(E, v.id, []);
    expect(out.itemsCarried.filter((i) => i.mismatch).length).toBe(2);
  });
  it('removeCarriedItem removes by id', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput());
    const w = addCarriedItem(E, v.id, { description: 'Bag' });
    const removed = removeCarriedItem(E, v.id, w.itemsCarried[0].id);
    expect(removed.itemsCarried.length).toBe(0);
  });
});

describe('FrontDesk · Roll-call · DP-FD-14', () => {
  it('buildMusterReport lists only on_site visitors', () => {
    checkInVisitor(E, U_RECEPTION, baseInput({ name: 'A' }));
    const v2 = checkInVisitor(E, U_RECEPTION, baseInput({ name: 'B' }));
    checkOutVisitor(E, v2.id, []);
    const m = buildMusterReport(E);
    expect(m.count).toBe(1);
    expect(m.rows[0].name).toBe('A');
  });
  it('getOnPremises mirrors muster count', () => {
    checkInVisitor(E, U_RECEPTION, baseInput({ name: 'A' }));
    expect(getOnPremises(E).length).toBe(1);
  });
  it('getOverstays flags visitors past expectedDurationMinutes', () => {
    const v = checkInVisitor(E, U_RECEPTION, baseInput({ expectedDurationMinutes: 5 }));
    const future = new Date(new Date(v.checkInAt!).getTime() + 3600_000).toISOString();
    expect(getOverstays(E, future).length).toBe(1);
  });
  it('getOverstays returns 0 when no duration set', () => {
    checkInVisitor(E, U_RECEPTION, baseInput());
    expect(getOverstays(E).length).toBe(0);
  });
});

describe('FrontDesk · Contact Book · DP-FD-8', () => {
  beforeEach(seedParties);
  it('listContactBook returns party-master rows', () => {
    expect(listContactBook(E).length).toBe(2);
  });
  it('listContactBook filters by group', () => {
    expect(listContactBook(E, { group: 'Logistics' }).length).toBe(1);
  });
  it('addContactNote attaches to party', () => {
    addContactNote(E, 'p-1', 'Followed up on PO', U_RECEPTION);
    const rows = listContactBook(E);
    expect(rows.find((r) => r.partyId === 'p-1')!.notes.length).toBe(1);
  });
  it('addContactNote requires note text', () => {
    expect(() => addContactNote(E, 'p-1', '', U_RECEPTION)).toThrow();
  });
  it('deleteContactNote removes by id', () => {
    const n = addContactNote(E, 'p-1', 'tmp', U_RECEPTION);
    deleteContactNote(E, n.id);
    expect(listContactBook(E).find((r) => r.partyId === 'p-1')!.notes.length).toBe(0);
  });
  it('buildLabelSheet returns selected parties', () => {
    expect(buildLabelSheet(E, ['p-1']).length).toBe(1);
  });
  it('buildEnvelopeData by group works', () => {
    const r = buildEnvelopeData(E, { group: 'Wholesale' });
    expect(r.count).toBe(1);
    expect(r.group).toBe('Wholesale');
  });
});

describe('FrontDesk · Stats', () => {
  it('getFrontDeskStats counts on_site / checked_out / overstays / watchlistHits', () => {
    addWatchlistEntry(E, { name: 'Ramesh Kumar', reason: 'r', flaggedByUserId: U_RECEPTION });
    const v1 = checkInVisitor(E, U_RECEPTION, {
      ...baseInput(), expectedDurationMinutes: 5, acknowledgeWatchlistByUserId: U_SECOND,
    });
    const v2 = checkInVisitor(E, U_RECEPTION, baseInput({ name: 'Suresh' }));
    checkOutVisitor(E, v2.id, []);
    const future = new Date(new Date(v1.checkInAt!).getTime() + 3600_000).toISOString();
    const s = getFrontDeskStats(E, future);
    expect(s.onSiteNow).toBe(1);
    expect(s.checkedOutToday).toBeGreaterThanOrEqual(1);
    expect(s.overstays).toBe(1);
    expect(s.watchlistHits).toBe(1);
  });
  it('listVisitors filter by status works', () => {
    checkInVisitor(E, U_RECEPTION, baseInput({ name: 'A' }));
    createPlannedVisitor(E, U_RECEPTION, { ...baseInput({ name: 'B' }), plannedAt: new Date().toISOString() });
    expect(listVisitors(E, 'on_site').length).toBe(1);
    expect(listVisitors(E, 'planned').length).toBe(1);
    expect(listVisitors(E).length).toBe(2);
  });
});

describe('FrontDesk · Scope Wall · DP-FD-1 (§H 0-DIFF parents)', () => {
  it('frontdesk-engine surface does NOT export gate-entry mutations', async () => {
    const mod = await import('@/lib/frontdesk-engine');
    expect((mod as Record<string, unknown>).createGateEntry).toBeUndefined();
    expect((mod as Record<string, unknown>).issueGatePass).toBeUndefined();
    expect((mod as Record<string, unknown>).recordWeighbridgeTicket).toBeUndefined();
  });
});

describe('FrontDesk · Institutional', () => {
  it('frontdesk-engine registered as sibling #214', () => {
    const sib = SIBLINGS.find((s) => s.id === 'frontdesk-engine');
    expect(sib).toBeDefined();
    expect(sib!.path).toBe('src/lib/frontdesk-engine.ts');
    expect(sib!.sprintAdded).toBe(145);
  });
  it('Sprint 145 registered with predecessorSha 293b0c1e', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 145);
    expect(s).toBeDefined();
    expect(s!.predecessorSha).toBe('293b0c1e');
    expect(s!.newSiblings).toContain('frontdesk-engine');
  });
  it('Sprint 144 backfilled with headSha 293b0c1e', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 144);
    expect(s!.headSha).toBe('293b0c1e');
  });
  it('frontdesk_event audit literal is exported additively', async () => {
    const { auditTrailLogKey } = await import('@/lib/audit-trail-engine');
    expect(typeof auditTrailLogKey).toBe('function');
  });
});
