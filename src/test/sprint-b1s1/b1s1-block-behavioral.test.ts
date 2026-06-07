/**
 * b1s1-block-behavioral.test.ts — Sprint B1S1 · Approval Rail · ≥22 it()
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  syncApprovalTasks,
  decideApproval,
  bulkApprove,
  listApprovalRules,
  updateApprovalRule,
  getApprovalsDigest,
  publishApprovalsDigest,
  listPendingMirrors,
  resolveSlab,
  describeStepApprover,
  registerApprovalAdapter,
  __resetApprovalAdaptersForTests,
} from '@/lib/approval-rail-engine';
import { registerAllApprovalAdapters } from '@/lib/approval-adapters';
import type { ApprovalAdapter } from '@/types/approval-rail';
import { approvalRulesKey, approvalDecidedByLedgerKey } from '@/types/approval-rail';
import { taskflowKey } from '@/types/taskflow';
import { listTasks } from '@/lib/taskflow-engine';
import { notificationsKey } from '@/types/notification';
import { listStockIssues } from '@/lib/stock-issue-engine';
import { stockIssuesKey } from '@/types/stock-issue';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENT = 'TESTENT';

function reset(): void {
  // Clean per-key only to avoid clobbering vitest's own state
  const keys = [
    taskflowKey(ENT),
    approvalRulesKey(ENT),
    approvalDecidedByLedgerKey(ENT),
    notificationsKey(ENT),
    stockIssuesKey(ENT),
    'erp_material_indents_TESTENT',
    'erp_disputes_TESTENT',
  ];
  for (const k of keys) localStorage.removeItem(k);
  __resetApprovalAdaptersForTests();
}

// ── A tiny in-memory test adapter for shape-true behavioral tests ────────
type TestRec = { id: string; no: string; amount: number; status: 'pending' | 'approved' | 'rejected'; creator?: string; liability?: string };
const _store = new Map<string, TestRec[]>();
function getStore(e: string): TestRec[] {
  if (!_store.has(e)) _store.set(e, []);
  return _store.get(e)!;
}

function makeAdapter(objectType: 'salesx_discount' | 'procure_po' | 'billpassing_deviation' | 'stock_issue'): ApprovalAdapter {
  return {
    id: `test:${objectType}`,
    source_card: objectType === 'billpassing_deviation' ? 'bill-passing' : objectType === 'salesx_discount' ? 'salesx' : objectType === 'stock_issue' ? 'store-hub' : 'procure360',
    object_type: objectType,
    listPending: (e) => getStore(e).filter((r) => r.status === 'pending').map((r) => ({
      source_record_id: r.id,
      source_record_no: r.no,
      amount: r.amount,
      creator_name: r.creator,
      liability_ref: r.liability,
    })),
    approve: (e, id) => {
      const r = getStore(e).find((x) => x.id === id);
      if (!r) return false;
      r.status = 'approved';
      return true;
    },
    reject: (e, id) => {
      const r = getStore(e).find((x) => x.id === id);
      if (!r) return false;
      r.status = 'rejected';
      return true;
    },
    recordRoute: (id) => `/test/${id}`,
  };
}

beforeEach(() => {
  reset();
  _store.clear();
});

describe('B1S1 · Approval Rail · engine', () => {
  it('seeds at least 8 default rules on first read', () => {
    const rules = listApprovalRules(ENT);
    // B1S2-R · architect-owned posture fix · exact-count ban
    expect(rules.length).toBeGreaterThanOrEqual(8);
    const types = rules.map((r) => r.object_type);
    for (const expected of [
      'billpassing_deviation', 'logistics_dispute', 'procure_po', 'production_order',
      'requestx_indent', 'salesx_discount', 'servicedesk_proposal', 'stock_issue',
    ]) {
      expect(types).toContain(expected);
    }
  });

  it('resolveSlab · slab 0 below auto-threshold', () => {
    const rule = listApprovalRules(ENT)[0];
    const r = resolveSlab({ ...rule, slab0_auto_below: 5000 }, 1000);
    expect(r.slab).toBe(0);
  });

  it('resolveSlab · slab 1 between thresholds', () => {
    const rule = listApprovalRules(ENT)[0];
    const r = resolveSlab({ ...rule, slab0_auto_below: 5000, slab1_single_below: 50000 }, 20000);
    expect(r.slab).toBe(1);
    expect(r.chain.length).toBe(1);
  });

  it('resolveSlab · slab 2 above slab-1 threshold', () => {
    const rule = listApprovalRules(ENT)[0];
    const r = resolveSlab({ ...rule, slab0_auto_below: 5000, slab1_single_below: 50000 }, 200000);
    expect(r.slab).toBe(2);
  });

  it('describeStepApprover · named wins over role (Matrix §2.3a)', () => {
    expect(describeStepApprover({ order: 1, approver: { mode: 'named', personName: 'Asha', role: 'hod' } })).toBe('Asha');
    expect(describeStepApprover({ order: 1, approver: { mode: 'role', role: 'hod' } })).toBe('hod');
  });

  it('syncApprovalTasks creates mirror tasks for pending records', () => {
    const ad = makeAdapter('procure_po');
    registerApprovalAdapter(ad);
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    const r = syncApprovalTasks(ENT);
    expect(r.created).toBe(1);
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval');
    expect(tasks.length).toBe(1);
    expect(tasks[0].approval?.source_record_no).toBe('PO/001');
  });

  it('syncApprovalTasks is dedupe-safe on re-run', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const second = syncApprovalTasks(ENT);
    expect(second.created).toBe(0);
  });

  it('slab-0 auto-approves at source AND audit-notes (no mirror task)', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    // Tune rule: slab-0 for procure_po up to 10000
    const r = listApprovalRules(ENT).find((x) => x.object_type === 'procure_po')!;
    updateApprovalRule(ENT, r.id, { slab0_auto_below: 10000 }, 'tester');
    getStore(ENT).push({ id: 'auto', no: 'PO/AUTO', amount: 500, status: 'pending' });
    const out = syncApprovalTasks(ENT);
    expect(out.created).toBe(0);
    expect(getStore(ENT).find((x) => x.id === 'auto')?.status).toBe('approved');
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval');
    expect(tasks.length).toBe(0);
  });

  it('D2 · in-card decision → mirror auto-completes on next sync', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    // user decides at source directly
    getStore(ENT).find((x) => x.id === 'r1')!.status = 'approved';
    const r = syncApprovalTasks(ENT);
    expect(r.autoCompleted).toBe(1);
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval');
    expect(tasks[0].status).toBe('completed');
  });

  it('decideApproval · reject without reason is refused (Matrix §2.6)', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    const r = decideApproval(ENT, taskId, 'rejected', 'asha', '');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/mandatory/i);
  });

  it('SoD-1 · creator cannot approve own request', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending', creator: 'asha' });
    syncApprovalTasks(ENT);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    const r = decideApproval(ENT, taskId, 'approved', 'asha');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/SoD-1/);
  });

  it('SoD-2 · same name on bill-passing + payout of one liability is refused', () => {
    // simulate two object types sharing the same liability_ref
    registerApprovalAdapter(makeAdapter('billpassing_deviation'));
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'b1', no: 'BP/001', amount: 60000, status: 'pending', liability: 'LIAB-1' });
    getStore(ENT).push({ id: 'p1', no: 'PO/PAY-1', amount: 60000, status: 'pending', liability: 'LIAB-1' });
    syncApprovalTasks(ENT);
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval');
    const billTask = tasks.find((t) => t.approval?.object_type === 'billpassing_deviation')!;
    const payTask = tasks.find((t) => t.approval?.object_type === 'procure_po')!;
    expect(decideApproval(ENT, billTask.id, 'approved', 'asha').ok).toBe(true);
    const second = decideApproval(ENT, payTask.id, 'approved', 'asha');
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/SoD-2/);
  });

  it('decide delegates to adapter · source record state actually changes', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    decideApproval(ENT, taskId, 'approved', 'asha');
    expect(getStore(ENT).find((x) => x.id === 'r1')!.status).toBe('approved');
  });

  it('reject delegates to adapter · source record marked rejected', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    decideApproval(ENT, taskId, 'rejected', 'asha', 'budget breach');
    expect(getStore(ENT).find((x) => x.id === 'r1')!.status).toBe('rejected');
  });

  it('publishes approval.pending on sync', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const raw = localStorage.getItem(notificationsKey(ENT));
    expect(raw).toContain('approval.pending');
  });

  it('publishes approval.decided on decision', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    decideApproval(ENT, taskId, 'approved', 'asha');
    const raw = localStorage.getItem(notificationsKey(ENT));
    expect(raw).toContain('approval.decided');
  });

  it('digest counts are correct with a synthetic overdue', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    // Force overdue by mutating the mirror task dueDate
    const k = taskflowKey(ENT);
    const list = JSON.parse(localStorage.getItem(k) ?? '[]');
    list[0].dueDate = new Date(Date.now() - 86400_000).toISOString();
    localStorage.setItem(k, JSON.stringify(list));
    const d = getApprovalsDigest(ENT);
    expect(d.waiting).toBe(1);
    expect(d.overdue).toBe(1);
  });

  it('publishApprovalsDigest emits digest event when waiting > 0', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const r = publishApprovalsDigest(ENT, 'user-1');
    expect(r.count).toBe(1);
    expect(localStorage.getItem(notificationsKey(ENT))).toContain('digest.approvals_pending');
  });

  it('bulkApprove · skips SoD-blocked rows with per-row message', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending', creator: 'asha' });
    getStore(ENT).push({ id: 'r2', no: 'PO/002', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval');
    const out = bulkApprove(ENT, tasks.map((t) => t.id), 'asha');
    expect(out.filter((o) => o.ok).length).toBe(1);
    expect(out.filter((o) => !o.ok && /SoD-1/.test(o.reason ?? '')).length).toBe(1);
  });

  it('rule-row edit is audit-logged · lastEditedBy stamped', () => {
    const r = listApprovalRules(ENT)[0];
    const next = updateApprovalRule(ENT, r.id, { slab0_auto_below: 1234 }, 'tester');
    expect(next?.slab0_auto_below).toBe(1234);
    expect(next?.lastEditedBy).toBe('tester');
  });

  it('listPendingMirrors excludes completed / cancelled tasks', () => {
    registerApprovalAdapter(makeAdapter('procure_po'));
    getStore(ENT).push({ id: 'r1', no: 'PO/001', amount: 60000, status: 'pending' });
    syncApprovalTasks(ENT);
    expect(listPendingMirrors(ENT).length).toBe(1);
    const taskId = listTasks(ENT).find((t) => t.category === 'approval')!.id;
    decideApproval(ENT, taskId, 'approved', 'asha');
    expect(listPendingMirrors(ENT).length).toBe(0);
  });
});

describe('B1S1 · §H walls (import-shape guards)', () => {
  it('taskflow-engine.ts has not been edited (createTask/changeStatus/listTasks intact)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/taskflow-engine.ts'), 'utf8');
    expect(src).toMatch(/export function listTasks\b/);
    expect(src).toMatch(/export function createTask\b/);
    expect(src).toMatch(/export function changeStatus\b/);
  });

  it('notification-engine.ts publish() still present (engine wall)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/notification-engine.ts'), 'utf8');
    expect(src).toMatch(/export function publish\(/);
  });

  it('consumer engines preserve their decision exports', () => {
    const oob8 = readFileSync(resolve(process.cwd(), 'src/lib/oob8-compliance-aware-approval-engine.ts'), 'utf8');
    expect(oob8).toMatch(/export function decideComplianceApproval\b/);
    const stk = readFileSync(resolve(process.cwd(), 'src/lib/stock-issue-engine.ts'), 'utf8');
    expect(stk).toMatch(/export function approveStockIssue\b/);
    expect(stk).toMatch(/export function rejectStockIssue\b/);
    const bp = readFileSync(resolve(process.cwd(), 'src/lib/bill-passing-engine.ts'), 'utf8');
    expect(bp).toMatch(/export async function approveBill\b/);
    expect(bp).toMatch(/export async function rejectBill\b/);
  });
});

describe('B1S1 · institutional registers', () => {
  it('sprint-history contains B1S1 row and flips WMS3 head', () => {
    const b1s1 = SPRINTS.find((s) => String(s.sprintNumber) === 'B1S1');
    expect(b1s1).toBeDefined();
    expect(b1s1?.predecessorSha).toBe('82feafbb');
    const wms3 = SPRINTS.find((s) => String(s.sprintNumber) === 'WMS3');
    expect(wms3?.headSha).toBe('82feafbb');
  });

  it('sibling-register includes approval-rail-engine', () => {
    expect(SIBLINGS.find((s) => s.id === 'approval-rail-engine')).toBeDefined();
  });
});

describe('B1S1 · live adapters wire to real consumer engines', () => {
  it('stock_issue adapter listPending returns stock-issue-engine draft rows', () => {
    // Plant a draft via stock-issue store directly
    const si = {
      id: 'si-1', voucher_no: 'SI/001', entity_id: ENT, fiscal_year_id: 'FY-2024-25', branch_id: 'b',
      voucher_type_id: 'vt', voucher_date: '2026-06-07', lines: [], total_value: 30000, total_qty: 1,
      status: 'draft' as const, source_document_type: 'manual' as const, source_document_id: null,
      department_id: 'd', cost_center_id: null, project_id: null, narration: '', created_at: '', updated_at: '',
      created_by: 'tester',
    };
    localStorage.setItem(stockIssuesKey(ENT), JSON.stringify([si]));
    registerAllApprovalAdapters();
    syncApprovalTasks(ENT);
    const tasks = listTasks(ENT).filter((t) => t.category === 'approval' && t.approval?.object_type === 'stock_issue');
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(listStockIssues(ENT)[0].status).toBe('draft');
  });
});
