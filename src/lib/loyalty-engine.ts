/**
 * loyalty-engine.ts — Pure loyalty state computations
 * No React. No localStorage. Callers hydrate entries + pass state.
 */

import type {
  CustomerLoyaltyState, LoyaltyLedgerEntry, LoyaltyTier, LoyaltyReward,
} from '@/types/customer-loyalty';
import {
  TIER_THRESHOLDS, EARN_RATE_PER_RUPEE, REDEMPTION_RATE,
  TIER_GRACE_DAYS,
} from '@/types/customer-loyalty';

const MS_PER_DAY = 86_400_000;
const TRAILING_12M_MS = 365 * MS_PER_DAY;

/** Trailing 12-month earned points (for tier calc). */
export function trailingEarnedPoints(
  customerId: string, ledger: LoyaltyLedgerEntry[],
): number {
  const cutoff = Date.now() - TRAILING_12M_MS;
  return ledger
    .filter(e =>
      e.customer_id === customerId &&
      e.points_delta > 0 &&
      new Date(e.created_at).getTime() >= cutoff)
    .reduce((sum, e) => sum + e.points_delta, 0);
}

/** Tier that customer qualifies for by trailing points. */
export function computeEarnedTier(trailingEarned: number): LoyaltyTier {
  if (trailingEarned >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (trailingEarned >= TIER_THRESHOLDS.gold)     return 'gold';
  if (trailingEarned >= TIER_THRESHOLDS.silver)   return 'silver';
  return 'bronze';
}

/** Soft-tier logic — never demote instantly; grace period. */
export function applySoftTier(
  current: LoyaltyTier, earned: LoyaltyTier,
  gracePeriodEndsAt: string | null, now: Date = new Date(),
): { tier: LoyaltyTier; valid_until: string | null } {
  const RANK: Record<LoyaltyTier, number> =
    { bronze: 0, silver: 1, gold: 2, platinum: 3 };

  // Promotion — instant
  if (RANK[earned] > RANK[current]) {
    return { tier: earned, valid_until: null };
  }

  // Same tier — keep
  if (earned === current) {
    return { tier: current, valid_until: null };
  }

  // Demotion candidate — start grace or honour ongoing grace
  if (!gracePeriodEndsAt) {
    const graceEnd = new Date(now.getTime() + TIER_GRACE_DAYS * MS_PER_DAY);
    return { tier: current, valid_until: graceEnd.toISOString() };
  }

  // Grace period expired -> demote
  if (new Date(gracePeriodEndsAt).getTime() < now.getTime()) {
    return { tier: earned, valid_until: null };
  }

  // Still within grace
  return { tier: current, valid_until: gracePeriodEndsAt };
}

/** Active (non-expired) points balance. */
export function activePointsBalance(
  customerId: string, ledger: LoyaltyLedgerEntry[], now: Date = new Date(),
): number {
  const nowMs = now.getTime();
  let balance = 0;
  for (const e of ledger) {
    if (e.customer_id !== customerId) continue;
    if (e.points_delta > 0) {
      // earned — skip if expired
      if (e.expires_at && new Date(e.expires_at).getTime() < nowMs) continue;
      balance += e.points_delta;
    } else {
      // redemption/adjustment/expiry
      balance += e.points_delta;
    }
  }
  return Math.max(0, balance);
}

/** Build refreshed state from ledger. */
export function rebuildState(
  customerId: string, entityCode: string,
  ledger: LoyaltyLedgerEntry[], prev: CustomerLoyaltyState | null,
): CustomerLoyaltyState {
  const trailing = trailingEarnedPoints(customerId, ledger);
  const earnedTier = computeEarnedTier(trailing);
  const currentTier: LoyaltyTier = prev?.current_tier ?? 'bronze';
  const graceEnd = prev?.tier_valid_until ?? null;
  const { tier, valid_until } = applySoftTier(currentTier, earnedTier, graceEnd);

  const myEntries = ledger.filter(e => e.customer_id === customerId);
  const earned = myEntries.filter(e => e.points_delta > 0).reduce((s, e) => s + e.points_delta, 0);
  const redeemed = myEntries.filter(e => e.points_delta < 0).reduce((s, e) => s + Math.abs(e.points_delta), 0);
  const lastActivity = myEntries.length
    ? [...myEntries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
    : null;

  return {
    entity_id: entityCode, customer_id: customerId,
    current_tier: tier,
    tier_valid_until: valid_until,
    points_balance: activePointsBalance(customerId, ledger),
    lifetime_points_earned: earned,
    lifetime_points_redeemed: redeemed,
    last_activity_at: lastActivity,
    enrolled_at: prev?.enrolled_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Points earned for a purchase — respects tier earn rate. */
export function pointsForPurchase(
  amountPaise: number, tier: LoyaltyTier,
): number {
  const rupees = amountPaise / 100;
  return Math.floor(rupees * EARN_RATE_PER_RUPEE[tier]);
}

/** Discount paise from N points. */
export function pointsToDiscountPaise(points: number): number {
  return Math.floor((points / REDEMPTION_RATE) * 100);
}

/** Which rewards can the customer see/redeem given state? */
export function eligibleRewards(
  state: CustomerLoyaltyState, allRewards: LoyaltyReward[],
  redemptionCounts: Map<string, number>,
): LoyaltyReward[] {
  const RANK: Record<LoyaltyTier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
  return allRewards.filter(r => {
    if (!r.active) return false;
    if (RANK[state.current_tier] < RANK[r.min_tier]) return false;
    if (state.points_balance < r.points_cost) return false;
    if (r.max_redeems_per_customer !== null) {
      const used = redemptionCounts.get(r.id) ?? 0;
      if (used >= r.max_redeems_per_customer) return false;
    }
    return true;
  });
}

/** Soft-tier grace countdown in days (for UI display). */
export function graceRemainingDays(state: CustomerLoyaltyState): number | null {
  if (!state.tier_valid_until) return null;
  const ms = new Date(state.tier_valid_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / MS_PER_DAY));
}
