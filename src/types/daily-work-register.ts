/**
 * daily-work-register.ts — DWR · Q24=a 3-tuple aggregation (D-579)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2
 *
 * Each entry is a unique combo of (date × shift × employee × machine).
 * Multiple Job Cards roll up into one DWR entry in real-time (Q31=a).
 *
 * [JWT] GET /api/plant-ops/daily-work-register
 */

export interface DailyWorkRegisterEntry {
  id: string;
  entity_id: string;
  factory_id: string;

  date: string;
  shift_id: string;
  shift_name: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  machine_id: string;
  machine_name: string;
  machine_code: string;
  work_center_id: string;

  job_card_ids: string[];
  job_card_count: number;

  total_planned_qty: number;
  total_produced_qty: number;
  total_rejected_qty: number;
  total_rework_qty: number;
  total_wastage_qty: number;

  total_scheduled_hours: number;
  total_actual_hours: number;
  total_idle_hours: number;

  yield_pct: number;
  efficiency_pct: number;

  total_labour_cost: number;
  total_machine_cost: number;
  total_cost: number;

  has_breakdown: boolean;
  has_quality_issue: boolean;
  has_wastage: boolean;

  computed_at: string;
  computed_by: string;
}

export const dailyWorkRegisterKey = (entityCode: string): string =>
  `erp_daily_work_register_${entityCode}`;

export function buildDWREntryId(
  date: string,
  shiftId: string,
  employeeId: string,
  machineId: string,
): string {
  return `dwr-${date}-${shiftId}-${employeeId}-${machineId}`;
}
