/**
 * @file        src/lib/approval-adapters.ts
 * @sprint      Sprint B1S1 · T-B1S1-Approval-Rail
 * @purpose     Registration glue ONLY · NOT engine-credited.
 *              Each adapter is ~25-35 LOC and CONSUMES the consumer engines'
 *              existing exported APIs. Every consumer engine remains 0-DIFF.
 *
 *              Imports allowed; edits forbidden (every consumer engine is a §H wall).
 *              SEAM-ONLY consumers (taskflow_expense, qualicheck_deviation) are
 *              documented at the bottom of this file — adapters land in B1S2.
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
  releaseProductionOrder,
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

// requestx · indents
import type { MaterialIndent } from '@/types/requisition-common';

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
      creator_name: po.created_by_user_id ?? undefined,
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
// 2 · stock_issue — stock-issue-engine
// ═══════════════════════════════════════════════════════════════════════
const stockIssueAdapter: ApprovalAdapter = {
  id: 'adapter:stock_issue',
  source_card: 'store-hub',
  object_type: 'stock_issue',
  listPending: (entityCode) =>
    listStockIssues(entityCode)
      .filter((si) => si.status === 'pending_approval')
      .map((si) => ({
        source_record_id: si.id,
        source_record_no: si.voucher_no ?? si.id,
        amount: si.total_value ?? undefined,
        creator_name: si.created_by_user_id ?? undefined,
      })),
  approve: (entityCode, recordId, by) => {
    try { approveStockIssue(entityCode, recordId, by); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by, reason) => {
    try { rejectStockIssue(entityCode, recordId, by, reason); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/store-hub/stock-issue/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 3 · production_order — production-engine (draft → released | cancelled)
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
        source_record_no: po.voucher_no ?? po.id,
        amount: po.cost_structure?.total_planned_cost ?? undefined,
      })),
  approve: (entityCode, recordId, by) => {
    try { releaseProductionOrder(entityCode, recordId, by); return true; } catch { return false; }
  },
  reject: (entityCode, recordId, by, reason) => {
    try { transitionProdState(entityCode, recordId, 'cancelled', by, reason); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/production/order/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 4 · requestx_indent — request-engine state spine
// (Consumes the indent LS store directly via type-exported key; transitions
// applied through transitionState; no edits to request-engine.ts.)
// ═══════════════════════════════════════════════════════════════════════
const REQUESTX_INDENT_KEY = (e: string): string => `erp_material_indents_${e}`;
function writeIndents(key: string, list: MaterialIndent[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* swallow */ }
}
const requestxIndentAdapter: ApprovalAdapter = {
  id: 'adapter:requestx_indent',
  source_card: 'requestx',
  object_type: 'requestx_indent',
  listPending: (entityCode) =>
    safeReadList<MaterialIndent>(REQUESTX_INDENT_KEY(entityCode))
      .filter((i) => i.status?.startsWith('pending_'))
      .map((i) => ({
        source_record_id: i.id,
        source_record_no: i.voucher_no ?? i.id,
        amount: i.total_estimated_value ?? undefined,
        creator_name: (i as unknown as { created_by_user_id?: string }).created_by_user_id,
      })),
  approve: (entityCode, recordId, by) => {
    const key = REQUESTX_INDENT_KEY(entityCode);
    const list = safeReadList<MaterialIndent>(key);
    const idx = list.findIndex((i) => i.id === recordId);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], status: 'approved', updated_at: new Date().toISOString(),
      approval_history: [
        ...(list[idx].approval_history ?? []),
        { decision: 'approved', by_user_id: by, at: new Date().toISOString(), reason: null },
      ] as MaterialIndent['approval_history'],
    };
    writeIndents(key, list);
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    const key = REQUESTX_INDENT_KEY(entityCode);
    const list = safeReadList<MaterialIndent>(key);
    const idx = list.findIndex((i) => i.id === recordId);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], status: 'rejected', updated_at: new Date().toISOString(),
      approval_history: [
        ...(list[idx].approval_history ?? []),
        { decision: 'rejected', by_user_id: by, at: new Date().toISOString(), reason },
      ] as MaterialIndent['approval_history'],
    };
    writeIndents(key, list);
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
      source_record_no: bp.bill_no ?? bp.id,
      amount: bp.total_after_tax ?? undefined,
      liability_ref: bp.id, // SoD-2 pivot · liability identified by bill-passing record
    })),
  approve: (entityCode, recordId, by) => {
    void approveBill(entityCode, recordId, by);
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    void rejectBill(entityCode, recordId, by, reason);
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
  approve: (_entityCode, recordId, _by, reason) => {
    const r = decideComplianceApproval(recordId, 'approved', reason);
    return r.ok;
  },
  reject: (_entityCode, recordId, _by, reason) => {
    const r = decideComplianceApproval(recordId, 'rejected', reason);
    return r.ok;
  },
  recordRoute: (id) => `/erp/salesx/voucher-class/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 7 · servicedesk_proposal — servicedesk-engine AMC proposal lifecycle
// ═══════════════════════════════════════════════════════════════════════
const servicedeskProposalAdapter: ApprovalAdapter = {
  id: 'adapter:servicedesk_proposal',
  source_card: 'servicedesk',
  object_type: 'servicedesk_proposal',
  listPending: (entityCode) =>
    listAMCProposals(entityCode)
      .filter((p) => p.status === 'proposal_draft' || p.status === 'proposal_submitted')
      .map((p) => ({
        source_record_id: p.id,
        source_record_no: p.proposal_no ?? p.id,
        amount: (p as unknown as { quoted_amount?: number }).quoted_amount,
      })),
  approve: (_entityCode, recordId, _by) => {
    try { transitionProposalStatus(recordId, 'approved'); return true; } catch { return false; }
  },
  reject: (_entityCode, recordId, _by, reason) => {
    try { transitionProposalStatus(recordId, 'rejected', reason); return true; } catch { return false; }
  },
  recordRoute: (id) => `/erp/servicedesk/proposal/${id}`,
};

// ═══════════════════════════════════════════════════════════════════════
// 8 · logistics_dispute — dispute-workflow-engine (W3 tolerance disputes)
// Pending = any dispute not yet resolved. Consumes disputesKey directly
// (type-exported store) — engine remains 0-DIFF.
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
        source_record_no: d.id,
        amount: d.disputed_amount ?? undefined,
      })),
  approve: (entityCode, recordId, by) => {
    const list = safeReadList<Dispute>(disputesKey(entityCode));
    const idx = list.findIndex((d) => d.id === recordId);
    if (idx < 0) return false;
    const next = applyDisputeTransition({
      dispute: list[idx],
      to: 'resolved_in_favor_of_us',
      by,
      notes: 'rail-approved',
    });
    list[idx] = next;
    try { localStorage.setItem(disputesKey(entityCode), JSON.stringify(list)); } catch { /* swallow */ }
    return true;
  },
  reject: (entityCode, recordId, by, reason) => {
    const list = safeReadList<Dispute>(disputesKey(entityCode));
    const idx = list.findIndex((d) => d.id === recordId);
    if (idx < 0) return false;
    const next = applyDisputeTransition({
      dispute: list[idx],
      to: 'resolved_in_favor_of_transporter',
      by,
      notes: reason,
    });
    list[idx] = next;
    try { localStorage.setItem(disputesKey(entityCode), JSON.stringify(list)); } catch { /* swallow */ }
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
 *   · taskflow_expense — TaskExpense has status union but no dedicated approve/reject
 *     export in taskflow-engine.ts. Surface ratification required first.
 *   · qualicheck_deviation — qa-inspection-engine has listPendingQa + transitionQaStatus
 *     but lacks dedicated approve/reject decision exports for deviation/concession.
 */
