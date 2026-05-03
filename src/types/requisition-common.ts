/**
 * @file        requisition-common.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Shared requisition types · status labels · lineage tree shape
 * @decisions   D-218, D-220
 * @disciplines SD-13
 */
import type { IndentStatus } from './material-indent';

export interface IndentStateTransition {
  from: IndentStatus;
  to: IndentStatus;
  label: string;
  requires_role?: string;
}

export interface ApprovalMatrixTier {
  tier: 1 | 2 | 3;
  min_value: number;
  max_value: number;
  approver_role: string;
  approver_label: string;
}

export type IndentVoucherKind = 'material' | 'service' | 'capital';

export interface IndentLineageNode {
  id: string;
  voucher_no: string;
  kind: IndentVoucherKind;
  status: IndentStatus;
  date: string;
  parent_id: string | null;
  cascade_reason: 'short_supply' | 'qc_rejection' | 'substitute' | null;
  children: IndentLineageNode[];
}

export const STATUS_LABEL: Record<IndentStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_hod: 'Pending HOD',
  pending_purchase: 'Pending Purchase',
  pending_finance: 'Pending Finance',
  approved: 'Approved',
  rejected: 'Rejected',
  hold: 'On Hold',
  rfq_created: 'RFQ Created',
  po_created: 'PO Created',
  partially_ordered: 'Partially Ordered',
  closed: 'Closed',
  pre_closed: 'Pre-Closed',
  cancelled: 'Cancelled',
  stock_available: 'Stock Available',
  indent_promoted: 'Indent Promoted',
  partial_fulfilled: 'Partial Fulfilled',
  short_supplied: 'Short Supplied',
  substitute_received: 'Substitute Received',
  re_indented: 'Re-Indented',
  quality_rejected_partial: 'Quality Rejected (Partial)',
  auto_pre_closed: 'Auto Pre-Closed',
};

export const STATUS_COLOR: Record<IndentStatus, string> = {
  draft: 'muted',
  submitted: 'primary',
  pending_hod: 'warning',
  pending_purchase: 'warning',
  pending_finance: 'warning',
  approved: 'success',
  rejected: 'destructive',
  hold: 'warning',
  rfq_created: 'primary',
  po_created: 'primary',
  partially_ordered: 'primary',
  closed: 'success',
  pre_closed: 'muted',
  cancelled: 'destructive',
  stock_available: 'success',
  indent_promoted: 'primary',
  partial_fulfilled: 'warning',
  short_supplied: 'warning',
  substitute_received: 'warning',
  re_indented: 'primary',
  quality_rejected_partial: 'warning',
  auto_pre_closed: 'muted',
};

export const APPROVAL_MATRIX: ApprovalMatrixTier[] = [
  { tier: 1, min_value: 0,       max_value: 50000,    approver_role: 'department_head', approver_label: 'HOD' },
  { tier: 2, min_value: 50001,   max_value: 500000,   approver_role: 'operations',      approver_label: 'Purchase Head' },
  { tier: 3, min_value: 500001,  max_value: Number.MAX_SAFE_INTEGER, approver_role: 'finance', approver_label: 'Finance Head' },
];
