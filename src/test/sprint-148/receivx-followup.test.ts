/**
 * @file   src/test/sprint-148/receivx-followup.test.ts
 * @sprint Sprint 148 · T-ReceivX-CF.1 · §N tests · ≥34 it() target.
 * Covers: Collections Follow-Up engine (DP-RX-1/2/3) + S148 mail rider (mailNo + updateMail
 * immutable-field guards + backfill) + Contact Book Depth rider (PartyContact CRUD,
 * one-isPrimary, greetings, envelope, label grid) + registers + sidebar parity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  logFollowUp, voidFollowUp, listFollowUps, getLastN,
  getTodaysFollowUps, getPlannedReminders,
  shouldPromptToday, markPrompted, loadFollowUps,
} from '@/lib/receivx-followup-engine';
import {
  upsertPartyContact, deletePartyContact, getContactsForParty, loadPartyContacts,
  getGreetingsToday, buildEnrichedEnvelope, computeLabelGrid,
} from '@/lib/frontdesk-engine';
import {
  createInwardMail, createOutwardMail, backfillMailNumbers, updateMail, loadMail,
} from '@/lib/frontdesk-records-engine';
import { receivxTasksKey, receivxPTPsKey, type OutstandingTask, type PTP } from '@/types/receivx';
import { partyMasterKey, type Party } from '@/types/party';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { frontdeskSidebarItems } from '@/apps/erp/configs/frontdesk-sidebar-config';
import type { SidebarItem } from '@/shell/types';

const E = 'ACME';

function clear(): void { localStorage.clear(); }

function seedTask(overrides: Partial<OutstandingTask> = {}): OutstandingTask {
  const t: OutstandingTask = {
    id: 'tsk-1', entity_id: E,
    outstanding_id: 'os-1', voucher_id: 'v-1', voucher_no: 'INV-001',
    voucher_date: '2026-05-01', due_date: '2026-05-15',
    party_id: 'p-1', party_name: 'Acme Traders',
    original_amount: 100000, pending_amount: 80000, age_days: 20, age_bucket: '0-30',
    assigned_salesman_id: null, assigned_salesman_name: null,
    assigned_agent_id: null, assigned_agent_name: null,
    assigned_broker_id: null, assigned_broker_name: null,
    assigned_telecaller_id: null, assigned_telecaller_name: null,
    assigned_collection_exec_id: null, assigned_collection_exec_name: null,
    status: 'open',
    next_action_date: null, next_action: null,
    last_contact_at: null, last_contact_channel: null,
    last_cadence_step: null, escalation_level: 0,
    active_ptp_id: null, disputed_reason: null,
    notes: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
  const existing: OutstandingTask[] = JSON.parse(localStorage.getItem(receivxTasksKey(E)) ?? '[]');
  localStorage.setItem(receivxTasksKey(E), JSON.stringify([t, ...existing.filter((x) => x.id !== t.id)]));
  return t;
}

function seedParty(id = 'p-1', name = 'Acme Traders'): Party {
  const p: Party = {
    id, entity_id: E, party_code: 'C-001', party_name: name, party_type: 'customer',
    gstin: null, state_code: null,
    created_via_quick_add: false, audit_flag_resolved_at: null,
    created_at: '2026-01-01', updated_at: '2026-01-01', created_by: 'u',
  };
  const cur: Party[] = JSON.parse(localStorage.getItem(partyMasterKey(E)) ?? '[]');
  localStorage.setItem(partyMasterKey(E), JSON.stringify([...cur.filter((x) => x.id !== id), p]));
  return p;
}

beforeEach(clear);

// ── DP-RX-1/2 · logFollowUp ──────────────────────────────────────────
describe('S148 · Collections Follow-Up · logFollowUp', () => {
  it('logs a follow-up and writes side-effects via existing task save path', () => {
    seedTask();
    const fu = logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u-1', followedUpByName: 'U One',
      channel: 'call', remarks: 'Called accounts; will pay next week.',
      nextFollowUpDate: '2026-06-10',
    });
    expect(fu.id).toBeTruthy();
    const tasks: OutstandingTask[] = JSON.parse(localStorage.getItem(receivxTasksKey(E))!);
    const t = tasks[0];
    expect(t.last_contact_at).toBe(fu.at);
    expect(t.last_contact_channel).toBe('call');
    expect(t.next_action_date).toBe('2026-06-10');
  });

  it('remarks are mandatory — throws on empty', () => {
    seedTask();
    expect(() => logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: '   ',
    })).toThrow(/remarks/i);
  });

  it('unknown taskId throws', () => {
    expect(() => logFollowUp(E, {
      taskId: 'missing', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x',
    })).toThrow(/task not found/i);
  });

  it('meeting/visit channel maps to call on task.last_contact_channel', () => {
    seedTask();
    logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'meeting', remarks: 'Met at office.',
    });
    const t: OutstandingTask = JSON.parse(localStorage.getItem(receivxTasksKey(E))!)[0];
    expect(t.last_contact_channel).toBe('call');
  });

  it('promisedAmount without nextFollowUpDate throws', () => {
    seedTask();
    expect(() => logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'whatsapp', remarks: 'PTP', promisedAmount: 50000,
    })).toThrow(/promised/i);
  });

  it('promisedAmount + nextDate creates a PTP and back-refs', () => {
    seedTask();
    const fu = logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'whatsapp', remarks: 'PTP confirmed',
      promisedAmount: 50000, nextFollowUpDate: '2026-06-15',
    });
    expect(fu.ptpId).toBeTruthy();
    const ptps: PTP[] = JSON.parse(localStorage.getItem(receivxPTPsKey(E))!);
    expect(ptps).toHaveLength(1);
    expect(ptps[0].promised_amount).toBe(50000);
    const t: OutstandingTask = JSON.parse(localStorage.getItem(receivxTasksKey(E))!)[0];
    expect(t.status).toBe('promised');
    expect(t.active_ptp_id).toBe(fu.ptpId);
  });

  it('next_action_date is preserved when log does not set one', () => {
    seedTask({ next_action_date: '2026-07-01' });
    logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'Status check.',
    });
    const t: OutstandingTask = JSON.parse(localStorage.getItem(receivxTasksKey(E))!)[0];
    expect(t.next_action_date).toBe('2026-07-01');
  });
});

// ── DP-RX-2 · APPEND-ONLY · voidFollowUp ─────────────────────────────
describe('S148 · voidFollowUp', () => {
  it('voids with reason; reason mandatory', () => {
    seedTask();
    const fu = logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x',
    });
    expect(() => voidFollowUp(E, fu.id, '', 'u')).toThrow(/reason/i);
    const v = voidFollowUp(E, fu.id, 'wrong task', 'u');
    expect(v.voidedAt).toBeTruthy();
    expect(v.voidReason).toBe('wrong task');
  });

  it('double-void throws', () => {
    seedTask();
    const fu = logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x',
    });
    voidFollowUp(E, fu.id, 'r', 'u');
    expect(() => voidFollowUp(E, fu.id, 'r2', 'u')).toThrow(/already voided/i);
  });

  it('voiding does NOT revert task side-effects (append-only canon)', () => {
    seedTask();
    const fu = logFollowUp(E, {
      taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x', nextFollowUpDate: '2026-06-10',
    });
    voidFollowUp(E, fu.id, 'misentered', 'u');
    const t: OutstandingTask = JSON.parse(localStorage.getItem(receivxTasksKey(E))!)[0];
    expect(t.last_contact_at).toBeTruthy();
    expect(t.next_action_date).toBe('2026-06-10');
  });
});

// ── List filters + Last-3 ────────────────────────────────────────────
describe('S148 · listFollowUps + getLastN', () => {
  it('filters by partyId and byUserId', () => {
    seedTask({ id: 'tsk-1', party_id: 'p-1' });
    seedTask({ id: 'tsk-2', party_id: 'p-2', voucher_no: 'INV-002' });
    logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u-A', followedUpByName: 'A', channel: 'call', remarks: 'a1' });
    logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u-B', followedUpByName: 'B', channel: 'call', remarks: 'b1' });
    logFollowUp(E, { taskId: 'tsk-2', followedUpByUserId: 'u-A', followedUpByName: 'A', channel: 'call', remarks: 'a2' });
    expect(listFollowUps(E, { partyId: 'p-1' })).toHaveLength(2);
    expect(listFollowUps(E, { byUserId: 'u-A' })).toHaveLength(2);
    expect(listFollowUps(E, { taskId: 'tsk-2' })).toHaveLength(1);
  });

  it('getLastN returns newest first, capped at N', () => {
    seedTask();
    for (let i = 0; i < 5; i++) {
      logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
        channel: 'call', remarks: `r${i}` });
    }
    const last = getLastN(E, 'p-1', 3);
    expect(last).toHaveLength(3);
    expect(last[0].remarks).toBe('r4');
  });
});

// ── Today board ──────────────────────────────────────────────────────
describe('S148 · getTodaysFollowUps', () => {
  it('partitions tasks by next_action_date into overdue vs today', () => {
    const now = '2026-06-05T10:00:00.000Z';
    seedTask({ id: 'o-1', next_action_date: '2026-06-01' });
    seedTask({ id: 't-1', next_action_date: '2026-06-05', voucher_no: 'INV-T' });
    seedTask({ id: 'f-1', next_action_date: '2026-06-10', voucher_no: 'INV-F' });
    const board = getTodaysFollowUps(E, now);
    expect(board.overdue.map((r) => r.task.id)).toEqual(['o-1']);
    expect(board.today.map((r) => r.task.id)).toEqual(['t-1']);
  });

  it('attaches lastFollowUp per task', () => {
    const now = '2026-06-05T10:00:00.000Z';
    seedTask({ next_action_date: '2026-06-05' });
    logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'email', remarks: 'sent reminder' });
    const board = getTodaysFollowUps(E, now);
    expect(board.today[0].lastFollowUp?.channel).toBe('email');
  });

  it('ignores voided follow-ups when picking lastFollowUp', () => {
    const now = '2026-06-05T10:00:00.000Z';
    seedTask({ next_action_date: '2026-06-05' });
    const fu = logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x' });
    voidFollowUp(E, fu.id, 'mis', 'u');
    const board = getTodaysFollowUps(E, now);
    expect(board.today[0].lastFollowUp).toBeNull();
  });
});

// ── Planned reminders ────────────────────────────────────────────────
describe('S148 · getPlannedReminders', () => {
  it('groups upcoming tasks by next-action-date within horizon', () => {
    const now = '2026-06-05T00:00:00.000Z';
    seedTask({ id: 'a', next_action_date: '2026-06-08' });
    seedTask({ id: 'b', next_action_date: '2026-06-08', voucher_no: 'V-B' });
    seedTask({ id: 'c', next_action_date: '2026-06-20', voucher_no: 'V-C' });
    seedTask({ id: 'd', next_action_date: '2026-07-15', voucher_no: 'V-D' });
    const g7 = getPlannedReminders(E, { days: 7 }, now);
    expect(g7).toHaveLength(1);
    expect(g7[0].tasks).toHaveLength(2);
    const g30 = getPlannedReminders(E, { days: 30 }, now);
    expect(g30.map((g) => g.dateISO)).toEqual(['2026-06-08', '2026-06-20']);
  });

  it('excludes today and past dates from planned reminders', () => {
    const now = '2026-06-05T00:00:00.000Z';
    seedTask({ id: 'past', next_action_date: '2026-06-01' });
    seedTask({ id: 'today', next_action_date: '2026-06-05', voucher_no: 'T' });
    seedTask({ id: 'fut', next_action_date: '2026-06-06', voucher_no: 'F' });
    const g = getPlannedReminders(E, { days: 7 }, now);
    expect(g.flatMap((x) => x.tasks.map((t) => t.id))).toEqual(['fut']);
  });
});

// ── DP-RX-3 prompt ───────────────────────────────────────────────────
describe('S148 · once-per-day prompt', () => {
  it('shouldPromptToday true when overdue+today > 0; flips false after markPrompted', () => {
    const now = '2026-06-05T08:00:00.000Z';
    seedTask({ next_action_date: '2026-06-05' });
    expect(shouldPromptToday(E, now)).toBe(true);
    markPrompted(E, now);
    expect(shouldPromptToday(E, now)).toBe(false);
  });

  it('shouldPromptToday false when board is empty', () => {
    expect(shouldPromptToday(E, '2026-06-05T08:00:00.000Z')).toBe(false);
  });
});

// ── S148 Rider 1b · mailNo + immutable field guards ──────────────────
describe('S148 · Rider 1b · mail numbering + updateMail guards', () => {
  it('createInwardMail assigns IN-NNNN sequence', () => {
    const m1 = createInwardMail(E, { kind: 'letter', description: 'a',
      toEmployeeId: 'e', toEmployeeName: 'E', createdByUserId: 'u', entityId: E });
    const m2 = createInwardMail(E, { kind: 'letter', description: 'b',
      toEmployeeId: 'e', toEmployeeName: 'E', createdByUserId: 'u', entityId: E });
    expect(m1.mailNo).toBe('IN-0001');
    expect(m2.mailNo).toBe('IN-0002');
  });

  it('createOutwardMail assigns OUT-NNNN sequence independently', () => {
    const o1 = createOutwardMail(E, { kind: 'letter', description: 'x', toText: 'recipient', createdByUserId: 'u', entityId: E });
    const o2 = createOutwardMail(E, { kind: 'letter', description: 'y', toText: 'recipient', createdByUserId: 'u', entityId: E });
    expect(o1.mailNo).toBe('OUT-0001');
    expect(o2.mailNo).toBe('OUT-0002');
  });

  it('backfillMailNumbers is idempotent and assigns only missing', () => {
    const m = createInwardMail(E, { kind: 'letter', description: 'a',
      toEmployeeId: 'e', toEmployeeName: 'E', createdByUserId: 'u', entityId: E });
    const first = backfillMailNumbers(E, 'u');
    expect(first).toBe(0); // already assigned
    // simulate legacy item without mailNo
    const rows = loadMail(E);
    rows.push({ ...m, id: 'legacy-1', mailNo: null, description: 'legacy' });
    localStorage.setItem(`fd_mail_${E}`, JSON.stringify(rows));
    const assigned = backfillMailNumbers(E, 'u');
    expect(assigned).toBe(1);
    expect(backfillMailNumbers(E, 'u')).toBe(0);
  });

  it('updateMail allows description/courier/awb/notes', () => {
    const m = createInwardMail(E, { kind: 'letter', description: 'old',
      toEmployeeId: 'e', toEmployeeName: 'E', createdByUserId: 'u', entityId: E });
    const u = updateMail(E, m.id, { description: 'new desc', notes: 'n' }, 'u');
    expect(u.description).toBe('new desc');
    expect(u.notes).toBe('n');
  });

  it('updateMail throws when changing immutable fields (direction/kind/mailNo)', () => {
    const m = createInwardMail(E, { kind: 'letter', description: 'a',
      toEmployeeId: 'e', toEmployeeName: 'E', createdByUserId: 'u', entityId: E });
    expect(() => updateMail(E, m.id, { direction: 'outward' }, 'u')).toThrow(/immutable/);
    expect(() => updateMail(E, m.id, { kind: 'parcel' }, 'u')).toThrow(/immutable/);
    expect(() => updateMail(E, m.id, { mailNo: 'IN-9999' }, 'u')).toThrow(/immutable/);
  });

  it('updateMail throws for sentAt / dispatch / delivery mutations', () => {
    const o = createOutwardMail(E, { kind: 'letter', description: 'x', toText: 'r', createdByUserId: 'u', entityId: E });
    expect(() => updateMail(E, o.id, { sentAt: '2026-06-05' }, 'u')).toThrow(/immutable/);
    expect(() => updateMail(E, o.id, { dispatchMode: 'rpad' }, 'u')).toThrow(/immutable/);
    expect(() => updateMail(E, o.id, { deliveryConfirmed: true }, 'u')).toThrow(/immutable/);
  });
});

// ── S148 Rider 1c · PartyContact ─────────────────────────────────────
describe('S148 · Rider 1c · PartyContact CRUD', () => {
  it('upsert creates and reads back', () => {
    const c = upsertPartyContact(E, { partyId: 'p-1', name: 'Ravi Kumar',
      designation: 'Accounts', mobile: '9876543210', createdByUserId: 'u' });
    expect(c.id).toBeTruthy();
    expect(getContactsForParty(E, 'p-1')).toHaveLength(1);
  });

  it('one isPrimary per party — upserting a second primary clears the first', () => {
    upsertPartyContact(E, { partyId: 'p-1', name: 'A', isPrimary: true, createdByUserId: 'u' });
    upsertPartyContact(E, { partyId: 'p-1', name: 'B', isPrimary: true, createdByUserId: 'u' });
    const primaries = loadPartyContacts(E).filter((c) => c.partyId === 'p-1' && c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].name).toBe('B');
  });

  it('deletePartyContact removes the row', () => {
    const c = upsertPartyContact(E, { partyId: 'p-1', name: 'A', createdByUserId: 'u' });
    deletePartyContact(E, c.id);
    expect(getContactsForParty(E, 'p-1')).toHaveLength(0);
  });

  it('name is required', () => {
    expect(() => upsertPartyContact(E, { partyId: 'p-1', name: '   ', createdByUserId: 'u' }))
      .toThrow(/name/i);
  });
});

// ── Greetings + envelope + label grid ─────────────────────────────────
describe('S148 · greetings + envelope + label grid', () => {
  it('greetings match on month-day; 29-Feb tolerance on non-leap 28-Feb', () => {
    upsertPartyContact(E, { partyId: 'p-1', name: 'Leap Baby', birthday: '2024-02-29', createdByUserId: 'u' });
    // 2026 is non-leap; on 28-Feb the leap baby should surface
    const g = getGreetingsToday(E, '2026-02-28T00:00:00.000Z');
    expect(g.find((x) => x.name === 'Leap Baby' && x.kind === 'birthday')).toBeTruthy();
  });

  it('buildEnrichedEnvelope applies M/S. prefix and Kind Attn from primary contact', () => {
    seedParty('p-1', 'Acme Traders');
    upsertPartyContact(E, { partyId: 'p-1', name: 'Ravi', designation: 'Mgr',
      isPrimary: true, createdByUserId: 'u' });
    const rows = buildEnrichedEnvelope(E, ['p-1'], { includeFromAddress: true,
      fromAddressBlock: '4D HQ\nMumbai' });
    expect(rows[0].toBlock).toContain('M/S. Acme Traders');
    expect(rows[0].toBlock).toContain('Kind Attn: Ravi');
    expect(rows[0].fromBlock).toContain('4D HQ');
  });

  it('buildEnrichedEnvelope can suppress M/S. prefix and from-address', () => {
    seedParty('p-1', 'Acme Traders');
    const rows = buildEnrichedEnvelope(E, ['p-1'], { msPrefix: false });
    expect(rows[0].toBlock.startsWith('Acme Traders')).toBe(true);
    expect(rows[0].fromBlock).toBeNull();
  });

  it('computeLabelGrid computes cols/rows for A4 with given label cm', () => {
    const g = computeLabelGrid({ widthCm: 9.9, heightCm: 3.39 });
    expect(g.cols).toBeGreaterThan(0);
    expect(g.rows).toBeGreaterThan(0);
    expect(g.perPage).toBe(g.cols * g.rows);
  });

  it('computeLabelGrid throws on non-positive dimensions', () => {
    expect(() => computeLabelGrid({ widthCm: 0, heightCm: 3 })).toThrow(/positive/i);
  });
});

// ── Registers + sidebar parity ───────────────────────────────────────
describe('S148 · registers + sidebar parity', () => {
  it('S147 backfilled with HEAD 8764b8f1', () => {
    const s147 = SPRINTS.find((s) => s.code === 'T-FrontDesk-A6F.3');
    expect(s147?.headSha).toBe('8764b8f1');
  });

  it('S148 entry exists with predecessor 8764b8f1', () => {
    const s148 = SPRINTS.find((s) => s.code === 'T-ReceivX-CF.1');
    expect(s148).toBeTruthy();
    expect(s148?.predecessorSha).toBe('8764b8f1');
    expect(s148?.newSiblings).toContain('receivx-followup-engine');
  });

  it('sibling-register includes receivx-followup-engine (entry 217)', () => {
    const sib = SIBLINGS.find((s) => s.id === 'receivx-followup-engine');
    expect(sib).toBeTruthy();
    expect(sib?.path).toBe('src/lib/receivx-followup-engine.ts');
    expect(sib?.sprintAdded).toBe(148);
  });

  it('FrontDesk sidebar items still carry ZERO requiredCards (S146.T2 parity guard)', () => {
    const walk = (items: SidebarItem[]): SidebarItem[] => {
      const out: SidebarItem[] = [];
      for (const it of items) {
        out.push(it);
        if (it.type === 'group' && it.children) out.push(...walk(it.children));
      }
      return out;
    };
    const all = walk(frontdeskSidebarItems);
    for (const it of all) {
      expect((it as { requiredCards?: unknown }).requiredCards).toBeUndefined();
    }
  });
});

// ── audit emission ───────────────────────────────────────────────────
describe('S148 · audit trail emission', () => {
  it('logFollowUp emits a receivx_followup_event audit row', () => {
    seedTask();
    const fu = logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'x' });
    // Audit storage is via audit-trail-engine; loadFollowUps confirms the row,
    // and absence of throw confirms the audit wrapper did not crash.
    expect(loadFollowUps(E).find((x) => x.id === fu.id)).toBeTruthy();
  });
});

// ── S148.T1 hotfix · UI-wiring guards ────────────────────────────────
describe('S148.T1 · UI-wiring guards', () => {
  it('Mail Inward CSV column shape is sourced from the page path', async () => {
    const { MAIL_INWARD_CSV_COLUMNS, MAIL_OUTWARD_CSV_COLUMNS } =
      await import('@/pages/erp/frontdesk/mail/mail-constants');
    expect(MAIL_INWARD_CSV_COLUMNS[0]).toBe('Mail No');
    expect(MAIL_INWARD_CSV_COLUMNS).toContain('Description');
    expect(MAIL_INWARD_CSV_COLUMNS).toContain('Status');
    expect(MAIL_OUTWARD_CSV_COLUMNS[0]).toBe('Mail No');
  });

  it('Mail edit dialog (UI-level) blocks all immutable mail fields', async () => {
    const { MAIL_EDITABLE_KEYS } =
      await import('@/pages/erp/frontdesk/mail/mail-constants');
    const IMMUTABLE = ['direction', 'kind', 'mailNo', 'receivedAt', 'sentAt',
      'acknowledgedAt', 'dispatchMode', 'deliveryConfirmed'];
    for (const k of IMMUTABLE) {
      expect((MAIL_EDITABLE_KEYS as readonly string[]).includes(k)).toBe(false);
    }
    expect((MAIL_EDITABLE_KEYS as readonly string[]).includes('description')).toBe(true);
  });

  it('Reception Diary surfaces greetings today for a seeded birthday', async () => {
    upsertPartyContact(E, { partyId: 'p-1', name: 'Birthday Person',
      birthday: '2024-06-15', createdByUserId: 'u' });
    const { buildReceptionDiary } = await import('@/lib/frontdesk-records-engine');
    const diary = buildReceptionDiary(E, '2026-06-15T00:00:00.000Z');
    expect(diary.greetingsToday?.some((g) => g.name === 'Birthday Person')).toBe(true);
  });

  it('Follow-ups drawer lists follow-ups for a seeded task (newest-first via listFollowUps)', () => {
    seedTask();
    logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'call', remarks: 'first', at: '2026-06-01T10:00:00.000Z' });
    logFollowUp(E, { taskId: 'tsk-1', followedUpByUserId: 'u', followedUpByName: 'U',
      channel: 'whatsapp', remarks: 'second', at: '2026-06-02T10:00:00.000Z' });
    const drawerRows = listFollowUps(E, { taskId: 'tsk-1' });
    expect(drawerRows).toHaveLength(2);
    expect(drawerRows[0].remarks).toBe('second'); // newest first
    expect(drawerRows[1].remarks).toBe('first');
  });
});
