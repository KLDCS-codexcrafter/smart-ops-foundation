/**
 * feature-gate-engine.ts — Pure gate evaluator.
 * Callers pass plan + featureId, get allowed/locked decision.
 */

import type { PlanTier } from '@/types/card-entitlement';
import {
  PLAN_TIER_RANK,
  featureMeta,
  type FeatureId,
} from '@/types/plan-features';

export interface GateResult {
  allowed: boolean;
  reason?: string;
  required_tier?: PlanTier;
  upgrade_prompt?: string;
}

export function canUseFeature(plan: PlanTier, featureId: FeatureId): GateResult {
  const meta = featureMeta(featureId);
  if (!meta) return { allowed: false, reason: 'Unknown feature' };

  const userRank = PLAN_TIER_RANK[plan];
  const requiredRank = PLAN_TIER_RANK[meta.min_tier];

  if (userRank >= requiredRank) return { allowed: true };

  return {
    allowed: false,
    reason: `${meta.label} requires ${meta.min_tier.toUpperCase()} tier`,
    required_tier: meta.min_tier,
    upgrade_prompt: `Upgrade to ${meta.min_tier.toUpperCase()} to unlock ${meta.label}`,
  };
}

/** Batch evaluation for feature dashboards. */
export function evaluateAll(plan: PlanTier): Map<FeatureId, GateResult> {
  const out = new Map<FeatureId, GateResult>();
  const ids: FeatureId[] = [
    'catalog_browse', 'place_orders', 'payment_tracking',
    'schemes_visibility', 'loyalty_visibility', 'voice_order', 'offline_mode',
    'distributor_hierarchy', 'credit_request', 'api_access', 'push_notifications',
  ];
  for (const id of ids) out.set(id, canUseFeature(plan, id));
  return out;
}
