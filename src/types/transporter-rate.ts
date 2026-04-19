/**
 * transporter-rate.ts — Multi-dimensional transporter rate card
 * Reference: OM Logistics Ltd quotation pattern
 * Sprint 15a ships STRUCTURE. Rate calculation engine matures in Sprint 15c.
 * [JWT] GET /api/masters/transporter-rate-cards
 */

export type TransportMode = 'surface' | 'train' | 'air';

export type ZoneCode =
  | 'NORTH_I' | 'NORTH_II' | 'CENTRAL'
  | 'WEST_I' | 'WEST_II'
  | 'SOUTH_I' | 'SOUTH_II'
  | 'EAST' | 'NORTH_EAST' | 'KERALA' | 'J_AND_K';

export interface ZoneDefinition {
  zone: ZoneCode;
  label: string;
  states: string[];
}

export interface ZoneRate {
  zone: ZoneCode;
  mode: TransportMode;
  rate_per_kg: number;
  transit_days_min: number;
  transit_days_max: number;
}

export interface CollectionDeliveryCharge {
  min_weight_kg: number;
  max_weight_kg: number;
  collection_charge: number;
  delivery_charge: number;
}

export interface ODACharge {
  min_weight_kg: number;
  max_weight_kg: number;
  distance_20_50_km: number;
  distance_51_100_km: number;
  distance_101_150_km: number;
  distance_gt_150_km: number;
}

export interface FuelEscalation {
  base_fuel_price: number;
  current_fuel_price: number;
  ratio_numerator: number;
  ratio_denominator: number;
}

export interface Surcharges {
  statistical_flat: number;
  fuel_pct_of_basic: number;
  fov_pct_of_invoice: number;
  cod_flat_if_applicable: number;
  demurrage_free_days: number;
  demurrage_per_kg_per_day: number;
}

export interface MinimumChargeableWeight {
  surface: number;
  train: number;
  air: number;
}

export interface TransporterRateCard {
  id: string;
  logistic_id: string;
  entity_id: string;
  label: string;
  effective_from: string;
  effective_to: string | null;
  zone_definitions: ZoneDefinition[];
  zone_rates: ZoneRate[];
  collection_delivery: CollectionDeliveryCharge[];
  oda_grid: ODACharge[];
  minimum_chargeable: MinimumChargeableWeight;
  volumetric_divisor: number;
  surcharges: Surcharges;
  fuel_escalation: FuelEscalation;
  annual_hike_pct: number;
  contract_start: string;
  contract_end: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const transporterRateCardsKey = (e: string) => `erp_transporter_rate_cards_${e}`;

export const DEFAULT_ZONE_DEFINITIONS: ZoneDefinition[] = [
  { zone: 'NORTH_I',    label: 'NORTH-I',    states: ['Delhi', 'Haryana'] },
  { zone: 'NORTH_II',   label: 'NORTH-II',   states: ['Rajasthan', 'Punjab', 'Uttar Pradesh', 'Himachal Pradesh', 'Uttarakhand'] },
  { zone: 'CENTRAL',    label: 'CENTRAL',    states: ['Madhya Pradesh', 'Chhattisgarh'] },
  { zone: 'WEST_I',     label: 'WEST-I',     states: ['Maharashtra'] },
  { zone: 'WEST_II',    label: 'WEST-II',    states: ['Gujarat', 'Goa'] },
  { zone: 'SOUTH_I',    label: 'SOUTH-I',    states: ['Andhra Pradesh', 'Karnataka', 'Telangana'] },
  { zone: 'SOUTH_II',   label: 'SOUTH-II',   states: ['Tamil Nadu', 'Puducherry'] },
  { zone: 'EAST',       label: 'EAST',       states: ['Bihar', 'West Bengal', 'Odisha', 'Jharkhand'] },
  { zone: 'NORTH_EAST', label: 'NORTH-EAST', states: ['Assam', 'Meghalaya', 'Tripura', 'Manipur', 'Mizoram', 'Nagaland', 'Arunachal Pradesh'] },
  { zone: 'KERALA',     label: 'KERALA',     states: ['Kerala'] },
  { zone: 'J_AND_K',    label: 'J&K',        states: ['Jammu and Kashmir', 'Ladakh'] },
];
