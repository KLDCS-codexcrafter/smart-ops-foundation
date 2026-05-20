/**
 * @file        src/types/egm.ts
 * @purpose     EGM (Export General Manifest) · vessel-level manifest · ICEGATE linkage
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q3=a full EGM workflow · ICEGATE simulated EGM number
 */

export type EGMStatus = 'pending' | 'requested' | 'assigned' | 'vessel_sailed' | 'closed';

export const EGM_VALID_TRANSITIONS: Record<EGMStatus, EGMStatus[]> = {
  pending: ['requested'],
  requested: ['assigned'],
  assigned: ['vessel_sailed'],
  vessel_sailed: ['closed'],
  closed: [],
};

export interface EGM {
  id: string;
  egm_no: string;
  entity_id: string;
  status: EGMStatus;

  vessel_name: string;
  vessel_imo_no: string;
  voyage_no: string;
  shipping_line: string;
  port_of_loading: string;
  port_of_discharge: string;
  scheduled_sailing_date: string;
  actual_sailing_date: string | null;
  scheduled_arrival_date: string;

  related_shipping_bill_ids: string[];

  icegate_requested_at: string | null;
  icegate_assigned_at: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const egmKey = (entityCode: string): string =>
  `erp_${entityCode}_egms`;
