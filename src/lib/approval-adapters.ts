/**
 * @file        src/lib/approval-adapters.ts
 * @sprint      Sprint B1S1 · T-B1S1-Approval-Rail
 * @purpose     Registration glue ONLY · NOT engine-credited.
 *              Each adapter consumes the consumer engines' existing exported APIs.
 *              Every consumer engine remains 0-DIFF.
 *
 *              Self-registers on import via registerApprovalAdapter().
 */

import { registerApprovalAdapter } from '@/lib/approval-rail-engine';
import type { ApprovalAdapter } from '@/types/approval-rail';

// ── consumer reads ────────────────────────────────────────────────────────
import {
  listPosAwaitingApproval,
  recordApproval as recordPoApproval,
  isPoFullyApproved,
} from '@/lib/approval-matrix-engine';
import { transitionPoStatus } from '@/lib/po-management-engine';

import {
  listStockIssues,
  approveStockIssue,
  rejectStockIssue,
} from '@/lib/stock-issue-engine';

import {
  listProductionOrders,
  transitionState as transitionProdState,
} from '@/lib/production-engine';

import {
  approveBill,
  rejectBill,
  listMatchedWithVariance,
} from '@/lib/bill-passing-engine';

import {
  listRoutedWorkflows,
  decideComplianceApproval,
} from '@/lib/oob8-compliance-aware-approval-engine';

import {
  listAMCProposals,
  transitionProposalStatus,
} from '@/lib/servicedesk-engine';

import { applyTransition as applyDisputeTransition } from '@/lib/dispute-workflow-engine';
import { disputesKey } from '@/types/freight-reconciliation';
import type { Dispute } from '@/types/freight-reconciliation';

import { materialIndentsKey } from '@/types/material-indent';
import type { MaterialIndent } from '@/types/material-indent';
// B1S2-R · R4 · request-engine already exports approveIndent/rejectIndent
// (request-engine.ts:258 + :284) · adapter consumes them instead of writing
// the LS store directly · request-engine.ts remains 0-DIFF.
import {
  approveIndent as approveRequestxIndent,
  rejectIndent as rejectRequestxIndent,
} from '@/lib/request-engine';

// ── B1S2 ADAPTER-READY (4) consumer reads ────────────────────────────────
import {
  listExpenses, approveExpense, rejectExpense,
} from '@/lib/taskflow-accountability-engine';

import {
  listPendingQa, transitionQaStatus,
} from '@/lib/qa-inspection-engine';

import {
  listRequisitions, approveDeptLevel, approveAccountsLevel, rejectRequisition,
  ROUTING_RULES,
} from '@/lib/payment-requisition-engine';
import type { PaymentRequestType } from '@/types/payment-requisition';

// ── small read helper (LS) ────────────────────────────────────────────────
function safeReadList<T>(key: string): T[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function safeWriteList<T>(key: string, list: T[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* swallow */
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 1 · procure_po — approval-matrix-engine
// ═══════════════════════════════════════════════════════════════════════
const procurePoAdapter: ApprovalAdapter = {
  id: 'adapter:procure_po',
  source_card: 'procure360',
  object_type: 'procure_po',
  listPending: (entityCode) =>
    listPosAwaitingApproval(entityCode).map((po) => ({
      source_record_id: po.id,
      source_record_no: po.po_no,
      amount: po.total_basic_value,
    })),
  approve: (entityCode, recordId, by) => {
    recordPoApproval(entityCode, recordId, by, '');
    if (isPoFullyApproved(entityCode, recordId)) {
      void transitionPoStatus(recordId, 'approved', entityCode, by);
    }
    return true;
  },
  reject: (entityCode, recordId, by) => {
    void transitionPoStatus(recordId, 'cancelled', entityCode, by);
    return true;
  },
  recordRoute: (id) => `/erp/procure-hub/po/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 2 · stock_issue — stock-issue-engine (draft → issued via approve)
// ═══════════════════════════════════════════════════════════════════════
const stockIssueAdapter: ApprovalAdapter = {
  id: 'adapter:stock_issue',
  source_card: 'store-hub',
  object_type: 'stock_issue',
  listPending: (entityCode) =>
    listStockIssues(entityCode)
      .filter((si) => si.status === 'draft')
      .map((si) => ({
        source_record_id: si.id,
        source_record_no: si.voucher_no ?? si.id,
        amount: si.total_value,
        creator_name: si.created_by ?? undefined,
      })),
  approve: (entityCode, recordId, by) => {
    const r = approveStockIssue(entityCode, by, by, recordId);
    return r.ok;
  },
  reject: (entityCode, recordId, by, reason) => {
    const r = rejectStockIssue(entityCode, by, by, recordId, reason);
    return r.ok;
  },
  recordRoute: (id) => `/erp/store-hub/stock-issue/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 3 · production_order — production-engine transitionState
// (Approval gate moves draft→released; full release-cascade with reservations
//  continues to run from the Production Console — §L disclosure.)
// ═══════════════════════════════════════════════════════════════════════
const productionOrderAdapter: ApprovalAdapter = {
  id: 'adapter:production_order',
  source_card: 'production',
  object_type: 'production_order',
  listPending: (entityCode) =>
    listProductionOrders(entityCode)
      .filter((po) => po.status === 'draft')
      .map((po) => ({
        source_record_id: po.id,
        source_record_no: po.doc_no,
      })),
  approve: (entityCode, recordId, by) => {
    const po = listProductionOrders(entityCode).find((p) => p.id === recordId);
    if (!po) return false;
    try { transitionProdState(po, 'released', { id: by, name: by }, 'rail-approved'); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by, reason) => {
    const po = listProductionOrders(entityCode).find((p) => p.id === recordId);
    if (!po) return false;
    try { transitionProdState(po, 'cancelled', { id: by, name: by }, reason); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/production/order/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 4 · requestx_indent — material-indent
// B1S2-R · R4 · approve/reject now consume request-engine#approveIndent /
// rejectIndent (additive exports already present at request-engine.ts:258, 284).
// The previous direct write to materialIndentsKey via safeWriteList has been
// REMOVED — adapters file no longer touches the store. request-engine.ts
// remains 0-DIFF. listPending stays a read-only LS lookup for visibility.
// ═══════════════════════════════════════════════════════════════════════
const requestxIndentAdapter: ApprovalAdapter = {
  id: 'adapter:requestx_indent',
  source_card: 'requestx',
  object_type: 'requestx_indent',
  listPending: (entityCode) =>
    safeReadList<MaterialIndent>(materialIndentsKey(entityCode))
      .filter((i) => typeof i.status === 'string' && i.status.startsWith('pending_'))
      .map((i) => ({
        source_record_id: i.id,
        source_record_no: i.voucher_no ?? i.id,
        amount: i.total_estimated_value ?? undefined,
        creator_name: i.requested_by_name,
      })),
  approve: (entityCode, recordId, by) =>
    approveRequestxIndent(recordId, 'material', by, 'rail', entityCode, 'rail-approved'),
  reject: (entityCode, recordId, by, reason) =>
    rejectRequestxIndent(recordId, 'material', by, 'rail', reason ?? 'rail-rejected', entityCode),
  recordRoute: (id) => `/erp/requestx/indent/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 5 · billpassing_deviation — bill-passing-engine
// ═══════════════════════════════════════════════════════════════════════
const billPassingAdapter: ApprovalAdapter = {
  id: 'adapter:billpassing_deviation',
  source_card: 'bill-passing',
  object_type: 'billpassing_deviation',
  listPending: (entityCode) =>
    listMatchedWithVariance(entityCode).map((bp) => ({
      source_record_id: bp.id,
      source_record_no: bp.bill_no,
      amount: bp.total_invoice_value,
      liability_ref: bp.id, // SoD-2 pivot · liability identified by bill-passing record
    })),
  approve: (entityCode, recordId, by, reason) => {
    void approveBill(recordId, reason ?? 'rail-approved', entityCode, by);
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    void rejectBill(recordId, reason, entityCode, by);
    return true;
  },
  recordRoute: (id) => `/erp/bill-passing/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 6 · salesx_discount (oob8) — compliance-aware approval engine
// ═══════════════════════════════════════════════════════════════════════
const salesxDiscountAdapter: ApprovalAdapter = {
  id: 'adapter:salesx_discount',
  source_card: 'salesx',
  object_type: 'salesx_discount',
  listPending: () =>
    listRoutedWorkflows()
      .filter((w) => !w.decision)
      .map((w) => ({
        source_record_id: w.routed_workflow_id,
        source_record_no: w.rule_id,
      })),
  approve: (_entityCode, recordId, _by, reason) =>
    decideComplianceApproval(recordId, 'approved', reason).ok,
  reject: (_entityCode, recordId, _by, reason) =>
    decideComplianceApproval(recordId, 'rejected', reason).ok,
  recordRoute: (id) => `/erp/salesx/voucher-class/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 7 · servicedesk_proposal — AMC proposal lifecycle
// AMCProposalStatus: 'draft'|'sent'|'negotiating'|'accepted'|'rejected'
// pending = sent OR negotiating · approve→'accepted' · reject→'rejected'
// ═══════════════════════════════════════════════════════════════════════
const servicedeskProposalAdapter: ApprovalAdapter = {
  id: 'adapter:servicedesk_proposal',
  source_card: 'servicedesk',
  object_type: 'servicedesk_proposal',
  listPending: (entityCode) =>
    listAMCProposals(entityCode)
      .filter((p) => p.status === 'sent' || p.status === 'negotiating')
      .map((p) => ({
        source_record_id: p.id,
        source_record_no: p.proposal_code,
        amount: typeof p.proposed_value_paise === 'number' ? p.proposed_value_paise / 100 : undefined,
      })),
  approve: (entityCode, recordId, by) => {
    try { transitionProposalStatus(recordId, 'accepted', by, undefined, entityCode); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by, reason) => {
    try { transitionProposalStatus(recordId, 'rejected', by, reason, entityCode); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/servicedesk/proposal/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 8 · logistics_dispute — dispute-workflow-engine
// ═══════════════════════════════════════════════════════════════════════
const logisticsDisputeAdapter: ApprovalAdapter = {
  id: 'adapter:logistics_dispute',
  source_card: 'logistic',
  object_type: 'logistics_dispute',
  listPending: (entityCode) =>
    safeReadList<Dispute>(disputesKey(entityCode))
      .filter((d) => !d.status.startsWith('resolved'))
      .map((d) => ({
        source_record_id: d.id,
        source_record_no: d.lr_no || d.id,
        amount: d.amount_in_dispute,
      })),
  approve: (entityCode, recordId, by) => {
    const list = safeReadList<Dispute>(disputesKey(entityCode));
    const idx = list.findIndex((d) => d.id === recordId);
    if (idx < 0) return false;
    const r = applyDisputeTransition({
      dispute: list[idx],
      to: 'resolved_in_favor_of_us',
      by,
      notes: 'rail-approved',
    });
    if (!r.ok) return false;
    list[idx] = r.dispute;
    safeWriteList(disputesKey(entityCode), list);
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    const list = safeReadList<Dispute>(disputesKey(entityCode));
    const idx = list.findIndex((d) => d.id === recordId);
    if (idx < 0) return false;
    const r = applyDisputeTransition({
      dispute: list[idx],
      to: 'resolved_in_favor_of_transporter',
      by,
      notes: reason,
    });
    if (!r.ok) return false;
    list[idx] = r.dispute;
    safeWriteList(disputesKey(entityCode), list);
    return true;
  },
  recordRoute: (id) => `/erp/logistic/dispute/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 9 · taskflow_expense — taskflow-accountability-engine (S1 hardening)
// ═══════════════════════════════════════════════════════════════════════
const taskflowExpenseAdapter: ApprovalAdapter = {
  id: 'adapter:taskflow_expense',
  source_card: 'taskflow',
  object_type: 'taskflow_expense',
  listPending: (entityCode) =>
    listExpenses(entityCode)
      .filter((e) => e.status === 'submitted')
      .map((e) => ({
        source_record_id: e.id,
        source_record_no: e.id,
        amount: e.amount,
        creator_name: e.submittedBy,
      })),
  approve: (entityCode, recordId, by, reason) => {
    try { approveExpense(entityCode, recordId, by, reason); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by, reason) => {
    try { rejectExpense(entityCode, recordId, by, reason); return true; } catch { return false; }
  },
  recordRoute: () => `/erp/taskflow#expense-center`,
};

// ═══════════════════════════════════════════════════════════════════════
// 10 · qualicheck_deviation — qa-inspection-engine (S1 hardening)
//   "failed" inspections are the deviation queue. approve → 'passed'
//   (concession-allowed precedent · see qa-inspection-engine §C 'concession')
//   reject → 'cancelled' (record archived · reason audited at source).
// ═══════════════════════════════════════════════════════════════════════
const qualicheckDeviationAdapter: ApprovalAdapter = {
  id: 'adapter:qualicheck_deviation',
  source_card: 'qualicheck',
  object_type: 'qualicheck_deviation',
  listPending: (entityCode) =>
    listPendingQa(entityCode)
      .filter((q) => q.status === 'failed' || q.status === 'partial_pass')
      .map((q) => ({
        source_record_id: q.id,
        source_record_no: q.qa_no,
        creator_name: q.inspector_user_id,
      })),
  approve: (entityCode, recordId, by) => {
    try { void transitionQaStatus(recordId, 'passed', entityCode, by); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by) => {
    try { void transitionQaStatus(recordId, 'cancelled', entityCode, by); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/qualicheck/inspection/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// Stage-aware payment-requisition adapter pair (§L mapping in close summary)
//   · 'payout_requisition'      filters vendor/treasury/director/statutory types
//   · 'peoplepay_reimbursement' filters employee_* types
//
// The engine's hardcoded dept→accounts chain (ROUTING_RULES) maps to the rail
// rule row's slab-2 two-step:
//   · listPending splits by status:
//       status=pending_dept_head    → step 1 mirror
//       status=pending_accounts     → step 2 mirror
//   · approve() delegates by current stage (dept vs accounts).
//   · reject() always calls rejectRequisition (engine sets fromLevel by status).
//
// payment-requisition-engine.ts stays ZERO-DIFF.
// ═══════════════════════════════════════════════════════════════════════
const PEOPLEPAY_TYPES: ReadonlySet<PaymentRequestType> = new Set<PaymentRequestType>([
  'employee_reimbursement',
  'employee_advance',
  'employee_loan_disbursement',
  'loan_emi',
]);

function isPeoplepayType(t: PaymentRequestType): boolean {
  return PEOPLEPAY_TYPES.has(t);
}

function reqStageLabel(status: string): string {
  if (status === 'pending_dept_head') return 'L1';
  if (status === 'pending_accounts') return 'L2';
  return status;
}

function reqApproveByStage(entityCode: string, recordId: string, _by: string, reason?: string): boolean {
  const req = listRequisitions(entityCode).find((r) => r.id === recordId);
  if (!req) return false;
  const comment = reason ?? 'rail-approved';
  if (req.status === 'pending_dept_head') {
    const r = approveDeptLevel(entityCode, recordId, comment);
    return !!r.ok;
  }
  if (req.status === 'pending_accounts') {
    const r = approveAccountsLevel(entityCode, recordId, comment);
    return !!r.ok;
  }
  return false;
}

const payoutRequisitionAdapter: ApprovalAdapter = {
  id: 'adapter:payout_requisition',
  source_card: 'pay-out',
  object_type: 'payout_requisition',
  listPending: (entityCode) =>
    listRequisitions(entityCode)
      .filter((r) => (r.status === 'pending_dept_head' || r.status === 'pending_accounts') && !isPeoplepayType(r.request_type))
      .map((r) => {
        const rule = ROUTING_RULES[r.request_type];
        const stage = reqStageLabel(r.status);
        return {
          source_record_id: r.id,
          source_record_no: `${r.id} · ${rule.levels}L · ${stage}`,
          amount: r.amount,
          creator_name: r.requested_by_name,
          liability_ref: r.linked_purchase_invoice_id ?? r.linked_purchase_invoice_no ?? undefined,
        };
      }),
  approve: (entityCode, recordId, by, reason) => reqApproveByStage(entityCode, recordId, by, reason),
  reject: (entityCode, recordId, _by, reason) => {
    const r = rejectRequisition(entityCode, recordId, reason);
    return !!r.ok;
  },
  recordRoute: (id) => `/erp/pay-out/requisition/${id}`,
};

const peoplepayReimbursementAdapter: ApprovalAdapter = {
  id: 'adapter:peoplepay_reimbursement',
  source_card: 'peoplepay',
  object_type: 'peoplepay_reimbursement',
  listPending: (entityCode) =>
    listRequisitions(entityCode)
      .filter((r) => (r.status === 'pending_dept_head' || r.status === 'pending_accounts') && isPeoplepayType(r.request_type))
      .map((r) => ({
        source_record_id: r.id,
        source_record_no: `${r.id} · ${reqStageLabel(r.status)}`,
        amount: r.amount,
        creator_name: r.requested_by_name,
      })),
  approve: (entityCode, recordId, by, reason) => reqApproveByStage(entityCode, recordId, by, reason),
  reject: (entityCode, recordId, _by, reason) => {
    const r = rejectRequisition(entityCode, recordId, reason);
    return !!r.ok;
  },
  recordRoute: (id) => `/erp/peoplepay/reimbursement/${id}`,
};

// ── self-register on import ───────────────────────────────────────────────
export function registerAllApprovalAdapters(): void {
  registerApprovalAdapter(procurePoAdapter);
  registerApprovalAdapter(stockIssueAdapter);
  registerApprovalAdapter(productionOrderAdapter);
  registerApprovalAdapter(requestxIndentAdapter);
  registerApprovalAdapter(billPassingAdapter);
  registerApprovalAdapter(salesxDiscountAdapter);
  registerApprovalAdapter(servicedeskProposalAdapter);
  registerApprovalAdapter(logisticsDisputeAdapter);
  // ── B1S2 ADAPTER-READY (4) ───────────────────────────────────────────
  registerApprovalAdapter(taskflowExpenseAdapter);
  registerApprovalAdapter(qualicheckDeviationAdapter);
  registerApprovalAdapter(payoutRequisitionAdapter);
  registerApprovalAdapter(peoplepayReimbursementAdapter);
}

// auto-fire on module import
registerAllApprovalAdapters();

/**
 * SEAM-ONLY · 6 rule rows are SEEDED in defaultRules() for visibility but have
 * NO adapter today. They activate when the source records ship in tree:
 *   · fincore_pending_voucher  — postVoucher hard-writes status='posted'; no
 *     pending_approval state exists yet (engine-surgery required to add one).
 *   · receivx_writeoff         — no write-off store exists yet.
 *   · credit_note              — credit-note-print-engine is print-only.
 *   · scheme_grant             — scheme-engine is pure calc.
 *   · projx_budget             — projx-engine has no projectBudgetKey store.
 *   · eximx_duty_payment       — duty-waterfall-engine is calc only.
 * Each activates by writing a new adapter here (engine remains 0-DIFF if the
 * approve/reject exports already exist; otherwise scheduled with the store).
 */
