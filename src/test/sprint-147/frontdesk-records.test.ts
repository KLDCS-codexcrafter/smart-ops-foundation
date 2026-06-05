/**
 * @file   src/test/sprint-147/frontdesk-records.test.ts
 * @sprint Sprint 147 · T-FrontDesk-A6F.3 · Mail Room + Asset Custody + Reception Diary
 *         + gate-entry bridge · §N tests · ≥32 it() target.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInwardMail, acknowledgeInwardMail, getUnclaimedInward,
  createOutwardMail, markSent, attachProofOfDispatch, confirmDelivery,
  getUnconfirmedOutward, linkScan, listMail,
  issueAsset, returnAsset, getOverdueCustody, flagOverdueCustody, loadCustody,
  buildReceptionDiary,
  linkVisitorToGateEntry,
} from '@/lib/frontdesk-records-engine';
import { createPlannedVisitor, checkInVisitor, getVisitor } from '@/lib/frontdesk-engine';
import { readAuditTrail } from '@/lib/audit-trail-engine';
import { listTasks } from '@/lib/taskflow-engine';
import { ASSETS_KEY, type Asset } from '@/types/asset-master';
import { gateEntriesKey, type GateEntry } from '@/types/gate-entry';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { frontdeskSidebarItems } from '@/apps/erp/configs/frontdesk-sidebar-config';
import type { SidebarItem } from '@/shell/types';

const E = 'ACME';
const CTX = { entityId: E, createdByUserId: 'u-recep' };

function clear(): void { localStorage.clear(); }

function seedAsset(id = 'a-1', code = 'AST-000001', name = 'Dell Laptop'): Asset {
  const a: Asset = {
    id, assetCode: code, name, category: 'laptop', make: 'Dell', model: 'Latitude',
    serialNo: 'SN-1', purchaseDate: '2024-01-01', purchaseValue: 60000,
    warrantyExpiry: '2027-01-01', location: 'HQ', department: 'IT',
    condition: 'good', notes: '', fixed_asset_id: null,
    currentAssigneeId: '', currentAssigneeCode: '', currentAssigneeName: '',
    assignedDate: '', assignments: [], status: 'available',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const existing: Asset[] = JSON.parse(localStorage.getItem(ASSETS_KEY) ?? '[]');
  localStorage.setItem(ASSETS_KEY, JSON.stringify([a, ...existing]));
  return a;
}

function seedGateEntry(id = 'ge-1'): GateEntry {
  const g: GateEntry = {
    id, entity_id: E, entity_code: E,
    entry_time: new Date().toISOString(),
    purpose: 'visitor', outcome: 'pending',
    logged_by_user_id: 'sec-1',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  localStorage.setItem(gateEntriesKey(E), JSON.stringify([g]));
  return g;
}

beforeEach(clear);

describe('S147 · Mail Room — Inward', () => {
  it('create inward letter (addressee required)', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'HDFC letter',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice' });
    expect(m.direction).toBe('inward');
    expect(m.toEmployeeName).toBe('Alice');
  });

  it('inward letter without addressee throws', () => {
    expect(() => createInwardMail(E, { ...CTX, kind: 'letter', description: 'x' }))
      .toThrow(/addressee/i);
  });

  it('inward document requires addressee', () => {
    expect(() => createInwardMail(E, { ...CTX, kind: 'document', description: 'd' }))
      .toThrow(/addressee/i);
  });

  it('inward parcel requires addressee', () => {
    expect(() => createInwardMail(E, { ...CTX, kind: 'parcel', description: 'p' }))
      .toThrow(/addressee/i);
  });

  it('gift requires giver + declaredBy', () => {
    expect(() => createInwardMail(E, { ...CTX, kind: 'gift', description: 'sweets' }))
      .toThrow(/giver/i);
    expect(() => createInwardMail(E, { ...CTX, kind: 'gift', description: 'sweets',
      giftGiverText: 'Vendor X' })).toThrow(/declaredBy/i);
  });

  it('gift with giver + declaredBy succeeds', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'gift', description: 'sweets',
      giftGiverText: 'Vendor X', giftDeclaredByEmployeeId: 'emp-9', giftApproxValue: 500 });
    expect(m.kind).toBe('gift');
    expect(m.giftApproxValue).toBe(500);
  });

  it('acknowledge by addressee passes', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice' });
    const ack = acknowledgeInwardMail(E, m.id, 'emp-1');
    expect(ack.acknowledgedAt).toBeTruthy();
    expect(ack.acknowledgedViaOverride).toBe(false);
  });

  it('acknowledge by non-addressee without override throws', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice' });
    expect(() => acknowledgeInwardMail(E, m.id, 'emp-2')).toThrow(/addressee/i);
  });

  it('reception override recorded with reason', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice' });
    const ack = acknowledgeInwardMail(E, m.id, 'recep-1', { overrideReason: 'on leave' });
    expect(ack.acknowledgedViaOverride).toBe(true);
    expect(ack.acknowledgedOverrideReason).toBe('on leave');
  });

  it('double-ack throws', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice' });
    acknowledgeInwardMail(E, m.id, 'emp-1');
    expect(() => acknowledgeInwardMail(E, m.id, 'emp-1')).toThrow(/already/i);
  });

  it('unclaimed ageDays math (injected now)', () => {
    const m = createInwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toEmployeeId: 'emp-1', toEmployeeName: 'Alice',
      receivedAt: '2026-06-01T00:00:00.000Z' });
    const list = getUnclaimedInward(E, '2026-06-05T00:00:00.000Z');
    expect(list[0].mail.id).toBe(m.id);
    expect(list[0].ageDays).toBe(4);
  });
});

describe('S147 · Mail Room — Outward', () => {
  it('outward create then markSent then proof attach', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'reply',
      toText: 'Vendor X' });
    expect(m.sentAt).toBeNull();
    const sent = markSent(E, m.id, { dispatchMode: 'courier' });
    expect(sent.sentAt).toBeTruthy();
    const proof = attachProofOfDispatch(E, m.id, 'doc-99');
    expect(proof.proofOfDispatchDocId).toBe('doc-99');
  });

  it('attaching proof before sent throws', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toText: 'V' });
    expect(() => attachProofOfDispatch(E, m.id, 'd-1')).toThrow(/before/i);
  });

  it('rpad missing proof WARN after 2 days (never throws)', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x',
      toText: 'V' });
    markSent(E, m.id, { dispatchMode: 'rpad' });
    // Force sentAt back-dated
    const raw = JSON.parse(localStorage.getItem(`fd_mail_${E}`)!);
    raw[0].sentAt = '2026-06-01T00:00:00.000Z';
    localStorage.setItem(`fd_mail_${E}`, JSON.stringify(raw));
    const board = getUnconfirmedOutward(E, '2026-06-04T00:00:00.000Z');
    expect(board[0].missingProofWarn).toBe(true);
  });

  it('confirmDelivery clears the ageing board', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x', toText: 'V' });
    markSent(E, m.id, { dispatchMode: 'courier' });
    expect(getUnconfirmedOutward(E).length).toBe(1);
    confirmDelivery(E, m.id);
    expect(getUnconfirmedOutward(E).length).toBe(0);
  });

  it('unconfirmed ageDays math', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x', toText: 'V' });
    markSent(E, m.id, { dispatchMode: 'courier' });
    const raw = JSON.parse(localStorage.getItem(`fd_mail_${E}`)!);
    raw[0].sentAt = '2026-06-01T00:00:00.000Z';
    localStorage.setItem(`fd_mail_${E}`, JSON.stringify(raw));
    expect(getUnconfirmedOutward(E, '2026-06-06T00:00:00.000Z')[0].ageDays).toBe(5);
  });

  it('outward create requires recipient', () => {
    expect(() => createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x' }))
      .toThrow(/recipient/i);
  });

  it('linkScan stores docId', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'x', toText: 'V' });
    const linked = linkScan(E, m.id, 'scan-1');
    expect(linked.scanDocumentId).toBe('scan-1');
  });

  it('listMail filter by status=unclaimed', () => {
    createInwardMail(E, { ...CTX, kind: 'letter', description: 'a', toEmployeeId: 'e1', toEmployeeName: 'A' });
    const out = createOutwardMail(E, { ...CTX, kind: 'letter', description: 'b', toText: 'V' });
    markSent(E, out.id, { dispatchMode: 'courier' });
    expect(listMail(E, { status: 'unclaimed' }).length).toBe(1);
  });
});

describe('S147 · Asset Custody', () => {
  it('unknown assetRefId throws', () => {
    expect(() => issueAsset(E, {
      ...CTX, assetRefId: 'missing', employeeId: 'e1', employeeName: 'A',
    })).toThrow(/not found/i);
  });

  it('second open issue on same asset throws', () => {
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A' });
    expect(() => issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e2', employeeName: 'B' }))
      .toThrow(/open custody/i);
  });

  it('return flow + condition recorded', () => {
    seedAsset();
    const r = issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A' });
    const ret = returnAsset(E, r.id, { conditionOnReturn: 'good · slight scratch' });
    expect(ret.returnedAt).toBeTruthy();
    expect(ret.conditionOnReturn).toMatch(/scratch/);
  });

  it('overdue detection (inject now)', () => {
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A',
      dueBackAt: '2026-06-01T00:00:00.000Z' });
    expect(getOverdueCustody(E, '2026-06-05T00:00:00.000Z').length).toBe(1);
    expect(getOverdueCustody(E, '2026-05-30T00:00:00.000Z').length).toBe(0);
  });

  it('flagOverdueCustody spawns task with custody-overdue: tag + assignee=holder', () => {
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e-holder', employeeName: 'Holder',
      dueBackAt: '2020-01-01T00:00:00.000Z' });
    const res = flagOverdueCustody(E);
    expect(res.flagged.length).toBe(1);
    const tasks = listTasks(E);
    const t = tasks.find((x) => x.tags.some((tag) => tag.startsWith('custody-overdue:')));
    expect(t).toBeTruthy();
    expect(t!.assigneeId).toBe('e-holder');
  });

  it('flagOverdueCustody idempotent re-run skips already-flagged', () => {
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A',
      dueBackAt: '2020-01-01T00:00:00.000Z' });
    const r1 = flagOverdueCustody(E);
    const r2 = flagOverdueCustody(E);
    expect(r1.flagged.length).toBe(1);
    expect(r2.flagged.length).toBe(0);
    expect(r2.alreadyFlagged.length).toBe(1);
  });

  it('photo cap throws when > 1MB', () => {
    seedAsset();
    const huge = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024);
    expect(() => issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A',
      evidencePhotoDataUrl: huge })).toThrow(/Photo too large/);
  });

  it('open custody appears in loadCustody', () => {
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A' });
    expect(loadCustody(E).length).toBe(1);
  });
});

describe('S147 · Reception Diary (FD-16 · COMPUTED)', () => {
  it('empty day is honest', () => {
    const d = buildReceptionDiary(E, '2026-06-05');
    expect(d.visitorsIn).toBe(0);
    expect(d.unclaimedInwardMail).toEqual([]);
    expect(d.custodyOverdue).toEqual([]);
  });

  it('partitions sections correctly', () => {
    createInwardMail(E, { ...CTX, kind: 'letter', description: 'A',
      toEmployeeId: 'e1', toEmployeeName: 'Alice', receivedAt: '2026-06-01T00:00:00.000Z' });
    seedAsset();
    issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e-h', employeeName: 'H',
      dueBackAt: '2020-01-01T00:00:00.000Z' });
    const d = buildReceptionDiary(E, '2026-06-05');
    expect(d.unclaimedInwardMail.length).toBe(1);
    expect(d.custodyOverdue.length).toBe(1);
  });

  it('expectedCouriers filters dispatchMode=courier', () => {
    const m = createOutwardMail(E, { ...CTX, kind: 'parcel', description: 'box', toText: 'V' });
    markSent(E, m.id, { dispatchMode: 'courier' });
    const d = buildReceptionDiary(E, new Date().toISOString().slice(0, 10));
    expect(d.expectedCouriers.length).toBe(1);
  });
});

describe('S147 · Gate-entry bridge (DP-FD-1 READ-ONLY)', () => {
  it('missing gate entry throws', () => {
    const v = createPlannedVisitor(E, {
      name: 'V1', purpose: 'General Visit', hostEmployeeId: 'h1', hostName: 'Host',
      plannedAt: new Date().toISOString(),
    }, { entityId: E, userId: 'u-recep' });
    expect(() => linkVisitorToGateEntry(E, v.id, 'missing', 'u-recep')).toThrow(/Gate entry/);
  });

  it('ref stored on visitor via additive update path', () => {
    seedGateEntry('ge-7');
    const v = checkInVisitor(E, {
      name: 'V2', purpose: 'General Visit', hostEmployeeId: 'h1', hostName: 'Host',
    }, { entityId: E, userId: 'u-recep' });
    linkVisitorToGateEntry(E, v.id, 'ge-7', 'u-recep');
    const after = getVisitor(E, v.id);
    expect(after!.gateEntryRef).toBe('ge-7');
  });
});

describe('S147 · Canon scope + structural parity', () => {
  it('ID-CAPTURE CANON scopes to VISITOR fields — 12-digit string in mail.notes does NOT throw', () => {
    // Explicit boundary test: legitimate AWB / tracking numbers may be 12+ digits.
    const m = createOutwardMail(E, { ...CTX, kind: 'parcel', description: 'box',
      toText: 'V', notes: 'Tracking 123456789012345' });
    expect(m.notes).toMatch(/123456789012345/);
  });

  it('sidebar items carry ZERO requiredCards (S146.T2 pattern parity)', () => {
    function countRequired(items: SidebarItem[]): number {
      let n = 0;
      for (const it of items) {
        if (it.requiredCards && it.requiredCards.length > 0) n++;
        if (it.children) n += countRequired(it.children);
      }
      return n;
    }
    expect(countRequired(frontdeskSidebarItems)).toBe(0);
  });
});

describe('S147 · Audit + Registers', () => {
  it('audit emitted on inward create', () => {
    createInwardMail(E, { ...CTX, kind: 'letter', description: 'A',
      toEmployeeId: 'e1', toEmployeeName: 'Alice' });
    const trail = readAuditTrail(E);
    expect(trail.some((t) => t.entityType === 'frontdesk_event' && t.action === 'create')).toBe(true);
  });

  it('audit emitted on custody return', () => {
    seedAsset();
    const r = issueAsset(E, { ...CTX, assetRefId: 'a-1', employeeId: 'e1', employeeName: 'A' });
    returnAsset(E, r.id);
    const trail = readAuditTrail(E);
    expect(trail.filter((t) => t.entityType === 'frontdesk_event').length).toBeGreaterThanOrEqual(2);
  });

  it('registers: S146 banked SHA c06202c9', () => {
    const s146 = SPRINTS.find((s) => s.sprintNumber === 146);
    expect(s146?.headSha).toBe('c06202c9');
  });

  it('registers: S147 last entry · TBD_AT_BANK', () => {
    const last = SPRINTS[SPRINTS.length - 1];
    expect(last.sprintNumber).toBe(147);
    expect(last.headSha).toBe('TBD_AT_BANK');
  });

  it('registers: sibling frontdesk-records-engine present (→216)', () => {
    const sib = SIBLINGS.find((s) => s.id === 'frontdesk-records-engine');
    expect(sib).toBeTruthy();
    expect(sib?.sprintAdded).toBe(147);
    expect(SIBLINGS.length).toBe(216);
  });

  it('time-robust: now-injection works in unclaimed math', () => {
    createInwardMail(E, { ...CTX, kind: 'letter', description: 'A',
      toEmployeeId: 'e1', toEmployeeName: 'Alice', receivedAt: '2026-06-01T00:00:00.000Z' });
    expect(getUnclaimedInward(E, '2026-06-10T00:00:00.000Z')[0].ageDays).toBe(9);
    expect(getUnclaimedInward(E, '2026-06-02T00:00:00.000Z')[0].ageDays).toBe(1);
  });
});
