/**
 * customer-clv-engine.ts — Pure CLV projection
 * Formula: projected_12m = AOV * frequency_per_year * retention_prob * gross_margin
 * Retention decays linearly after CHURN_DAYS_THRESHOLD days of silence.
 */

import type { CLVInputs, CLVResult } from '@/types/customer-clv';
import {
  DEFAULT_GROSS_MARGIN, CHURN_DAYS_THRESHOLD, CLV_TIER_THRESHOLDS,
} from '@/types/customer-clv';

const MS_PER_DAY = 86_400_000;
const TRAILING_12M_MS = 365 * MS_PER_DAY;

function daysSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return Infinity;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
}

/** Retention probability 0..1 — decays after threshold days of silence. */
function retentionProb(lastOrderAt: string | null, hasChurned: boolean): number {
  if (hasChurned) return 0;
  const days = daysSince(lastOrderAt);
  if (days === Infinity) return 0;
  if (days <= 30)  return 0.95;
  if (days <= 90)  return 0.80;
  if (days <= CHURN_DAYS_THRESHOLD) return 0.55;
  // Linear decay after threshold — zero at 2x threshold
  const extra = days - CHURN_DAYS_THRESHOLD;
  return Math.max(0, 0.5 - (extra / CHURN_DAYS_THRESHOLD) * 0.5);
}

export function computeCLV(
  inputs: CLVInputs, now: Date = new Date(),
): CLVResult {
  const { customer_id, historical_orders, first_order_at, last_order_at, has_churned } = inputs;

  const historical = historical_orders.reduce((s, o) => s + o.value_paise, 0);

  const cutoff = now.getTime() - TRAILING_12M_MS;
  const trailing = historical_orders
    .filter(o => new Date(o.placed_at).getTime() >= cutoff)
    .reduce((s, o) => s + o.value_paise, 0);

  const trailingOrders = historical_orders.filter(o =>
    new Date(o.placed_at).getTime() >= cutoff).length;

  const aov = trailingOrders > 0 ? Math.round(trailing / trailingOrders) : 0;

  // Frequency — orders per year based on tenure
  let frequency = 0;
  if (first_order_at && historical_orders.length > 0) {
    const tenureDays = Math.max(1, daysSince(first_order_at, now));
    frequency = (historical_orders.length / tenureDays) * 365;
  }

  const retention = retentionProb(last_order_at, has_churned);

  const projected = Math.round(aov * frequency * retention * DEFAULT_GROSS_MARGIN);

  const tier: CLVResult['clv_rank_tier'] =
    has_churned ? 'churned' :
    retention < 0.3 ? 'at_risk' :
    projected >= CLV_TIER_THRESHOLDS.vip      ? 'vip' :
    projected >= CLV_TIER_THRESHOLDS.growth   ? 'growth' :
    projected >= CLV_TIER_THRESHOLDS.standard ? 'standard' :
    'at_risk';

  return {
    customer_id,
    historical_value_paise: historical,
    trailing_12m_value_paise: trailing,
    avg_order_value_paise: aov,
    purchase_frequency_per_year: Math.round(frequency * 10) / 10,
    retention_probability: Math.round(retention * 100) / 100,
    projected_12m_value_paise: projected,
    clv_rank_tier: tier,
    computed_at: now.toISOString(),
  };
}

/** Rank a list of customers by projected CLV desc. Returns top N. */
export function topCLV(
  results: CLVResult[], limit: number = 10,
): CLVResult[] {
  return [...results]
    .sort((a, b) => b.projected_12m_value_paise - a.projected_12m_value_paise)
    .slice(0, limit);
}
