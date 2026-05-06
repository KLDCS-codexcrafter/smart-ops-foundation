/**
 * qa-inspection-production-bridge.test.ts — Sprint 3b-pre-1 · Block I · D-623
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveQCParameters,
  createQaInspectionFromPO,
  createQaInspectionFromJC,
} from '@/lib/qa-inspection-production-bridge';
import type { ProductionOrder } from '@/types/production-order';
import type { JobCard } from '@/types/job-card';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { QaPlan } from '@/types/qa-plan';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import { qaInspectionKey } from '@/types/qa-inspection';
import { emptyCostStructure } from '@/types/production-cost';

const E = 'E1';

function basePO(over: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: 'po-1', entity_id: E, doc_no: 'MO/T/1',
    bom_id: 'b1', bom_version: 1,
    output_item_id: 'i1', output_item_name: 'Widget', output_item_code: 'W1',
    planned_qty: 100, uom: 'nos',
    start_date: '2026-05-01', target_end_date: '2026-05-10', actual_completion_date: null,
    status: 'completed',
    department_id: 'd1', department_name: 'P',
    source_godown_id: null, wip_godown_id: null, output_godown_id: 'g1',
    reservation_ids: [],
    project_id: null, project_milestone_id: null, project_centre_id: null, reference_project_id: null,
    sales_order_id: null, sales_order_line_mappings: [], sales_plan_id: null,
    customer_id: null, customer_name: null,
    business_unit_id: null, batch_no: null, is_export_project: false,
    production_site_id: 'fac1', nature_of_processing: null, is_job_work_in: false,
    linked_job_work_out_order_ids: [],
    qc_required: true, qc_scenario: 'internal_dept', linked_test_report_ids: [], routed_to_quarantine: false,
    production_plan_id: null, shift_id: null, production_team_id: null,
    export_destination_country: null, export_regulatory_body: null, linked_letter_of_credit_id: null,
    cost_structure: emptyCostStructure(),
    lines: [],
    outputs: [{
      id: 'o1', output_no: 1, output_kind: 'main',
      item_id: 'i1', item_code: 'W1', item_name: 'Widget',
      planned_qty: 100, uom: 'nos',
      bom_id: 'b1', bom_version: 1, batch_no: null,
      qc_required: true, qc_scenario: 'internal_dept', linked_test_report_ids: [],
      output_cost_master: 0, output_cost_budget: 0, output_cost_actual: 0,
      cost_allocation_basis: 'qty', cost_allocation_pct: 100,
      actual_qty: null, yield_pct: null, output_godown_id: 'g1',
    }],
    linked_production_plan_ids: [],
    approval_history: [], status_history: [],
    closed_at: null, closed_by_user_id: null, closed_by_name: null,
    closure_approval: null, closure_remarks: '',
    closed_cost_snapshot: null, closed_variance_id: null,
    notes: '', created_at: '', created_by: '', updated_at: '', updated_by: '',
    ...over,
  };
}

function baseJC(over: Partial<JobCard> = {}): JobCard {
  return {
    id: 'jc1', entity_id: E, doc_no: 'JC/01',
    factory_id: 'fac1', work_center_id: 'wc1', machine_id: 'mac1',
    production_order_id: 'po-1', production_order_no: 'MO/T/1', production_order_line_id: null,
    employee_id: 'em1', employee_name: 'Op', employee_code: 'OP01',
    shift_id: 's1', shift_name: 'Day',
    scheduled_start: '2026-05-01T09:00:00Z', scheduled_end: '2026-05-01T17:00:00Z',
    actual_start: '2026-05-01T09:00:00Z', actual_end: '2026-05-01T17:00:00Z',
    planned_qty: 100, produced_qty: 95, rejected_qty: 5, rework_qty: 0, uom: 'nos',
    wastage_qty: 0, wastage_reason: null, wastage_notes: '',
    labour_cost: 0, machine_cost: 0, total_cost: 0,
    status: 'completed', remarks: '', breakdown_notes: '',
    approval_history: [], status_history: [],
    qc_required: true, qc_scenario: 'internal_dept', linked_test_report_ids: [], routed_to_quarantine: false,
    created_at: '', created_by: '', updated_at: '', updated_by: '',
    ...over,
  };
}

describe('qa-inspection-production-bridge · 3b-pre-1', () => {
  beforeEach(() => { localStorage.removeItem(qaInspectionKey(E)); });

  it('Test 1 · createQaInspectionFromPO · Q44=a synthetic bill_id + canonical production_order_id', () => {
    const r = createQaInspectionFromPO({
      po: basePO(), inspector_user_id: 'u1', inspection_location: 'Floor',
      itemQCParams: [], qaPlans: [],
    });
    expect(r.bill_id).toBe('PROD-PO-po-1');
    expect(r.production_order_id).toBe('po-1');
    expect(r.source_context).toBe('in_process');
    expect(r.qa_no).toMatch(/^QA\/\d{6}\/0001$/);
    expect(r.factory_id).toBe('fac1');
  });

  it('Test 2 · resolveQCParameters · Q46=c smart merge · template + plan + item override', () => {
    const tpl = {
      id: 't1', name: 'T1', industry_segment: 'general', sub_segment: 'x',
      bom_unit: 'nos', tags: [],
      qc_parameters: [{ key: 'visual', label: 'Visual', type: 'pass_fail' }],
    } as unknown as ManufacturingTemplate;
    const params: ItemQCParam[] = [{
      id: 'p1', item_id: 'i1', sl_no: 1, specification: 'Hardness',
      standard: '60 HRC', test_method: null, frequency: null,
      is_critical: true, party_specific: false, party_id: null, party_name: null,
      created_at: '', updated_at: '',
    }];
    const plans: QaPlan[] = [{
      id: 'qp1', code: 'QP/001', name: 'Vendor Plan', plan_type: 'incoming',
      item_id: 'i1', item_name: 'W', spec_id: 's1', acceptance_criteria_id: null,
      vendor_id: null, vendor_name: null, customer_id: null, customer_name: null,
      status: 'active', applicable_voucher_kinds: [], notes: '',
      entity_id: E, created_at: '', updated_at: '',
    }];
    const result = resolveQCParameters({ itemId: 'i1', template: tpl, itemQCParams: params, qaPlans: plans });
    expect(result.length).toBe(3);
    expect(result.find(r => r.source === 'template')).toBeDefined();
    expect(result.find(r => r.source === 'qa_plan')).toBeDefined();
    const itemEntry = result.find(r => r.source === 'item_qc_param');
    expect(itemEntry?.is_critical).toBe(true);
    expect(itemEntry?.standard).toBe('60 HRC');
  });

  it('Test 3 · createQaInspectionFromJC · plant context propagated from JC', () => {
    const r = createQaInspectionFromJC({
      jc: baseJC(), po: basePO(),
      inspector_user_id: 'u1', inspection_location: 'Shop',
      itemQCParams: [], qaPlans: [],
    });
    expect(r.factory_id).toBe('fac1');
    expect(r.machine_id).toBe('mac1');
    expect(r.work_center_id).toBe('wc1');
    expect(r.job_card_id).toBe('jc1');
    expect(r.lines[0].qty_inspected).toBe(95);
  });
});
