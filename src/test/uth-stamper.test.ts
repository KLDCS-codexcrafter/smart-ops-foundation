/**
 * @file uth-stamper.test.ts — D-228 UTH + OOB-12 + Q7-b coverage
 * @sprint T-Phase-1.2.6d-hdr · UTH1-UTH8
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { stampCreate, stampUpdate, stampPost, stampCancel } from '@/lib/uth-stamper';
import { computeVoucherHash } from '@/lib/voucher-hash';
import { checkDuplicateReference } from '@/lib/duplicate-reference-check';
import { setCurrentUser, clearCurrentUser } from '@/lib/auth-helpers';

describe('UTH Stamper · D-228 audit metadata', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentUser({ id: 'u-1', displayName: 'Test User' });
  });

  it('UTH1 · stampCreate populates created_by + dates + currency defaults', () => {
    const stamp = stampCreate('TEST', 'grn', 'r-1', 'GRN/26-27/0001');
    expect(stamp.created_by).toBe('u-1');
    expect(stamp.created_at).toBeTruthy();
    expect(stamp.updated_at).toBe(stamp.created_at);
    expect(stamp.currency_code).toBe('INR');
    expect(stamp.exchange_rate).toBe(1);
  });

  it('UTH2 · stampUpdate populates updated_by + updated_at', () => {
    const before = { id: 'r-1', amount: 100 };
    const stamp = stampUpdate('TEST', 'grn', 'r-1', 'GRN/26-27/0001', before, { id: 'r-1', amount: 200 });
    expect(stamp.updated_by).toBe('u-1');
    expect(stamp.updated_at).toBeTruthy();
  });

  it('UTH3 · stampPost populates posted_at + voucher_hash', () => {
    const record = { id: 'r-1', amount: 100, status: 'posted' };
    const stamp = stampPost(record);
    expect(stamp.posted_at).toBeTruthy();
    expect(stamp.voucher_hash).toMatch(/^fnv1a:/);
  });

  it('UTH4 · stampCancel rejects short reasons (<10 chars) · accepts longer', () => {
    expect(() => stampCancel({ id: 'r-1' }, 'short')).toThrow();
    const valid = stampCancel({ id: 'r-1' }, 'Genuine reason for cancellation');
    expect(valid.cancel_reason).toContain('Genuine');
    expect(valid.cancelled_at).toBeTruthy();
  });

  it('cleanup · clearCurrentUser does not break stampCreate (fallback user)', () => {
    clearCurrentUser();
    const stamp = stampCreate('TEST', 'grn', 'r-2', 'GRN/26-27/0002');
    expect(stamp.created_by).toBeTruthy();
  });
});

describe('Voucher Hash · OOB-12', () => {
  it('UTH5 · same record produces same hash', () => {
    const record = { id: 'r-1', amount: 100, vendor: 'ABC' };
    expect(computeVoucherHash(record)).toBe(computeVoucherHash(record));
  });

  it('UTH6 · changed material field produces different hash', () => {
    const r1 = { id: 'r-1', amount: 100, vendor: 'ABC' };
    const r2 = { id: 'r-1', amount: 200, vendor: 'ABC' };
    expect(computeVoucherHash(r1)).not.toBe(computeVoucherHash(r2));
  });

  it('UTH7 · updated_at change does NOT change hash (legitimate field excluded)', () => {
    const r1 = { id: 'r-1', amount: 100, updated_at: '2026-04-01' };
    const r2 = { id: 'r-1', amount: 100, updated_at: '2026-05-01' };
    expect(computeVoucherHash(r1)).toBe(computeVoucherHash(r2));
  });
});

describe('Duplicate Reference Check · Q7-b', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('UTH8 · hard-block on (vendor, ref_no, FY) collision · override accepted with 10+ char reason', () => {
    const existing = [{
      id: 'g-1', grn_no: 'GRN/26-27/0001', vendor_id: 'V-1',
      reference_no: 'VINV-100', receipt_date: '2026-04-15',
    }];
    localStorage.setItem('erp_grns_TEST', JSON.stringify(existing));

    const blocked = checkDuplicateReference({
      entityCode: 'TEST', recordType: 'grn',
      partyId: 'V-1', referenceNo: 'VINV-100',
      recordDate: '2026-05-10',
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.conflicting?.record_no).toBe('GRN/26-27/0001');

    const allowed = checkDuplicateReference({
      entityCode: 'TEST', recordType: 'grn',
      partyId: 'V-1', referenceNo: 'VINV-100',
      recordDate: '2026-05-10',
      overrideReason: 'Vendor split single invoice across 2 deliveries',
    });
    expect(allowed.blocked).toBe(false);

    const differentFY = checkDuplicateReference({
      entityCode: 'TEST', recordType: 'grn',
      partyId: 'V-1', referenceNo: 'VINV-100',
      recordDate: '2027-05-10',
    });
    expect(differentFY.blocked).toBe(false);
  });
});
