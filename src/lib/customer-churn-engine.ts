/**
 * customer-churn-engine.ts — Churn probability model
 * Companion to CLV engine. Churn = P(customer will NOT order in next 90d).
 * Inputs: days since last order, order frequency, support tickets.
 * Output: 0..1 probability + risk tier.
 * Pure: no React, no localStorage.
 */

export interface ChurnInputs {
  customer_id: string;
  historical_orders: { placed_at: string; value_paise: number }[];
  first_order_at: string | null;
  last_order_at: string | null;
  open_complaints: number;          // support tickets not resolved
  recent_rating_avg: number | null; // last 5 ratings avg, 0-5, null if none
}

export type ChurnRiskTier = 'safe' | 'watch' | 'at_risk' | 'critical' | 'gone';

export interface ChurnResult {
  customer_id: string;
  churn_probability: number;        // 0..1
  risk_tier: ChurnRiskTier;
  days_since_last_order: number;
  avg_days_between_orders: number;  // from historical frequency
  complaint_factor: number;         // 0..1 — how much complaints hurt
  signal: string;                   // human-readable top reason
  computed_at: string;
}

const MS_PER_DAY = 86_400_000;

function daysSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return Infinity;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
}

/** Average days between orders (frequency proxy). */
function avgDaysBetween(orders: { placed_at: string }[]): number {
  if (orders.length < 2) return Infinity;
  const sorted = [...orders].sort((a, b) => a.placed_at.localeCompare(b.placed_at));
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += (new Date(sorted[i].placed_at).getTime() - new Date(sorted[i - 1].placed_at).getTime()) / MS_PER_DAY;
  }
  return Math.round(totalGap / (sorted.length - 1));
}

export function computeChurn(
  inputs: ChurnInputs, now: Date = new Date(),
): ChurnResult {
  const { customer_id, historical_orders, last_order_at, open_complaints, recent_rating_avg } = inputs;

  const dsince = daysSince(last_order_at, now);
  const avgBetween = avgDaysBetween(historical_orders);

  // Base churn rises as days-since exceeds expected gap
  let base = 0;
  if (historical_orders.length === 0) base = 0.5;
  else if (avgBetween === Infinity) base = 0.3;
  else if (dsince <= avgBetween) base = 0.1;
  else if (dsince <= avgBetween * 2) base = 0.35;
  else if (dsince <= avgBetween * 4) base = 0.65;
  else base = 0.9;

  // Complaint factor — each open complaint adds 10%
  const complaintFactor = Math.min(0.3, open_complaints * 0.1);

  // Recent rating factor — low ratings bump churn
  let ratingBump = 0;
  if (recent_rating_avg !== null) {
    if (recent_rating_avg < 2) ratingBump = 0.25;
    else if (recent_rating_avg < 3) ratingBump = 0.15;
    else if (recent_rating_avg < 4) ratingBump = 0.05;
  }

  const total = Math.min(1, base + complaintFactor + ratingBump);

  const riskTier: ChurnRiskTier =
    dsince > 365 ? 'gone' :
    total >= 0.8 ? 'critical' :
    total >= 0.55 ? 'at_risk' :
    total >= 0.3 ? 'watch' :
    'safe';

  let signal = 'Active and engaged';
  if (riskTier === 'gone') signal = `No order for ${dsince} days — likely churned`;
  else if (riskTier === 'critical') signal = `Overdue by ${dsince - avgBetween} days vs usual cycle`;
  else if (riskTier === 'at_risk' && open_complaints > 0) signal = `${open_complaints} open complaint(s)`;
  else if (riskTier === 'at_risk') signal = 'Order cadence slowing';
  else if (riskTier === 'watch') signal = 'Gap widening — monitor';

  return {
    customer_id,
    churn_probability: Math.round(total * 100) / 100,
    risk_tier: riskTier,
    days_since_last_order: dsince === Infinity ? 999 : dsince,
    avg_days_between_orders: avgBetween === Infinity ? 0 : avgBetween,
    complaint_factor: Math.round(complaintFactor * 100) / 100,
    signal,
    computed_at: now.toISOString(),
  };
}

/** Rank customers by churn risk descending. Returns top-N at-risk. */
export function highestChurnRisk(results: ChurnResult[], limit: number = 10): ChurnResult[] {
  return [...results]
    .filter(r => r.risk_tier !== 'safe' && r.risk_tier !== 'gone')
    .sort((a, b) => b.churn_probability - a.churn_probability)
    .slice(0, limit);
}
