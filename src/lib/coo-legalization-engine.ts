/**
 * @file        src/lib/coo-legalization-engine.ts
 * @purpose     4-state CoO Embassy legalization workflow · Moat #10 ADVANCED
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q6=a 4-state (not_required → chamber_attested → embassy_submitted → legalized_returned)
 */
import type { CountryDocRule } from '@/types/pre-shipment-doc-pack';

export type CoOLegalizationState =
  | 'not_required' | 'chamber_attested' | 'embassy_submitted' | 'legalized_returned';

export const COO_VALID_TRANSITIONS: Record<CoOLegalizationState, CoOLegalizationState[]> = {
  not_required: [],
  chamber_attested: ['embassy_submitted'],
  embassy_submitted: ['legalized_returned'],
  legalized_returned: [],
};

export function requiresEmbassyLegalization(rule: CountryDocRule): boolean {
  return rule === 'uae_legalized' || rule === 'cepa_preferential';
}

export function initialLegalizationState(rule: CountryDocRule): CoOLegalizationState {
  if (requiresEmbassyLegalization(rule)) return 'chamber_attested';
  return 'not_required';
}

export function transitionLegalization(
  current: CoOLegalizationState,
  next: CoOLegalizationState,
): { valid: boolean; reason: string } {
  if (!COO_VALID_TRANSITIONS[current].includes(next)) {
    return { valid: false, reason: `Invalid CoO transition: ${current} → ${next}` };
  }
  return { valid: true, reason: 'Transition allowed' };
}

export const LEGALIZATION_COST_INR: Record<CountryDocRule, number> = {
  standard: 1200,
  uae_legalized: 4200,
  cepa_preferential: 4200,
  eu_eur1: 1500,
  asean_form_ai: 1200,
  gsp_form_a: 1200,
};

export const LEGALIZATION_TAT_DAYS: Record<CountryDocRule, number> = {
  standard: 2,
  uae_legalized: 10,
  cepa_preferential: 10,
  eu_eur1: 3,
  asean_form_ai: 3,
  gsp_form_a: 3,
};
