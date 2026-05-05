/**
 * vendor-return-engine.test.ts — Card #6 6-pre-2 Block J
 * Covers: createVendorReturn, createAutoDebitNote, postDebitNote, queries.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVendorReturn,
  createAutoDebitNote,
  postDebitNote,
  listVendorReturns,
  listPendingVendorReturns,
  getVendorReturn,
} from '@/lib/vendor-return-engine';
import { vendorReturnsKey } from '@/types/vendor-return';

const E = 'VRTEST';

beforeEach(() => {
  localStorage.clear();
});

const baseInput = () => ({
  entity_id: E,
  vendor_id: 'V001',
  vendor_name: 'Acme Vendor',
  vendor_gstin: '27AAACA1234A1Z5',
  primary_reason: 'qa_rejected' as const,
  reason_notes: 'Failed inspection',
  lines: [{
    item_id: 'I1', item_code: 'STL-01', item_name: 'Steel Bar', uom: 'KG',
    return_qty: 10, unit_rate: 100, reason: 'qa_rejected' as const,
  }],
});

describe('vendor-return-engine · CRUD', () => {
  it('creates a draft vendor return with computed totals', async () => {
    const rtv = await createVendorReturn(baseInput(), E, 'tester');
    expect(rtv.status).toBe('draft');
    expect(rtv.total_qty).toBe(10);
    expect(rtv.total_value).toBe(1000);
    expect(rtv.return_no).toMatch(/^RJO/);
    expect(rtv.lines).toHaveLength(1);
  });

  it('rejects empty lines', async () => {
    await expect(
      createVendorReturn({ ...baseInput(), lines: [] }, E, 'tester'),
    ).rejects.toThrow();
  });

  it('persists to localStorage under vendorReturnsKey', async () => {
    await createVendorReturn(baseInput(), E, 'tester');
    const raw = localStorage.getItem(vendorReturnsKey(E));
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});

describe('vendor-return-engine · auto-DN (D-366)', () => {
  it('creates draft RTV from QA inspection rejection', async () => {
    const rtv = await createAutoDebitNote({
      entity_id: E, vendor_id: 'V001', vendor_name: 'Acme Vendor',
      source_inspection_id: 'INS-1', source_inspection_no: 'QA/26-27/001',
      item_id: 'I1', item_code: 'STL-01', item_name: 'Steel Bar', uom: 'KG',
      qty_failed: 5, unit_rate: 200,
    }, E);
    expect(rtv.primary_reason).toBe('qa_rejected');
    expect(rtv.total_qty).toBe(5);
    expect(rtv.total_value).toBe(1000);
    expect(rtv.lines[0].source_inspection_id).toBe('INS-1');
  });
});

describe('vendor-return-engine · postDebitNote', () => {
  it('posts a Debit Note voucher and stamps RTV', async () => {
    const rtv = await createVendorReturn(baseInput(), E, 'tester');
    const result = await postDebitNote(rtv.id, E, 'tester');
    expect(result.ok).toBe(true);
    expect(result.voucher_id).toBeTruthy();
    const after = getVendorReturn(rtv.id, E);
    expect(after?.debit_note_id).toBe(result.voucher_id);
    expect(after?.status).toBe('approved');
  });

  it('refuses to repost when DN already exists', async () => {
    const rtv = await createVendorReturn(baseInput(), E, 'tester');
    await postDebitNote(rtv.id, E, 'tester');
    const second = await postDebitNote(rtv.id, E, 'tester');
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/already/i);
  });

  it('returns failure for unknown RTV', async () => {
    const result = await postDebitNote('missing-id', E, 'tester');
    expect(result.ok).toBe(false);
  });
});

describe('vendor-return-engine · queries', () => {
  it('listPendingVendorReturns returns draft + approved only', async () => {
    const a = await createVendorReturn(baseInput(), E, 'tester');
    await createVendorReturn(baseInput(), E, 'tester');
    expect(listVendorReturns(E)).toHaveLength(2);
    expect(listPendingVendorReturns(E)).toHaveLength(2);
    await postDebitNote(a.id, E, 'tester');
    expect(listPendingVendorReturns(E)).toHaveLength(2); // approved still pending
  });
});
