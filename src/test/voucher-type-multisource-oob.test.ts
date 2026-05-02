/**
 * @file     voucher-type-multisource-oob.test.ts — Sprint T-Phase-1.2.6e-tally-1 tests
 * @purpose  VT1-VT8: voucher type registry + multi-source resolution + use-last engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultVoucherTypeForFamily,
  findVoucherTypeById,
  DEFAULT_NON_FINECORE_VOUCHER_TYPES,
} from '@/lib/non-finecore-voucher-type-registry';
import { resolveSources, hasMultipleSources, totalSourceAmount } from '@/types/multi-source-ref';
import { findLastVoucher, stripForUseLast } from '@/lib/use-last-voucher-engine';

describe('Non-FineCore Voucher Type Registry · Q1-b', () => {
  it('VT1 · DEFAULT registry has at least 17 entries across all 10 families', () => {
    expect(DEFAULT_NON_FINECORE_VOUCHER_TYPES.length).toBeGreaterThanOrEqual(17);
    const families = new Set(DEFAULT_NON_FINECORE_VOUCHER_TYPES.map(vt => vt.family));
    expect(families.size).toBeGreaterThanOrEqual(10);
  });

  it('VT2 · each family has exactly one is_default=true entry', () => {
    const families = new Set(DEFAULT_NON_FINECORE_VOUCHER_TYPES.map(vt => vt.family));
    for (const f of families) {
      const defaults = DEFAULT_NON_FINECORE_VOUCHER_TYPES.filter(vt => vt.family === f && vt.is_default);
      expect(defaults.length).toBe(1);
    }
  });

  it('VT3 · getDefaultVoucherTypeForFamily returns the default · findVoucherTypeById resolves', () => {
    const vt = getDefaultVoucherTypeForFamily('TEST', 'inventory_in');
    expect(vt?.id).toBe('vt-grn-domestic');
    const found = findVoucherTypeById('TEST', 'vt-grn-import');
    expect(found?.display_name).toBe('GRN Import');
  });
});

describe('Multi-Source Refs · Q2-c', () => {
  it('VT4 · hasMultipleSources + totalSourceAmount work as expected', () => {
    const refs = [
      { voucher_id: 'po-1', voucher_no: 'PO/26-27/0001', voucher_date: '2026-04-01', amount: 50000, type: 'against_ref' as const },
      { voucher_id: 'po-2', voucher_no: 'PO/26-27/0002', voucher_date: '2026-04-15', amount: 30000, type: 'against_ref' as const },
    ];
    expect(hasMultipleSources(refs)).toBe(true);
    expect(totalSourceAmount(refs)).toBe(80000);
    expect(hasMultipleSources([refs[0]])).toBe(false);
    expect(totalSourceAmount(null)).toBe(0);
  });

  it('VT5 · resolveSources prefers multi_source_refs · falls back to legacy single ref', () => {
    const recWithMulti = {
      multi_source_refs: [
        { voucher_id: 'po-1', voucher_no: 'PO/26-27/0001', voucher_date: '2026-04-01', amount: 50000, type: 'against_ref' as const },
      ],
      po_id: 'po-legacy', po_no: 'PO/26-27/9999',
    };
    expect(resolveSources(recWithMulti)[0].voucher_no).toBe('PO/26-27/0001');

    const recLegacyOnly = { po_id: 'po-legacy', po_no: 'PO/26-27/9999', po_date: '2026-04-01' };
    expect(resolveSources(recLegacyOnly)[0].voucher_no).toBe('PO/26-27/9999');

    const recEmpty = {};
    expect(resolveSources(recEmpty).length).toBe(0);
  });
});

describe('Use-Last Voucher Engine · OOB-1 · Q3-b', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('VT6 · findLastVoucher returns most recent same-party non-cancelled record', () => {
    const records = [
      { id: 'g-1', vendor_id: 'V-1', receipt_date: '2026-04-01', status: 'posted' },
      { id: 'g-2', vendor_id: 'V-1', receipt_date: '2026-04-15', status: 'posted' },
      { id: 'g-3', vendor_id: 'V-2', receipt_date: '2026-04-20', status: 'posted' },
      { id: 'g-4', vendor_id: 'V-1', receipt_date: '2026-04-25', status: 'cancelled' },
    ];
    localStorage.setItem('erp_grns_TEST', JSON.stringify(records));
    const last = findLastVoucher('TEST', 'grn', 'V-1');
    expect(last?.id).toBe('g-2');
  });

  it('VT7 · stripForUseLast removes id, voucher_no, dates, status, voucher_hash, audit fields', () => {
    const stripped = stripForUseLast({
      id: 'g-1', grn_no: 'GRN/26-27/0001', receipt_date: '2026-04-01',
      vendor_id: 'V-1', items: [{ id: 'l-1' }], voucher_hash: 'fnv1a:abc',
      created_by: 'u-1', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z',
      posted_at: '2026-04-01T00:00:00Z', status: 'posted',
    }, 'grn');
    expect(stripped.id).toBeUndefined();
    expect(stripped.grn_no).toBeUndefined();
    expect(stripped.receipt_date).toBeUndefined();
    expect(stripped.voucher_hash).toBeUndefined();
    expect(stripped.created_by).toBeUndefined();
    expect(stripped.posted_at).toBeUndefined();
    expect(stripped.vendor_id).toBe('V-1');
    expect(Array.isArray(stripped.items)).toBe(true);
  });

  it('VT8 · returns null when no matching records exist', () => {
    localStorage.setItem('erp_grns_TEST', JSON.stringify([]));
    expect(findLastVoucher('TEST', 'grn', 'V-99')).toBeNull();
  });
});
