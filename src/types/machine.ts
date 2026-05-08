/**
 * machine.ts — Machine Master (Q21=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1 · D-573
 *
 * Machine belongs to one WorkCenter · one Factory.
 * capabilities[] drives operator-machine certification matching in 3-PlantOps-pre-2.
 * current_status feeds OEE Availability calculation in 3-PlantOps-pre-3.
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/machines
 */

export type MachineStatus =
  | 'running'
  | 'idle'
  | 'breakdown'
  | 'maintenance'
  | 'decommissioned';

export interface Machine {
  id: string;
  entity_id: string;
  factory_id: string;
  work_center_id: string;
  code: string;
  name: string;
  asset_tag: string;

  // D-NEW-M · Machine ↔ FineCore Fixed Asset link (FR-11 SSOT)
  fixed_asset_id?: string | null;

  manufacturer: string;
  model: string;
  serial_number: string;
  year_of_make: number;

  capabilities: string[];

  rated_capacity_per_hour: number;
  rated_capacity_uom: string;
  setup_time_minutes: number;

  current_status: MachineStatus;
  current_operator_employee_id: string | null;

  last_maintenance_at: string | null;
  next_maintenance_due: string | null;
  maintenance_interval_hours: number;

  hourly_run_cost: number;
  power_kw: number;

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const machinesKey = (entityCode: string): string =>
  `erp_machines_${entityCode}`;
