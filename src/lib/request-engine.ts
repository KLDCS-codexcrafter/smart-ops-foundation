/**
 * @file        request-engine.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     CRUD + state machine for Material/Service/Capital indents.
 * @decisions   D-218 (state machine v3.0), D-220, D-230, D-231
 * @disciplines SD-13, SD-15, SD-16
 * @reuses      decimal-helpers (dAdd, round2)
 * @[JWT]       /api/requestx/* endpoints (Phase 1.4)
 */
import { dAdd, round2 } from '@/lib/decimal-helpers';
import {
  materialIndentsKey,
  type MaterialIndent,
  type MaterialIndentLine,
  type IndentStatus,
  type ApprovalEvent,
} from '@/types/material-indent';
import { serviceRequestsKey, type ServiceRequest, type ServiceRequestLine } from '@/types/service-request';
import { capitalIndentsKey, type CapitalIndent, type CapitalIndentLine } from '@/types/capital-indent';
import { APPROVAL_MATRIX } from '@/types/requisition-common';

export type IndentKind = 'material' | 'service' | 'capital';

export interface AutoRuleWarning {
  rule: 'shortage' | 'over_budget' | 'duplicate_item' | 'preferred_vendor';
  severity: 'info' | 'warn' | 'error';
  message: string;
  line_id?: string;
}

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readArr<T>(key: string): T[] {
  // [JWT] GET /api/requestx/<entity>/<kind>
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(key: string, list: T[]): void {
  // [JWT] PUT /api/requestx/<entity>/<kind>
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota — silent per Card #2.7-d-1 contract */
  }
}

export function recomputeTotal(lines: { estimated_value: number }[]): number {
  let total = 0;
  for (const l of lines) total = dAdd(total, l.estimated_value);
  return round2(total);
}

export function getApprovalTier(value: number, isCapital: boolean): 1 | 2 | 3 {
  if (isCapital) return 3;
  for (const tier of APPROVAL_MATRIX) {
    if (value >= tier.min_value && value <= tier.max_value) return tier.tier;
  }
  return 3;
}

const ALLOWED_TRANSITIONS: Record<IndentStatus, IndentStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['pending_hod', 'pending_purchase', 'pending_finance', 'rejected', 'cancelled'],
  pending_hod: ['approved', 'rejected', 'hold', 'pending_purchase'],
  pending_purchase: ['approved', 'rejected', 'hold', 'pending_finance'],
  pending_finance: ['approved', 'rejected', 'hold'],
  approved: ['rfq_created', 'po_created', 'stock_available', 'indent_promoted', 'closed', 'pre_closed', 'cancelled'],
  rejected: [],
  hold: ['submitted', 'cancelled'],
  rfq_created: ['po_created', 'cancelled'],
  po_created: ['partially_ordered', 'closed', 'short_supplied', 'partial_fulfilled', 'cancelled', 'quality_rejected_partial'],
  partially_ordered: ['closed', 'short_supplied', 'partial_fulfilled', 'pre_closed'],
  closed: [],
  pre_closed: [],
  cancelled: [],
  stock_available: ['closed', 'indent_promoted'],
  indent_promoted: ['rfq_created', 'po_created', 'closed'],
  partial_fulfilled: ['re_indented', 'closed', 'auto_pre_closed'],
  short_supplied: ['re_indented', 'substitute_received', 'auto_pre_closed'],
  substitute_received: ['closed'],
  re_indented: ['submitted'],
  quality_rejected_partial: ['re_indented', 'closed'],
  auto_pre_closed: [],
};

export function transitionState(current: IndentStatus, next: IndentStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

// ── CREATE ──────────────────────────────────────────────────────────────────

export interface CreateMaterialIndentInput
  extends Omit<MaterialIndent, 'id' | 'voucher_no' | 'total_estimated_value' | 'status' | 'approval_tier' | 'pending_approver_user_id' | 'approval_history' | 'created_at' | 'updated_at'> {
  voucher_no?: string;
}

function genVoucherNo(prefix: string): string {
  // [JWT] /api/voucher-numbering/next?prefix=...
  const fy = '2526';
  const seq = (Date.now() % 9999).toString().padStart(4, '0');
  return `${prefix}/${fy}/${seq}`;
}

export function createMaterialIndent(input: CreateMaterialIndentInput, entityCode: string): MaterialIndent {
  const total = recomputeTotal(input.lines);
  const tier = getApprovalTier(total, false);
  const now = new Date().toISOString();
  const indent: MaterialIndent = {
    ...input,
    id: newId('mi'),
    voucher_no: input.voucher_no ?? genVoucherNo('MI'),
    total_estimated_value: total,
    status: 'draft',
    approval_tier: tier,
    pending_approver_user_id: null,
    approval_history: [],
    created_at: now,
    updated_at: now,
  };
  const list = readArr<MaterialIndent>(materialIndentsKey(entityCode));
  list.push(indent);
  writeArr(materialIndentsKey(entityCode), list);
  return indent;
}

export interface CreateServiceRequestInput
  extends Omit<ServiceRequest, 'id' | 'voucher_no' | 'total_estimated_value' | 'status' | 'approval_tier' | 'pending_approver_user_id' | 'approval_history' | 'created_at' | 'updated_at'> {
  voucher_no?: string;
}

export function createServiceRequest(input: CreateServiceRequestInput, entityCode: string): ServiceRequest {
  const total = recomputeTotal(input.lines);
  const tier = getApprovalTier(total, false);
  const now = new Date().toISOString();
  const sr: ServiceRequest = {
    ...input,
    id: newId('sr'),
    voucher_no: input.voucher_no ?? genVoucherNo('SR'),
    total_estimated_value: total,
    status: 'draft',
    approval_tier: tier,
    pending_approver_user_id: null,
    approval_history: [],
    created_at: now,
    updated_at: now,
  };
  const list = readArr<ServiceRequest>(serviceRequestsKey(entityCode));
  list.push(sr);
  writeArr(serviceRequestsKey(entityCode), list);
  return sr;
}

export interface CreateCapitalIndentInput
  extends Omit<CapitalIndent, 'id' | 'voucher_no' | 'total_estimated_value' | 'status' | 'approval_tier' | 'pending_approver_user_id' | 'approval_history' | 'finance_gate_required' | 'created_at' | 'updated_at'> {
  voucher_no?: string;
}

export function createCapitalIndent(input: CreateCapitalIndentInput, entityCode: string): CapitalIndent {
  const total = recomputeTotal(input.lines);
  const now = new Date().toISOString();
  const ci: CapitalIndent = {
    ...input,
    id: newId('cap'),
    voucher_no: input.voucher_no ?? genVoucherNo('CAP'),
    total_estimated_value: total,
    status: 'draft',
    approval_tier: 3,
    pending_approver_user_id: null,
    approval_history: [],
    finance_gate_required: true,
    created_at: now,
    updated_at: now,
  };
  const list = readArr<CapitalIndent>(capitalIndentsKey(entityCode));
  list.push(ci);
  writeArr(capitalIndentsKey(entityCode), list);
  return ci;
}

// ── SUBMIT / APPROVE / REJECT ───────────────────────────────────────────────

function keyFor(kind: IndentKind, entityCode: string): string {
  if (kind === 'material') return materialIndentsKey(entityCode);
  if (kind === 'service') return serviceRequestsKey(entityCode);
  return capitalIndentsKey(entityCode);
}

interface BaseIndent {
  id: string;
  status: IndentStatus;
  approval_history: ApprovalEvent[];
  pending_approver_user_id: string | null;
  approval_tier: 1 | 2 | 3;
  updated_at: string;
}

export function submitIndent(id: string, kind: IndentKind, entityCode: string, approverUserId: string): boolean {
  const key = keyFor(kind, entityCode);
  const list = readArr<BaseIndent>(key);
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return false;
  const cur = list[idx];
  if (!transitionState(cur.status, 'submitted')) return false;
  const next: IndentStatus =
    cur.approval_tier === 3 ? 'pending_finance' : cur.approval_tier === 2 ? 'pending_purchase' : 'pending_hod';
  list[idx] = {
    ...cur,
    status: next,
    pending_approver_user_id: approverUserId,
    updated_at: new Date().toISOString(),
  };
  writeArr(key, list);
  return true;
}

export function approveIndent(id: string, kind: IndentKind, approverId: string, role: string, entityCode: string, remarks = ''): boolean {
  const key = keyFor(kind, entityCode);
  const list = readArr<BaseIndent>(key);
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return false;
  const cur = list[idx];
  if (!transitionState(cur.status, 'approved')) return false;
  const event: ApprovalEvent = {
    id: newId('apv'),
    approver_user_id: approverId,
    approver_role: role,
    action: 'approved',
    remarks,
    acted_at: new Date().toISOString(),
  };
  list[idx] = {
    ...cur,
    status: 'approved',
    pending_approver_user_id: null,
    approval_history: [...cur.approval_history, event],
    updated_at: new Date().toISOString(),
  };
  writeArr(key, list);
  return true;
}

export function rejectIndent(id: string, kind: IndentKind, approverId: string, role: string, reason: string, entityCode: string): boolean {
  const key = keyFor(kind, entityCode);
  const list = readArr<BaseIndent>(key);
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return false;
  const cur = list[idx];
  if (!transitionState(cur.status, 'rejected')) return false;
  const event: ApprovalEvent = {
    id: newId('apv'),
    approver_user_id: approverId,
    approver_role: role,
    action: 'rejected',
    remarks: reason,
    acted_at: new Date().toISOString(),
  };
  list[idx] = {
    ...cur,
    status: 'rejected',
    pending_approver_user_id: null,
    approval_history: [...cur.approval_history, event],
    updated_at: new Date().toISOString(),
  };
  writeArr(key, list);
  return true;
}

// ── AUTO RULES (OOB-6) ──────────────────────────────────────────────────────

export function runAutoRules(
  indent: { lines: Array<MaterialIndentLine | CapitalIndentLine | ServiceRequestLine>; total_estimated_value: number; preferred_vendor_id?: string | null },
  deptBudgetAvailable: number,
): AutoRuleWarning[] {
  const warnings: AutoRuleWarning[] = [];
  // Shortage warn (material/capital lines only; SR has no current_stock_qty)
  for (const l of indent.lines) {
    if ('current_stock_qty' in l && l.is_stocked && l.qty > l.current_stock_qty) {
      warnings.push({
        rule: 'shortage',
        severity: 'warn',
        message: `Line "${l.item_name ?? ''}": qty ${l.qty} exceeds available stock ${l.current_stock_qty}.`,
        line_id: l.id,
      });
    }
  }
  // Over-budget warn
  if (deptBudgetAvailable > 0 && indent.total_estimated_value > deptBudgetAvailable) {
    warnings.push({
      rule: 'over_budget',
      severity: 'warn',
      message: `Estimated value exceeds remaining department budget (₹${deptBudgetAvailable.toLocaleString('en-IN')}).`,
    });
  }
  // Duplicate item
  const seen = new Set<string>();
  for (const l of indent.lines) {
    const key = 'item_id' in l ? l.item_id : 'service_id' in l ? l.service_id : '';
    if (key && seen.has(key)) {
      warnings.push({ rule: 'duplicate_item', severity: 'info', message: `Duplicate line entry for ${key}.`, line_id: l.id });
    }
    if (key) seen.add(key);
  }
  // Preferred vendor (info only)
  if (!indent.preferred_vendor_id) {
    warnings.push({ rule: 'preferred_vendor', severity: 'info', message: 'No preferred vendor selected — Procure360 will run full RFQ.' });
  }
  return warnings;
}

// ── CANCEL (DRAFT-only · D-410 · 8-pre-2) ───────────────────────────────────

/**
 * cancelIndent — DRAFT-only cancellation (D-410 · 8-pre-2)
 * Mirrors rejectIndent pattern EXACTLY but for status='draft' transitions to 'cancelled'.
 * Uses approval_history audit pattern (NOT separate fields) · cleaner than Card #7 D-399.
 *
 * D-128 boundary respect: rejects non-DRAFT statuses (use rejectIndent or finecore.cancelVoucher).
 */
export function cancelIndent(
  id: string,
  kind: IndentKind,
  cancellerId: string,
  role: string,
  cancelReason: string,
  entityCode: string,
): { ok: boolean; reason?: string } {
  // [JWT] PATCH /api/requestx/{kind}-indents/:id/cancel
  if (!cancelReason.trim()) return { ok: false, reason: 'cancel-reason-required' };
  if (cancelReason.length > 500) return { ok: false, reason: 'cancel-reason-too-long' };
  const key = keyFor(kind, entityCode);
  const list = readArr<BaseIndent>(key);
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return { ok: false, reason: 'not-found' };
  const cur = list[idx];
  if (cur.status === 'cancelled') return { ok: false, reason: 'already-cancelled' };
  if (cur.status !== 'draft') return { ok: false, reason: 'cancel-only-allowed-for-draft' };
  if (!transitionState(cur.status, 'cancelled')) return { ok: false, reason: 'state-transition-forbidden' };

  const event: ApprovalEvent = {
    id: newId('apv'),
    approver_user_id: cancellerId,
    approver_role: role,
    action: 'cancelled',
    remarks: cancelReason,
    acted_at: new Date().toISOString(),
  };
  list[idx] = {
    ...cur,
    status: 'cancelled',
    pending_approver_user_id: null,
    approval_history: [...cur.approval_history, event],
    updated_at: new Date().toISOString(),
  };
  writeArr(key, list);
  return { ok: true };
}
