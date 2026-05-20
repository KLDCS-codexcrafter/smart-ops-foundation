/**
 * @file        src/types/coo-embassy-full.ts
 * @purpose     CoO Embassy FULL · 5-state legalization · sibling extension of EX-7b coo-legalization
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q3=a · coo-legalization-engine.ts STAYS 0-DIFF
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */

export type EmbassyLegalizationState =
  | 'chamber_submitted' | 'chamber_endorsed' | 'mea_submitted' | 'mea_attested'
  | 'embassy_submitted' | 'embassy_legalized' | 'apostille_pending' | 'apostille_complete'
  | 'consul_legalized' | 'buyer_side_legalized' | 'failed';

export const EMBASSY_VALID_TRANSITIONS: Record<EmbassyLegalizationState, EmbassyLegalizationState[]> = {
  chamber_submitted: ['chamber_endorsed', 'failed'],
  chamber_endorsed: ['mea_submitted', 'apostille_pending', 'failed'],
  mea_submitted: ['mea_attested', 'failed'],
  mea_attested: ['embassy_submitted', 'consul_legalized', 'failed'],
  embassy_submitted: ['embassy_legalized', 'failed'],
  embassy_legalized: ['buyer_side_legalized'],
  apostille_pending: ['apostille_complete', 'failed'],
  apostille_complete: ['buyer_side_legalized'],
  consul_legalized: ['buyer_side_legalized'],
  buyer_side_legalized: [],
  failed: [],
};

export interface EmbassyLegalization {
  id: string;
  legalization_ref: string;
  entity_id: string;
  state: EmbassyLegalizationState;
  related_shipping_bill_id: string;
  destination_country_code: string;
  is_hague_apostille_country: boolean;
  chamber_name: string;
  chamber_endorsed_at: string | null;
  mea_attested_at: string | null;
  embassy_name: string | null;
  embassy_legalized_at: string | null;
  apostille_authority: string | null;
  apostille_completed_at: string | null;
  total_fee_inr: number;
  total_tat_days: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const embassyLegalizationKey = (entityCode: string): string =>
  `erp_${entityCode}_embassy_legalizations`;
