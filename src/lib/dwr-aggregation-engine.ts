/**
 * dwr-aggregation-engine.ts — Daily Work Register real-time rollup (D-581 · Q31=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2
 *
 * [JWT] PUT /api/plant-ops/daily-work-register
 */
import type { JobCard } from '@/types/job-card';
import { jobCardsKey } from '@/types/job-card';
import type { DailyWorkRegisterEntry } from '@/types/daily-work-register';
import { dailyWorkRegisterKey, buildDWREntryId } from '@/types/daily-work-register';
import type { Machine } from '@/types/machine';
import { machinesKey } from '@/types/machine';
import { round2 } from '@/lib/decimal-helpers';

export function rollupDWREntry(jc: JobCard): DailyWorkRegisterEntry | null {
  if (!jc.actual_start) return null;

  const date = jc.actual_start.slice(0, 10);
  const dwrEntryId = buildDWREntryId(date, jc.shift_id, jc.employee_id, jc.machine_id);

  const allJCs = listJobCardsRaw(jc.entity_id);
  const matchingJCs = allJCs.filter(other =>
    other.actual_start &&
    other.actual_start.slice(0, 10) === date &&
    other.shift_id === jc.shift_id &&
    other.employee_id === jc.employee_id &&
    other.machine_id === jc.machine_id &&
    (other.status === 'completed' || other.status === 'in_progress' || other.status === 'on_hold')
  );

  if (matchingJCs.length === 0) {
    removeDWREntry(jc.entity_id, dwrEntryId);
    return null;
  }

  const machine = loadMachine(jc.entity_id, jc.machine_id);

  let total_planned_qty = 0;
  let total_produced_qty = 0;
  let total_rejected_qty = 0;
  let total_rework_qty = 0;
  let total_wastage_qty = 0;
  let total_scheduled_hours = 0;
  let total_actual_hours = 0;
  let total_labour_cost = 0;
  let total_machine_cost = 0;
  let has_breakdown = false;
  let has_quality_issue = false;
  let has_wastage = false;

  for (const j of matchingJCs) {
    total_planned_qty += j.planned_qty;
    total_produced_qty += j.produced_qty;
    total_rejected_qty += j.rejected_qty;
    total_rework_qty += j.rework_qty;
    total_wastage_qty += j.wastage_qty;

    const schedHours = (new Date(j.scheduled_end).getTime() - new Date(j.scheduled_start).getTime()) / (1000 * 60 * 60);
    total_scheduled_hours += schedHours;

    if (j.actual_start && j.actual_end) {
      const actHours = (new Date(j.actual_end).getTime() - new Date(j.actual_start).getTime()) / (1000 * 60 * 60);
      total_actual_hours += actHours;
    } else if (j.actual_start) {
      const actHours = (Date.now() - new Date(j.actual_start).getTime()) / (1000 * 60 * 60);
      total_actual_hours += actHours;
    }

    total_labour_cost += j.labour_cost;
    total_machine_cost += j.machine_cost;

    if (j.status === 'on_hold' || j.breakdown_notes) has_breakdown = true;
    if (j.rejected_qty > 0) has_quality_issue = true;
    if (j.wastage_qty > 0) has_wastage = true;
  }

  const total_cost = round2(total_labour_cost + total_machine_cost);
  const total_idle_hours = round2(Math.max(0, total_scheduled_hours - total_actual_hours));

  const yield_pct = total_produced_qty > 0
    ? round2(((total_produced_qty - total_rejected_qty) / total_produced_qty) * 100)
    : 0;
  const efficiency_pct = total_actual_hours > 0 && total_planned_qty > 0
    ? round2((total_produced_qty / total_planned_qty) * 100)
    : 0;

  const entry: DailyWorkRegisterEntry = {
    id: dwrEntryId,
    entity_id: jc.entity_id,
    factory_id: jc.factory_id,

    date,
    shift_id: jc.shift_id,
    shift_name: jc.shift_name,
    employee_id: jc.employee_id,
    employee_name: jc.employee_name,
    employee_code: jc.employee_code,
    machine_id: jc.machine_id,
    machine_name: machine?.name ?? '',
    machine_code: machine?.code ?? '',
    work_center_id: machine?.work_center_id ?? jc.work_center_id,

    job_card_ids: matchingJCs.map(j => j.id),
    job_card_count: matchingJCs.length,

    total_planned_qty: round2(total_planned_qty),
    total_produced_qty: round2(total_produced_qty),
    total_rejected_qty: round2(total_rejected_qty),
    total_rework_qty: round2(total_rework_qty),
    total_wastage_qty: round2(total_wastage_qty),

    total_scheduled_hours: round2(total_scheduled_hours),
    total_actual_hours: round2(total_actual_hours),
    total_idle_hours,

    yield_pct,
    efficiency_pct,

    total_labour_cost: round2(total_labour_cost),
    total_machine_cost: round2(total_machine_cost),
    total_cost,

    has_breakdown,
    has_quality_issue,
    has_wastage,

    computed_at: new Date().toISOString(),
    computed_by: 'system',
  };

  persistDWREntry(jc.entity_id, entry);
  return entry;
}

export function listDWREntries(entityCode: string): DailyWorkRegisterEntry[] {
  try {
    // [JWT] GET /api/plant-ops/daily-work-register?entityCode={entityCode}
    const raw = localStorage.getItem(dailyWorkRegisterKey(entityCode));
    return raw ? (JSON.parse(raw) as DailyWorkRegisterEntry[]) : [];
  } catch { return []; }
}

function listJobCardsRaw(entityCode: string): JobCard[] {
  try {
    const raw = localStorage.getItem(jobCardsKey(entityCode));
    return raw ? (JSON.parse(raw) as JobCard[]) : [];
  } catch { return []; }
}

function loadMachine(entityCode: string, machineId: string): Machine | null {
  try {
    const raw = localStorage.getItem(machinesKey(entityCode));
    if (!raw) return null;
    const all = JSON.parse(raw) as Machine[];
    return all.find(m => m.id === machineId) ?? null;
  } catch { return null; }
}

function persistDWREntry(entityCode: string, entry: DailyWorkRegisterEntry): void {
  const all = listDWREntries(entityCode);
  const idx = all.findIndex(e => e.id === entry.id);
  if (idx >= 0) all[idx] = entry; else all.push(entry);
  // [JWT] PUT /api/plant-ops/daily-work-register
  localStorage.setItem(dailyWorkRegisterKey(entityCode), JSON.stringify(all));
}

function removeDWREntry(entityCode: string, entryId: string): void {
  const all = listDWREntries(entityCode);
  const filtered = all.filter(e => e.id !== entryId);
  if (filtered.length !== all.length) {
    // [JWT] DELETE /api/plant-ops/daily-work-register/:id
    localStorage.setItem(dailyWorkRegisterKey(entityCode), JSON.stringify(filtered));
  }
}
