/**
 * distributor-rating-engine.ts — Average ratings + derive credit score
 */

import type { RatingEntry, CompositeScore } from '@/types/distributor-rating';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function computeComposite(distributorId: string, all: RatingEntry[]): CompositeScore {
  const mine = all.filter(r => r.distributor_id === distributorId);
  const t2d = mine.filter(r => r.direction === 'tenant_to_distributor');
  const d2t = mine.filter(r => r.direction === 'distributor_to_tenant');

  // Weighted tenant-to-distributor (payment reliability counts 2x)
  const t2dScore = avg(t2d.map(r =>
    r.dimension === 'payment_reliability' ? r.stars * 2 : r.stars,
  ));
  const d2tScore = avg(d2t.map(r => r.stars));

  // Credit score 300-900 (CIBIL-like). Default 650 if no data.
  const base = t2d.length === 0 ? 650 : Math.round(400 + (t2dScore / 5) * 500);
  const cs = Math.max(300, Math.min(900, base));

  const grade: CompositeScore['credit_grade'] =
    cs >= 800 ? 'A+' : cs >= 700 ? 'A' : cs >= 600 ? 'B' : cs >= 500 ? 'C' : 'D';

  return {
    distributor_id: distributorId,
    tenant_to_distributor_avg: Math.round(t2dScore * 10) / 10,
    distributor_to_tenant_avg: Math.round(d2tScore * 10) / 10,
    payment_weight: 2,
    credit_score: cs,
    credit_grade: grade,
    computed_at: new Date().toISOString(),
  };
}

/** Recommend credit limit based on composite score. Returns paise. */
export function recommendedCreditLimit(score: CompositeScore, baseLimitPaise: number): number {
  const multiplier =
    score.credit_grade === 'A+' ? 2.0 :
    score.credit_grade === 'A'  ? 1.5 :
    score.credit_grade === 'B'  ? 1.0 :
    score.credit_grade === 'C'  ? 0.5 : 0.25;
  return Math.round(baseLimitPaise * multiplier);
}
