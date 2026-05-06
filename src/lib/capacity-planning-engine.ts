/**
 * capacity-planning-engine.ts — Q34=ALL + Q37=ALL polymorphic · Q25=a runCapacityCheck
 * Sprint T-Phase-1.3-3-PlantOps-pre-3a · D-594
 */
import type { ProductionPlan } from '@/types/production-plan';
import type { ProductionOrder } from '@/types/production-order';
import type { JobCard } from '@/types/job-card';
import type { Machine } from '@/types/machine';
import type { Factory } from '@/types/factory';
import type { Shift } from '@/types/payroll-masters';
import type { Employee } from '@/types/employee';
import type {
  CapacitySnapshotAtomic, CapacityRow, CapacityViewMode,
  CapacityThresholdMode, CapacityRowStatus,
} from '@/types/capacity-snapshot';
import { round2 } from '@/lib/decimal-helpers';

export interface BuildCapacitySnapshotsInput {
  entity_id: string;
  factory_id: string;
  date_from: string;
  date_to: string;
  shifts: Shift[];
  machines: Machine[];
  plans: ProductionPlan[];
  pos: ProductionOrder[];
  job_cards: JobCard[];
  operators: Employee[];
}

export function buildCapacitySnapshots(input: BuildCapacitySnapshotsInput): CapacitySnapshotAtomic[] {
  const result: CapacitySnapshotAtomic[] = [];
  const { entity_id, factory_id, date_from, date_to, shifts, machines, plans, pos, job_cards, operators } = input;

  const dates: string[] = [];
  const start = new Date(date_from);
  const end = new Date(date_to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  const factoryMachines = machines.filter(m => m.factory_id === factory_id);

  for (const date of dates) {
    for (const machine of factoryMachines) {
      for (const shift of shifts) {
        const shiftHours = computeShiftHours(shift);
        const planned = sumPlannedHours(plans, machine.id, date, shift.id);
        const committed = sumCommittedHours(pos, job_cards, machine.id, date, shift.id);
        const requiredOps = countRequiredOperators(machine, planned + committed);
        const availableOps = countAvailableOperators(operators, machine.id);

        result.push({
          id: `cs-${date}-${shift.id}-${machine.id}`,
          entity_id,
          factory_id,
          machine_id: machine.id,
          date,
          shift_id: shift.id,
          shift_hours: shiftHours,
          planned_maintenance_hours: 0,
          available_hours: shiftHours,
          planned_hours: planned,
          committed_hours: committed,
          required_operators: requiredOps,
          available_operators: availableOps,
          source_plan_ids: [],
          source_po_ids: [],
          source_jc_ids: [],
          computed_at: new Date().toISOString(),
        });
      }
    }
  }
  return result;
}

export function aggregateCapacity(
  atomics: CapacitySnapshotAtomic[],
  viewMode: CapacityViewMode,
  thresholdMode: CapacityThresholdMode,
  thresholds: { passPct: number; warnPct: number },
  factoryThresholds?: Map<string, { passPct: number; warnPct: number }>,
): CapacityRow[] {
  const groups = groupByViewMode(atomics, viewMode);
  const rows: CapacityRow[] = [];

  for (const items of groups.values()) {
    if (items.length === 0) continue;
    const sumAvailable = items.reduce((s, a) => s + a.available_hours, 0);
    const sumPlanned = items.reduce((s, a) => s + a.planned_hours, 0);
    const sumCommitted = items.reduce((s, a) => s + a.committed_hours, 0);
    const utilization_pct = sumAvailable > 0 ? round2((sumCommitted / sumAvailable) * 100) : 0;
    const available_pct = sumAvailable > 0 ? round2(((sumAvailable - sumCommitted) / sumAvailable) * 100) : 0;

    const status = computeStatus(
      utilization_pct,
      thresholdMode, thresholds, factoryThresholds, items[0].factory_id,
    );

    rows.push(buildCapacityRow(items[0], viewMode, sumAvailable, sumPlanned, sumCommitted, utilization_pct, available_pct, status, items.length));
  }
  return rows;
}

function computeStatus(
  utilization_pct: number,
  mode: CapacityThresholdMode,
  config_thresholds: { passPct: number; warnPct: number },
  factory_thresholds: Map<string, { passPct: number; warnPct: number }> | undefined,
  factory_id: string,
): CapacityRowStatus {
  let passPct: number;
  let warnPct: number;

  switch (mode) {
    case 'config_pct':
      passPct = config_thresholds.passPct;
      warnPct = config_thresholds.warnPct;
      break;
    case 'hard_absolute':
      passPct = 85;
      warnPct = 100;
      break;
    case 'per_factory': {
      const ft = factory_thresholds?.get(factory_id) ?? config_thresholds;
      passPct = ft.passPct;
      warnPct = ft.warnPct;
      break;
    }
  }

  // Note: passPct < warnPct in 'config_pct' mode (warn=75 means tight at >75%, overbooked at >90)
  // Use min/max to be robust regardless of ordering
  const lo = Math.min(passPct, warnPct);
  const hi = Math.max(passPct, warnPct);
  if (utilization_pct <= lo) return 'available';
  if (utilization_pct <= hi) return 'tight';
  return 'overbooked';
}

export interface RunCapacityCheckResult {
  status: 'pass' | 'warn' | 'fail';
  reason: string;
  warnings: string[];
  details: {
    affected_machines: string[];
    overbooked_dates: string[];
    threshold_mode_used: CapacityThresholdMode;
  };
}

export function runCapacityCheck(
  plan: ProductionPlan,
  context: {
    machines: Machine[];
    shifts: Shift[];
    pos: ProductionOrder[];
    job_cards: JobCard[];
    operators: Employee[];
    productionConfig: {
      capacityThresholdMode: CapacityThresholdMode;
      capacityCheckPassThreshold: number;
      capacityCheckWarnThreshold: number;
    };
    factories: Factory[];
  },
): RunCapacityCheckResult {
  const warnings: string[] = [];
  const affected_machines: string[] = [];
  const overbooked_dates: string[] = [];

  // Phase 1: Plan does not have factory_id directly · use first machine's factory or first factory
  const factory_id = context.factories[0]?.id ?? '';
  if (!factory_id) {
    return {
      status: 'warn',
      reason: 'No factory configured · capacity check inconclusive',
      warnings: ['No factory configured'],
      details: {
        affected_machines: [],
        overbooked_dates: [],
        threshold_mode_used: context.productionConfig.capacityThresholdMode,
      },
    };
  }

  const atomics = buildCapacitySnapshots({
    entity_id: plan.entity_id,
    factory_id,
    date_from: plan.plan_period_start,
    date_to: plan.plan_period_end,
    shifts: context.shifts,
    machines: context.machines,
    plans: [plan],
    pos: context.pos,
    job_cards: context.job_cards,
    operators: context.operators,
  });

  const factoryThresholds = new Map<string, { passPct: number; warnPct: number }>();

  const rows = aggregateCapacity(
    atomics, 'per_day',
    context.productionConfig.capacityThresholdMode,
    {
      passPct: context.productionConfig.capacityCheckPassThreshold,
      warnPct: context.productionConfig.capacityCheckWarnThreshold,
    },
    factoryThresholds,
  );

  for (const row of rows) {
    if (row.status === 'overbooked') {
      affected_machines.push(row.machine_id);
      if (row.date) overbooked_dates.push(row.date);
      warnings.push(`Machine ${row.machine_name} overbooked on ${row.date} · ${row.utilization_pct}% utilization`);
    } else if (row.status === 'tight') {
      warnings.push(`Machine ${row.machine_name} tight on ${row.date} · ${row.utilization_pct}% utilization`);
    }
    if (row.manpower_status === 'short') {
      warnings.push(`Operator shortage on ${row.machine_name} ${row.date} · ${row.required_operators} required vs ${row.available_operators} available`);
    }
  }

  let status: 'pass' | 'warn' | 'fail';
  let reason: string;
  if (overbooked_dates.length > 0) {
    status = 'fail';
    reason = `Capacity overbooked on ${overbooked_dates.length} date(s)`;
  } else if (warnings.length > 0) {
    status = 'warn';
    reason = `${warnings.length} capacity warning(s)`;
  } else {
    status = 'pass';
    reason = 'Capacity available within thresholds';
  }

  return {
    status, reason, warnings,
    details: {
      affected_machines: Array.from(new Set(affected_machines)),
      overbooked_dates: Array.from(new Set(overbooked_dates)),
      threshold_mode_used: context.productionConfig.capacityThresholdMode,
    },
  };
}

// ── Helpers ──

function groupByViewMode(atomics: CapacitySnapshotAtomic[], mode: CapacityViewMode): Map<string, CapacitySnapshotAtomic[]> {
  const groups = new Map<string, CapacitySnapshotAtomic[]>();
  for (const a of atomics) {
    let key: string;
    switch (mode) {
      case 'per_day':   key = `${a.machine_id}_${a.date}`; break;
      case 'per_shift': key = `${a.machine_id}_${a.date}_${a.shift_id}`; break;
      case 'per_week':  key = `${a.machine_id}_${weekStart(a.date)}`; break;
    }
    const existing = groups.get(key) ?? [];
    existing.push(a);
    groups.set(key, existing);
  }
  return groups;
}

function weekStart(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function computeShiftHours(_shift: Shift): number {
  // Phase 1 default · refined per Shift master timing fields in Phase 2
  return 8;
}

function sumPlannedHours(_plans: ProductionPlan[], _machine_id: string, _date: string, _shift_id: string): number {
  // Phase 1: ProductionPlanLine has no machine_id · returns 0 · Phase 2 wires plan→machine
  return 0;
}

function sumCommittedHours(_pos: ProductionOrder[], job_cards: JobCard[], machine_id: string, date: string, shift_id: string): number {
  return job_cards
    .filter(jc => jc.machine_id === machine_id && jc.scheduled_start.slice(0, 10) === date && jc.shift_id === shift_id)
    .reduce((sum, jc) => sum + ((new Date(jc.scheduled_end).getTime() - new Date(jc.scheduled_start).getTime()) / (1000 * 60 * 60)), 0);
}

function countRequiredOperators(_machine: Machine, demand_hours: number): number {
  return demand_hours > 0 ? 1 : 0;
}

function countAvailableOperators(operators: Employee[], machine_id: string): number {
  return operators.filter(e => (e.certified_machine_ids ?? []).includes(machine_id)).length;
}

function buildCapacityRow(
  atomic: CapacitySnapshotAtomic, mode: CapacityViewMode,
  available: number, planned: number, committed: number,
  utilization_pct: number, available_pct: number, status: CapacityRowStatus,
  source_count: number,
): CapacityRow {
  const row: CapacityRow = {
    view_mode: mode,
    machine_id: atomic.machine_id,
    machine_name: atomic.machine_id,
    factory_id: atomic.factory_id,
    available_hours: round2(available),
    planned_hours: round2(planned),
    committed_hours: round2(committed),
    utilization_pct,
    available_pct,
    status,
    required_operators: atomic.required_operators,
    available_operators: atomic.available_operators,
    manpower_status: atomic.required_operators <= atomic.available_operators ? 'ok' : 'short',
    source_count,
  };
  if (mode === 'per_day') row.date = atomic.date;
  if (mode === 'per_shift') { row.date = atomic.date; row.shift_id = atomic.shift_id; }
  if (mode === 'per_week') { row.week_start = weekStart(atomic.date); row.week_label = `Week of ${weekStart(atomic.date)}`; }
  return row;
}
