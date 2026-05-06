/**
 * capacity-snapshot.ts — Capacity Planning data model (Q34=ALL polymorphic · Q39=b)
 * Sprint T-Phase-1.3-3-PlantOps-pre-3a · D-592
 */

export type CapacityViewMode = 'per_day' | 'per_shift' | 'per_week';
export type CapacityThresholdMode = 'config_pct' | 'hard_absolute' | 'per_factory';
export type CapacityRowStatus = 'available' | 'tight' | 'overbooked';

export interface CapacitySnapshotAtomic {
  id: string;
  entity_id: string;
  factory_id: string;
  machine_id: string;
  date: string;
  shift_id: string;
  shift_hours: number;
  planned_maintenance_hours: number;
  available_hours: number;
  planned_hours: number;
  committed_hours: number;
  required_operators: number;
  available_operators: number;
  source_plan_ids: string[];
  source_po_ids: string[];
  source_jc_ids: string[];
  computed_at: string;
}

export interface CapacityRow {
  view_mode: CapacityViewMode;
  date?: string;
  shift_id?: string;
  shift_name?: string;
  week_start?: string;
  week_label?: string;
  machine_id: string;
  machine_name: string;
  factory_id: string;
  available_hours: number;
  planned_hours: number;
  committed_hours: number;
  utilization_pct: number;
  available_pct: number;
  status: CapacityRowStatus;
  required_operators: number;
  available_operators: number;
  manpower_status: 'ok' | 'short';
  source_count: number;
}

export const capacitySnapshotsKey = (entityCode: string): string =>
  `erp_capacity_snapshots_${entityCode}`;
