/**
 * @file     tank-flow.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS2 · ST5c
 * @purpose  Volumetric + mass + density inventory type definitions.
 *           Q-LOCK-7 Option A · Hybrid CSV + IoT support.
 */

export interface TankInventory {
  tank_id: string;
  item_id: string;
  current_volume_litres: number;
  current_mass_kg: number;
  current_density_kg_per_litre: number;
  capacity_litres: number;
  fill_pct: number;
  temperature_c: number;
  reading_timestamp: string;
  source: 'manual' | 'iot' | 'csv_upload';
  meter_id?: string;
}

export interface TankFlow {
  id: string;
  entity_id: string;
  from_tank_id: string | null;
  to_tank_id: string | null;
  volume_litres: number;
  mass_kg: number;
  flow_rate_lph: number;
  start_time: string;
  end_time: string;
  batch_id?: string;
  source: 'manual' | 'iot';
  notes: string;
}

export interface EvaporationRecord {
  id: string;
  tank_id: string;
  period_start: string;
  period_end: string;
  expected_loss_pct: number;
  actual_loss_litres: number;
  variance_litres: number;
  accounting_treatment: 'standard_loss' | 'abnormal_loss';
  recorded_at: string;
}

export interface MassBalance {
  batch_id: string;
  total_inflow_kg: number;
  total_outflow_kg: number;
  retained_kg: number;
  loss_kg: number;
  loss_pct: number;
  within_tolerance: boolean;
  tolerance_pct: number;
  computed_at: string;
}

export const tankInventoryKey = (entityCode: string): string =>
  `tank_inventory_${entityCode}`;

export const tankFlowsKey = (entityCode: string): string =>
  `tank_flows_${entityCode}`;

export const evaporationRecordsKey = (entityCode: string): string =>
  `evaporation_records_${entityCode}`;
