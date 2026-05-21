/**
 * @file        src/types/bill-of-entry-item-valuation-override.ts
 * @purpose     D-NEW-FF RESOLUTION · per-item valuation override sibling · BoELine STAYS 0-DIFF
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q1=a SIBLING · 5th application of sibling discipline
 */

export type OverrideReason =
  | 'customs_revaluation'
  | 'transfer_pricing_adjustment'
  | 'related_party_adjustment'
  | 'royalty_addition'
  | 'assist_addition'
  | 'discount_disallowance'
  | 'other';

export const OVERRIDE_REASON_DESCRIPTIONS: Record<OverrideReason, string> = {
  customs_revaluation: 'Customs Section 14 revaluation · Rule 4-9 sequence',
  transfer_pricing_adjustment: 'Related-party TP adjustment per Customs Valuation Rule 3(3)(b)',
  related_party_adjustment: 'Related-party price not at arm length · Rule 3(3)(b)',
  royalty_addition: 'Royalty/license fee addition under Rule 10(1)(c)',
  assist_addition: 'Free supply assist addition under Rule 10(1)(b)',
  discount_disallowance: 'Trade discount disallowed · not normal trade practice',
  other: 'Other valuation override · provide justification',
};

export interface BoELineValuationOverride {
  id: string;
  override_no: string;
  entity_id: string;
  related_boe_id: string;
  related_boe_no: string;
  related_boe_line_id: string;
  line_no: number;
  original_final_cif_inr: number;
  original_final_assessable_inr: number;
  original_bcd_inr: number;
  original_total_duty_inr: number;
  overridden_final_cif_inr: number;
  overridden_final_assessable_inr: number;
  overridden_bcd_inr: number;
  overridden_total_duty_inr: number;
  delta_cif_inr: number;
  delta_assessable_inr: number;
  delta_bcd_inr: number;
  delta_total_duty_inr: number;
  reason: OverrideReason;
  justification: string;
  approver_user: string;
  approved_at: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const boeLineOverrideKey = (entityCode: string): string =>
  `erp_${entityCode}_boe_line_valuation_overrides`;
