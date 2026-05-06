/**
 * @file     demo-production-data.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import type { ProductionOrder } from '@/types/production-order';
import { emptyCostStructure } from '@/types/production-cost';

const baseCost = () => {
  const cs = emptyCostStructure();
  cs.master.direct_material = 50000;
  cs.master.total = 50000;
  cs.master.per_unit = 500;
  return cs;
};

export function getDemoProductionData(entityCode: string): ProductionOrder[] {
  const now = new Date().toISOString();
  const mk = (overrides: Partial<ProductionOrder>): ProductionOrder => ({
    id: `po-demo-${overrides.doc_no}`,
    entity_id: entityCode,
    doc_no: 'MO/2526/0000',
    bom_id: 'bom-demo',
    bom_version: 1,
    output_item_id: 'i-demo',
    output_item_name: 'Demo',
    output_item_code: 'DEMO',
    planned_qty: 100,
    uom: 'nos',
    start_date: '2026-05-10',
    target_end_date: '2026-05-20',
    actual_completion_date: null,
    status: 'draft',
    department_id: 'd-prod',
    department_name: 'Production',
    source_godown_id: null,
    wip_godown_id: null,
    output_godown_id: '',
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
    cost_structure: baseCost(),
    lines: [],
    outputs: [],
    linked_production_plan_ids: [],
    approval_history: [],
    status_history: [],
    notes: '',
    created_at: now, created_by: 'seed',
    updated_at: now, updated_by: 'seed',
    ...overrides,
  });

  return [
    mk({ doc_no: 'MO/2526/0001', output_item_name: 'Cherise Buddy Beverage Pod (Pack of 24)', batch_no: 'CHB-2526-001', qc_required: true, qc_scenario: 'internal_dept' }),
    mk({ doc_no: 'MO/2526/0002', output_item_name: 'Conveyor Belt System (Custom 25m)', project_id: 'TKR-001', project_milestone_id: 'M3-Fabrication', qc_required: true, qc_scenario: 'customer_inspection' }),
    mk({ doc_no: 'MO/2526/0003', output_item_name: 'HDPE Bottle 250ml (Unilever co-pack)', customer_id: 'cust-unilever', customer_name: 'Unilever', is_job_work_in: true, is_export_project: true, export_destination_country: 'US', export_regulatory_body: 'FDA', qc_scenario: 'export_oriented' }),
  ];
}
