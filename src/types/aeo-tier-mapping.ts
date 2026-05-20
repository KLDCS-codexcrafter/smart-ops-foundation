/**
 * @file        src/types/aeo-tier-mapping.ts
 * @purpose     AEO Tier Mapping · per-Entity AEO + per-Port AEO + fast-track rules · Moat #4 anchor
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q4=b master with Entity × Port resolution
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped localStorage
 */
import type { AEOTier } from './port-extension';

export interface EntityAEOCertification {
  id: string;
  entity_id: string;
  aeo_tier: AEOTier;
  certificate_no: string;
  validity_from: string;
  validity_to: string;
  cbic_notification_ref: string;
  free_demurrage_days_bonus: number;
  rms_pre_bias: 'auto_green' | 'green_preferred' | 'none';
  notes: string;
}

export interface AEOResolutionResult {
  importer_tier: AEOTier;
  port_tier_supported: AEOTier;
  fast_track_eligible: boolean;
  rms_pre_bias_applied: 'auto_green' | 'green_preferred' | 'none';
  free_demurrage_days_applied: number;
  reason: string;
}

export const AEO_TIER_RANK: Record<AEOTier, number> = {
  not_aeo: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

export const entityAEOCertificationsKey = (entityCode: string): string =>
  `erp_${entityCode}_entity_aeo_certifications`;
