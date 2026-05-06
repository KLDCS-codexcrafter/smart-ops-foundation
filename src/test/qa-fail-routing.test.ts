/**
 * qa-fail-routing.test.ts — Sprint 3b-pre-1 · Block I · D-623 · Q47=c
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyFailRouting } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { ProductionOrder } from '@/types/production-order';
import type { ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { DEFAULT_PRODUCTION_CONFIG } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { emptyCostStructure } from '@/types/production-cost';

const E = 'E1';
const POKEY = `erp_production_orders_${E}`;

function seedPO(): ProductionOrder {
  const po: ProductionOrder = {
    id: 'po-fr-1', entity_id: E, doc_no: 'MO/FR/1',
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
  localStorage.setItem(POKEY, JSON.stringify([po]));
  return po;
}

function failedInspection(): QaInspectionRecord {
  return {
    id: 'qa-1', qa_no: 'QA/202605/0001',
    bill_id: 'PROD-PO-po-fr-1', bill_no: 'MO/FR/1', git_id: null,
    po_id: '', po_no: '', entity_id: E, branch_id: null,
    inspector_user_id: 'u1', inspection_date: '2026-05-05', inspection_location: 'F',
    lines: [{
      id: 'l1', bill_line_id: 'x', item_id: 'i1', item_name: 'X',
      qty_inspected: 10, qty_passed: 0, qty_failed: 10,
      failure_reason: 'fail', inspection_parameters: {},
    }],
    status: 'failed', notes: '',
    created_at: '', updated_at: '',
    source_context: 'in_process',
    production_order_id: 'po-fr-1', production_order_no: 'MO/FR/1',
    production_confirmation_id: null, material_issue_id: null, job_card_id: null,
    factory_id: null, machine_id: null, work_center_id: null,
  };
}

const cfg = (rule: ProductionConfig['qcFailureRoutingRule']): ProductionConfig =>
  ({ ...DEFAULT_PRODUCTION_CONFIG, qcFailureRoutingRule: rule });

const user = { id: 'u1', name: 'U' };

describe('qa fail routing · Q47=c · 3b-pre-1', () => {
  beforeEach(() => { localStorage.removeItem(POKEY); });

  it('Test 4 · block_dispatch · sets routed_to_quarantine=true', () => {
    seedPO();
    const r = applyFailRouting(failedInspection(), cfg('block_dispatch'), user);
    expect(r.routing_action).toBe('quarantine');
    const stored = JSON.parse(localStorage.getItem(POKEY) || '[]') as ProductionOrder[];
    expect(stored[0].routed_to_quarantine).toBe(true);
  });

  it('Test 5 · allow_with_concession · adds audit event · no quarantine', () => {
    seedPO();
    const r = applyFailRouting(failedInspection(), cfg('allow_with_concession'), user);
    expect(r.routing_action).toBe('concession');
    const stored = JSON.parse(localStorage.getItem(POKEY) || '[]') as ProductionOrder[];
    expect(stored[0].routed_to_quarantine).toBe(false);
    expect(stored[0].status_history.length).toBe(1);
    expect(stored[0].status_history[0].note).toContain('concession');
  });

  it('Test 6 · manual_review · warning only · no PO mutation', () => {
    seedPO();
    const before = JSON.parse(localStorage.getItem(POKEY) || '[]') as ProductionOrder[];
    const r = applyFailRouting(failedInspection(), cfg('manual_review'), user);
    expect(r.routing_action).toBe('manual_review');
    const after = JSON.parse(localStorage.getItem(POKEY) || '[]') as ProductionOrder[];
    expect(after[0].routed_to_quarantine).toBe(before[0].routed_to_quarantine);
    expect(after[0].status_history.length).toBe(0);
  });
});
