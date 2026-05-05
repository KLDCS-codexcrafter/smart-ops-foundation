/**
 * store-hub-foundation.test.ts — Card #7 Block J
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 * Covers D-377 (stock-issue-engine) + D-378 (stock-receipt-ack-engine cross-card).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStockIssue,
  postStockIssue,
  listStockIssues,
} from '@/lib/stock-issue-engine';
import {
  createReceiptAck,
  postReceiptAck,
  listReleasedReceiptsAwaitingStock,
  countPendingReceiptAcks,
} from '@/lib/stock-receipt-ack-engine';
import { createInwardReceipt, transitionInwardReceipt } from '@/lib/inward-receipt-engine';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';

const E = 'SHTEST';

beforeEach(() => {
  localStorage.clear();
});

describe('stock-issue-engine · D-377 + D-128 zero-touch', () => {
  it('createStockIssue + postStockIssue posts a Stock Journal voucher', async () => {
    const si = await createStockIssue({
      entity_id: E,
      department_name: 'Production',
      recipient_name: 'Rakesh',
      purpose: 'Job-1',
      lines: [{
        item_id: 'i1', item_code: 'I1', item_name: 'Bolt', uom: 'PCS',
        qty: 10, rate: 5,
        source_godown_id: 'gd-stores', source_godown_name: 'Stores',
      }],
    }, E, 'u1');
    expect(si.status).toBe('draft');
    expect(si.issue_no).toMatch(/^SI\//);

    const posted = await postStockIssue(si.id, E, 'u1');
    expect(posted?.status).toBe('issued');
    expect(posted?.voucher_id).toBeTruthy();

    const raw = localStorage.getItem(vouchersKey(E));
    const vouchers = raw ? (JSON.parse(raw) as Voucher[]) : [];
    const sj = vouchers.find(v => v.id === posted?.voucher_id);
    expect(sj?.base_voucher_type).toBe('Stock Journal');
    expect(sj?.status).toBe('posted');
  });

  it('listStockIssues returns issues sorted newest first', async () => {
    await createStockIssue({
      entity_id: E, department_name: 'D1', recipient_name: 'R1', purpose: 'P',
      lines: [{ item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        qty: 1, rate: 1, source_godown_id: 'g', source_godown_name: 'G' }],
    }, E, 'u1');
    expect(listStockIssues(E)).toHaveLength(1);
  });
});

describe('stock-receipt-ack-engine · D-378 cross-card consumer', () => {
  it('listReleasedReceiptsAwaitingStock returns released IRs not yet acked', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v', vendor_name: 'V',
      godown_id: 'gd-recv', godown_name: 'Receiving',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        expected_qty: 5, received_qty: 5 }],
    }, E, 'u1');
    await transitionInwardReceipt(ir.id, 'released', E, 'u1');

    const awaiting = listReleasedReceiptsAwaitingStock(E);
    expect(awaiting).toHaveLength(1);
    expect(awaiting[0].id).toBe(ir.id);
    expect(countPendingReceiptAcks(E)).toBe(1);
  });

  it('createReceiptAck + postReceiptAck posts Stock Journal and removes IR from awaiting', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v', vendor_name: 'Vendor X',
      godown_id: 'gd-recv', godown_name: 'Receiving',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        expected_qty: 10, received_qty: 10 }],
    }, E, 'u1');
    await transitionInwardReceipt(ir.id, 'released', E, 'u1');

    const ack = await createReceiptAck({
      entity_id: E,
      inward_receipt_id: ir.id,
      inward_receipt_no: ir.receipt_no,
      vendor_id: ir.vendor_id, vendor_name: ir.vendor_name,
      acknowledged_by_id: 'u1', acknowledged_by_name: 'U',
      lines: [{
        inward_line_id: ir.lines[0].id,
        item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        qty_inward: 10, qty_acknowledged: 10,
        source_godown_id: 'gd-recv', source_godown_name: 'Receiving',
        dest_godown_id: 'gd-stores', dest_godown_name: 'Stores',
      }],
    }, E, 'u1');
    expect(ack.ack_no).toMatch(/^SRA\//);

    const posted = await postReceiptAck(ack.id, E, 'u1');
    expect(posted?.status).toBe('acknowledged');
    expect(posted?.voucher_id).toBeTruthy();

    // After ack, IR no longer in awaiting list
    expect(listReleasedReceiptsAwaitingStock(E)).toHaveLength(0);
    expect(countPendingReceiptAcks(E)).toBe(0);

    const raw = localStorage.getItem(vouchersKey(E));
    const vouchers = raw ? (JSON.parse(raw) as Voucher[]) : [];
    const sj = vouchers.find(v => v.id === posted?.voucher_id);
    expect(sj?.base_voucher_type).toBe('Stock Journal');
    // Receiving OUT + Stores IN = 2 inventory lines
    expect(sj?.inventory_lines).toHaveLength(2);
  });

  it('variance is computed correctly', async () => {
    const ir = await createInwardReceipt({
      entity_id: E, vendor_id: 'v', vendor_name: 'V',
      godown_id: 'gd-recv', godown_name: 'Receiving',
      received_by_id: 'u1', received_by_name: 'U',
      lines: [{ item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        expected_qty: 100, received_qty: 100 }],
    }, E, 'u1');
    await transitionInwardReceipt(ir.id, 'released', E, 'u1');

    const ack = await createReceiptAck({
      entity_id: E,
      inward_receipt_id: ir.id, inward_receipt_no: ir.receipt_no,
      vendor_id: null, vendor_name: 'V',
      acknowledged_by_id: 'u1', acknowledged_by_name: 'U',
      lines: [{
        inward_line_id: ir.lines[0].id,
        item_id: 'i', item_code: 'C', item_name: 'X', uom: 'NOS',
        qty_inward: 100, qty_acknowledged: 98,
        source_godown_id: 'gd-recv', source_godown_name: 'Receiving',
        dest_godown_id: 'gd-stores', dest_godown_name: 'Stores',
      }],
    }, E, 'u1');
    expect(ack.lines[0].variance).toBe(-2);
    expect(ack.total_variance).toBe(2);
  });
});
