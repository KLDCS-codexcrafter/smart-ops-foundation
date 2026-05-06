/**
 * work-center.ts — Work Center Master (Q21=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1 · D-572
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/work-centers
 */

export type WorkCenterType =
  | 'machine_center'
  | 'manual_station'
  | 'inspection_point'
  | 'job_work_external';

export type WorkCenterStatus = 'active' | 'maintenance' | 'breakdown' | 'inactive';

export interface WorkCenter {
  id: string;
  entity_id: string;
  factory_id: string;
  code: string;
  name: string;
  type: WorkCenterType;

  capacity_hours_per_shift: number;
  setup_time_minutes: number;
  efficiency_pct: number;

  hourly_run_cost: number;
  hourly_idle_cost: number;

  department_id: string | null;
  parent_work_center_id: string | null;

  current_status: WorkCenterStatus;
  last_breakdown_at: string | null;
  next_maintenance_due: string | null;

  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const workCentersKey = (entityCode: string): string =>
  `erp_work_centers_${entityCode}`;
