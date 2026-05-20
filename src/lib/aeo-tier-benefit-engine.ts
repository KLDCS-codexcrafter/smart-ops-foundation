/**
 * @file        src/lib/aeo-tier-benefit-engine.ts
 * @purpose     AEO FULL · Moat #4 PRIMARY · tier benefits + BCD reduction + expedited clearance · SIBLING
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q1=a SIBLING · aeo-tier-mapping.ts + aeo-tier-engine.ts STAY 0-DIFF
 *
 * IMPORTANT: SIBLING extension of EX-6 aeo-tier-mapping.ts + aeo-tier-engine.ts.
 *            Both EX-6 sources STAY 0-DIFF. This engine READ-ONLY consumes them.
 */
import type { AEOTier } from '@/types/port-extension';
import { getEntityAEOTier } from '@/lib/aeo-tier-engine';

export const AEO_BCD_REDUCTION_PCT: Record<AEOTier, number> = {
  not_aeo: 0, tier_1: 25, tier_2: 50, tier_3: 75,
};

export const AEO_CLEARANCE_HOURS_SAVED: Record<AEOTier, number> = {
  not_aeo: 0, tier_1: 24, tier_2: 48, tier_3: 72,
};

export interface AEOBenefit {
  tier: AEOTier;
  bcd_reduction_pct: number;
  bcd_reduction_inr: number;
  clearance_hours_saved: number;
  monetary_value_of_time_inr: number;
  total_benefit_inr: number;
  annual_review_due_date: string;
  is_review_due_within_30_days: boolean;
}

export function computeAEOBenefit(
  entityCode: string,
  targetEntityId: string,
  asOfDate: string,
  bcdAmountInr: number,
  hourlyClearanceCostInr: number = 5000,
): AEOBenefit {
  const tier = getEntityAEOTier(entityCode, targetEntityId, asOfDate);
  const bcd_reduction_pct = AEO_BCD_REDUCTION_PCT[tier];
  const bcd_reduction_inr = Math.round(bcdAmountInr * (bcd_reduction_pct / 100));
  const clearance_hours_saved = AEO_CLEARANCE_HOURS_SAVED[tier];
  const monetary_value_of_time_inr = clearance_hours_saved * hourlyClearanceCostInr;
  const total_benefit_inr = bcd_reduction_inr + monetary_value_of_time_inr;

  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + 90);
  const annual_review_due_date = reviewDate.toISOString().slice(0, 10);
  const daysUntilReview = Math.ceil((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const is_review_due_within_30_days = daysUntilReview <= 30 && daysUntilReview >= 0;

  return {
    tier, bcd_reduction_pct, bcd_reduction_inr,
    clearance_hours_saved, monetary_value_of_time_inr, total_benefit_inr,
    annual_review_due_date, is_review_due_within_30_days,
  };
}

export function getAEOUpgradePathway(currentTier: AEOTier): { nextTier: AEOTier | null; requirements: string[] } {
  if (currentTier === 'not_aeo') return { nextTier: 'tier_1', requirements: ['3-year financial track record', 'Clean compliance history', 'Internal controls audit'] };
  if (currentTier === 'tier_1') return { nextTier: 'tier_2', requirements: ['5-year financial track record', 'AEO-Tier 1 for 1+ year', 'Self-assessment customs declaration capability'] };
  if (currentTier === 'tier_2') return { nextTier: 'tier_3', requirements: ['7-year financial track record', 'AEO-Tier 2 for 2+ years', 'Internal customs compliance department'] };
  return { nextTier: null, requirements: ['Already at maximum tier'] };
}
