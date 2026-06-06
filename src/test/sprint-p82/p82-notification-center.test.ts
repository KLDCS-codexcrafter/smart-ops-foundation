/**
 * Sprint P82 · B.4 Notification Center — behavioral tests (≥30)
 *
 * Locks: eventKey idempotency · cap-prune oldest-only · mute filtering ·
 *        mute-expiry release · targetRole broadcast · digest same-day re-open ·
 *        digest resolved-today silences tomorrow · publisher #7b spec-valid
 *        EcClaimStatus only (no 'recovered' slip).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  publish, listNotifications, getUnreadCount, markRead, markAllRead,
  setMute, unsetMute, getMutes,
  buildOverdueTasksDigest, buildPtpDueDigest, buildObligationsDueDigest, runOpenDigests,
} from '@/lib/notification-engine';
import {
  notificationsKey, notificationMutesKey, NOTIFICATION_MAX,
  type NotificationEvent,
} from '@/types/notification';
import { createTask, acknowledgeTask, reassignTask, changeDueDate, updateTask } from '@/lib/taskflow-engine';
import {
  runRecon, createClaimFromLine, updateClaimStatus,
} from '@/lib/ecomx-recon-engine';
import type { EcClaimStatus, EcReconLine, EcOrder, EcSettlement } from '@/types/ecomx';

const ENT = 'P82TEST';
const USER = 'u-alice';
const OTHER = 'u-bob';

function reset() {
  localStorage.clear();
}

beforeEach(reset);

// ════════════════════════════════════════════════════════════════════════
// Section 1 · spine: publish · idempotency · cap-prune · readAt
// ════════════════════════════════════════════════════════════════════════
describe('publish() spine', () => {
  const base = {
    entityCode: ENT, targetUserId: USER, kind: 'taskflow.acknowledged' as const,
    source: 'test', cardId: 'taskflow' as const, title: 't',
  };

  it('appends a single event with all spec fields populated', () => {
    const e = publish({ ...base, eventKey: 'k1' });
    expect(e.id).toBeTruthy();
    expect(e.eventKey).toBe('k1');
    expect(e.entityCode).toBe(ENT);
    expect(e.targetUserId).toBe(USER);
    expect(e.targetRole).toBeNull();
    expect(e.source).toBe('test');
    expect(e.severity).toBe('info');
    expect(e.readAt).toBeNull();
    expect(e.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('is idempotent by eventKey — same key never duplicates', () => {
    const a = publish({ ...base, eventKey: 'dup', title: 'first' });
    const b = publish({ ...base, eventKey: 'dup', title: 'second' });
    expect(a.id).toBe(b.id);
    expect(listNotifications(ENT).length).toBe(1);
    expect(listNotifications(ENT)[0].title).toBe('first');
  });

  it('different eventKeys produce distinct events', () => {
    publish({ ...base, eventKey: 'k-a' });
    publish({ ...base, eventKey: 'k-b' });
    publish({ ...base, eventKey: 'k-c' });
    expect(listNotifications(ENT).length).toBe(3);
  });

  it('cap-prune drops the OLDEST when exceeding NOTIFICATION_MAX (500)', () => {
    for (let i = 0; i < NOTIFICATION_MAX + 5; i++) {
      publish({ ...base, eventKey: `cap-${i}`, title: `t-${i}` });
    }
    const rows = listNotifications(ENT);
    expect(rows.length).toBe(NOTIFICATION_MAX);
    // newest-first: last-inserted is at index 0
    expect(rows[0].eventKey).toBe(`cap-${NOTIFICATION_MAX + 4}`);
    // oldest five evicted
    expect(rows.find((r) => r.eventKey === 'cap-0')).toBeUndefined();
    expect(rows.find((r) => r.eventKey === 'cap-4')).toBeUndefined();
  });

  it('NOTIFICATION_MAX is 500 (cap-500 correction)', () => {
    expect(NOTIFICATION_MAX).toBe(500);
  });

  it('persists under the entity-scoped key', () => {
    publish({ ...base, eventKey: 'pk' });
    const raw = localStorage.getItem(notificationsKey(ENT));
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw!);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0].eventKey).toBe('pk');
  });

  it('markRead stamps readAt without removing the event', () => {
    const e = publish({ ...base, eventKey: 'r1' });
    markRead(ENT, e.id);
    const rows = listNotifications(ENT);
    expect(rows.length).toBe(1);
    expect(rows[0].readAt).not.toBeNull();
  });

  it('markRead on unknown id is a no-op', () => {
    publish({ ...base, eventKey: 'r2' });
    markRead(ENT, 'nope');
    expect(listNotifications(ENT)[0].readAt).toBeNull();
  });

  it('markAllRead returns count of newly-read user events only', () => {
    publish({ ...base, eventKey: 'a1' });
    publish({ ...base, eventKey: 'a2' });
    publish({ ...base, eventKey: 'a3', targetUserId: OTHER });
    const n = markAllRead(ENT, USER);
    expect(n).toBe(2);
    expect(listNotifications(ENT, { userId: OTHER }).every((e) => !e.readAt)).toBe(true);
  });

  it('getUnreadCount honors targetUserId scope', () => {
    publish({ ...base, eventKey: 'u1' });
    publish({ ...base, eventKey: 'u2', targetUserId: OTHER });
    expect(getUnreadCount(ENT, USER)).toBe(1);
    expect(getUnreadCount(ENT, OTHER)).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section 2 · targetUserId · '*' broadcast · targetRole role fan-out
// ════════════════════════════════════════════════════════════════════════
describe('audience routing', () => {
  const base = {
    entityCode: ENT, kind: 'approval.approved' as const,
    source: 'approval-workflow-engine', cardId: 'fincore' as const, title: 'x',
  };

  it("'*' broadcast reaches any user", () => {
    publish({ ...base, eventKey: 'b1', targetUserId: '*' });
    expect(listNotifications(ENT, { userId: USER }).length).toBe(1);
    expect(listNotifications(ENT, { userId: OTHER }).length).toBe(1);
  });

  it('userId-scoped events do NOT bleed to other users', () => {
    publish({ ...base, eventKey: 's1', targetUserId: USER });
    expect(listNotifications(ENT, { userId: OTHER }).length).toBe(0);
    expect(listNotifications(ENT, { userId: USER }).length).toBe(1);
  });

  it('targetRole broadcast reaches a role user AND NOT a non-role user', () => {
    publish({ ...base, eventKey: 'role1', targetUserId: '__role__', targetRole: 'finance' });
    expect(listNotifications(ENT, { userId: USER, userRole: 'finance' }).length).toBe(1);
    expect(listNotifications(ENT, { userId: OTHER, userRole: 'ops' }).length).toBe(0);
  });

  it('role match still respects user mutes', () => {
    publish({ ...base, eventKey: 'role2', targetUserId: '__role__', targetRole: 'finance' });
    setMute(ENT, USER, { source: 'approval-workflow-engine' });
    expect(listNotifications(ENT, { userId: USER, userRole: 'finance' }).length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section 3 · mute layer · filtering · expiry · unmute
// ════════════════════════════════════════════════════════════════════════
describe('mutes', () => {
  const mk = (i: number) => publish({
    entityCode: ENT, eventKey: `m-${i}`, targetUserId: USER,
    kind: 'taskflow.reassigned', source: 'taskflow-engine',
    cardId: 'taskflow', title: `r-${i}`,
  });

  it('mute by source suppresses matching events for that user', () => {
    mk(1); mk(2);
    setMute(ENT, USER, { source: 'taskflow-engine' });
    expect(listNotifications(ENT, { userId: USER }).length).toBe(0);
    // other user unaffected
    expect(localStorage.getItem(notificationMutesKey(ENT, OTHER))).toBeNull();
  });

  it('mute by kind filters that kind only', () => {
    mk(1);
    publish({
      entityCode: ENT, eventKey: 'other', targetUserId: USER,
      kind: 'approval.approved', source: 'approval-workflow-engine',
      cardId: 'fincore', title: 'ok',
    });
    setMute(ENT, USER, { kind: 'taskflow.reassigned' });
    const rows = listNotifications(ENT, { userId: USER });
    expect(rows.length).toBe(1);
    expect(rows[0].kind).toBe('approval.approved');
  });

  it('mute with BOTH kind and source requires AND match', () => {
    mk(1);
    setMute(ENT, USER, { kind: 'taskflow.acknowledged', source: 'taskflow-engine' });
    // kind mismatch → not muted
    expect(listNotifications(ENT, { userId: USER }).length).toBe(1);
  });

  it('expired mute no longer filters', () => {
    mk(1);
    const past = new Date(Date.now() - 60_000).toISOString();
    setMute(ENT, USER, { source: 'taskflow-engine', until: past });
    expect(listNotifications(ENT, { userId: USER }).length).toBe(1);
    // expired mutes are also excluded from getMutes
    expect(getMutes(ENT, USER).length).toBe(0);
  });

  it('future-dated mute still filters', () => {
    mk(1);
    const future = new Date(Date.now() + 3_600_000).toISOString();
    setMute(ENT, USER, { source: 'taskflow-engine', until: future });
    expect(listNotifications(ENT, { userId: USER }).length).toBe(0);
  });

  it('unsetMute releases the suppression', () => {
    mk(1);
    const m = setMute(ENT, USER, { source: 'taskflow-engine' });
    expect(listNotifications(ENT, { userId: USER }).length).toBe(0);
    unsetMute(ENT, USER, m.id);
    expect(listNotifications(ENT, { userId: USER }).length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section 4 · digests · same-day re-open · resolved-today silences tomorrow
// ════════════════════════════════════════════════════════════════════════
describe('digests', () => {
  function seedOverdueTask() {
    const t = createTask(ENT, {
      title: 'Overdue', priority: 'high', category: 'task',
      assigneeId: USER, assigneeName: 'Alice', creatorId: USER,
      departmentId: 'd1', dueDate: '2026-01-01', entityId: ENT,
    });
    return t;
  }

  it('overdue-tasks digest emits when overdue tasks exist', () => {
    seedOverdueTask();
    const e = buildOverdueTasksDigest(ENT, USER, '2026-06-06T10:00:00Z');
    expect(e).not.toBeNull();
    expect(e!.kind).toBe('digest.overdue_tasks');
    expect(e!.eventKey).toBe(`digest:overdue-tasks:${ENT}:${USER}:2026-06-06`);
  });

  it('overdue digest is null when no overdue tasks', () => {
    const e = buildOverdueTasksDigest(ENT, USER, '2026-06-06T10:00:00Z');
    expect(e).toBeNull();
  });

  it('same-day re-open adds NO new digest events (eventKey idempotent)', () => {
    seedOverdueTask();
    buildOverdueTasksDigest(ENT, USER, '2026-06-06T08:00:00Z');
    const before = listNotifications(ENT).length;
    buildOverdueTasksDigest(ENT, USER, '2026-06-06T15:00:00Z');
    buildOverdueTasksDigest(ENT, USER, '2026-06-06T23:00:00Z');
    expect(listNotifications(ENT).length).toBe(before);
  });

  it('item RESOLVED today → tomorrow digest is silent for it', () => {
    const t = seedOverdueTask();
    // today fires (count = 1)
    const todayE = buildOverdueTasksDigest(ENT, USER, '2026-06-06T08:00:00Z');
    expect(todayE).not.toBeNull();
    // resolve the task today
    updateTask(ENT, t.id, { status: 'completed', completedDate: '2026-06-06T18:00:00Z' }, USER);
    // tomorrow's digest: new eventKey (date+1), count = 0 ⇒ null
    const tomorrowE = buildOverdueTasksDigest(ENT, USER, '2026-06-07T08:00:00Z');
    expect(tomorrowE).toBeNull();
  });

  it('different days have different digest eventKeys', () => {
    seedOverdueTask();
    const a = buildOverdueTasksDigest(ENT, USER, '2026-06-06T08:00:00Z');
    // create a second overdue so tomorrow still has work
    seedOverdueTask();
    const b = buildOverdueTasksDigest(ENT, USER, '2026-06-07T08:00:00Z');
    expect(a!.eventKey).not.toBe(b!.eventKey);
  });

  it('obligations-due digest emits within 7-day horizon and is null beyond', () => {
    const near = buildObligationsDueDigest(ENT, USER, '2026-05-10T08:00:00Z');
    expect(near).not.toBeNull();
    const far = buildObligationsDueDigest(ENT, USER, '2030-01-01T08:00:00Z');
    expect(far).toBeNull();
  });

  it('obligations-due digest same-day re-open is idempotent', () => {
    buildObligationsDueDigest(ENT, USER, '2026-05-10T08:00:00Z');
    const n = listNotifications(ENT).length;
    buildObligationsDueDigest(ENT, USER, '2026-05-10T20:00:00Z');
    expect(listNotifications(ENT).length).toBe(n);
  });

  it('ptp-due digest is null when no PTPs are persisted', () => {
    const e = buildPtpDueDigest(ENT, USER, '2026-06-06T08:00:00Z');
    expect(e).toBeNull();
  });

  it('runOpenDigests returns only the digests it emitted this run', () => {
    seedOverdueTask();
    const out = runOpenDigests(ENT, USER, '2026-05-10T08:00:00Z');
    // overdue + obligations (no PTPs) → 2
    expect(out.length).toBe(2);
    // second open same day → 0 newly emitted
    const out2 = runOpenDigests(ENT, USER, '2026-05-10T10:00:00Z');
    expect(out2.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section 5 · publisher integration · payload contracts · #7b status lock
// ════════════════════════════════════════════════════════════════════════
describe('publishers · integration', () => {
  function mkTask() {
    return createTask(ENT, {
      title: 'Demo', priority: 'medium', category: 'task',
      assigneeId: USER, assigneeName: 'A', creatorId: USER,
      departmentId: 'd1', dueDate: '2026-06-10', entityId: ENT,
    });
  }

  it('acknowledgeTask publishes taskflow.acknowledged with stable eventKey', () => {
    const t = mkTask();
    acknowledgeTask(ENT, t.id, USER);
    const ev = listNotifications(ENT).find((e) => e.kind === 'taskflow.acknowledged');
    expect(ev).toBeDefined();
    expect(ev!.eventKey).toBe(`taskflow:ack:${ENT}:${t.id}`);
    expect(ev!.source).toBe('taskflow-engine');
    expect(ev!.cardId).toBe('taskflow');
    expect(ev!.deepLink).toBe(`/erp/taskflow/task/${t.id}`);
  });

  it('reassignTask publishes targeted at the NEW assignee', () => {
    const t = mkTask();
    reassignTask(ENT, t.id, OTHER, 'capacity', USER, 'Bob');
    const ev = listNotifications(ENT).find((e) => e.kind === 'taskflow.reassigned');
    expect(ev).toBeDefined();
    expect(ev!.targetUserId).toBe(OTHER);
  });

  it('changeDueDate publishes warning severity', () => {
    const t = mkTask();
    changeDueDate(ENT, t.id, '2026-06-20', 'slip', USER);
    const ev = listNotifications(ENT).find((e) => e.kind === 'taskflow.due_date_changed');
    expect(ev).toBeDefined();
    expect(ev!.severity).toBe('warning');
  });

  function seedReconFixture(): { orderId: string; settlementId: string } {
    const orders: EcOrder[] = [{
      id: 'o1', marketplaceId: 'amazon', marketplaceOrderId: 'AMZ-1',
      sku: 'SKU1', qty: 1, grossAmount: 10000, commission: 1000,
      shippingFee: 0, otherFees: 0, taxAmount: 0, expectedNet: 9000,
      orderDate: '2026-06-01', status: 'fulfilled',
    } as unknown as EcOrder];
    const settlements: EcSettlement[] = [{
      id: 's1', marketplaceId: 'amazon', marketplaceOrderId: 'AMZ-1',
      sku: 'SKU1', amount: 8000, settlementDate: '2026-06-05',
    } as unknown as EcSettlement];
    localStorage.setItem(`erp_ecomx_orders_${ENT}`, JSON.stringify(orders));
    localStorage.setItem(`erp_ecomx_settlements_${ENT}`, JSON.stringify(settlements));
    return { orderId: 'o1', settlementId: 's1' };
  }

  it('runRecon publishes ecomx.recon_completed once per runId', () => {
    seedReconFixture();
    const result = runRecon(ENT, { marketplaceId: 'amazon', dateFrom: '2026-06-01', dateTo: '2026-06-30' });
    const evs = listNotifications(ENT).filter((e) => e.kind === 'ecomx.recon_completed');
    expect(evs.length).toBeGreaterThanOrEqual(1);
    expect(evs[0].eventKey).toContain(result.id);
  });

  it('publisher #7b emits ONLY spec-valid EcClaimStatus values (no "recovered" slip)', () => {
    seedReconFixture();
    const result = runRecon(ENT, { marketplaceId: 'amazon', dateFrom: '2026-06-01', dateTo: '2026-06-30' });
    const line = result.lines.find((l) => l.flag !== 'matched') as EcReconLine | undefined;
    expect(line).toBeDefined();
    const claim = createClaimFromLine(ENT, line!.id, { reasonCategory: 'short_payment', ownerUserId: USER });
    const validStatuses: EcClaimStatus[] = ['open', 'raised', 'settled', 'rejected'];
    for (const s of validStatuses) {
      updateClaimStatus(ENT, claim.id, { status: s, note: `→ ${s}` });
    }
    const statusEvts = listNotifications(ENT).filter((e) => e.kind === 'ecomx.claim_status_changed');
    // Lock: every published claim-status title must reference ONLY a valid status,
    // never the legacy 'recovered' slip name.
    for (const e of statusEvts) {
      expect(e.title.includes('recovered')).toBe(false);
      expect(e.title).toMatch(/Claim (open|raised|settled|rejected) ·/);
    }
    // Severity mapping locks: settled→success, rejected→warning, others→info.
    const settled = statusEvts.find((e) => e.title.startsWith('Claim settled'));
    const rejected = statusEvts.find((e) => e.title.startsWith('Claim rejected'));
    expect(settled?.severity).toBe('success');
    expect(rejected?.severity).toBe('warning');
  });

  it('createClaimFromLine publishes ecomx.claim_created with claim deepLink', () => {
    seedReconFixture();
    const result = runRecon(ENT, { marketplaceId: 'amazon', dateFrom: '2026-06-01', dateTo: '2026-06-30' });
    const line = result.lines.find((l) => l.flag !== 'matched')!;
    const claim = createClaimFromLine(ENT, line.id, { reasonCategory: 'short_payment', ownerUserId: USER });
    const ev = listNotifications(ENT).find((e) => e.kind === 'ecomx.claim_created');
    expect(ev).toBeDefined();
    expect(ev!.deepLink).toBe(`/erp/ecomx/claim/${claim.id}`);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Section 6 · isolation · entity scope
// ════════════════════════════════════════════════════════════════════════
describe('entity isolation', () => {
  it('events under entity A do not appear under entity B', () => {
    publish({
      entityCode: 'A', eventKey: 'iso', targetUserId: USER,
      kind: 'taskflow.acknowledged', source: 's', cardId: 'taskflow', title: 't',
    });
    expect(listNotifications('A').length).toBe(1);
    expect(listNotifications('B').length).toBe(0);
  });

  it('mutes under entity A do not affect entity B', () => {
    publish({
      entityCode: 'B', eventKey: 'evB', targetUserId: USER,
      kind: 'taskflow.acknowledged', source: 'taskflow-engine',
      cardId: 'taskflow', title: 't',
    });
    setMute('A', USER, { source: 'taskflow-engine' });
    expect(listNotifications('B', { userId: USER }).length).toBe(1);
  });
});
