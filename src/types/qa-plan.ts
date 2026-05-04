/**
 * @file        qa-plan.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block B · D-321 + D-330 + D-336
 * @purpose     Quality Plan · binds Spec + Acceptance Criteria to (item × party × voucher kind).
 * @decisions   D-321 (9-field Plan, becomes 11 with D-330+D-336)
 *              D-330 (applicable_voucher_kinds[] · matches Tally per-voucher-type config)
 *              D-336 (customer_id? for outgoing variants · symmetric with vendor_id?)
 *              D-333 (plan_type 4-value enum incl. 'sample')
 * @[JWT]       GET/POST /api/qa/plans
 */
import type { QaInspectionType } from './qa-inspection';

/** Voucher kinds where this plan auto-applies. Tally per-voucher-type parity. */
export type QaPlanVoucherKind =
  | 'grn' | 'mfg_in' | 'mfg_out' | 'sample_in'
  | 'outward' | 'delivery_note' | 'sales_invoice';

export interface QaPlan {
  id: string;
  // 1
  code: string;                              // e.g. "QP/26/0001"
  // 2
  name: string;                              // e.g. "Default Incoming RM Plan"
  // 3
  plan_type: QaInspectionType;               // incoming | sample | in_process | outgoing
  // 4
  item_id: string | null;                    // null = group-level / fallback
  item_name: string | null;
  // 5
  spec_id: string;                           // QaSpec FK (mandatory)
  // 6
  acceptance_criteria_id: string | null;     // QaAcceptanceCriteria FK
  // 7 — D-321 vendor variant
  vendor_id: string | null;
  vendor_name: string | null;
  // 8 — D-336 customer variant (symmetric)
  customer_id: string | null;
  customer_name: string | null;
  // 9
  status: 'draft' | 'active' | 'archived';
  // 10 — D-330 applicable voucher kinds (Tally per-voucher-type pattern)
  applicable_voucher_kinds: QaPlanVoucherKind[];
  // 11
  notes: string;

  entity_id: string;
  created_at: string;
  updated_at: string;
}

export const qaPlanKey = (entityCode: string): string =>
  `erp_qa_plans_${entityCode}`;
