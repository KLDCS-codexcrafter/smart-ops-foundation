/**
 * @file        src/lib/demurrage-engine.ts
 * @purpose     Demurrage calculation · consumes MLGIT.leg4.dwell_time_days + CBIC free-day rules + AEO tier bonus
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q6=b consume EX-4 dwell time · CBIC free-day + AEO bonus
 * @disciplines FR-30 · FR-50 · pure function · D-284 ZERO TOUCH on EX-4 inputs
 */
import type { AEOTier } from '@/types/port-extension';

export const CBIC_FREE_DAYS_BY_BOE_TYPE: Record<string, number> = {
  home_consumption: 3,
  warehouse: 7,
  ex_bond: 5,
};

export const AEO_FREE_DAYS_BONUS: Record<AEOTier, number> = {
  not_aeo: 0,
  tier_1: 0,
  tier_2: 2,
  tier_3: 5,
};

export const DEMURRAGE_PER_DAY_INR: Record<string, number> = {
  cfs_tier_1: 4500,
  cfs_tier_2: 6000,
  cfs_tier_3: 9000,
};

export interface DemurrageComputation {
  dwell_days_used: number;
  free_days_base: number;
  free_days_aeo_bonus: number;
  free_days_total: number;
  chargeable_days: number;
  rate_per_day_inr: number;
  total_demurrage_inr: number;
  rationale: string;
}

export function computeDemurrage(
  dwellDaysUsed: number,
  boeType: 'home_consumption' | 'warehouse' | 'ex_bond',
  importerAEOTier: AEOTier,
  facilityTier: 'cfs_tier_1' | 'cfs_tier_2' | 'cfs_tier_3' = 'cfs_tier_1',
): DemurrageComputation {
  const free_days_base = CBIC_FREE_DAYS_BY_BOE_TYPE[boeType] ?? 3;
  const free_days_aeo_bonus = AEO_FREE_DAYS_BONUS[importerAEOTier];
  const free_days_total = free_days_base + free_days_aeo_bonus;
  const chargeable_days = Math.max(0, dwellDaysUsed - free_days_total);
  const rate_per_day_inr = DEMURRAGE_PER_DAY_INR[facilityTier] ?? 4500;
  const total_demurrage_inr = chargeable_days * rate_per_day_inr;

  return {
    dwell_days_used: dwellDaysUsed,
    free_days_base,
    free_days_aeo_bonus,
    free_days_total,
    chargeable_days,
    rate_per_day_inr,
    total_demurrage_inr,
    rationale: chargeable_days === 0
      ? `Within ${free_days_total}-day free window (${free_days_base} base + ${free_days_aeo_bonus} AEO bonus) · no demurrage`
      : `${chargeable_days} chargeable day(s) past ${free_days_total}-day free window · ₹${rate_per_day_inr}/day`,
  };
}
