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
// 4 · requestx_indent — material-indent store + status writes
// (request-engine exports transitionState as state-validator only; the
//  approve/reject writes go straight to the LS store via the type-exported
//  materialIndentsKey — request-engine.ts remains 0-DIFF.)
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
  approve: (entityCode, recordId, by) => {
    const key = materialIndentsKey(entityCode);
    const list = safeReadList<MaterialIndent>(key);
    const idx = list.findIndex((i) => i.id === recordId);
    if (idx < 0) return false;
    const now = new Date().toISOString();
    list[idx] = {
      ...list[idx],
      status: 'approved',
      updated_at: now,
      updated_by: by,
      approval_history: [
        ...(list[idx].approval_history ?? []),
        { id: `ae_${Date.now().toString(36)}`, approver_user_id: by, approver_role: 'rail', action: 'approved', remarks: '', acted_at: now },
      ] as MaterialIndent['approval_history'],
    };
    safeWriteList(key, list);
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    const key = materialIndentsKey(entityCode);
    const list = safeReadList<MaterialIndent>(key);
    const idx = list.findIndex((i) => i.id === recordId);
    if (idx < 0) return false;
    const now = new Date().toISOString();
    list[idx] = {
      ...list[idx],
      status: 'rejected',
      updated_at: now,
      updated_by: by,
      approval_history: [
        ...(list[idx].approval_history ?? []),
        { id: `ae_${Date.now().toString(36)}`, approver_user_id: by, approver_role: 'rail', action: 'rejected', remarks: reason, acted_at: now },
      ] as MaterialIndent['approval_history'],
    };
    safeWriteList(key, list);
    return true;
  },
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
}

// auto-fire on module import
registerAllApprovalAdapters();

/**
 * SEAM-ONLY · adapters land in B1S2 (Matrix tier):
 *   · taskflow_expense — TaskExpense status union exists but taskflow-engine.ts
 *     does not export approve/reject. Surface ratification needed first.
 *   · qualicheck_deviation — qa-inspection-engine has listPendingQa +
 *     transitionQaStatus but no dedicated approve/reject for deviation/concession.
 */
