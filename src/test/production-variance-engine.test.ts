/**
 * @file     production-variance-engine.test.ts
 * @sprint   T-Phase-1.3-3a-pre-3 · Block L · D-567 · Q8=a
 */
import { describe, it, expect } from 'vitest';
import {
  computeRateVariance, computeEfficiencyVariance, computeYieldVariance,
  computeSubstitutionVariance, computeMixVariance, computeTimingVariance,
  computeProductionVariance,
} from '@/lib/production-variance-engine';
import { emptyCostStructure } from '@/types/production-cost';
import type { ProductionOrder } from '@/types/production-order';
import type { MaterialIssueNote } from '@/types/material-issue-note';
import type { ProductionConfirmation } from '@/types/production-confirmation';

function basePO(overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  const cs = emptyCostStructure();
  cs.master.direct_material = 10000;
  cs.master.total = 12000;
  cs.master.per_unit = 100;
  return {
    id: 'po-1', entity_id: 'E1', doc_no: 'MO/T/1',
    bom_id: 'b1', bom_version: 1,
    output_item_id: 'i1', output_item_name: 'X', output_item_code: 'X',
    planned_qty: 100, uom: 'nos',
    start_date: '2026-04-01', target_end_date: '2026-04-10', actual_completion_date: null,
    status: 'completed',
    department_id: 'd1', department_name: 'P',
    source_godown_id: null, wip_godown_id: null, output_godown_id: 'g1',
    reservation_ids: [],
    project_id: null, project_milestone_id: null, project_centre_id: null, reference_project_id: null,
    sales_order_id: null, sales_order_line_mappings: [], sales_plan_id: null,
    customer_id: null, customer_name: null,
    business_unit_id: null, batch_no: null, is_export_project: false,
    production_site_id: null, nature_of_processing: null, is_job_work_in: false,
    linked_job_work_out_order_ids: [],
    qc_required: false, qc_scenario: null, linked_test_report_ids: [], production_plan_id: null,
    shift_id: null, production_team_id: null,
    export_destination_country: null, export_regulatory_body: null, linked_letter_of_credit_id: null,
    cost_structure: cs,
    lines: [], outputs: [],
    linked_production_plan_ids: [],
    approval_history: [], status_history: [],
    closed_at: null, closed_by_user_id: null, closed_by_name: null,
    closure_approval: null, closure_remarks: '',
    closed_cost_snapshot: null, closed_variance_id: null,
    notes: '', created_at: '2026-04-01', created_by: 'u1',
    updated_at: '2026-04-01', updated_by: 'u1',
    ...overrides,
  };
}

describe('production-variance-engine · 7-way · Q18=a', () => {
  it('Test 1 · Rate variance from MIN unit_rate vs PO original_unit_rate', () => {
    const po = basePO({
      lines: [{
        id: 'pol-1', line_no: 1, bom_component_id: 'bc1',
        item_id: 'i1', item_code: 'RM1', item_name: 'RM1',
        required_qty: 10, issued_qty: 0, uom: 'kg',
        reservation_id: null, batch_no: null, serial_nos: [], heat_no: null,
        original_bom_item_id: 'i1', original_bom_qty: 10,
        is_substituted: false, substitute_reason: null, substitute_item_substitute_id: null,
        substitute_notes: '', substituted_by: null, substituted_at: null,
        original_unit_rate: 100, substituted_unit_rate: 0,
        cost_variance_amount: 0, cost_variance_pct: 0, yield_impact_pct: 0,
      }],
    });
    const min: MaterialIssueNote = {
      id: 'm1', entity_id: 'E1', doc_no: 'MIN/1',
      status: 'issued', issue_date: '2026-04-02',
      production_order_id: 'po-1', production_order_no: 'MO/T/1',
      department_id: 'd1', department_name: 'P',
      issued_by_user_id: 'u1', issued_by_name: 'U1',
      lines: [{
        id: 'ml1', line_no: 1, production_order_line_id: 'pol-1',
        item_id: 'i1', item_code: 'RM1', item_name: 'RM1',
        required_qty: 10, issued_qty: 10, uom: 'kg',
        source_godown_id: 'g1', source_godown_name: 'G1',
        destination_godown_id: 'g2', destination_godown_name: 'G2',
        reservation_id: null, batch_no: null, serial_nos: [], heat_no: null,
        unit_rate: 120, line_value: 1200, remarks: '',
      }],
      total_qty: 10, total_value: 1200,
      approval_history: [], status_history: [],
      notes: '', created_at: '', created_by: '', updated_at: '', updated_by: '',
    };
    const v = computeRateVariance(po, [min], 10);
    expect(v.amount).toBe(200);
    expect(v.is_unfavourable).toBe(true);
  });

  it('Test 2 · Efficiency variance ACTIVATED · returns 0 with no_data when no JCs', () => {
    const v = computeEfficiencyVariance(basePO(), [], 10);
    expect(v.amount).toBe(0);
    expect(v.drilldown_data.status).toBe('no_data');
  });

  it('Test 3 · Yield variance from PC actual vs planned × std_unit_cost', () => {
    const po = basePO();
    const pc: ProductionConfirmation = {
      id: 'pc1', entity_id: 'E1', doc_no: 'PC/1',
      status: 'confirmed', confirmation_date: '2026-04-09',
      production_order_id: 'po-1', production_order_no: 'MO/T/1',
      department_id: 'd1', department_name: 'P',
      confirmed_by_user_id: 'u2', confirmed_by_name: 'U2',
      lines: [{
        id: 'pl1', line_no: 1, output_index: 0,
        output_item_id: 'i1', output_item_code: 'X', output_item_name: 'X',
        planned_qty: 100, actual_qty: 90, uom: 'nos',
        destination_godown_id: 'g1', destination_godown_name: 'G1',
        batch_no: null, serial_nos: [], heat_no: null,
        qc_required: false, qc_scenario: null, routed_to_quarantine: false,
        yield_pct: 90, qty_variance: -10, remarks: '',
      }],
      total_actual_qty: 90, total_planned_qty: 100, overall_yield_pct: 90,
      marks_po_complete: false, status_history: [],
      notes: '', created_at: '', created_by: '', updated_at: '', updated_by: '',
    };
    const v = computeYieldVariance(po, [pc], 10);
    expect(v.amount).toBe(1000);
    expect(v.is_unfavourable).toBe(true);
  });

  it('Test 4 · Substitution variance sums cost_variance_amount on is_substituted lines', () => {
    const po = basePO({
      lines: [{
        id: 'pol-1', line_no: 1, bom_component_id: 'bc',
        item_id: 'i2', item_code: 'SUB1', item_name: 'SUB1',
        required_qty: 5, issued_qty: 5, uom: 'kg',
        reservation_id: null, batch_no: null, serial_nos: [], heat_no: null,
        original_bom_item_id: 'orig-aaa-bbb', original_bom_qty: 5,
        is_substituted: true, substitute_reason: 'cost_optimization',
        substitute_item_substitute_id: 'sub-1', substitute_notes: 'x',
        substituted_by: 'u1', substituted_at: '2026-04-02',
        original_unit_rate: 100, substituted_unit_rate: 110,
        cost_variance_amount: 50, cost_variance_pct: 10, yield_impact_pct: 0,
      }],
    });
    const v = computeSubstitutionVariance(po, 10);
    expect(v.amount).toBe(50);
    expect(v.contributing_factors.length).toBe(1);
  });

  it('Test 5 · Mix variance N/A for single-output PO', () => {
    const po = basePO({ outputs: [{
      id: 'o1', output_no: 1, output_kind: 'main',
      item_id: 'i1', item_code: 'X', item_name: 'X',
      planned_qty: 100, uom: 'nos',
      bom_id: 'b1', bom_version: 1, batch_no: null,
      qc_required: false, qc_scenario: null, linked_test_report_ids: [],
      output_cost_master: 10000, output_cost_budget: 0, output_cost_actual: 0,
      cost_allocation_basis: 'qty', cost_allocation_pct: 100,
      actual_qty: null, yield_pct: null, output_godown_id: 'g1',
    }] });
    const v = computeMixVariance(po, [], 10);
    expect(v.amount).toBe(0);
    expect(v.contributing_factors[0]).toMatch(/Single-output/);
  });

  it('Test 6 · Timing variance: 5 days late × 0.1% holding', () => {
    const po = basePO({ target_end_date: '2026-04-10' });
    const pc: ProductionConfirmation = {
      ...({} as ProductionConfirmation),
      id: 'pc1', confirmation_date: '2026-04-15',
      lines: [], total_actual_qty: 0, total_planned_qty: 0, overall_yield_pct: 0,
    } as ProductionConfirmation;
    const v = computeTimingVariance(po, [pc], 10);
    expect(v.drilldown_data.days_delta).toBe(5);
    expect(v.is_unfavourable).toBe(true);
  });

  it('Test 7 · Aggregator combines 7 components and counts breaches', () => {
    const v = computeProductionVariance({
      po: basePO(), mins: [], pcs: [], jwos: [], jwrs: [], thresholdPct: 10,
    });
    expect(v.rate_variance.type).toBe('rate');
    expect(v.scope_variance.type).toBe('scope');
    expect(typeof v.threshold_breach_count).toBe('number');
    expect(typeof v.total_unfavourable_count).toBe('number');
  });
});
