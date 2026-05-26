/**
 * @file        src/types/vehicle-fa.ts
 * @purpose     Types for vehicle-fa-bridge · 43rd SIBLING · Q-LOCK-5 A
 * @sprint      T-Phase-4.FAR-2 · MOAT-44 (vehicle component) · FAR-CAP-15
 */

export type VehicleUtilizationMetric = 'mileage' | 'engine_hours' | 'days_in_service';

export interface VehicleFAAssetLink {
  vehicle_id: string;
  asset_unit_record_id: string;
  linked_at: string;
  linked_by: { id: string; name: string };
  utilization_metric: VehicleUtilizationMetric;
  current_value: number;
}

export interface VehicleUtilizationRecord {
  id: string;
  vehicle_id: string;
  asset_unit_record_id: string;
  period_start: string;
  period_end: string;
  utilization_value: number;
  gate_pass_event_count: number;
  recorded_at: string;
}

export interface VehicleFAUtilizationSummary {
  vehicle_id: string;
  asset_unit_record_id: string;
  total_utilization: number;
  per_period_average: number;
  gate_pass_events: number;
  last_recorded_at: string | null;
}

// FR-26 entity-scoped storage keys
export const VEHICLE_FA_LINK_KEY = (entityCode: string): string =>
  `vehicle_fa_links_${entityCode}`;
export const VEHICLE_UTILIZATION_KEY = (entityCode: string): string =>
  `vehicle_utilization_records_${entityCode}`;
