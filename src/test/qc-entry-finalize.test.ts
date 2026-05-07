/**
 * @file     qc-entry-finalize.test.ts
 * @sprint   T-Phase-1.3-3b-pre-2 · Block L · D-637 · completeInspection ext + findQuarantineGodown
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { completeInspection, findQuarantineGodown } from '@/lib/qa-inspection-engine';
import { qaInspectionKey, type QaInspectionRecord } from '@/types/qa-inspection';
import type { ProductionOrder } from '@/types/production-order';
import { DEFAULT_PRODUCTION_CONFIG } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { emptyCostStructure } from '@/types/production-cost';
import type { Godown } from '@/types/godown';

const E = 'E1';

function seedInspection(qf: number, qp: number): QaInspectionRecord {
  const rec: QaInspectionRecord = {
    id: 'qa-fz', qa_no: 'QA/FZ/0001',
    bill_id: 'PROD-PO-po-fz-1', bill_no: 'MO/FZ/1', git_id: null,
    po_id: '', po_no: '', entity_id: E, branch_id: null,
    inspector_user_id: 'u1', inspection_date: '2026-05-05', inspection_location: 'F',
    lines: [{
      id: 'l1', bill_line_id: 'x', item_id: 'i1', item_name: 'X',
      qty_inspected: qp + qf, qty_passed: qp, qty_failed: qf,
      failure_reason: qf > 0 ? 'fail' : null, inspection_parameters: {},
    }],
    status: 'in_progress', notes: '',
    created_at: '', updated_at: '',
    source_context: 'in_process',
    production_order_id: 'po-fz-1', production_order_no: 'MO/FZ/1',
  };
  localStorage.setItem(qaInspectionKey(E), JSON.stringify([rec]));
  return rec;
}

function seedPO(): void {
  const po: ProductionOrder = {
    id: 'po-fz-1', entity_id: E, doc_no: 'MO/FZ/1',
    bom_id: 'b1', bom_version: 1,
    output_item_id: 'i1', output_item_name: 'X', output_item_code: 'X',
    planned_qty: 10, uom: 'nos',
    start_date: '2026-05-01', target_end_date: '2026-05-10', actual_completion_date: null,
    status: 'completed',
    department_id: 'd1', department_name: 'P',
    source_godown_id: null, wip_godown_id: null, output_godown_id: 'g1', reservation_ids: [],
    project_id: null, project_milestone_id: null, project_centre_id: null, reference_project_id: null,
    sales_order_id: null, sales_order_line_mappings: [], sales_plan_id: null,
    customer_id: null, customer_name: null,
    business_unit_id: null, batch_no: null, is_export_project: false,
    production_site_id: null, nature_of_processing: null, is_job_work_in: false,
    linked_job_work_out_order_ids: [],
    qc_required: true, qc_scenario: 'internal_dept', linked_test_report_ids: [], routed_to_quarantine: false,
    production_plan_id: null, shift_id: null, production_team_id: null,
    export_destination_country: null, export_regulatory_body: null, linked_letter_of_credit_id: null,
    cost_structure: emptyCostStructure(),
    lines: [], outputs: [], linked_production_plan_ids: [],
    approval_history: [], status_history: [],
    closed_at: null, closed_by_user_id: null, closed_by_name: null,
    closure_approval: null, closure_remarks: '',
    closed_cost_snapshot: null, closed_variance_id: null,
    notes: '', created_at: '', created_by: '', updated_at: '', updated_by: '',
  };
  localStorage.setItem(`erp_production_orders_${E}`, JSON.stringify([po]));
}

describe('completeInspection extended · 3b-pre-2', () => {
  beforeEach(() => {
    localStorage.removeItem(qaInspectionKey(E));
    localStorage.removeItem(`erp_production_orders_${E}`);
    localStorage.removeItem('erp_godowns');
  });

  it('Test 4 · backward-compat · no context arg → uses aggregateStatus', async () => {
    seedInspection(0, 10);                       // all pass
    const r = await completeInspection('qa-fz', E, 'u1');
    expect(r?.status).toBe('passed');
  });

  it('Test 5 · with context · per_param_and FAIL triggers applyFailRouting (Q47=c)', async () => {
    seedInspection(10, 0);                       // all fail
    seedPO();
    const r = await completeInspection('qa-fz', E, 'u1', {
      passFailMode: 'per_param_and',
      productionConfig: { ...DEFAULT_PRODUCTION_CONFIG, qcFailureRoutingRule: 'block_dispatch' },
      itemQCParams: [],
    });
    expect(r?.status).toBe('failed');
    const stored = JSON.parse(localStorage.getItem(`erp_production_orders_${E}`) || '[]') as ProductionOrder[];
    expect(stored[0].routed_to_quarantine).toBe(true);
  });

  it('Test 6 · findQuarantineGodown · returns QC Hold Store from system godowns', () => {
    const godowns: Partial<Godown>[] = [
      { id: 'g-other', code: 'O-MAIN', name: 'Main', department_code: null, is_system_godown: false, status: 'active' },
      { id: 'g-qc', code: 'O-QC-GD', name: 'QC Hold Store', department_code: 'qc', is_system_godown: true, status: 'active' },
    ];
    localStorage.setItem('erp_godowns', JSON.stringify(godowns));
    const found = findQuarantineGodown(E);
    expect(found?.id).toBe('g-qc');
  });
});
