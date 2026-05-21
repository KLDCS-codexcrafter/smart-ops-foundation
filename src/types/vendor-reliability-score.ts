/**
 * @file        src/types/vendor-reliability-score.ts
 * @purpose     Vendor Reliability Scorecard · Moat #21 PRIMARY · MIRROR of EX-7a buyer-reliability-score
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q4=a MIRROR · buyer-reliability-score.ts STAYS 0-DIFF
 */

export type VendorReliabilityClass = 'preferred' | 'strategic' | 'standard' | 'probationary' | 'blocked';

export const VENDOR_RELIABILITY_THRESHOLDS: Record<VendorReliabilityClass, { min: number; max: number; description: string }> = {
  preferred: { min: 85, max: 100, description: '85+ · preferred partner · long-term contracts · best terms' },
  strategic: { min: 70, max: 85, description: '70-85 · strategic vendor · regular orders · negotiated terms' },
  standard: { min: 50, max: 70, description: '50-70 · standard vendor · spot orders · standard terms' },
  probationary: { min: 30, max: 50, description: '30-50 · probationary · monitor closely · trial orders only' },
  blocked: { min: 0, max: 30, description: '<30 · blocked · do not transact · resolve issues first' },
};

export interface VendorReliabilityComponents {
  on_time_delivery_score: number;
  quality_acceptance_score: number;
  price_stability_score: number;
  carotar_compliance_score: number;
  dgtr_exposure_score: number;
  sanctions_clearance_score: number;
  payment_terms_adherence_score: number;
  composite_score: number;
  classification: VendorReliabilityClass;
  computed_at: string;
}

export interface VendorReliabilityScore {
  id: string;
  entity_id: string;
  related_foreign_vendor_id: string;
  vendor_name: string;
  country_code: string;
  components: VendorReliabilityComponents;
  prior_classification: VendorReliabilityClass | null;
  classification_changed_at: string | null;
  active_dgtr_case_count: number;
  active_sanctions_hit_count: number;
  open_carotar_queries: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const vendorReliabilityKey = (entityCode: string): string =>
  `erp_${entityCode}_vendor_reliability_scores`;
