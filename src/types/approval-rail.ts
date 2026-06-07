/**
 * @file        src/types/approval-rail.ts
 * @sprint      Sprint B1S1 · T-B1S1-Approval-Rail · Pillar B.1
 * @purpose     Type spine for the ONE approval rail (TaskFlow-mirrored).
 *              Per Operix_Approval_Matrix_v1.3 §2 · 3-slab model · role-or-named.
 *              Cards own records; rail owns the inbox. Adapters bridge the two.
 * @[JWT]       Wave-2: auth-derived approver identity (currently free-text name).
 */

/** One literal per Block-0 ADAPTER-READY consumer (B1S1 ledger · 8 ready). */
export type ApprovalObjectType =
  | 'salesx_discount'
  | 'procure_po'
  | 'stock_issue'
  | 'production_order'
  | 'requestx_indent'
  | 'billpassing_deviation'
  | 'servicedesk_proposal'
  | 'logistics_dispute';

/** Matrix §2.3a — `named` wins over `role`, role is fallback. */
export interface ApprovalChainStep {
  order: number;
  approver: {
    mode: 'role' | 'named';
    role?: string;
    personName?: string;
  };
}

/**
 * The 3-slab rule row (one row per object_type per entity).
 * Matrix §3 default seeds are planted at first read; every field editable.
 */
export interface ApprovalRuleRow {
  id: string;
  object_type: ApprovalObjectType;
  /** Slab 0 · amount <= this → auto-approve. null = slab 0 disabled. */
  slab0_auto_below: number | null;
  /** Slab 1 · amount <= this (and > slab0) → single approver. null = no slab 1. */
  slab1_single_below: number | null;
  /** Slab 1 single-approver step (used only when slab1_single_below is set). */
  slab1_step: ApprovalChainStep;
  /** Slab 2 · everything above slab 1 → sequential chain. */
  slab2_chain: ApprovalChainStep[];
  sla_hours_slab1: 24;
  sla_hours_slab2_per_step: 48;
  active: true;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

/** Attached to the mirror Task as `Task.approval` when category='approval'. */
export interface ApprovalTaskMeta {
  source_card:
    | 'salesx'
    | 'procure360'
    | 'store-hub'
    | 'production'
    | 'requestx'
    | 'bill-passing'
    | 'servicedesk'
    | 'logistic';
  object_type: ApprovalObjectType;
  source_record_id: string;
  source_record_no: string;
  amount?: number;
  slab: 0 | 1 | 2;
  creator_name?: string;
  decision?: 'approved' | 'rejected';
  decision_by?: string;
  decision_reason?: string;
  decided_at?: string;
  /** Optional cross-object liability ref for SoD-2 (bill-passing ↔ payout). */
  liability_ref?: string;
}

/** What an adapter returns to the rail when listing pending records. */
export interface PendingApprovalItem {
  source_record_id: string;
  source_record_no: string;
  amount?: number;
  creator_name?: string;
  liability_ref?: string;
}

/** Adapter contract — implemented in src/lib/approval-adapters.ts (NOT engine-credited). */
export interface ApprovalAdapter {
  id: string;
  source_card: ApprovalTaskMeta['source_card'];
  object_type: ApprovalObjectType;
  listPending(entityCode: string): PendingApprovalItem[];
  approve(entityCode: string, recordId: string, by: string, reason?: string): boolean;
  reject(entityCode: string, recordId: string, by: string, reason: string): boolean;
  recordRoute(recordId: string): string;
}

export const approvalRulesKey = (entityCode: string): string =>
  `erp_approval_rules_${entityCode}`;

/** Decided-by ledger for SoD-2 cross-object enforcement (per-entity). */
export const approvalDecidedByLedgerKey = (entityCode: string): string =>
  `erp_approval_decided_by_${entityCode}`;

export interface ApprovalDecidedByEntry {
  id: string;
  liability_ref: string;
  object_type: ApprovalObjectType;
  decided_by_name: string;
  decided_at: string;
}
