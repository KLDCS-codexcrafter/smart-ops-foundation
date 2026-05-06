/**
 * @file     demo-production-workflow-data.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block M · demo seed for new transaction types
 * @purpose  One-row demo per type so registers (Phase 2) and panels render with
 *           realistic data for SMRT entity. Idempotent · entity-scoped.
 */
import type { MaterialIssueNote } from '@/types/material-issue-note';
import type { ProductionConfirmation } from '@/types/production-confirmation';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';
import type { JobWorkReceipt } from '@/types/job-work-receipt';

const ts = '2026-05-12T10:00:00.000Z';

export function getDemoMaterialIssues(entityCode: string): MaterialIssueNote[] {
  return [{
    id: `min-demo-${entityCode}-0001`,
    entity_id: entityCode,
    doc_no: 'MIN/25-26/0001',
    status: 'issued',
    issue_date: '2026-05-12',
    production_order_id: 'po-demo-MO/2526/0001',
    production_order_no: 'MO/2526/0001',
    department_id: 'd-prod',
    department_name: 'Production',
    issued_by_user_id: 'seed',
    issued_by_name: 'Demo Seed',
    lines: [{
      id: 'min-demo-l1', line_no: 1,
      production_order_line_id: 'pol-demo-1',
      item_id: 'i-demo-rm', item_code: 'RM-001', item_name: 'Pod Substrate',
      required_qty: 100, issued_qty: 100, uom: 'kg',
      source_godown_id: 'g-rm', source_godown_name: 'RM Godown',
      destination_godown_id: 'g-wip', destination_godown_name: 'WIP',
      reservation_id: null, batch_no: 'CHB-2526-001', serial_nos: [], heat_no: null,
      unit_rate: 100, line_value: 10000, remarks: '',
    }],
    total_qty: 100, total_value: 10000,
    approval_history: [],
    status_history: [
      { id: 'mis-1', from_status: null, to_status: 'draft', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Created' },
      { id: 'mis-2', from_status: 'draft', to_status: 'issued', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Issued' },
    ],
    notes: 'Demo MIN', created_at: ts, created_by: 'seed', updated_at: ts, updated_by: 'seed',
  }];
}

export function getDemoProductionConfirmations(entityCode: string): ProductionConfirmation[] {
  return [{
    id: `pc-demo-${entityCode}-0001`,
    entity_id: entityCode,
    doc_no: 'PC/25-26/0001',
    status: 'confirmed',
    confirmation_date: '2026-05-15',
    production_order_id: 'po-demo-MO/2526/0001',
    production_order_no: 'MO/2526/0001',
    department_id: 'd-prod', department_name: 'Production',
    confirmed_by_user_id: 'seed', confirmed_by_name: 'Demo Seed',
    lines: [{
      id: 'pc-demo-l1', line_no: 1, output_index: 0,
      output_item_id: 'i-demo', output_item_code: 'DEMO',
      output_item_name: 'Cherise Buddy Beverage Pod (Pack of 24)',
      planned_qty: 100, actual_qty: 98, uom: 'nos',
      destination_godown_id: 'g-fg', destination_godown_name: 'FG Godown',
      batch_no: 'CHB-2526-001', serial_nos: [], heat_no: null,
      qc_required: true, qc_scenario: 'internal_dept', routed_to_quarantine: false,
      yield_pct: 98, qty_variance: -2, remarks: '',
    }],
    total_actual_qty: 98, total_planned_qty: 100, overall_yield_pct: 98,
    marks_po_complete: false,
    status_history: [
      { id: 'pcs-1', from_status: null, to_status: 'draft', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Created' },
      { id: 'pcs-2', from_status: 'draft', to_status: 'confirmed', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Confirmed' },
    ],
    notes: 'Demo PC', created_at: ts, created_by: 'seed', updated_at: ts, updated_by: 'seed',
  }];
}

export function getDemoJobWorkOutOrders(entityCode: string): JobWorkOutOrder[] {
  return [{
    id: `jwo-demo-${entityCode}-0001`,
    entity_id: entityCode,
    doc_no: 'JWO/25-26/0001',
    status: 'sent',
    jwo_date: '2026-05-12',
    expected_return_date: '2026-05-22',
    vendor_id: 'v-demo-jw', vendor_name: 'Surya Coatings Pvt Ltd', vendor_gstin: '27AABCS1234A1Z5',
    production_order_id: 'po-demo-MO/2526/0002',
    production_order_no: 'MO/2526/0002',
    department_id: 'd-prod', department_name: 'Production',
    raised_by_user_id: 'seed', raised_by_name: 'Demo Seed',
    lines: [{
      id: 'jwo-demo-l1', line_no: 1,
      item_id: 'i-demo-comp', item_code: 'CMP-001', item_name: 'Conveyor Frame', uom: 'nos',
      sent_qty: 25, received_qty: 0,
      source_godown_id: 'g-rm', source_godown_name: 'RM',
      job_work_godown_id: 'g-jw', job_work_godown_name: 'Job Work',
      expected_output_item_id: 'i-demo-comp-coat', expected_output_item_code: 'CMP-001-C',
      expected_output_item_name: 'Conveyor Frame (Coated)',
      expected_output_qty: 25, expected_output_uom: 'nos',
      job_work_rate: 1500, job_work_value: 37500, remarks: 'Powder coating',
    }],
    total_sent_qty: 25, total_received_qty: 0, total_jw_value: 37500,
    itc04_reference: null, itc04_quarter: null,
    approval_history: [],
    status_history: [
      { id: 'jwos-1', from_status: null, to_status: 'draft', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Created' },
      { id: 'jwos-2', from_status: 'draft', to_status: 'sent', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Sent to vendor' },
    ],
    notes: 'Demo JWO', created_at: ts, created_by: 'seed', updated_at: ts, updated_by: 'seed',
  }];
}

export function getDemoJobWorkReceipts(entityCode: string): JobWorkReceipt[] {
  return [{
    id: `jwr-demo-${entityCode}-0001`,
    entity_id: entityCode,
    doc_no: 'JWR/25-26/0001',
    status: 'draft',
    receipt_date: '2026-05-20',
    job_work_out_order_id: `jwo-demo-${entityCode}-0001`,
    job_work_out_order_no: 'JWO/25-26/0001',
    vendor_id: 'v-demo-jw', vendor_name: 'Surya Coatings Pvt Ltd',
    department_id: 'd-prod', department_name: 'Production',
    received_by_user_id: 'seed', received_by_name: 'Demo Seed',
    lines: [{
      id: 'jwr-demo-l1', line_no: 1,
      job_work_out_order_line_id: 'jwo-demo-l1',
      item_id: 'i-demo-comp-coat', item_code: 'CMP-001-C',
      item_name: 'Conveyor Frame (Coated)', uom: 'nos',
      expected_qty: 25, received_qty: 25, rejected_qty: 0,
      destination_godown_id: 'g-fg', destination_godown_name: 'FG Godown',
      qc_required: false, routed_to_quarantine: false,
      batch_no: null, serial_nos: [], remarks: '',
    }],
    total_received_qty: 25, total_rejected_qty: 0,
    marks_jwo_complete: true,
    status_history: [
      { id: 'jwrs-1', from_status: null, to_status: 'draft', changed_by_id: 'seed', changed_by_name: 'Demo Seed', changed_at: ts, note: 'Created' },
    ],
    notes: 'Demo JWR', created_at: ts, created_by: 'seed', updated_at: ts, updated_by: 'seed',
  }];
}
