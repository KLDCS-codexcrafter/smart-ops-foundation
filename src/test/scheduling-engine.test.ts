/**
 * scheduling-engine.test.ts — 3-PlantOps-pre-3b · D-613
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildGanttData, rescheduleProductionOrder } from '@/lib/scheduling-engine';
import type { ProductionOrder } from '@/types/production-order';
import type { ProductionPlan } from '@/types/production-plan';

function mkPO(over: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 'po1', entity_id: 'e1', doc_no: 'MO/01',
    bom_id: 'b1', bom_version: 1,
    output_item_id: 'i1', output_item_name: 'Item', output_item_code: 'I-1',
    planned_qty: 100, uom: 'pcs',
    start_date: '2026-05-01', target_end_date: '2026-05-10', actual_completion_date: null,
    status: 'released',
    department_id: 'd1', department_name: 'Prod',
    source_godown_id: null, wip_godown_id: null, output_godown_id: 'g1',
    reservation_ids: [],
    project_id: null, project_milestone_id: null, project_centre_id: null, reference_project_id: null,
    sales_order_id: null, sales_order_line_mappings: [], sales_plan_id: null,
    customer_id: null, customer_name: null,
    business_unit_id: null, batch_no: null, is_export_project: false,
    production_site_id: 'f1', nature_of_processing: null, is_job_work_in: false,
    linked_job_work_out_order_ids: [],
    qc_required: false, qc_scenario: null, linked_test_report_ids: [], production_plan_id: null,
    shift_id: null, production_team_id: 'm1',
    export_destination_country: null, export_regulatory_body: null, linked_letter_of_credit_id: null,
    cost_structure: { material_cost: 0, labour_cost: 0, machine_cost: 0, overhead_cost: 0, total_cost: 0 } as ProductionOrder['cost_structure'],
    lines: [],
    outputs: [],
    linked_production_plan_ids: [],
    approval_history: [],
    status_history: [],
    closure: null,
    created_at: '', created_by: '', updated_at: '', updated_by: '',
    ...over,
  } as ProductionOrder;
}

function mkPlan(over: Partial<ProductionPlan>): ProductionPlan {
  return {
    id: 'pp1', entity_id: 'e1', doc_no: 'PP/01',
    plan_period_start: '2026-05-01', plan_period_end: '2026-05-31',
    plan_type: 'standalone', status: 'approved',
    source_links: {},
    department_id: 'd1', business_unit_id: null,
    lines: [],
    linked_production_order_ids: [],
    total_planned_qty: 0, total_ordered_qty: 0, total_produced_qty: 0, fulfillment_pct: 0,
    approval_history: [], status_history: [],
    capacity_check_status: 'not_run', capacity_warnings: [],
    capacity_check_run_at: null, capacity_check_details: {},
    notes: '',
    created_at: '', created_by: '', updated_at: '', updated_by: '',
    ...over,
  };
}

beforeEach(() => { localStorage.clear(); });

describe('scheduling-engine · 3-PlantOps-pre-3b', () => {
  it('Test 4 · Q41=c unified Plans + POs Gantt', () => {
    const bars = buildGanttData({
      factory_id: null, date_from: '2026-04-01', date_to: '2026-06-01',
      plans: [mkPlan({})], pos: [mkPO({})], job_cards: [], machines: [],
    });
    expect(bars.find(b => b.type === 'plan')).toBeTruthy();
    expect(bars.find(b => b.type === 'production_order')?.status).toBe('released');
  });

  it('Test 5 · period-mismatch warning when PO falls outside Plan period (Q42=c)', () => {
    const plan = mkPlan({ id: 'pp1' });
    const po = mkPO({ linked_production_plan_ids: ['pp1'] });
    const r = rescheduleProductionOrder({
      po, new_start_date: '2026-06-15', new_target_end_date: '2026-06-20',
      user: { id: 'u1', name: 'U' }, reason: 'test',
      parent_plans: [plan], pos: [po],
    });
    expect(r.success).toBe(true);
    expect(r.warnings.some(w => w.includes('outside Plan'))).toBe(true);
  });

  it('Test 6 · conflict detection · overlapping POs on same machine', () => {
    const a = mkPO({ id: 'a', doc_no: 'MO/A', start_date: '2026-05-01', target_end_date: '2026-05-10' });
    const b = mkPO({ id: 'b', doc_no: 'MO/B', start_date: '2026-05-05', target_end_date: '2026-05-15' });
    const r = rescheduleProductionOrder({
      po: a, new_start_date: '2026-05-08', new_target_end_date: '2026-05-12',
      user: { id: 'u1', name: 'U' }, reason: 'shift',
      parent_plans: [], pos: [a, b],
    });
    expect(r.conflicts.some(c => c.includes('MO/B'))).toBe(true);
  });
});
