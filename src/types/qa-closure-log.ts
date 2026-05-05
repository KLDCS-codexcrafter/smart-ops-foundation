/**
 * @file        qa-closure-log.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block B · D-338 + D-194
 * @purpose     Audit log for QC closures · which inspections triggered which Stock Journal vouchers.
 *              Pure query target — NEVER edited after write. Closure trace for compliance + ops visibility.
 * @[JWT]       GET /api/qa/closure-log
 */

export type QaClosureRoute = 'approved' | 'sample' | 'rejection';

export interface QaClosureLogEntry {
  id: string;
  qa_id: string;
  qa_no: string;
  closed_at: string;
  closed_by: string;
  // 3 routing legs · null if leg had qty 0
  approved_voucher_id: string | null;
  approved_voucher_no: string | null;
  approved_qty: number;
  sample_voucher_id: string | null;
  sample_voucher_no: string | null;
  sample_qty: number;
  rejection_voucher_id: string | null;
  rejection_voucher_no: string | null;
  rejection_qty: number;
  entity_id: string;
}

export const qaClosureLogKey = (entityCode: string): string =>
  `erp_qa_closure_log_${entityCode}`;
