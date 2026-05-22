/**
 * @file        src/lib/approval-matrix-engine.ts
 * @purpose     D-NEW-GK · Approval Matrix engine · routes PO/RC for tiered approval workflow · 21st SIBLING ⭐
 * @sprint      T-Phase-2.HK-5 · Block A
 * @decisions   Q-LOCK-3(a) FR-19 SIBLING · approval-matrix-template type extended non-breaking · po-management-engine 0-DIFF
 * @disciplines FR-19 (SIBLING discipline · 21st application) · FR-22 canonical · FR-26 entity-scoped · FR-54 CC SSOT preserved
 * @reuses      approvalMatrixTemplatesKey (existing localStorage key) · approval-matrix-template type · po-management-engine PUBLIC API
 * @[JWT]       erp_approval_records_<entityCode>
 */
import type { ApprovalMatrixTemplate, ApprovalTemplateTier } from '@/types/approval-matrix-template';
import { approvalMatrixTemplatesKey } from '@/types/approval-matrix-template';
import type { PurchaseOrderRecord } from '@/types/po';
import { listPurchaseOrders } from '@/lib/po-management-engine';

export interface ApprovalRoutingResult {
  po_id: string;
  applicable_template: ApprovalMatrixTemplate | null;
  applicable_tier: ApprovalTemplateTier | null;
  required_approvers: Array<{ role: string; is_mandatory: boolean; avg_response_hours: number }>;
  status: 'no_template' | 'auto_approve_below_threshold' | 'awaiting_approval' | 'approved';
  rationale: string;
}

export interface ApprovalRecord {
  po_id: string;
  approver_role: string;
  approved_at: string;
  approver_id?: string;
  notes?: string;
}

const approvalRecordsKey = (entityCode: string): string => `erp_approval_records_${entityCode}`;

export function findApplicableTemplate(
  entityCode: string,
  voucherKind: 'po' | 'rate_contract',
  amount: number,
): { template: ApprovalMatrixTemplate | null; tier: ApprovalTemplateTier | null } {
  try {
    // [JWT] GET /api/approval-matrix/templates
    const raw = localStorage.getItem(approvalMatrixTemplatesKey(entityCode));
    const templates: ApprovalMatrixTemplate[] = raw ? JSON.parse(raw) : [];
    const candidates = templates.filter(
      (t) => t.is_active && (t.voucher_kind === voucherKind || t.voucher_kind === 'all'),
    );
    const template = candidates.find((t) => t.is_default) ?? candidates[0] ?? null;
    if (!template) return { template: null, tier: null };
    const tier = template.tiers.find(
      (t) => amount >= t.threshold_min && amount <= t.threshold_max,
    ) ?? null;
    return { template, tier };
  } catch {
    return { template: null, tier: null };
  }
}

export function routeForApproval(entityCode: string, poId: string): ApprovalRoutingResult {
  const pos = listPurchaseOrders(entityCode);
  const po = pos.find((p) => p.id === poId);
  if (!po) {
    return {
      po_id: poId,
      applicable_template: null,
      applicable_tier: null,
      required_approvers: [],
      status: 'no_template',
      rationale: 'PO not found',
    };
  }
  const { template, tier } = findApplicableTemplate(entityCode, 'po', po.total_basic_value);
  if (!template) {
    return {
      po_id: poId,
      applicable_template: null,
      applicable_tier: null,
      required_approvers: [],
      status: 'no_template',
      rationale: 'No active approval template for PO voucher_kind in this entity',
    };
  }
  if (!tier) {
    return {
      po_id: poId,
      applicable_template: template,
      applicable_tier: null,
      required_approvers: [],
      status: 'auto_approve_below_threshold',
      rationale: `PO amount below all tier thresholds`,
    };
  }
  return {
    po_id: poId,
    applicable_template: template,
    applicable_tier: tier,
    required_approvers: tier.required_approvals,
    status: 'awaiting_approval',
    rationale: `Routed to Tier ${tier.tier_no} · ${tier.required_approvals.length} required approver(s)`,
  };
}

export function recordApproval(
  entityCode: string,
  poId: string,
  approverRole: string,
  notes?: string,
): void {
  try {
    // [JWT] POST /api/approval-records
    const raw = localStorage.getItem(approvalRecordsKey(entityCode));
    const records: ApprovalRecord[] = raw ? JSON.parse(raw) : [];
    records.push({
      po_id: poId,
      approver_role: approverRole,
      approved_at: new Date().toISOString(),
      notes,
    });
    localStorage.setItem(approvalRecordsKey(entityCode), JSON.stringify(records));
  } catch {
    /* quota silent */
  }
}

export function listApprovalsForPO(entityCode: string, poId: string): ApprovalRecord[] {
  try {
    const raw = localStorage.getItem(approvalRecordsKey(entityCode));
    const all: ApprovalRecord[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.po_id === poId);
  } catch {
    return [];
  }
}

export function isPoFullyApproved(entityCode: string, poId: string): boolean {
  const routing = routeForApproval(entityCode, poId);
  if (routing.status === 'auto_approve_below_threshold') return true;
  if (routing.status !== 'awaiting_approval') return false;
  const recorded = listApprovalsForPO(entityCode, poId);
  const mandatoryRoles = routing.required_approvers.filter((a) => a.is_mandatory).map((a) => a.role);
  return mandatoryRoles.every((role) => recorded.some((r) => r.approver_role === role));
}

export function listPosAwaitingApproval(entityCode: string): PurchaseOrderRecord[] {
  return listPurchaseOrders(entityCode).filter(
    (po) => po.status === 'pending_approval' && !isPoFullyApproved(entityCode, po.id),
  );
}
