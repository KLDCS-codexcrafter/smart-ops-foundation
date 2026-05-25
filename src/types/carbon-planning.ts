/**
 * @file        src/types/carbon-planning.ts
 * @sprint      T-Phase-3.PROD-5 · Theme B · 39th SIBLING types
 * @purpose     Carbon-aware production planning type system.
 *              Per FR-26 entity-scoped storage · per Q-LOCK-7 A.
 * @moat        MOAT-38 · World-first carbon-aware production planning at SMB price.
 */

export interface CarbonFootprint {
  id: string;
  entity_id: string;
  source_type: 'production_order' | 'job_card' | 'shift' | 'process_batch';
  source_id: string;
  energy_kwh: number;
  grid_emission_factor: number;
  machine_baseline_kg: number;
  material_scope3_kg: number;
  total_kg_co2: number;
  computed_at: string;
  fy: string;
}

export interface CarbonIntensityWindow {
  hour_of_day: number;
  day_type: 'weekday' | 'weekend';
  intensity_kg_per_kwh: number;
  recommendation: 'low' | 'medium' | 'high';
}

export interface GridEmissionFactor {
  region: string;
  baseline_kg_per_kwh: number;
  hourly_variation_pct: number;
  source: string;
  last_updated: string;
}

// FR-26 entity-scoped storage keys
export const carbonFootprintsKey = (entityCode: string): string =>
  `erp_carbon_footprints_${entityCode}`;

export const carbonIntensityKey = (entityCode: string): string =>
  `erp_carbon_intensity_${entityCode}`;

export const gridEmissionFactorKey = (entityCode: string): string =>
  `erp_grid_emission_factor_${entityCode}`;

// CEA 2024 India baseline (kg CO2 / kWh)
export const INDIA_GRID_BASELINE_KG_PER_KWH = 0.82;
