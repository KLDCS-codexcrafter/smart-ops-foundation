/**
 * @file        store-hub-mobile-cancel.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-3 · Block J · D-399
 * @covers      DRAFT-ONLY cancel for Stock Issue + Receipt Ack (D-128 boundary preserved)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStockIssue, postStockIssue, cancelStockIssue, getStockIssue,
} from '@/lib/stock-issue-engine';
import {
  createReceiptAck, cancelReceiptAck, getReceiptAck,
} from '@/lib/stock-receipt-ack-engine';
import { stockIssuesKey } from '@/types/stock-issue';
import { stockReceiptAcksKey } from '@/types/stock-receipt-ack';

const E = 'TEST-CARD7P3';

beforeEach(() => {
  localStorage.removeItem(stockIssuesKey(E));
  localStorage.removeItem(stockReceiptAcksKey(E));
});

const makeIssueInput = () => ({
  entity_id: E,
  department_name: 'Production',
  recipient_name: 'Foreman A',
  purpose: 'Job Card #42',
  lines: [{
    item_id: 'i1', item_code: 'STL-12', item_name: 'Steel Rod 12mm',
    uom: 'nos', qty: 10, rate: 100,
    source_godown_id: 'g-main', source_godown_name: 'Main Stores',
  }],
});

describe('Card #7 7-pre-3 · DRAFT-ONLY cancel discipline', () => {
  it('cancels draft Stock Issue and marks status=cancelled', async () => {
    const si = await createStockIssue(makeIssueInput(), E, 'u1');
    const r = await cancelStockIssue(si.id, 'wrong department', E, 'u1');
    expect(r.ok).toBe(true);
    expect(getStockIssue(si.id, E)?.status).toBe('cancelled');
  });

  it('refuses cancel without reason', async () => {
    const si = await createStockIssue(makeIssueInput(), E, 'u1');
    const r = await cancelStockIssue(si.id, '   ', E, 'u1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('cancel-reason-required');
  });

  it('refuses cancel of posted Stock Issue (must use finecore.cancelVoucher)', async () => {
    const si = await createStockIssue(makeIssueInput(), E, 'u1');
    await postStockIssue(si.id, E, 'u1');
    const r = await cancelStockIssue(si.id, 'mistake', E, 'u1');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/finecore/);
  });

  it('refuses cancel on unknown id', async () => {
    const r = await cancelStockIssue('does-not-exist', 'x', E, 'u1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not-found');
  });

  it('cancels draft Receipt Ack with reason', async () => {
    const ack = await createReceiptAck({
      entity_id: E,
      inward_receipt_id: 'ir-1',
      inward_receipt_no: 'IR/0001',
      receiving_godown_id: 'g-main',
      receiving_godown_name: 'Main Stores',
      lines: [{
        item_id: 'i1', item_code: 'STL-12', item_name: 'Steel Rod',
        uom: 'nos', qty_inward: 50, qty_accepted: 50, rate: 100,
      }],
    }, E, 'u1');
    const r = await cancelReceiptAck(ack.id, 'duplicate entry', E, 'u1');
    expect(r.ok).toBe(true);
    expect(getReceiptAck(ack.id, E)?.status).toBe('cancelled');
  });
});
