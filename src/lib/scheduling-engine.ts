/**
 * scheduling-engine.ts — 3-PlantOps-pre-3b · D-608 · Q38=ALL + Q41=c + Q42=c
 *
 * Builds unified Plans + POs Gantt data · click-to-reschedule with smart cascade.
 * Conflict detection · period-mismatch warnings.
 *
 * [JWT] PUT /api/plant-ops/production-orders/:id/reschedule
 */
import type { ProductionPlan } from '@/types/production-plan';
import type { ProductionOrder } from '@/types/production-order';
import type { JobCard } from '@/types/job-card';
import type { Machine } from '@/types/machine';
import type { GanttBar, RescheduleResult } from '@/types/scheduling-snapshot';
import { productionOrdersKey } from '@/types/production-order';

export interface BuildGanttDataInput {
  factory_id: string | null;
  date_from: string;
  date_to: string;
  plans: ProductionPlan[];
  pos: ProductionOrder[];
  job_cards: JobCard[];
  machines: Machine[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-300',
  released: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-success',
  closed: 'bg-slate-500',
  cancelled: 'bg-destructive',
  planned: 'bg-purple-300',
  approved: 'bg-purple-500',
  in_execution: 'bg-purple-600',
};

function poFactoryId(po: ProductionOrder): string {
  return po.production_site_id ?? '';
}

function poMachineId(po: ProductionOrder): string | null {
  return po.production_team_id ?? po.lines[0]?.bom_component_id ?? null;
}

export function buildGanttData(input: BuildGanttDataInput): GanttBar[] {
  const { factory_id, date_from, date_to, plans, pos, job_cards, machines } = input;
  const fromMs = new Date(date_from).getTime();
  const toMs = new Date(date_to).getTime();
  const result: GanttBar[] = [];

  for (const plan of plans) {
    const startMs = new Date(plan.plan_period_start).getTime();
    const endMs = new Date(plan.plan_period_end).getTime();
    if (endMs < fromMs || startMs > toMs) continue;

    const linkedPOs = pos.filter(p => p.linked_production_plan_ids?.includes(plan.id));
    const planFactoryId = linkedPOs[0] ? poFactoryId(linkedPOs[0]) : '';
    if (factory_id && planFactoryId && planFactoryId !== factory_id) continue;

    result.push({
      id: `gantt-plan-${plan.id}`,
      type: 'plan',
      source_id: plan.id,
      source_doc_no: plan.doc_no,
      start_ms: Math.max(startMs, fromMs),
      end_ms: Math.min(endMs, toMs),
      duration_days: Math.ceil((endMs - startMs) / 86400000),
      label: `${plan.doc_no} · ${plan.plan_type}`,
      status: plan.status as GanttBar['status'],
      status_color: STATUS_COLORS[plan.status] ?? 'bg-muted',
      machine_id: null,
      machine_label: 'All machines',
      factory_id: planFactoryId,
      linked_po_ids: linkedPOs.map(p => p.id),
      linked_jc_ids: [],
      is_locked: plan.status === 'closed' || plan.status === 'cancelled',
      warnings: [],
    });
  }

  for (const po of pos) {
    const startMs = new Date(po.start_date).getTime();
    const endMs = new Date(po.target_end_date).getTime();
    if (endMs < fromMs || startMs > toMs) continue;
    const fId = poFactoryId(po);
    if (factory_id && fId !== factory_id) continue;

    const machineId = poMachineId(po);
    const machine = machines.find(m => m.id === machineId);
    const linkedJCs = job_cards.filter(jc => jc.production_order_id === po.id).map(jc => jc.id);

    const warnings: string[] = [];
    const conflictPOs = pos.filter(other =>
      other.id !== po.id &&
      poMachineId(other) === machineId &&
      machineId !== null &&
      new Date(other.start_date).getTime() < endMs &&
      new Date(other.target_end_date).getTime() > startMs,
    );
    if (conflictPOs.length > 0) {
      warnings.push(`Overlaps ${conflictPOs.length} other PO(s) on same machine`);
    }

    result.push({
      id: `gantt-po-${po.id}`,
      type: 'production_order',
      source_id: po.id,
      source_doc_no: po.doc_no,
      start_ms: startMs,
      end_ms: endMs,
      duration_days: Math.ceil((endMs - startMs) / 86400000),
      label: `${po.doc_no} · ${po.output_item_code ?? 'multi'}`,
      status: po.status,
      status_color: STATUS_COLORS[po.status] ?? 'bg-muted',
      machine_id: machineId,
      machine_label: machine?.name ?? machineId ?? 'Unassigned',
      factory_id: fId,
      linked_po_ids: [],
      linked_jc_ids: linkedJCs,
      is_locked: po.status === 'completed' || po.status === 'closed' || po.status === 'cancelled',
      warnings,
    });
  }

  return result;
}

export interface RescheduleProductionOrderInput {
  po: ProductionOrder;
  new_start_date: string;
  new_target_end_date: string;
  user: { id: string; name: string };
  reason: string;
  parent_plans: ProductionPlan[];
  pos: ProductionOrder[];
}

export function rescheduleProductionOrder(input: RescheduleProductionOrderInput): RescheduleResult {
  const { po, new_start_date, new_target_end_date, user, reason, parent_plans, pos } = input;
  const warnings: string[] = [];
  const conflicts: string[] = [];

  if (po.status === 'completed' || po.status === 'closed' || po.status === 'cancelled') {
    return { success: false, cascaded: false, affected_ids: [], conflicts: [], warnings: [`PO is ${po.status} · cannot reschedule`], audit_event_id: '' };
  }

  if (new Date(new_target_end_date) <= new Date(new_start_date)) {
    return { success: false, cascaded: false, affected_ids: [], conflicts: [], warnings: ['target_end_date must be after start_date'], audit_event_id: '' };
  }

  if (po.linked_production_plan_ids?.length > 0) {
    for (const planId of po.linked_production_plan_ids) {
      const plan = parent_plans.find(p => p.id === planId);
      if (!plan) continue;
      const planStart = new Date(plan.plan_period_start).getTime();
      const planEnd = new Date(plan.plan_period_end).getTime();
      const newStart = new Date(new_start_date).getTime();
      const newEnd = new Date(new_target_end_date).getTime();
      if (newStart < planStart || newEnd > planEnd) {
        warnings.push(`PO outside Plan ${plan.doc_no} period (${plan.plan_period_start} → ${plan.plan_period_end})`);
      }
    }
  }

  const machineId = poMachineId(po);
  if (machineId) {
    const overlapping = pos.filter(other =>
      other.id !== po.id &&
      poMachineId(other) === machineId &&
      new Date(other.start_date).getTime() < new Date(new_target_end_date).getTime() &&
      new Date(other.target_end_date).getTime() > new Date(new_start_date).getTime(),
    );
    for (const other of overlapping) {
      conflicts.push(`Overlaps ${other.doc_no} (${other.start_date} → ${other.target_end_date})`);
    }
  }

  const auditEventId = `pose-${Date.now()}`;
  const updated: ProductionOrder = {
    ...po,
    start_date: new_start_date,
    target_end_date: new_target_end_date,
    status_history: [...po.status_history, {
      id: auditEventId,
      from_status: po.status,
      to_status: po.status,
      changed_by_id: user.id,
      changed_by_name: user.name,
      changed_at: new Date().toISOString(),
      note: `Rescheduled · ${reason} · ${po.start_date} → ${new_start_date}`,
    }],
    updated_at: new Date().toISOString(),
    updated_by: user.name,
  };

  persistProductionOrder(updated);

  return {
    success: true,
    cascaded: false,
    affected_ids: [po.id],
    conflicts,
    warnings,
    audit_event_id: auditEventId,
  };
}

export interface ReschedulePlanInput {
  plan: ProductionPlan;
  new_period_start: string;
  new_period_end: string;
  cascade_to_pos: boolean;
  user: { id: string; name: string };
  reason: string;
  child_pos: ProductionOrder[];
  all_pos: ProductionOrder[];
  parent_plans: ProductionPlan[];
}

export function reschedulePlan(input: ReschedulePlanInput): RescheduleResult {
  const { plan, new_period_start, new_period_end, cascade_to_pos, user, reason, child_pos, all_pos, parent_plans } = input;
  const warnings: string[] = [];
  const conflicts: string[] = [];
  const affected: string[] = [plan.id];

  if (plan.status === 'closed' || plan.status === 'cancelled') {
    return { success: false, cascaded: false, affected_ids: [], conflicts: [], warnings: [`Plan is ${plan.status} · cannot reschedule`], audit_event_id: '' };
  }
  if (new Date(new_period_end) <= new Date(new_period_start)) {
    return { success: false, cascaded: false, affected_ids: [], conflicts: [], warnings: ['period_end must be after period_start'], audit_event_id: '' };
  }

  if (cascade_to_pos) {
    for (const cp of child_pos) {
      const r = rescheduleProductionOrder({
        po: cp,
        new_start_date: new_period_start,
        new_target_end_date: new_period_end,
        user, reason: `Cascade from Plan ${plan.doc_no}: ${reason}`,
        parent_plans, pos: all_pos,
      });
      if (r.success) affected.push(...r.affected_ids);
      warnings.push(...r.warnings);
      conflicts.push(...r.conflicts);
    }
  }

  return {
    success: true,
    cascaded: cascade_to_pos,
    affected_ids: affected,
    conflicts,
    warnings,
    audit_event_id: `plne-${Date.now()}`,
  };
}

function persistProductionOrder(po: ProductionOrder): void {
  try {
    // [JWT] PUT /api/plant-ops/production-orders/:id
    const key = productionOrdersKey(po.entity_id);
    const all = JSON.parse(localStorage.getItem(key) || '[]') as ProductionOrder[];
    const idx = all.findIndex(p => p.id === po.id);
    if (idx >= 0) all[idx] = po; else all.push(po);
    localStorage.setItem(key, JSON.stringify(all));
  } catch { /* silent */ }
}
