/**
 * @file        src/test/sprint-b1s2/b1s2-block-behavioral.test.ts
 * @sprint      Sprint B1S2 · T-B1S2-Adapters-MyReminders · Pillar B.1 CLOSE
 * @purpose     Behavioral coverage for the 4 new adapters + delegation + quorum
 *              + the new My Reminders engine. Vitest scoped via filename pattern.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  listApprovalRules, listRegisteredAdapters,
  setDelegation, resolveActingApprover, clearDelegation, listDelegations,
  recordQuorumVote,
} from '@/lib/approval-rail-engine';

import '@/lib/approval-adapters'; // self-registers

import {
  createMyReminder, listMyReminders, snoozeMyReminder,
  dismissMyReminder, deleteMyReminder, fireDueMyReminders,
  getMyRemindersDigest,
  // B1S2-R · §2.4b catalog API
  REMINDER_CATALOG, getMyReminders, getUserPrefs, saveUserPrefs,
  publishMyRemindersDigest,
} from '@/lib/taskflow-reminders-engine';
import { notificationsKey } from '@/types/notification';
import { materialIndentsKey } from '@/types/material-indent';

const E = 'ENT_B1S2';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

// ════════════════════════════════════════════════════════════════════════
// Block A · default rules — 14 rows (8 B1S1 + 4 ADAPTER-READY + 6 SEAM)
// → wait: 8 + 4 + 6 = 18 rows
// ════════════════════════════════════════════════════════════════════════
describe('B1S2 · default rule seeds', () => {
  it('seeds 18 rule rows (8 birth + 4 adapter-ready + 6 seam)', () => {
    const rules = listApprovalRules(E);
    expect(rules).toHaveLength(18);
    const types = rules.map((r) => r.object_type);
    expect(types).toContain('taskflow_expense');
    expect(types).toContain('qualicheck_deviation');
    expect(types).toContain('payout_requisition');
    expect(types).toContain('peoplepay_reimbursement');
    // SEAM-ONLY visibility seeds
    expect(types).toContain('fincore_pending_voucher');
    expect(types).toContain('receivx_writeoff');
    expect(types).toContain('credit_note');
    expect(types).toContain('scheme_grant');
    expect(types).toContain('projx_budget');
    expect(types).toContain('eximx_duty_payment');
  });

  it('payout_requisition has the two-person seed (dept→accounts slab-2 chain)', () => {
    const row = listApprovalRules(E).find((r) => r.object_type === 'payout_requisition');
    expect(row).toBeDefined();
    expect(row!.slab2_chain).toHaveLength(2);
    const roles = row!.slab2_chain.map((s) => s.approver.role);
    expect(roles).toEqual(['department_head', 'accounts']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Block B · adapter registry — 12 adapters
// ════════════════════════════════════════════════════════════════════════
describe('B1S2 · adapter registry', () => {
  it('registers 12 adapters (8 birth + 4 new)', () => {
    const ids = listRegisteredAdapters().map((a) => a.object_type).sort();
    expect(ids).toContain('payout_requisition');
    expect(ids).toContain('peoplepay_reimbursement');
    expect(ids).toContain('taskflow_expense');
    expect(ids).toContain('qualicheck_deviation');
    expect(ids.length).toBeGreaterThanOrEqual(12);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Block C · Delegation
// ════════════════════════════════════════════════════════════════════════
describe('B1S2 · delegation ledger', () => {
  it('routes acting approver to delegate during the window, falls back outside', () => {
    setDelegation(E, {
      delegator_name: 'Anita',
      delegate_name: 'Bharat',
      from_date: '2026-06-01T00:00:00Z',
      to_date:   '2026-06-30T23:59:59Z',
      reason: 'leave',
    });
    expect(resolveActingApprover(E, 'Anita', '2026-06-15T10:00:00Z')).toBe('Bharat');
    expect(resolveActingApprover(E, 'Anita', '2026-07-15T10:00:00Z')).toBe('Anita');
    expect(resolveActingApprover(E, 'Charu', '2026-06-15T10:00:00Z')).toBe('Charu');
  });

  it('clearDelegation deactivates the row', () => {
    const d = setDelegation(E, {
      delegator_name: 'X', delegate_name: 'Y',
      from_date: new Date().toISOString(), to_date: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(clearDelegation(E, d.id)).toBe(true);
    const list = listDelegations(E);
    expect(list.find((r) => r.id === d.id)?.active).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Block D · Quorum (M-of-N)
// ════════════════════════════════════════════════════════════════════════
describe('B1S2 · quorum voting', () => {
  const args = {
    source_record_id: 'REC1',
    object_type: 'payout_requisition' as const,
    step_order: 1,
    required: 2,
    candidate_pool: ['Aman', 'Bina', 'Chitra'],
  };

  it('reaches when M votes in favor', () => {
    expect(recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' }).state).toBe('pending');
    expect(recordQuorumVote(E, { ...args, voter_name: 'Bina', vote: 'approved' }).state).toBe('reached');
  });

  it('rejects when remaining candidates cannot reach required', () => {
    expect(recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'rejected' }).state).toBe('pending');
    // After two rejections, only 1 candidate left (<required=2) → rejected
    const o = recordQuorumVote(E, { ...args, voter_name: 'Bina', vote: 'rejected' });
    expect(o.state).toBe('rejected');
  });

  it('is idempotent per (voter, record, step)', () => {
    recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' });
    const o = recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' });
    expect(o.votes_for).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Block E · My Reminders engine
// ════════════════════════════════════════════════════════════════════════
describe('B1S2 · My Reminders engine', () => {
  it('creates · lists · snoozes · dismisses · deletes', () => {
    const r = createMyReminder({
      entityCode: E, user_name: 'op', kind: 'free',
      title: 'follow vendor', remind_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(listMyReminders(E, 'op')).toHaveLength(1);
    expect(snoozeMyReminder(E, r.id, 2)!.status).toBe('snoozed');
    expect(dismissMyReminder(E, r.id)!.status).toBe('dismissed');
    expect(deleteMyReminder(E, r.id)).toBe(true);
    expect(listMyReminders(E, 'op')).toHaveLength(0);
  });

  it('fires only reminders whose remind_at is past', () => {
    createMyReminder({
      entityCode: E, user_name: 'op', kind: 'free',
      title: 'past', remind_at: new Date(Date.now() - 60_000).toISOString(),
    });
    createMyReminder({
      entityCode: E, user_name: 'op', kind: 'free',
      title: 'future', remind_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const { fired } = fireDueMyReminders(E, 'op');
    expect(fired).toBe(1);
    const rows = listMyReminders(E, 'op');
    expect(rows.find((r) => r.title === 'past')?.status).toBe('fired');
    expect(rows.find((r) => r.title === 'future')?.status).toBe('pending');
  });

  it('digest counts pending / overdue / due_today correctly', () => {
    createMyReminder({
      entityCode: E, user_name: 'op', kind: 'free',
      title: 'overdue', remind_at: new Date(Date.now() - 3_600_000).toISOString(),
    });
    createMyReminder({
      entityCode: E, user_name: 'op', kind: 'free',
      title: 'today', remind_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const d = getMyRemindersDigest(E, 'op');
    expect(d.pending).toBe(2);
    expect(d.overdue).toBe(1);
    expect(d.due_today).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Block F · §2.4b Reminder Catalog · honesty + prefs + threshold + digest
// ════════════════════════════════════════════════════════════════════════
describe('B1S2-R · reminder catalog · honesty ledger', () => {
  it('catalog declares ≥ 12 items, each with a source string', () => {
    expect(REMINDER_CATALOG.length).toBeGreaterThanOrEqual(12);
    for (const c of REMINDER_CATALOG) {
      expect(typeof c.source).toBe('string');
      expect(c.source.length).toBeGreaterThan(0);
    }
  });

  it('items without a real source are status=unavailable in snapshots (no fake zeros)', () => {
    const snaps = getMyReminders(E, 'op');
    const unavailable = snaps.filter((s) => s.status === 'unavailable');
    expect(unavailable.length).toBeGreaterThanOrEqual(7);
    for (const s of unavailable) {
      expect(s.count).toBeNull();
      expect(typeof s.reason).toBe('string');
    }
  });

  it('wired sources return numeric count (status=ok) — never null', () => {
    const snaps = getMyReminders(E, 'op');
    const wired = snaps.filter((s) =>
      ['approvals_waiting', 'tasks_due_today', 'quarantine', 'birthdays_today'].includes(s.id),
    );
    expect(wired.length).toBe(4);
    for (const s of wired) {
      expect(s.status).toBe('ok');
      expect(typeof s.count).toBe('number');
    }
  });
});

describe('B1S2-R · user prefs round-trip', () => {
  it('default prefs are returned when nothing is saved', () => {
    const prefs = getUserPrefs(E, 'op');
    expect(prefs.user_name).toBe('op');
    expect(prefs.items.length).toBe(REMINDER_CATALOG.length);
  });

  it('save → reload returns the same edited prefs', () => {
    const prefs = getUserPrefs(E, 'op');
    const edited = {
      ...prefs,
      items: prefs.items.map((p) =>
        p.id === 'approvals_waiting' ? { ...p, threshold: 99, headline: false, show: false } : p,
      ),
    };
    saveUserPrefs(E, edited);
    const back = getUserPrefs(E, 'op');
    const apv = back.items.find((p) => p.id === 'approvals_waiting')!;
    expect(apv.threshold).toBe(99);
    expect(apv.headline).toBe(false);
    expect(apv.show).toBe(false);
  });

  it('threshold drives the snapshot breached flag (count > threshold)', () => {
    const qakey = 'erp_v1_qa_inspections_' + E;
    const inspections = Array.from({ length: 7 }).map((_, i) => ({
      id: `qa${i}`, qa_no: `QA${i}`, status: 'pending', inspector_user_id: 'x',
    }));
    localStorage.setItem(qakey, JSON.stringify(inspections));
    const snap = getMyReminders(E, 'op').find((s) => s.id === 'quarantine')!;
    expect(snap.status).toBe('ok');
    expect(snap.count).toBe(7);
    expect(snap.breached).toBe(true);
  });
});

describe('B1S2-R · publishMyRemindersDigest', () => {
  it('returns 0 and emits nothing when nothing is breached', () => {
    const r = publishMyRemindersDigest(E, 'op');
    expect(r.count).toBe(0);
    const raw = localStorage.getItem(notificationsKey(E));
    expect(raw === null || !raw.includes('digest.my_reminders')).toBe(true);
  });

  it('emits digest.my_reminders when at least one snapshot is breached', () => {
    const qakey = 'erp_v1_qa_inspections_' + E;
    const inspections = Array.from({ length: 6 }).map((_, i) => ({
      id: `qa${i}`, qa_no: `QA${i}`, status: 'pending', inspector_user_id: 'x',
    }));
    localStorage.setItem(qakey, JSON.stringify(inspections));
    const r = publishMyRemindersDigest(E, 'op');
    expect(r.count).toBeGreaterThan(0);
    expect(localStorage.getItem(notificationsKey(E))).toContain('digest.my_reminders');
  });
});

describe('B1S2-R · quorum distinct-signer refusal', () => {
  const args = {
    source_record_id: 'REC-DS',
    object_type: 'payout_requisition' as const,
    step_order: 1,
    required: 2,
    candidate_pool: ['Aman', 'Bina', 'Chitra'],
  };

  it('the same voter approving twice never counts twice (idempotent)', () => {
    expect(recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' }).state).toBe('pending');
    const second = recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' });
    expect(second.votes_for).toBe(1);
    expect(second.state).toBe('pending');
  });

  it('quorum reached requires distinct signers (M-of-N)', () => {
    recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' });
    recordQuorumVote(E, { ...args, voter_name: 'Aman', vote: 'approved' });
    const out = recordQuorumVote(E, { ...args, voter_name: 'Bina', vote: 'approved' });
    expect(out.votes_for).toBe(2);
    expect(out.state).toBe('reached');
  });
});

describe('B1S2-R · R4 wall · adapters file no longer writes the requestx store', () => {
  it('approval-adapters.ts contains no setItem against materialIndentsKey', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/approval-adapters.ts'), 'utf8');
    expect(src).toMatch(/approveRequestxIndent\b/);
    expect(src).toMatch(/rejectRequestxIndent\b/);
    expect(src).not.toMatch(/safeWriteList\([^)]*materialIndentsKey/);
    expect(src).not.toMatch(/localStorage\.setItem\([^)]*materialIndentsKey/);
  });

  it('request-engine.ts still exposes approveIndent / rejectIndent (engine wall)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/request-engine.ts'), 'utf8');
    expect(src).toMatch(/export function approveIndent\b/);
    expect(src).toMatch(/export function rejectIndent\b/);
  });

  it('materialIndentsKey still imported for read-only listPending visibility', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/approval-adapters.ts'), 'utf8');
    expect(src).toMatch(/from '@\/types\/material-indent'/);
    expect(src).toMatch(/\bmaterialIndentsKey\b/);
    expect(typeof materialIndentsKey).toBe('function');
  });
});
