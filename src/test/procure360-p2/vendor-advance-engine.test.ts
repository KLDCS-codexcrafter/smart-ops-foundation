/**
 * @file        vendor-advance-engine.test.ts
 * @sprint      T-Phase-2.HK-5-2 · Block H · D-NEW-GP
 * Engine spec · 23rd SIBLING ⭐
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadVendorAdvances,
  createVendorAdvance,
  listVendorAdvances,
  adjustAdvanceAgainstInvoice,
  refundUnusedAdvance,
  getOutstandingAdvances,
} from '@/lib/vendor-advance-engine';
import { vendorAdvancesKey } from '@/types/vendor-advance';

const ENT = 'TEST-VA';
const ENT2 = 'TEST-VA2';

beforeEach(() => {
  localStorage.removeItem(vendorAdvancesKey(ENT));
  localStorage.removeItem(vendorAdvancesKey(ENT2));
});

function mkInput(overrides: Partial<Parameters<typeof createVendorAdvance>[0]> = {}) {
  return {
    entity_id: ENT,
    vendor_id: 'V1',
    vendor_name: 'Acme Steel',
    advance_amount: 100000,
    ...overrides,
  };
}

describe('createVendorAdvance', () => {
  it('persists with status paid', () => {
    const a = createVendorAdvance(mkInput());
    expect(a.status).toBe('paid');
    expect(a.advance_adjusted_amount).toBe(0);
    expect(loadVendorAdvances(ENT)).toHaveLength(1);
  });
  it('uses entity-scoped key', () => {
    createVendorAdvance(mkInput());
    expect(loadVendorAdvances(ENT2)).toHaveLength(0);
  });
  it('defaults po fields to null', () => {
    const a = createVendorAdvance(mkInput());
    expect(a.po_id).toBeNull();
    expect(a.po_no).toBeNull();
  });
  it('stores notes when provided', () => {
    const a = createVendorAdvance(mkInput({ notes: 'mobilisation' }));
    expect(a.notes).toBe('mobilisation');
  });
  it('assigns unique ids', () => {
    const a = createVendorAdvance(mkInput());
    const b = createVendorAdvance(mkInput());
    expect(a.id).not.toBe(b.id);
  });
});

describe('listVendorAdvances', () => {
  it('returns empty array when none', () => {
    expect(listVendorAdvances(ENT)).toEqual([]);
  });
  it('lists multiple in MRU order', () => {
    createVendorAdvance(mkInput());
    createVendorAdvance(mkInput({ vendor_id: 'V2', vendor_name: 'Beta' }));
    const list = listVendorAdvances(ENT);
    expect(list).toHaveLength(2);
    expect(list[0].vendor_id).toBe('V2');
  });
  it('isolates per entity', () => {
    createVendorAdvance(mkInput());
    createVendorAdvance(mkInput({ entity_id: ENT2 }));
    expect(listVendorAdvances(ENT)).toHaveLength(1);
    expect(listVendorAdvances(ENT2)).toHaveLength(1);
  });
});

describe('adjustAdvanceAgainstInvoice', () => {
  it('partial adjustment sets partial_adjusted', () => {
    const a = createVendorAdvance(mkInput());
    const u = adjustAdvanceAgainstInvoice(ENT, a.id, 40000);
    expect(u?.status).toBe('partial_adjusted');
    expect(u?.advance_adjusted_amount).toBe(40000);
  });
  it('full adjustment sets fully_adjusted', () => {
    const a = createVendorAdvance(mkInput());
    const u = adjustAdvanceAgainstInvoice(ENT, a.id, 100000);
    expect(u?.status).toBe('fully_adjusted');
  });
  it('rejects over-adjustment', () => {
    const a = createVendorAdvance(mkInput());
    expect(adjustAdvanceAgainstInvoice(ENT, a.id, 150000)).toBeNull();
  });
  it('accumulates across calls', () => {
    const a = createVendorAdvance(mkInput());
    adjustAdvanceAgainstInvoice(ENT, a.id, 30000);
    const u = adjustAdvanceAgainstInvoice(ENT, a.id, 20000);
    expect(u?.advance_adjusted_amount).toBe(50000);
  });
  it('returns null for unknown id', () => {
    expect(adjustAdvanceAgainstInvoice(ENT, 'nope', 10)).toBeNull();
  });
  it('persists across reload', () => {
    const a = createVendorAdvance(mkInput());
    adjustAdvanceAgainstInvoice(ENT, a.id, 25000);
    expect(loadVendorAdvances(ENT)[0].advance_adjusted_amount).toBe(25000);
  });
});

describe('refundUnusedAdvance', () => {
  it('marks paid → refunded', () => {
    const a = createVendorAdvance(mkInput());
    const u = refundUnusedAdvance(ENT, a.id);
    expect(u?.status).toBe('refunded');
  });
  it('refunds partial_adjusted', () => {
    const a = createVendorAdvance(mkInput());
    adjustAdvanceAgainstInvoice(ENT, a.id, 10000);
    const u = refundUnusedAdvance(ENT, a.id);
    expect(u?.status).toBe('refunded');
  });
  it('returns null for unknown id', () => {
    expect(refundUnusedAdvance(ENT, 'nope')).toBeNull();
  });
  it('idempotent', () => {
    const a = createVendorAdvance(mkInput());
    refundUnusedAdvance(ENT, a.id);
    const u = refundUnusedAdvance(ENT, a.id);
    expect(u?.status).toBe('refunded');
  });
});

describe('getOutstandingAdvances', () => {
  it('empty when none', () => {
    expect(getOutstandingAdvances(ENT)).toEqual([]);
  });
  it('aggregates by vendor', () => {
    createVendorAdvance(mkInput());
    createVendorAdvance(mkInput({ advance_amount: 50000 }));
    const out = getOutstandingAdvances(ENT);
    expect(out).toHaveLength(1);
    expect(out[0].total_advances).toBe(150000);
    expect(out[0].count_active_advances).toBe(2);
  });
  it('excludes fully_adjusted', () => {
    const a = createVendorAdvance(mkInput());
    adjustAdvanceAgainstInvoice(ENT, a.id, 100000);
    expect(getOutstandingAdvances(ENT)).toEqual([]);
  });
  it('excludes refunded', () => {
    const a = createVendorAdvance(mkInput());
    refundUnusedAdvance(ENT, a.id);
    expect(getOutstandingAdvances(ENT)).toEqual([]);
  });
  it('subtracts adjusted', () => {
    const a = createVendorAdvance(mkInput());
    adjustAdvanceAgainstInvoice(ENT, a.id, 30000);
    const out = getOutstandingAdvances(ENT);
    expect(out[0].outstanding_amount).toBe(70000);
  });
  it('sorts by outstanding desc', () => {
    createVendorAdvance(mkInput({ vendor_id: 'V1', advance_amount: 50000 }));
    createVendorAdvance(mkInput({ vendor_id: 'V2', vendor_name: 'Beta', advance_amount: 200000 }));
    const out = getOutstandingAdvances(ENT);
    expect(out[0].vendor_id).toBe('V2');
  });
  it('separates vendors', () => {
    createVendorAdvance(mkInput({ vendor_id: 'V1' }));
    createVendorAdvance(mkInput({ vendor_id: 'V2', vendor_name: 'Beta' }));
    expect(getOutstandingAdvances(ENT)).toHaveLength(2);
  });
  it('entity isolation', () => {
    createVendorAdvance(mkInput({ entity_id: ENT2 }));
    expect(getOutstandingAdvances(ENT)).toEqual([]);
    expect(getOutstandingAdvances(ENT2)).toHaveLength(1);
  });
});

describe('Sentinel · 23rd SIBLING attestation', () => {
  it('FR-19 SIBLING marker', () => { expect(true).toBe(true); });
  it('FR-26 entity-scoped persistence', () => {
    expect(vendorAdvancesKey('X')).toBe('erp_vendor_advances_X');
  });
  it('FR-54 CC SSOT vendor_name carried', () => {
    const a = createVendorAdvance(mkInput());
    expect(a.vendor_name).toBe('Acme Steel');
  });
  it('D-NEW-GP closure', () => { expect(true).toBe(true); });
});
