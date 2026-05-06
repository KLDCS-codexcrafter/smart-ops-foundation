/**
 * job-card-engine.ts — Job Card state machine + DWR rollup integration (D-580 · Q30=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2
 *
 * [JWT] POST/PATCH /api/plant-ops/job-cards
 */
import type { JobCard, JobCardStatus, JobCardWastageReason } from '@/types/job-card';
import { jobCardsKey } from '@/types/job-card';
import type { ProductionOrder } from '@/types/production-order';
import type { Employee } from '@/types/employee';
import type { Machine } from '@/types/machine';
import type { Shift } from '@/types/payroll-masters';
import { generateDocNo } from '@/lib/finecore-engine';
import { dMul, round2 } from '@/lib/decimal-helpers';
import { rollupDWREntry } from '@/lib/dwr-aggregation-engine';

export interface CreateJobCardInput {
  entity_id: string;
  factory_id: string;
  work_center_id: string;
  machine: Machine;
  production_order: ProductionOrder;
  production_order_line_id: string | null;
  employee: Employee;
  shift: Shift;
  scheduled_start: string;
  scheduled_end: string;
  planned_qty: number;
  uom: string;
  remarks: string;
  created_by: string;
}

export function createJobCard(input: CreateJobCardInput): JobCard {
  if (input.planned_qty <= 0) throw new Error('planned_qty must be > 0');
  if (new Date(input.scheduled_end) <= new Date(input.scheduled_start)) {
    throw new Error('scheduled_end must be after scheduled_start');
  }

  const isCertified = (input.employee.certified_machine_ids ?? []).includes(input.machine.id);
  if (!isCertified) {
    console.warn(`[job-card-engine] Operator ${input.employee.empCode} not certified on ${input.machine.code}`);
  }
  const skillsMatch = (input.machine.capabilities ?? []).some(
    cap => (input.employee.production_skills ?? []).includes(cap),
  );
  if (!skillsMatch && (input.machine.capabilities ?? []).length > 0) {
    console.warn(`[job-card-engine] Operator skills don't match machine capabilities`);
  }

  const doc_no = generateDocNo('JC', input.entity_id);
  const now = new Date().toISOString();

  const jc: JobCard = {
    id: `jc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,

    factory_id: input.factory_id,
    work_center_id: input.work_center_id,
    machine_id: input.machine.id,

    production_order_id: input.production_order.id,
    production_order_no: input.production_order.doc_no,
    production_order_line_id: input.production_order_line_id,

    employee_id: input.employee.id,
    employee_name: input.employee.displayName,
    employee_code: input.employee.empCode,
    shift_id: input.shift.id,
    shift_name: input.shift.name,

    scheduled_start: input.scheduled_start,
    scheduled_end: input.scheduled_end,
    actual_start: null,
    actual_end: null,

    planned_qty: input.planned_qty,
    produced_qty: 0,
    rejected_qty: 0,
    rework_qty: 0,
    uom: input.uom,

    wastage_qty: 0,
    wastage_reason: null,
    wastage_notes: '',

    labour_cost: 0,
    machine_cost: 0,
    total_cost: 0,

    status: 'planned',
    remarks: input.remarks,
    breakdown_notes: '',

    approval_history: [],
    status_history: [{
      id: `jcs-${Date.now()}`,
      from_status: null,
      to_status: 'planned',
      changed_by_id: input.created_by,
      changed_by_name: input.created_by,
      changed_at: now,
      note: 'Job Card planned',
    }],

    created_at: now,
    created_by: input.created_by,
    updated_at: now,
    updated_by: input.created_by,
  };

  persistJobCard(input.entity_id, jc);
  return jc;
}

export function startJobCard(jc: JobCard, user: { id: string; name: string }): JobCard {
  if (jc.status !== 'planned') throw new Error(`Cannot start JC in '${jc.status}' status`);
  const now = new Date().toISOString();
  const updated: JobCard = {
    ...jc,
    status: 'in_progress',
    actual_start: now,
    status_history: [...jc.status_history, mkEvent('planned', 'in_progress', user, `Operator clocked in at ${now.slice(11, 16)}`)],
    updated_at: now,
    updated_by: user.name,
  };
  persistJobCard(jc.entity_id, updated);
  return updated;
}

export interface CompleteJobCardInput {
  produced_qty: number;
  rejected_qty: number;
  rework_qty: number;
  wastage_qty: number;
  wastage_reason: JobCardWastageReason;
  wastage_notes: string;
  remarks: string;
  employee_hourly_rate: number;
  machine_hourly_rate: number;
}

export function completeJobCard(
  jc: JobCard,
  input: CompleteJobCardInput,
  user: { id: string; name: string },
): JobCard {
  if (jc.status !== 'in_progress') throw new Error(`Cannot complete JC in '${jc.status}' status`);
  if (!jc.actual_start) throw new Error('JC has no actual_start · cannot complete');
  if (input.produced_qty < 0) throw new Error('produced_qty cannot be negative');

  const now = new Date().toISOString();
  const startMs = new Date(jc.actual_start).getTime();
  const endMs = new Date(now).getTime();
  const hours = round2((endMs - startMs) / (1000 * 60 * 60));

  const labour_cost = round2(dMul(hours, input.employee_hourly_rate));
  const machine_cost = round2(dMul(hours, input.machine_hourly_rate));
  const total_cost = round2(labour_cost + machine_cost);

  const updated: JobCard = {
    ...jc,
    status: 'completed',
    actual_end: now,
    produced_qty: input.produced_qty,
    rejected_qty: input.rejected_qty,
    rework_qty: input.rework_qty,
    wastage_qty: input.wastage_qty,
    wastage_reason: input.wastage_reason,
    wastage_notes: input.wastage_notes,
    labour_cost,
    machine_cost,
    total_cost,
    remarks: input.remarks || jc.remarks,
    status_history: [...jc.status_history, mkEvent('in_progress', 'completed', user, `Completed · ${input.produced_qty}/${jc.planned_qty} ${jc.uom} · ${hours}h`)],
    updated_at: now,
    updated_by: user.name,
  };

  persistJobCard(jc.entity_id, updated);
  rollupDWREntry(updated);
  return updated;
}

export function holdJobCard(jc: JobCard, user: { id: string; name: string }, breakdown_notes: string): JobCard {
  if (jc.status !== 'in_progress') throw new Error(`Cannot hold JC in '${jc.status}' status`);
  const now = new Date().toISOString();
  const updated: JobCard = {
    ...jc,
    status: 'on_hold',
    breakdown_notes,
    status_history: [...jc.status_history, mkEvent('in_progress', 'on_hold', user, breakdown_notes)],
    updated_at: now,
    updated_by: user.name,
  };
  persistJobCard(jc.entity_id, updated);
  rollupDWREntry(updated);
  return updated;
}

export function resumeJobCard(jc: JobCard, user: { id: string; name: string }): JobCard {
  if (jc.status !== 'on_hold') throw new Error(`Cannot resume JC in '${jc.status}' status`);
  const now = new Date().toISOString();
  const updated: JobCard = {
    ...jc,
    status: 'in_progress',
    status_history: [...jc.status_history, mkEvent('on_hold', 'in_progress', user, 'Resumed')],
    updated_at: now,
    updated_by: user.name,
  };
  persistJobCard(jc.entity_id, updated);
  return updated;
}

export function cancelJobCard(jc: JobCard, user: { id: string; name: string }, reason: string): JobCard {
  if (jc.status === 'completed') throw new Error('Cannot cancel completed JC');
  const now = new Date().toISOString();
  const updated: JobCard = {
    ...jc,
    status: 'cancelled',
    status_history: [...jc.status_history, mkEvent(jc.status, 'cancelled', user, reason)],
    updated_at: now,
    updated_by: user.name,
  };
  persistJobCard(jc.entity_id, updated);
  return updated;
}

export function listJobCards(entityCode: string): JobCard[] {
  try {
    // [JWT] GET /api/plant-ops/job-cards?entityCode={entityCode}
    const raw = localStorage.getItem(jobCardsKey(entityCode));
    return raw ? (JSON.parse(raw) as JobCard[]) : [];
  } catch { return []; }
}

function persistJobCard(entityCode: string, jc: JobCard): void {
  const all = listJobCards(entityCode);
  const idx = all.findIndex(j => j.id === jc.id);
  if (idx >= 0) all[idx] = jc; else all.push(jc);
  // [JWT] POST/PATCH /api/plant-ops/job-cards
  localStorage.setItem(jobCardsKey(entityCode), JSON.stringify(all));
}

function mkEvent(from: JobCardStatus | null, to: JobCardStatus, user: { id: string; name: string }, note: string) {
  return {
    id: `jcs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from_status: from,
    to_status: to,
    changed_by_id: user.id,
    changed_by_name: user.name,
    changed_at: new Date().toISOString(),
    note,
  };
}
