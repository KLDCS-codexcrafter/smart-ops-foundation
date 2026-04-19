/**
 * customer-streak.ts — Monthly ordering streak + milestone rewards
 * Out-of-box idea #2. Engine: reward customers who place orders every
 * month for N consecutive months. Hard-to-game (1 order/month max counts)
 * with 1-month grace.
 */

export type StreakMilestoneKind =
  | 'permanent_discount'    // permanent X% off future orders
  | 'loyalty_points_boost'  // N bonus points
  | 'tier_upgrade';         // one-time tier bump

export interface StreakMilestone {
  id: string;
  months_required: number;          // 3, 6, 12, 24...
  title: string;
  description: string;
  kind: StreakMilestoneKind;
  value: number;                    // percent for discount, points for boost
  unlocked_at: string;
}

export interface CustomerStreakState {
  entity_id: string;
  customer_id: string;
  current_streak_months: number;
  longest_streak_months: number;
  last_qualifying_month: string;    // ISO YYYY-MM of last month with 1+ order
  grace_used: boolean;              // true if 1-month gap already forgiven
  active_milestones: StreakMilestone[];
  updated_at: string;
}

/** Static milestone config — shown on welcome as progression ladder. */
export const STREAK_MILESTONES: {
  months_required: number; kind: StreakMilestoneKind;
  value: number; title: string; description: string;
}[] = [
  { months_required: 3,  kind: 'loyalty_points_boost', value: 500,
    title: 'Quarter Streak', description: '3 months in a row · 500 bonus points' },
  { months_required: 6,  kind: 'permanent_discount', value: 5,
    title: 'Half-Year Hero', description: '6 months in a row · 5% permanent discount' },
  { months_required: 12, kind: 'tier_upgrade', value: 1,
    title: 'Year-Long Loyalist', description: '12 months · one-time tier upgrade' },
  { months_required: 24, kind: 'permanent_discount', value: 10,
    title: 'Two-Year Legend', description: '24 months · 10% permanent discount' },
];

export const GRACE_MONTHS = 1;   // one 'missed month' allowed without breaking streak

export const customerStreakKey = (e: string) => `erp_customer_streaks_${e}`;
