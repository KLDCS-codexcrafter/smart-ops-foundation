/**
 * @file        src/types/cycle-count-voucher.ts
 * @purpose     D-NEW-FQ · Cycle Count Stock Adjustment Voucher SIBLING type · 14th SIBLING application
 * @sprint      T-Phase-2.A-DepartmentStore-Phase2-Expansion · Block D
 * @decisions   Q-LOCK-6(a) SIBLING type · CycleCount stays 0-DIFF · purely augmentative
 * @disciplines FR-26 entity-scoped persistence via cycleAdjustmentVoucherKey
 * @[JWT]       writes via cycle-count-voucher-engine · localStorage erp_${entity}_cycle_adjustment_vouchers
 */

export type AdjustmentDirection = 'gain' | 'loss';

export interface CycleAdjustmentVoucherLine {
  item_id: string;
  item_code: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  bin_code: string | null;
  book_qty: number;
  physical_qty: number;
  variance_qty: number;
  variance_value_inr: number;
  direction: AdjustmentDirection;
  ledger_account: string;
}

export interface CycleAdjustmentVoucher {
  id: string;
  voucher_no: string;
  entity_id: string;

  related_cycle_count_id: string;
  related_cycle_count_no: string;

  voucher_date: string;
  total_lines: number;
  total_gain_value_inr: number;
  total_loss_value_inr: number;
  net_value_inr: number;

  voucher_routing_target: 'voucher_runtime_engine';

  lines: CycleAdjustmentVoucherLine[];

  status: 'draft' | 'posted' | 'cancelled';
  posted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;

  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const cycleAdjustmentVoucherKey = (entityCode: string): string =>
  `erp_${entityCode}_cycle_adjustment_vouchers`;
