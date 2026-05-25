import { describe, it, expect } from 'vitest';
import { computeScheduleMComplianceScore } from '@/lib/process-genealogy-engine';

describe('Sprint 62 · Schedule M compliance scoring', () => {
  it('returns 8 dimensions', () => {
    const s = computeScheduleMComplianceScore('NONE');
    expect(s.dimensions.length).toBe(8);
  });

  it('overall_score is within 0-100', () => {
    const s = computeScheduleMComplianceScore('NONE');
    expect(s.overall_score).toBeGreaterThanOrEqual(0);
    expect(s.overall_score).toBeLessThanOrEqual(100);
  });

  it('weights sum to ~1.0', () => {
    const s = computeScheduleMComplianceScore('NONE');
    const sum = s.dimensions.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it('empty entity returns 0 batches + 0 recipes assessed', () => {
    const s = computeScheduleMComplianceScore('EMPTY');
    expect(s.total_batches_assessed).toBe(0);
    expect(s.total_recipes_assessed).toBe(0);
  });
});
