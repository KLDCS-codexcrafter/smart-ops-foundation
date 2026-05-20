/**
 * @file        src/types/multi-leg-git.ts
 * @purpose     Multi-Leg Goods-in-Transit · 5-leg journey · sibling to Procure360 GitStage1 (D-284 ZERO TOUCH)
 * @who         Import operators · landed cost reconciliation · CCSP/CFS/ICD tracking
 * @when        Phase 1.EX-4 · Multi-Leg GIT foundation · consumed by EX-5 (CI) + EX-6 (BoE)
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @iso         Functional Suitability · Maintainability (ISO 25010)
 * @decisions   EX-4-Q1=b sibling (D-284 ZERO TOUCH) · EX-4-Q2=b 5 legs FIXED · EX-4-Q5=b CCSP at Leg 4 · EX-4-Q6=a two-layer state
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped localStorage
 */
import type { ReconciliationEvent } from './reconciliation-event';
import type { CostAllocationMethod, AllocatedCost } from './cost-allocation';
import type { CFSICDFacility } from './ccsp-cfs-icd';

export type LegState = 'pending' | 'in_transit' | 'arrived' | 'handed_over';

export type MultiLegGITState =
  | 'originating'
  | 'mid_journey'
  | 'final_leg'
  | 'reconciled'
  | 'closed';

export interface Leg1_OriginPort {
  leg_no: 1;
  state: LegState;
  skip_flag: boolean;
  port_code: string;
  vendor_handover_date: string | null;
  port_arrival_date: string | null;
  notes: string;
}

export interface Leg2_Vessel {
  leg_no: 2;
  state: LegState;
  skip_flag: boolean;
  vessel_or_flight_id: string;
  carrier: string;
  bill_of_lading_no: string;
  loaded_date: string | null;
  expected_arrival: string | null;
  actual_arrival: string | null;
  notes: string;
}

export interface Leg3_DestinationPort {
  leg_no: 3;
  state: LegState;
  skip_flag: boolean;
  port_code: string;
  discharge_date: string | null;
  customs_cleared_date: string | null;
  rms_lane: 'green' | 'yellow' | 'red' | null;
  notes: string;
}

export interface Leg4_CFS_or_ICD {
  leg_no: 4;
  state: LegState;
  skip_flag: boolean;
  facility: CFSICDFacility;
  arrival_date: string | null;
  dispatch_date: string | null;
  dwell_time_days: number;
  notes: string;
}

export interface Leg5_CustomerWarehouse {
  leg_no: 5;
  state: LegState;
  skip_flag: boolean;
  warehouse_code: string;
  arrival_date: string | null;
  received_by: string | null;
  notes: string;
}

export interface MultiLegGoodsInTransit {
  id: string;
  mlgit_no: string;
  entity_id: string;
  related_import_po_id: string;
  related_import_po_no: string;

  leg1: Leg1_OriginPort;
  leg2: Leg2_Vessel;
  leg3: Leg3_DestinationPort;
  leg4: Leg4_CFS_or_ICD;
  leg5: Leg5_CustomerWarehouse;

  overall_state: MultiLegGITState;
  origination_date: string;
  closure_date: string | null;

  reconciliation_events: ReconciliationEvent[];
  booked_total_inr: number;
  custom_revalued_total_inr: number;
  actual_landed_total_inr: number;

  allocation_method: CostAllocationMethod;
  allocated_costs: AllocatedCost[];

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const multiLegGITKey = (entityCode: string): string =>
  `erp_${entityCode}_multi_leg_gits`;

export function getAllLegs(mlgit: MultiLegGoodsInTransit): Array<
  Leg1_OriginPort | Leg2_Vessel | Leg3_DestinationPort | Leg4_CFS_or_ICD | Leg5_CustomerWarehouse
> {
  return [mlgit.leg1, mlgit.leg2, mlgit.leg3, mlgit.leg4, mlgit.leg5];
}

export function countActiveLegs(mlgit: MultiLegGoodsInTransit): number {
  return getAllLegs(mlgit).filter((l) => !l.skip_flag).length;
}
