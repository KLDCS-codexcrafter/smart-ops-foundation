/**
 * @file        narrative.test.ts
 * @sprint      RPT-12a · Block 5 · default rule-based narrative
 *
 *   The sentence MUST be assembled from numbers computed by
 *   computeNarrativeAggregates on the real rows. No prose generation.
 */
import { describe, it, expect } from 'vitest';
import { describeReport, computeNarrativeAggregates, DEFAULT_PROVIDER } from '@/lib/report-framework/narrative';
import type { QuerySpec } from '@/lib/report-framework/report-builder-engine';

const ROWS = [
  { party: 'A', sum_amount: 1000 },
  { party: 'B', sum_amount: 250 },
  { party: 'C', sum_amount: 50 },
];
const SPEC: QuerySpec = { groupBy: ['party'], measures: [{ field: 'amount', agg: 'sum' }] };

describe('RPT-12a · narrative', () => {
  it('aggregates match computed values', () => {
    const a = computeNarrativeAggregates(ROWS, SPEC)!;
    expect(a.total).toBe(1300);
    expect(a.topLabel).toBe('A');
    expect(a.topValue).toBe(1000);
    expect(a.groupCount).toBe(3);
  });

  it('every number in the sentence comes from the rows', () => {
    const s = describeReport(ROWS, SPEC);
    // top label + value
    expect(s).toContain('A');
    expect(s).toContain('1,000');
    // total
    expect(s).toContain('1,300');
    // group count
    expect(s).toContain('3 ');
  });

  it('empty rows → empty narrative', () => {
    expect(describeReport([], SPEC)).toBe('');
  });

  it('default provider identity', () => {
    expect(DEFAULT_PROVIDER.id).toBe('rule-based-v1');
  });

  it('threshold-based below-count is computed (25% of top)', () => {
    const a = computeNarrativeAggregates(ROWS, SPEC)!;
    expect(a.thresholdValue).toBe(250);
    // strictly less than 250 → only the value 50 qualifies
    expect(a.belowThresholdCount).toBe(1);
  });
});
