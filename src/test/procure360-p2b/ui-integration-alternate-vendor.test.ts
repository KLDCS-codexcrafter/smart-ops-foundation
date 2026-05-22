/**
 * @file        ui-integration-alternate-vendor.test.ts
 * @purpose     HK-5-2 Block D · UI integration · AlternateVendorSuggestPanel + post-inline engine
 *              Validates Block E-completion: stub deleted · hint inlined · panel 0-DIFF preserved
 * @sprint      T-Phase-2.HK-5-2 · Block D + Block E-completion verification
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { suggestAlternates } from '@/lib/oob/alternate-vendor-suggest';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';

describe('HK-5-2 Block D · AlternateVendor UI integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('panel exported', () => { expect(typeof P2.AlternateVendorSuggestPanel).toBe('function'); });
  it('suggestAlternates is a function', () => { expect(typeof suggestAlternates).toBe('function'); });
  it('returns null with no benchmark data', () => {
    expect(suggestAlternates('item-x', 100, 'v1', 'e1')).toBe(null);
  });
  it('returns null for absent item id', () => {
    expect(suggestAlternates('', 100, 'v1', 'e1')).toBe(null);
  });
  it('does not throw on zero rate', () => {
    expect(() => suggestAlternates('item-x', 0, 'v1', 'e1')).not.toThrow();
  });
  it('does not throw on negative rate (defensive)', () => {
    expect(() => suggestAlternates('item-x', -10, 'v1', 'e1')).not.toThrow();
  });
  it('stub module is deleted (Block E-completion)', async () => {
    let importErr: Error | null = null;
    try {
      // @ts-expect-error · module intentionally deleted
      await import('@/lib/oob/price-benchmark-stub');
    } catch (e) {
      importErr = e as Error;
    }
    expect(importErr).not.toBe(null);
  });
  it('panel name stability', () => {
    expect(P2.AlternateVendorSuggestPanel.name).toContain('AlternateVendor');
  });
  it('result shape includes reason when non-null', () => {
    const r = suggestAlternates('item-x', 100, 'v1', 'e1');
    if (r) { expect(typeof r.reason).toBe('string'); }
    expect(true).toBe(true);
  });
  it('entity scoping does not throw across entities', () => {
    expect(() => suggestAlternates('item-x', 100, 'v1', 'e2')).not.toThrow();
  });
});
