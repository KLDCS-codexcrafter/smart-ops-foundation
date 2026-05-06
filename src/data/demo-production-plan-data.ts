/**
 * @file     demo-production-plan-data.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block M
 * @purpose  Demo seed for Production Plans (3 entries across plan_types).
 */
import type { ProductionPlan } from '@/types/production-plan';

export function getDemoProductionPlans(entityCode: string): ProductionPlan[] {
  const now = new Date().toISOString();

  const mk = (overrides: Partial<ProductionPlan>): ProductionPlan => ({
    id: `pp-demo-${overrides.doc_no}`,
    entity_id: entityCode,
    doc_no: 'PP/2526/0000',
    plan_period_start: '2026-05-01',
    plan_period_end: '2026-05-31',
    plan_type: 'standalone',
    status: 'approved',
    source_links: {},
    department_id: 'd-prod',
    business_unit_id: null,
    lines: [
      {
        id: `ppl-${overrides.doc_no}-1`,
        line_no: 1,
        item_id: 'i-demo-1',
        item_code: 'DEMO-1',
        item_name: 'Demo Item 1',
        planned_qty: 200,
        uom: 'nos',
        target_date: '2026-05-15',
        suggested_bom_id: null,
        suggested_batch_size: null,
        min_batch_size: null,
        max_batch_size: null,
        is_critical_path: false,
        is_export_line: false,
        ordered_qty: 0,
        produced_qty: 0,
        variance_pct: 0,
        notes: '',
      },
    ],
    linked_production_order_ids: [],
    total_planned_qty: 200,
    total_ordered_qty: 0,
    total_produced_qty: 0,
    fulfillment_pct: 0,
    approval_history: [],
    status_history: [],
    capacity_check_status: 'not_run',
    capacity_warnings: [],
    notes: '',
    created_at: now,
    created_by: 'seed',
    updated_at: now,
    updated_by: 'seed',
    ...overrides,
  });

  return [
    mk({ doc_no: 'PP/2526/0001', plan_type: 'standalone' }),
    mk({ doc_no: 'PP/2526/0002', plan_type: 'sales_order', source_links: { sales_order_ids: ['so-demo-1'] } }),
    mk({ doc_no: 'PP/2526/0003', plan_type: 'project_milestone', source_links: { project_id: 'proj-demo', project_milestone_id: 'm1' } }),
  ];
}
