/**
 * demo-dispatch-data.ts — Dispatch Hub demo data
 * Sprint T-Phase-1.1.1n. Memo-based authorization data (DM).
 * [JWT] Read by orchestrator → POST /api/dispatch/*
 */
import type { DeliveryMemo } from '@/types/delivery-memo';

export const DEMO_DELIVERY_MEMOS: DeliveryMemo[] = [
  {
    id: 'dm-demo-1',
    entity_id: 'ENTITY',
    memo_no: 'DM/25-26/0001',
    memo_date: '2026-02-02',
    supply_request_memo_id: 'srm-demo-2',
    supply_request_memo_no: 'SRQM/25-26/0002',
    customer_id: null,
    customer_name: 'Demo Customer B',
    delivery_address: '456 Test Road, Mumbai 400001',
    transporter_name: 'Demo Transport Co',
    vehicle_no: 'WB-01-AA-1234',
    lr_no: 'LR/2026/001',
    lr_date: '2026-02-03',
    expected_delivery_date: '2026-02-07',
    items: [
      { id: 'dmi-1', item_name: 'Demo Item C', qty: 20, uom: 'MTR', amount: 3000 },
    ],
    total_amount: 3000,
    status: 'delivered',
    created_by: 'dispatch_user',
    delivered_at: '2026-02-08T14:00:00.000Z',
    pod_reference: 'POD/2026/001',
    created_at: '2026-02-02T09:00:00.000Z',
    updated_at: '2026-02-08T14:00:00.000Z',
  },
];
