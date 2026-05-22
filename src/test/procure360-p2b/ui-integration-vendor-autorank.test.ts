/**
 * @file        ui-integration-vendor-autorank.test.ts
 * @purpose     HK-5-2 Block D · UI integration coverage · VendorAutoRankPanel + engine surface
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/vendor-auto-rank-engine';
import * as P2 from '@/pages/erp/procure-hub/panels-p2';

describe('HK-5-2 Block D · VendorAutoRank UI integration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('panel component exported', () => { expect(typeof P2.VendorAutoRankPanel).toBe('function'); });
  it('engine module imports', () => { expect(Engine).toBeDefined(); });
  it('autoRankVendorsForCategory exposed', () => { expect(typeof Engine.autoRankVendorsForCategory).toBe('function'); });
  it('getSuggestedVendor exposed', () => { expect(typeof Engine.getSuggestedVendor).toBe('function'); });
  it('getTopNRankedVendors exposed', () => { expect(typeof Engine.getTopNRankedVendors).toBe('function'); });
  it('returns ranking shape with empty data', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'cat-x');
    expect(r.item_category).toBe('cat-x');
    expect(Array.isArray(r.top_3)).toBe(true);
  });
  it('top_3 bounded ≤3', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'cat-y');
    expect(r.top_3.length).toBeLessThanOrEqual(3);
  });
  it('total_vendors_scored numeric', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'cat-z');
    expect(typeof r.total_vendors_scored).toBe('number');
  });
  it('ranking_computed_at ISO string', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'cat-a');
    expect(typeof r.ranking_computed_at).toBe('string');
    expect(() => new Date(r.ranking_computed_at).toISOString()).not.toThrow();
  });
  it('getSuggestedVendor returns null or entry', () => {
    const v = Engine.getSuggestedVendor('e1', 'cat-empty');
    expect(v === null || typeof v === 'object').toBe(true);
  });
  it('getTopNRankedVendors honors N bound', () => {
    const r = Engine.getTopNRankedVendors('e1', 'cat-empty', 3);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeLessThanOrEqual(3);
  });
  it('panel export name stability (SSOT chip)', () => {
    expect(P2.VendorAutoRankPanel.name).toContain('VendorAutoRank');
  });
});
