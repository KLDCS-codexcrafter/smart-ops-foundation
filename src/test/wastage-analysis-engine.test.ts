/**
 * wastage-analysis-engine.test.ts — 3-PlantOps-pre-3b · D-613
 */
import { describe, it, expect } from 'vitest';
import { buildWastageSourceRows, aggregateWastage } from '@/lib/wastage-analysis-engine';
import type { JobCard } from '@/types/job-card';
import type { Machine } from '@/types/machine';

function mkJC(over: Partial<JobCard>): JobCard {
  return {
    id: 'jc1', entity_id: 'e1', doc_no: 'JC/01',
    factory_id: 'f1', work_center_id: 'wc1', machine_id: 'm1',
    production_order_id: 'po1', production_order_no: 'MO/01', production_order_line_id: null,
    employee_id: 'em1', employee_name: 'Op', employee_code: 'OP01',
    shift_id: 's1', shift_name: 'Day',
    scheduled_start: '2026-05-01T09:00:00Z', scheduled_end: '2026-05-01T17:00:00Z',
    actual_start: '2026-05-01T09:00:00Z', actual_end: '2026-05-01T17:00:00Z',
    planned_qty: 100, produced_qty: 100, rejected_qty: 0, rework_qty: 0, uom: 'pcs',
    wastage_qty: 0, wastage_reason: null, wastage_notes: '',
    labour_cost: 0, machine_cost: 0, total_cost: 0,
    status: 'completed', remarks: '', breakdown_notes: '',
    approval_history: [], status_history: [],
    qc_required: false, qc_scenario: null, linked_test_report_ids: [], routed_to_quarantine: false,
    created_at: '', created_by: '', updated_at: '', updated_by: '',
    ...over,
  };
}

const machine: Machine = {
  id: 'm1', entity_id: 'e1', factory_id: 'f1', work_center_id: 'wc1',
  code: 'M1', name: 'Lathe', asset_tag: '',
  manufacturer: '', model: '', serial_number: '', year_of_make: 2020,
  capabilities: [], rated_capacity_per_hour: 50, rated_capacity_uom: 'pcs',
  setup_time_minutes: 0, current_status: 'running', current_operator_employee_id: null,
  last_maintenance_at: null, next_maintenance_due: null, maintenance_interval_hours: 0,
  hourly_run_cost: 80, power_kw: 10, notes: '',
  created_at: '', created_by: '', updated_at: '', updated_by: '',
};

describe('wastage-analysis-engine · 3-PlantOps-pre-3b', () => {
  it('Test 1 · maps existing JC.wastage_reason deterministically + auto-derives from JC patterns', () => {
    const jcs = [
      mkJC({ id: 'a', wastage_qty: 5, wastage_reason: 'breakdown' }),
      mkJC({ id: 'b', status: 'on_hold', wastage_qty: 0 }),
      mkJC({ id: 'c', planned_qty: 100, produced_qty: 130, wastage_qty: 0 }),
    ];
    const rows = buildWastageSourceRows({ entity_id: 'e1', factory_id: null, job_cards: jcs, dwr_entries: [], machines: [machine] });
    expect(rows.find(r => r.source_jc_id === 'a')?.category_12).toBe('equipment_failure');
    expect(rows.find(r => r.source_jc_id === 'b' && r.category_12 === 'waiting')).toBeTruthy();
    expect(rows.find(r => r.source_jc_id === 'c' && r.category_12 === 'over_production')).toBeTruthy();
  });

  it('Test 2 · 6_reason · Pareto-sorted with cumulative_pct', () => {
    const jcs = [
      mkJC({ id: 'a', wastage_qty: 8, wastage_reason: 'breakdown' }),
      mkJC({ id: 'b', wastage_qty: 2, wastage_reason: 'setup' }),
    ];
    const rows = buildWastageSourceRows({ entity_id: 'e1', factory_id: null, job_cards: jcs, dwr_entries: [], machines: [machine] });
    const agg = aggregateWastage(rows, '6_reason');
    expect(agg[0].group_key).toBe('breakdown');
    expect(agg[0].cumulative_pct).toBe(80);
    expect(agg[1].cumulative_pct).toBe(100);
  });

  it('Test 3 · 12_category · superset includes Lean 6BL + TIM WOODS auto-derived', () => {
    const jcs = [
      mkJC({ id: 'a', wastage_qty: 3, wastage_reason: 'quality_failure' }),
      mkJC({ id: 'b', planned_qty: 100, produced_qty: 130 }),
    ];
    const rows = buildWastageSourceRows({ entity_id: 'e1', factory_id: null, job_cards: jcs, dwr_entries: [], machines: [machine] });
    const agg = aggregateWastage(rows, '12_category');
    const keys = agg.map(r => r.group_key);
    expect(keys).toContain('process_defects');
    expect(keys).toContain('over_production');
  });
});
