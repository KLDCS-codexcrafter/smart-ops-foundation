/**
 * voucher-version-engine.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1
 */
import { describe, it, expect } from 'vitest';
import { canMutateInPlace, buildNextVersion } from '@/lib/voucher-version-engine';

describe('voucher-version-engine · M-1 · CGST Rule 56(8)', () => {
  it('VV1 · drafts can mutate in place', () => {
    expect(canMutateInPlace({ status: 'draft' })).toBe(true);
  });
  it('VV2 · submitted can mutate in place', () => {
    expect(canMutateInPlace({ status: 'submitted' })).toBe(true);
  });
  it('VV3 · posted CANNOT mutate (must create version N+1)', () => {
    expect(canMutateInPlace({ status: 'posted' })).toBe(false);
  });
  it('VV4 · cancelled CANNOT mutate (immutable forensic record)', () => {
    expect(canMutateInPlace({ status: 'cancelled' })).toBe(false);
  });
  it('VV5 · buildNextVersion increments version + sets superseded_by on original', () => {
    const orig = { id: 'v1', version: 1, superseded_by: null, amount: 100 };
    const { supersededOriginal, nextVersion } = buildNextVersion(orig, { amount: 110 } as Partial<typeof orig>, 'v2');
    expect(supersededOriginal.superseded_by).toBe('v2');
    expect(nextVersion.id).toBe('v2');
    expect(nextVersion.version).toBe(2);
    expect(nextVersion.superseded_by).toBeNull();
    expect((nextVersion as { amount: number }).amount).toBe(110);
  });
  it('VV6 · empty status string is mutable (defensive)', () => {
    expect(canMutateInPlace({})).toBe(true);
  });
});
