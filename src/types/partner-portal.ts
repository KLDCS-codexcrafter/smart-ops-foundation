/**
 * @file     src/types/partner-portal.ts
 * @sprint   PARTNER-1 · T-PP1-Partner-Portal
 * @purpose  KLDCS channel-partner portal types — Tally-modeled tiers (Referral 10%
 *           / Associate 20% / Channel 30% · owns support). Distinct domain from
 *           tenant salesman/distributor: KLDCS resellers who SELL Operix.
 * @[JWT]    Wave-2: partner auth + live MRR/billing feeds replace localStorage seed.
 */

export type PartnerTier = 'referral' | 'associate' | 'channel';

export const PARTNER_TIER_COMMISSION_PCT: Record<PartnerTier, 10 | 20 | 30> = {
  referral: 10,
  associate: 20,
  channel: 30,
};

export const PARTNER_TIER_LABEL: Record<PartnerTier, string> = {
  referral: 'Referral',
  associate: 'Associate',
  channel: 'Channel (owns support)',
};

export interface PartnerProfile {
  id: string;
  name: string;
  tier: PartnerTier;
  certification: string | null;
  region: string;
  joined_at: string; // ISO
}

export type PartnerCustomerStatus = 'active' | 'paused' | 'churned';

export interface PartnerCustomer {
  id: string;
  partner_id: string;
  tenant_name: string;
  plan: 'starter' | 'growth' | 'enterprise';
  mrr_paise: number;
  status: PartnerCustomerStatus;
  onboarded_at: string;     // ISO date
  renewal_date: string;     // ISO date
  new_license_value_paise: number; // one-time at onboarding
}

export type PartnerDealStage =
  | 'registered'
  | 'approved'
  | 'won'
  | 'lost'
  | 'expired';

export interface PartnerDeal {
  id: string;
  partner_id: string;
  prospect_name: string;
  stage: PartnerDealStage;
  registered_at: string;
  protected_until: string;   // ISO; 90d protection by default
  value_paise: number | null;
  notes: string;
}

export interface PartnerTarget {
  period: string;            // e.g. 'Q1-FY26'
  target_count: number;
  actual_count: number;
}

export interface PartnerRenewal {
  customer_id: string;
  tenant_name: string;
  renewal_date: string;
  mrr_paise: number;
  days_until: number;
  bucket: 30 | 60 | 90;
}

export type MarketingAssetType = 'brochure' | 'deck' | 'pricelist' | 'tool';

export interface MarketingAsset {
  id: string;
  title: string;
  type: MarketingAssetType;
  size_kb: number | null;
  available: boolean;        // Wave-2: hosted assets
}

export interface PartnerDashboardCounts {
  customers: number;
  deals: number;
  upcoming_renewals_30d: number;
  targets_actual: number;
  targets_total: number;
  commission_period_paise: number;
}

// ── Storage keys (entity-scoped · Tier-L seed) ──
export const partnerProfileKey   = (e: string) => `erp_partner_portal_profile_${e}`;
export const partnerCustomersKey = (e: string) => `erp_partner_portal_customers_${e}`;
export const partnerDealsKey     = (e: string) => `erp_partner_portal_deals_${e}`;
export const partnerTargetsKey   = (e: string) => `erp_partner_portal_targets_${e}`;
export const partnerAssetsKey    = (e: string) => `erp_partner_portal_assets_${e}`;
