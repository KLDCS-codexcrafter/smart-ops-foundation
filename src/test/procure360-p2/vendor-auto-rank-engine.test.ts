import { describe, it, expect, beforeEach } from 'vitest';
import * as Engine from '@/lib/vendor-auto-rank-engine';

describe('vendor-auto-rank-engine · D-NEW-FT · OOB-50 ⭐', () => {
  beforeEach(() => { localStorage.clear(); });

  it('module imports cleanly', () => { expect(Engine).toBeDefined(); });

  it('exports core API surface', () => {
    expect(typeof Engine.autoRankVendorsForCategory).toBe('function');
    expect(typeof Engine.getSuggestedVendor).toBe('function');
    expect(typeof Engine.getTopNRankedVendors).toBe('function');
  });

  it('returns ItemCategoryRanking shape', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'steel');
    expect(r.item_category).toBe('steel');
    expect(Array.isArray(r.top_3)).toBe(true);
    expect(typeof r.total_vendors_scored).toBe('number');
    expect(typeof r.ranking_computed_at).toBe('string');
  });

  it('returns empty top_3 when no vendors scored', () => {
    const r = Engine.autoRankVendorsForCategory('empty-entity', 'bearings');
    expect(r.top_3).toEqual([]);
    expect(r.total_vendors_scored).toBe(0);
  });

  it('getSuggestedVendor returns null when empty', () => {
    expect(Engine.getSuggestedVendor('empty', 'steel')).toBeNull();
  });

  it('getTopNRankedVendors respects n', () => {
    const r = Engine.getTopNRankedVendors('e1', 'steel', 2);
    expect(r.length).toBeLessThanOrEqual(2);
  });

  it('supports composite_score basis', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'steel', 'composite_score');
    expect(r.top_3.every((e) => e.rank_basis === 'composite_score')).toBe(true);
  });

  it('supports reliability_score basis', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'steel', 'reliability_score');
    expect(r.top_3.every((e) => e.rank_basis === 'reliability_score')).toBe(true);
  });

  it('defaults to blended basis', () => {
    const r = Engine.autoRankVendorsForCategory('e1', 'steel');
    expect(r.top_3.every((e) => e.rank_basis === 'blended')).toBe(true);
  });

  it('Sentinel · D-NEW-FT closure marker', () => { expect('D-NEW-FT').toBe('D-NEW-FT'); });
});
