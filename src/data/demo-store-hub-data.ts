/**
 * demo-store-hub-data.ts — Card #7 Block H · D-383
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Demo Stock Issues + Receipt Acks · matches Card #6 demo-inward-data.ts pattern.
 * [JWT] Read by orchestrator → POST /api/store/stock-issues + /stock-receipt-acks
 */
import type { StockIssue } from '@/types/stock-issue';
import type { StockReceiptAck } from '@/types/stock-receipt-ack';

const T0 = '2026-04-29T08:30:00.000Z';
const T1 = '2026-04-30T10:15:00.000Z';
const T2 = '2026-05-01T13:00:00.000Z';

export const DEMO_STOCK_ISSUES: StockIssue[] = [
  {
    id: 'si-demo-1',
    entity_id: 'ENTITY',
    issue_no: 'SI/26-27/0001',
    status: 'issued',
    issue_date: '2026-04-29',
    department_id: 'dept-prod', department_name: 'Production',
    recipient_id: 'u-prod-1', recipient_name: 'Rakesh (Line 1)',
    purpose: 'Job ABC-101',
    lines: [
      {
        id: 'sil-1-a', item_id: 'i-2', item_code: 'BLT-M10',
        item_name: 'Bolt M10', uom: 'PCS',
        qty: 50, rate: 8, value: 400,
        source_godown_id: 'gd-stores', source_godown_name: 'Main Stores',
        batch_no: null, remarks: '',
      },
    ],
    total_value: 400,
    voucher_id: 'vch-demo-si-1', voucher_no: 'SJ/26-27/0010', posted_at: T0,
    narration: 'Issued to Production for Job ABC-101',
    effective_date: '2026-04-29', created_by: 'u-store-1', updated_by: 'u-store-1',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T0, updated_at: T0, cancelled_at: null,
  },
  {
    id: 'si-demo-2',
    entity_id: 'ENTITY',
    issue_no: 'SI/26-27/0002',
    status: 'draft',
    issue_date: '2026-05-01',
    department_id: 'dept-maint', department_name: 'Maintenance',
    recipient_id: 'u-maint-1', recipient_name: 'Suresh (Maint)',
    purpose: 'Pump overhaul',
    lines: [
      {
        id: 'sil-2-a', item_id: 'i-3', item_code: 'OIL-HYD-46',
        item_name: 'Hydraulic Oil 46', uom: 'LTR',
        qty: 20, rate: 250, value: 5000,
        source_godown_id: 'gd-stores', source_godown_name: 'Main Stores',
        batch_no: 'CL-B-77', remarks: '',
      },
    ],
    total_value: 5000,
    voucher_id: null, voucher_no: null, posted_at: null,
    narration: 'Pending approval',
    effective_date: '2026-05-01', created_by: 'u-store-1', updated_by: 'u-store-1',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T2, updated_at: T2, cancelled_at: null,
  },
];

export const DEMO_STOCK_RECEIPT_ACKS: StockReceiptAck[] = [
  {
    id: 'sra-demo-1',
    entity_id: 'ENTITY',
    ack_no: 'SRA/26-27/0001',
    status: 'acknowledged',
    ack_date: '2026-04-30',
    inward_receipt_id: 'ir-demo-2',
    inward_receipt_no: 'IR/26-27/0002',
    vendor_id: 'v-demo-2', vendor_name: 'Bharat Hardware Co',
    acknowledged_by_id: 'u-store-1', acknowledged_by_name: 'Suresh (Stores)',
    lines: [
      {
        id: 'sral-1-a', inward_line_id: 'irl-2-a',
        item_id: 'i-2', item_code: 'BLT-M10', item_name: 'Bolt M10', uom: 'PCS',
        qty_inward: 200, qty_acknowledged: 200, variance: 0,
        source_godown_id: 'gd-main', source_godown_name: 'Main Stores',
        dest_godown_id: 'gd-stores', dest_godown_name: 'Main Stores',
        batch_no: null, remarks: '',
      },
    ],
    total_variance: 0,
    voucher_id: 'vch-demo-sra-1', voucher_no: 'SJ/26-27/0011', posted_at: T1,
    narration: 'Receipt confirmed into Stores',
    effective_date: '2026-04-30', created_by: 'u-store-1', updated_by: 'u-store-1',
    cancel_reason: null, reference_no: null, voucher_hash: null,
    created_at: T1, updated_at: T1, cancelled_at: null,
  },
];
