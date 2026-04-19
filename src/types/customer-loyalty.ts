/**
 * customer-loyalty.ts — Loyalty programme types
 * Sprint 13a. Consumed by Customer Hub + (later) Mobile PWA.
 * [JWT] GET /api/customers/:id/loyalty
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type LoyaltyActionType =
  | 'earn_purchase'     // earned points from a purchase
  | 'earn_referral'     // referred a new customer
  | 'earn_review'       // posted a review
  | 'earn_birthday'     // birthday bonus
  | 'redeem_discount'   // redeemed points for order discount
  | 'redeem_reward'     // redeemed points for a reward item
  | 'expired'           // points expired
  | 'adjustment';       // manual adjustment by admin

export interface LoyaltyLedgerEntry {
  id: string;
  entity_id: string;
  customer_id: string;
  action: LoyaltyActionType;
  points_delta: number;           // positive or negative
  ref_type: string | null;        // 'order' | 'review' | 'manual'
  ref_id: string | null;
  note: string;
  created_at: string;
  expires_at: string | null;      // for earned points (typically 12 months)
}

export interface CustomerLoyaltyState {
  entity_id: string;
  customer_id: string;
  current_tier: LoyaltyTier;
  tier_valid_until: string | null;   // soft-tier grace window
  points_balance: number;            // active, non-expired
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  last_activity_at: string | null;
  enrolled_at: string;
  updated_at: string;
}

/** Tier thresholds — lifetime points earned in trailing 12 months. */
export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 5_000,
  gold: 25_000,
  platinum: 100_000,
};

/** Points earned per ₹ spent, by tier (higher tier = better earn rate). */
export const EARN_RATE_PER_RUPEE: Record<LoyaltyTier, number> = {
  bronze: 1,     // 1 point per ₹1
  silver: 1.25,
  gold: 1.5,
  platinum: 2,
};

/** Redemption rate — points needed per ₹ of discount. */
export const REDEMPTION_RATE = 10;  // 10 points = ₹1 discount

/** Grace period before tier demotion (top-1% discipline). */
export const TIER_GRACE_DAYS = 14;

/** Default point expiry — 12 months from earn. */
export const POINT_EXPIRY_MONTHS = 12;

export interface LoyaltyReward {
  id: string;
  code: string;
  title: string;
  description: string;
  points_cost: number;
  reward_type: 'discount_voucher' | 'free_item' | 'upgrade';
  value_paise?: number;             // for discount_voucher
  item_id?: string;                 // for free_item
  min_tier: LoyaltyTier;
  max_redeems_per_customer: number | null;
  active: boolean;
}

export const loyaltyLedgerKey   = (e: string) => `erp_loyalty_ledger_${e}`;
export const loyaltyStateKey    = (e: string) => `erp_loyalty_state_${e}`;
export const loyaltyRewardsKey  = (e: string) => `erp_loyalty_rewards_${e}`;
export const customerSegmentsKey= (e: string) => `erp_customer_segments_${e}`;
