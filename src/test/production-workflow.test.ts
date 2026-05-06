/**
 * @file     production-workflow.test.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block L · 5 new vitest tests (375 → 380)
 * @purpose  Lifecycle coverage for Material Issue · Production Confirmation ·
 *           Job Work Out · Job Work Receipt engines (Blocks B/D/F/H).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createProductionOrder, releaseProductionOrder, explodeBOM } from '@/lib/production-engine';
import {
  createMaterialIssue, issueMaterialIssue, listMaterialIssues,
} from '@/lib/material-issue-engine';
import {
  createProductionConfirmation, confirmProductionConfirmation,
} from '@/lib/production-confirmation-engine';
import {
  createJobWorkOutOrder, sendJobWorkOutOrder,
} from '@/lib/job-work-out-engine';
import {
  createJobWorkReceipt, confirmJobWorkReceipt,
} from '@/lib/job-work-receipt-engine';
import { productionOrdersKey } from '@/types/production-order';
import { jobWorkOutOrdersKey } from '@/types/job-work-out-order';
import {
  DEFAULT_PRODUCTION_CONFIG,
  DEFAULT_QC_CONFIG,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { Bom } from '@/types/bom';
import type { InventoryItem } from '@/types/inventory-item';
import type { ProductionOrder } from '@/types/production-order';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';

const user = { id: 'u1', name: 'Tester' };

const mockBOM: Bom = {
  id: 'bom1', entity_id: 'e1',
  product_item_id: 'i-out', product_item_code: 'OUT-001', product_item_name: 'Output',
  version_no: 1, output_qty: 1, output_uom: 'nos', valid_from: '2026-01-01', is_active: true,
  components: [
    { id: 'c1', item_id: 'i-rm1', item_code: 'RM-001', item_name: 'RM 1', component_type: 'raw_material', qty: 2, uom: 'kg', wastage_percent: 0 },
  ],
  byproducts: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const mockItems: InventoryItem[] = [
  { id: 'i-rm1', std_cost_rate: 100 } as InventoryItem,
];

const baseInput = {
  entity_id: 'e1', bom_id: 'bom1', output_item_id: 'i-out',
  planned_qty: 10, start_date: '2026-05-10', target_end_date: '2026-05-15',
  department_id: 'd1', created_by: 'u1',
};

function persistPO(po: ProductionOrder): void {
  localStorage.setItem(productionOrdersKey('e1'), JSON.stringify([po]));
}

function persistJWO(jwo: JobWorkOutOrder): void {
  localStorage.setItem(jobWorkOutOrdersKey('e1'), JSON.stringify([jwo]));
}

beforeEach(() => { localStorage.clear(); });

describe('production-workflow · Blocks B/D/F/H', () => {
  it('Material Issue · DRAFT → ISSUED transitions PO released → in_progress and updates issued_qty', () => {
    const draft = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, user);
    const released = releaseProductionOrder(draft, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, user);
    persistPO(released);

    const min = createMaterialIssue({
      entity_id: 'e1', production_order: released,
      issue_date: '2026-05-11', department_id: 'd1', department_name: 'Prod',
      issued_by_user_id: user.id, issued_by_name: user.name,
      lines: released.lines.map(l => ({
        production_order_line_id: l.id, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
        required_qty: l.required_qty, issued_qty: l.required_qty, uom: l.uom,
        source_godown_id: 'g-rm', source_godown_name: 'RM',
        destination_godown_id: 'g-wip', destination_godown_name: 'WIP',
        reservation_id: l.reservation_id, batch_no: null, serial_nos: [], heat_no: null,
        unit_rate: 100, remarks: '',
      })),
      notes: '',
    });
    expect(min.doc_no).toMatch(/^MIN\/\d{2}-\d{2}\/\d{4}$/);
    expect(min.status).toBe('draft');

    const issued = issueMaterialIssue(min, user);
    expect(issued.status).toBe('issued');

    const stored = JSON.parse(localStorage.getItem(productionOrdersKey('e1'))!) as ProductionOrder[];
    expect(stored[0].status).toBe('in_progress');
    expect(stored[0].lines[0].issued_qty).toBe(stored[0].lines[0].required_qty);
    expect(listMaterialIssues('e1').length).toBe(1);
  });

  it('Production Confirmation · auto-completes PO when actual_qty >= planned_qty', () => {
    const draft = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, user);
    const released = releaseProductionOrder(draft, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, user);
    persistPO({ ...released, status: 'in_progress' });

    const pc = createProductionConfirmation({
      entity_id: 'e1', production_order: { ...released, status: 'in_progress' },
      confirmation_date: '2026-05-15', department_id: 'd1', department_name: 'Prod',
      confirmed_by_user_id: user.id, confirmed_by_name: user.name,
      actual_qty: 10,
      destination_godown_id: 'g-fg', destination_godown_name: 'FG',
      batch_no: null, serial_nos: [], heat_no: null,
      remarks: '', notes: '',
    }, DEFAULT_QC_CONFIG);
    expect(pc.doc_no).toMatch(/^PC\/\d{2}-\d{2}\/\d{4}$/);
    expect(pc.marks_po_complete).toBe(true);

    const confirmed = confirmProductionConfirmation(pc, user);
    expect(confirmed.status).toBe('confirmed');

    const stored = JSON.parse(localStorage.getItem(productionOrdersKey('e1'))!) as ProductionOrder[];
    expect(stored[0].status).toBe('completed');
    expect(stored[0].actual_completion_date).toBe('2026-05-15');
  });

  it('Production Confirmation · routes FG to quarantine when QC enabled and qc_required', () => {
    const draft = createProductionOrder({ ...baseInput, qc_required: true }, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, user);
    const released = releaseProductionOrder(draft, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, user);
    persistPO({ ...released, status: 'in_progress' });

    const qcOn = { ...DEFAULT_QC_CONFIG, enableOutgoingInspection: true, quarantineGodownId: 'g-quarantine' };
    const pc = createProductionConfirmation({
      entity_id: 'e1', production_order: { ...released, status: 'in_progress' },
      confirmation_date: '2026-05-15', department_id: 'd1', department_name: 'Prod',
      confirmed_by_user_id: user.id, confirmed_by_name: user.name,
      actual_qty: 10,
      destination_godown_id: 'g-fg', destination_godown_name: 'FG',
      batch_no: null, serial_nos: [], heat_no: null,
      remarks: '', notes: '',
    }, qcOn);
    expect(pc.lines[0].routed_to_quarantine).toBe(true);
    expect(pc.lines[0].destination_godown_id).toBe('g-quarantine');
  });

  it('Job Work Out · DRAFT → SENT appends JWO id to linked PO', () => {
    const draft = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, user);
    const released = releaseProductionOrder(draft, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, user);
    persistPO(released);

    const jwo = createJobWorkOutOrder({
      entity_id: 'e1', jwo_date: '2026-05-12', expected_return_date: '2026-05-20',
      vendor_id: 'v1', vendor_name: 'Acme JW', vendor_gstin: null,
      production_order_id: released.id, production_order_no: released.doc_no,
      department_id: 'd1', department_name: 'Prod',
      raised_by_user_id: user.id, raised_by_name: user.name,
      lines: [{
        item_id: 'i-rm1', item_code: 'RM-001', item_name: 'RM 1', uom: 'kg',
        sent_qty: 20, source_godown_id: 'g-rm', source_godown_name: 'RM',
        job_work_godown_id: 'g-jw', job_work_godown_name: 'Job Work',
        expected_output_item_id: 'i-out', expected_output_item_code: 'OUT-001',
        expected_output_item_name: 'Output', expected_output_qty: 10, expected_output_uom: 'nos',
        job_work_rate: 50, remarks: '',
      }],
      notes: '',
    });
    expect(jwo.doc_no).toMatch(/^JWO\/\d{2}-\d{2}\/\d{4}$/);

    const sent = sendJobWorkOutOrder(jwo, user);
    expect(sent.status).toBe('sent');

    const stored = JSON.parse(localStorage.getItem(productionOrdersKey('e1'))!) as ProductionOrder[];
    expect(stored[0].linked_job_work_out_order_ids).toContain(jwo.id);
  });

  it('Job Work Receipt · partial then full receipt drives JWO status to received', () => {
    const jwo = createJobWorkOutOrder({
      entity_id: 'e1', jwo_date: '2026-05-12', expected_return_date: '2026-05-20',
      vendor_id: 'v1', vendor_name: 'Acme JW', vendor_gstin: null,
      production_order_id: null, production_order_no: null,
      department_id: 'd1', department_name: 'Prod',
      raised_by_user_id: user.id, raised_by_name: user.name,
      lines: [{
        item_id: 'i-rm1', item_code: 'RM-001', item_name: 'RM 1', uom: 'kg',
        sent_qty: 20, source_godown_id: 'g-rm', source_godown_name: 'RM',
        job_work_godown_id: 'g-jw', job_work_godown_name: 'JW',
        expected_output_item_id: 'i-out', expected_output_item_code: 'OUT-001',
        expected_output_item_name: 'Out', expected_output_qty: 10, expected_output_uom: 'nos',
        job_work_rate: 50, remarks: '',
      }],
      notes: '',
    });
    const sent = sendJobWorkOutOrder(jwo, user);
    persistJWO(sent);

    const partial = createJobWorkReceipt({
      entity_id: 'e1', job_work_out_order: sent,
      receipt_date: '2026-05-18', department_id: 'd1', department_name: 'Prod',
      received_by_user_id: user.id, received_by_name: user.name,
      lines: [{
        job_work_out_order_line_id: sent.lines[0].id,
        item_id: 'i-out', item_code: 'OUT-001', item_name: 'Out', uom: 'nos',
        expected_qty: 10, received_qty: 6, rejected_qty: 0,
        destination_godown_id: 'g-fg', destination_godown_name: 'FG',
        qc_required: false, batch_no: null, serial_nos: [], remarks: '',
      }],
      notes: '',
    }, DEFAULT_QC_CONFIG);
    expect(partial.doc_no).toMatch(/^JWR\/\d{2}-\d{2}\/\d{4}$/);
    expect(partial.marks_jwo_complete).toBe(false);

    confirmJobWorkReceipt(partial, user);
    let stored = JSON.parse(localStorage.getItem(jobWorkOutOrdersKey('e1'))!) as JobWorkOutOrder[];
    expect(stored[0].status).toBe('partially_received');
    expect(stored[0].lines[0].received_qty).toBe(6);

    const remainder = createJobWorkReceipt({
      entity_id: 'e1', job_work_out_order: stored[0],
      receipt_date: '2026-05-19', department_id: 'd1', department_name: 'Prod',
      received_by_user_id: user.id, received_by_name: user.name,
      lines: [{
        job_work_out_order_line_id: stored[0].lines[0].id,
        item_id: 'i-out', item_code: 'OUT-001', item_name: 'Out', uom: 'nos',
        expected_qty: 10, received_qty: 4, rejected_qty: 0,
        destination_godown_id: 'g-fg', destination_godown_name: 'FG',
        qc_required: false, batch_no: null, serial_nos: [], remarks: '',
      }],
      notes: '',
    }, DEFAULT_QC_CONFIG);
    expect(remainder.marks_jwo_complete).toBe(true);

    confirmJobWorkReceipt(remainder, user);
    stored = JSON.parse(localStorage.getItem(jobWorkOutOrdersKey('e1'))!) as JobWorkOutOrder[];
    expect(stored[0].status).toBe('received');
    expect(stored[0].lines[0].received_qty).toBe(10);
  });

  it('Multi-level BOM explosion · semi-finished sub-BOMs flatten with wastage compounding', () => {
    const subBom: Bom = {
      id: 'bom-sub', entity_id: 'e1',
      product_item_id: 'item-sub-asm', product_item_code: 'SUB-ASM', product_item_name: 'Sub Assembly',
      version_no: 1, output_qty: 1, output_uom: 'nos',
      valid_from: '2026-01-01', valid_to: null, is_active: true,
      components: [
        { id: 'cs1', item_id: 'rm-x', item_code: 'RM-X', item_name: 'Leaf X',
          component_type: 'raw_material', qty: 3, uom: 'nos', wastage_percent: 0, sub_bom_id: null },
        { id: 'cs2', item_id: 'rm-y', item_code: 'RM-Y', item_name: 'Leaf Y',
          component_type: 'raw_material', qty: 5, uom: 'nos', wastage_percent: 10, sub_bom_id: null },
      ],
      byproducts: [],
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const topBom: Bom = {
      ...subBom, id: 'bom-top',
      product_item_id: 'item-widget', product_item_code: 'WIDGET', product_item_name: 'Widget',
      components: [
        { id: 'ct1', item_id: 'item-sub-asm', item_code: 'SUB-ASM', item_name: 'Sub Assembly',
          component_type: 'semi_finished', qty: 2, uom: 'nos', wastage_percent: 0, sub_bom_id: 'bom-sub' },
        { id: 'ct2', item_id: 'rm-a', item_code: 'RM-A', item_name: 'Direct A',
          component_type: 'raw_material', qty: 1, uom: 'nos', wastage_percent: 0, sub_bom_id: null },
      ],
    };
    const exploded = explodeBOM(topBom, 10, [topBom, subBom]);
    expect(exploded).toHaveLength(3);
    expect(exploded.find(c => c.item_id === 'rm-x')?.required_qty).toBe(60);
    expect(exploded.find(c => c.item_id === 'rm-y')?.required_qty).toBe(110);
    expect(exploded.find(c => c.item_id === 'rm-a')?.required_qty).toBe(10);
  });
});
