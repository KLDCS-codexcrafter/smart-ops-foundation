/**
 * demo-inward-data.ts — Card #6 Inward Logistic FOUNDATION demo data
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block F
 * [JWT] Read by orchestrator → POST /api/logistic/inward-receipts
 */
import type { InwardReceipt } from '@/types/inward-receipt';

const T0 = '2026-04-28T09:30:00.000Z';
const T1 = '2026-04-29T11:15:00.000Z';
const T2 = '2026-04-30T14:00:00.000Z';

export const DEMO_INWARD_RECEIPTS: InwardReceipt[] = [
  {
    id: 'ir-demo-1',
    entity_id: 'ENTITY',
    receipt_no: 'IR/26-27/0001',
    status: 'quarantine',
    po_id: 'po-demo-1', po_no: 'PO/26-27/0001',
    gate_entry_id: null, gate_entry_no: null,
    vendor_id: 'v-demo-1', vendor_name: 'Acme Steel Pvt Ltd',
    vendor_invoice_no: 'INV/2026/0421', vendor_invoice_date: '2026-04-28',
    vehicle_no: 'KA-01-AB-1234', lr_no: 'LR/2026/0091',
    driver_name: 'Ramesh Kumar', driver_mobile: '9876543210',
    arrival_date: '2026-04-28', arrival_time: T0,
    received_by_id: 'u-store-1', received_by_name: 'Suresh (Stores)',
    godown_id: 'gd-main', godown_name: 'Main Stores',
    lines: [
      {
        id: 'irl-1-a', item_id: 'i-1', item_code: 'STL-ROD-12',
        item_name: 'Steel Rod 12mm', uom: 'KG',
        expected_qty: 500, received_qty: 500,
        batch_no: 'B-AC-0421', heat_no: 'H-2026-04-A',
        qa_plan_id: 'qap-steel-rod', routing_decision: 'inspection_required',
        routing_reason: 'QA plan attached · inspection required',
      },
    ],
    total_lines: 1, quarantine_lines: 1, released_lines: 0, rejected_lines: 0,
    grn_id: null, grn_no: null, qa_inspection_ids: [],
    narration: 'Routine PO supply — QA pending',
    effective_date: '2026-04-28', created_by: 'u-store-1', updated_by: 'u-store-1',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T0, updated_at: T0, released_at: null, cancelled_at: null,
  },
  {
    id: 'ir-demo-2',
    entity_id: 'ENTITY',
    receipt_no: 'IR/26-27/0002',
    status: 'released',
    po_id: 'po-demo-2', po_no: 'PO/26-27/0002',
    gate_entry_id: null, gate_entry_no: null,
    vendor_id: 'v-demo-2', vendor_name: 'Bharat Hardware Co',
    vendor_invoice_no: 'BHC/0188', vendor_invoice_date: '2026-04-29',
    vehicle_no: 'MH-12-CD-7788', lr_no: null,
    driver_name: 'Mahesh Patil', driver_mobile: '9123456780',
    arrival_date: '2026-04-29', arrival_time: T1,
    received_by_id: 'u-store-1', received_by_name: 'Suresh (Stores)',
    godown_id: 'gd-main', godown_name: 'Main Stores',
    lines: [
      {
        id: 'irl-2-a', item_id: 'i-2', item_code: 'BLT-M10',
        item_name: 'Bolt M10', uom: 'PCS',
        expected_qty: 200, received_qty: 200,
        batch_no: null, heat_no: null,
        qa_plan_id: null, routing_decision: 'auto_release',
        routing_reason: 'No QA plan · qty within tolerance',
      },
    ],
    total_lines: 1, quarantine_lines: 0, released_lines: 1, rejected_lines: 0,
    grn_id: null, grn_no: null, qa_inspection_ids: [],
    narration: 'Auto-released hardware supply',
    effective_date: '2026-04-29', created_by: 'u-store-1', updated_by: 'u-store-1',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T1, updated_at: T1, released_at: T1, cancelled_at: null,
  },
  {
    id: 'ir-demo-3',
    entity_id: 'ENTITY',
    receipt_no: 'IR/26-27/0003',
    status: 'arrived',
    po_id: null, po_no: null,
    gate_entry_id: null, gate_entry_no: null,
    vendor_id: 'v-demo-3', vendor_name: 'Crescent Lubricants',
    vendor_invoice_no: 'CL-2026-77', vendor_invoice_date: '2026-04-30',
    vehicle_no: 'GJ-05-EF-3344', lr_no: 'LR/2026/0093',
    driver_name: 'Vikram Singh', driver_mobile: '9988776655',
    arrival_date: '2026-04-30', arrival_time: T2,
    received_by_id: 'u-store-2', received_by_name: 'Anita (Stores)',
    godown_id: 'gd-main', godown_name: 'Main Stores',
    lines: [
      {
        id: 'irl-3-a', item_id: 'i-3', item_code: 'OIL-HYD-46',
        item_name: 'Hydraulic Oil 46', uom: 'LTR',
        expected_qty: 100, received_qty: 100,
        batch_no: 'CL-B-77', heat_no: null,
        qa_plan_id: null, routing_decision: 'auto_release',
        routing_reason: 'No QA plan · qty within tolerance',
      },
    ],
    total_lines: 1, quarantine_lines: 0, released_lines: 1, rejected_lines: 0,
    grn_id: null, grn_no: null, qa_inspection_ids: [],
    narration: 'Direct vendor delivery (no PO)',
    effective_date: '2026-04-30', created_by: 'u-store-2', updated_by: 'u-store-2',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T2, updated_at: T2, released_at: null, cancelled_at: null,
  },
];
