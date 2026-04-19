/**
 * plan-features.ts — 3-tier SaaS feature matrix for OperixGo Mobile.
 * Reuses PlanTier from card-entitlement.ts.
 */

import type { PlanTier } from '@/types/card-entitlement';

export type FeatureId =
  | 'catalog_browse'
  | 'place_orders'
  | 'payment_tracking'
  | 'schemes_visibility'
  | 'loyalty_visibility'
  | 'voice_order'
  | 'offline_mode'
  | 'distributor_hierarchy'
  | 'credit_request'
  | 'api_access'
  | 'push_notifications';

export interface FeatureMeta {
  id: FeatureId;
  label: string;
  description: string;
  min_tier: PlanTier;
}

export const PLAN_TIER_RANK: Record<PlanTier, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

export const PLAN_PRICING_INR_PER_MONTH: Record<PlanTier, number> = {
  trial: 0,
  starter: 999,
  growth: 2499,
  enterprise: 7499,
};

export const FEATURE_MATRIX: FeatureMeta[] = [
  { id: 'catalog_browse',        label: 'Catalog browsing',        description: 'Browse all products',          min_tier: 'starter' },
  { id: 'place_orders',          label: 'Place orders',            description: 'Submit orders',                min_tier: 'starter' },
  { id: 'payment_tracking',      label: 'Payment tracking',        description: 'See payments due/paid',        min_tier: 'starter' },
  { id: 'schemes_visibility',    label: 'Promotional schemes',     description: 'See applicable schemes',       min_tier: 'growth' },
  { id: 'loyalty_visibility',    label: 'Loyalty programme',       description: 'Points + tier + rewards',      min_tier: 'growth' },
  { id: 'voice_order',           label: 'Voice-to-order',          description: 'Hindi/English voice ordering', min_tier: 'growth' },
  { id: 'offline_mode',          label: 'Offline mode',            description: 'Order without network',        min_tier: 'growth' },
  { id: 'distributor_hierarchy', label: 'Distributor hierarchy',   description: 'Downstream view',              min_tier: 'enterprise' },
  { id: 'credit_request',        label: 'Credit request workflow', description: 'Request credit increase',      min_tier: 'enterprise' },
  { id: 'api_access',            label: 'API access',              description: 'Integrate with your systems',  min_tier: 'enterprise' },
  { id: 'push_notifications',    label: 'Push notifications',      description: 'Real-time order updates',      min_tier: 'enterprise' },
];

/** Lookup helper. */
export function featureMeta(id: FeatureId): FeatureMeta | undefined {
  return FEATURE_MATRIX.find((f) => f.id === id);
}
