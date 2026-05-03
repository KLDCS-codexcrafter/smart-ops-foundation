/**
 * @file        git.ts
 * @sprint      T-Phase-1.2.6f-c-1 · Block C · per D-284 GIT 2-stage Procure360 owns Stage 1
 * @purpose     Goods in Transit · Stage 1 (gate-receipt) types · Procure360-owned.
 *              Stage 2 (final inventory acceptance) remains FineCore Receipt Note (SD-9 ZERO TOUCH).
 * @decisions   D-284 (Stage 1 ownership) · D-257 (GIT awareness from 3-a) · D-127 · D-194
 * @disciplines FR-22 · FR-50 · FR-58
 */

export type GitStage1Status =
  | 'in_transit'
  | 'received_at_gate'
  | 'rejected_at_gate'
  | 'partial_receive';

export interface GitStage1Line {
  id: string;
  po_line_id: string;
  item_id: string;
  item_name: string;
  qty_ordered: number;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  uom: string;
  rejection_reason: string | null;
}

export interface GitStage1Record {
  id: string;
  git_no: string;

  po_id: string;
  po_no: string;
  vendor_id: string;
  vendor_name: string;

  entity_id: string;
  branch_id: string | null;
  godown_id: string | null;

  receipt_date: string;
  vehicle_no: string | null;
  driver_name: string | null;
  invoice_no: string | null;

  lines: GitStage1Line[];

  quality_check_passed: boolean;
  quality_notes: string;

  status: GitStage1Status;

  // Stage 2 linkage (set when FineCore Receipt Note created · OUT OF SCOPE for 3-c-1)
  stage2_grn_id: string | null;
  stage2_completed_at: string | null;

  notes: string;
  received_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const gitStage1Key = (entityCode: string): string =>
  `erp_procure_git_${entityCode}`;
