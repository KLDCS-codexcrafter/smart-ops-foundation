/**
 * @file        src/types/leo.ts
 * @purpose     LEO (Let Export Order) · customs clearance · 4-state workflow
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q4=a 4-state (pending → examined → let_export → closed)
 */
import type { RMSLane } from './rms-declaration';

export type LEOStatus = 'pending' | 'examined' | 'let_export' | 'closed';

export const LEO_VALID_TRANSITIONS: Record<LEOStatus, LEOStatus[]> = {
  pending: ['examined'],
  examined: ['let_export'],
  let_export: ['closed'],
  closed: [],
};

export interface LEO {
  id: string;
  leo_no: string;
  entity_id: string;
  status: LEOStatus;

  related_shipping_bill_id: string;

  rms_lane_assigned: RMSLane;
  examination_officer: string;
  examination_date: string | null;
  examination_notes: string;
  containers_examined: number;
  containers_total: number;

  examination_skipped_self_sealing: boolean;

  pending_at: string;
  examined_at: string | null;
  let_export_at: string | null;
  closed_at: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const leoKey = (entityCode: string): string =>
  `erp_${entityCode}_leos`;
