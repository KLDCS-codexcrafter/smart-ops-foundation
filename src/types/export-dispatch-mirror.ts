/**
 * @file        src/types/export-dispatch-mirror.ts
 * @purpose     5-leg outbound dispatch mirror · D-284 sibling · multi-leg-git.ts STAYS 0-diff
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q5=a 5-leg outbound · NEW sibling NOT modify multi-leg-git.ts
 */

export type OutboundLegState = 'pending' | 'in_transit' | 'arrived' | 'closed' | 'skipped';

export interface OutboundLeg1_CustomerWarehouseOrigin {
  leg_no: 1;
  state: OutboundLegState;
  facility_name: string;
  factory_address: string;
  dispatch_date: string | null;
  notes: string;
}

export interface OutboundLeg2_OriginPort {
  leg_no: 2;
  state: OutboundLegState;
  port_code: string;
  port_arrival_date: string | null;
  port_dispatch_date: string | null;
  dwell_time_days: number;
  notes: string;
}

export interface OutboundLeg3_Vessel {
  leg_no: 3;
  state: OutboundLegState;
  vessel_name: string;
  vessel_imo_no: string;
  voyage_no: string;
  shipping_line: string;
  sailing_date: string | null;
  arrival_date: string | null;
  notes: string;
}

export interface OutboundLeg4_DestinationPort {
  leg_no: 4;
  state: OutboundLegState;
  port_code: string;
  port_arrival_date: string | null;
  customs_clearance_date: string | null;
  dwell_time_days: number;
  notes: string;
}

export interface OutboundLeg5_ForeignBuyerWarehouse {
  leg_no: 5;
  state: OutboundLegState;
  facility_name: string;
  buyer_address: string;
  delivery_date: string | null;
  proof_of_delivery_ref: string;
  notes: string;
}

export type ExportDispatchMirrorState =
  | 'planning' | 'dispatched' | 'arrived_destination' | 'delivered' | 'cancelled';

export interface ExportDispatchMirror {
  id: string;
  dispatch_mirror_no: string;
  entity_id: string;
  related_export_po_id: string;
  overall_state: ExportDispatchMirrorState;

  leg1: OutboundLeg1_CustomerWarehouseOrigin;
  leg2: OutboundLeg2_OriginPort;
  leg3: OutboundLeg3_Vessel;
  leg4: OutboundLeg4_DestinationPort;
  leg5: OutboundLeg5_ForeignBuyerWarehouse;

  origination_date: string;
  delivery_date: string | null;

  created_at: string;
  updated_at: string;
  notes: string;
}

export const exportDispatchMirrorKey = (entityCode: string): string =>
  `erp_${entityCode}_export_dispatch_mirrors`;
