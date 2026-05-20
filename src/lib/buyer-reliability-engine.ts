/**
 * @file        src/lib/buyer-reliability-engine.ts
 * @purpose     Buyer Reliability Score computation · country risk + credit util + payment history · Moat #18 FOUNDATION
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import type { BuyerReliabilityClass, BuyerReliabilityComponents, CountryRiskLevel } from '@/types/buyer-reliability-score';
import { COUNTRY_RISK_TABLE, BUYER_RELIABILITY_THRESHOLDS } from '@/types/buyer-reliability-score';
import type { ForeignCustomer } from '@/types/foreign-customer';

export function classifyReliability(score: number): BuyerReliabilityClass {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= BUYER_RELIABILITY_THRESHOLDS.excellent.min) return 'excellent';
  if (clamped >= BUYER_RELIABILITY_THRESHOLDS.good.min) return 'good';
  if (clamped >= BUYER_RELIABILITY_THRESHOLDS.attention.min) return 'attention';
  return 'risk';
}

export function resolveCountryRisk(countryCode: string): CountryRiskLevel {
  return COUNTRY_RISK_TABLE[countryCode] ?? 'medium';
}

export function computeBuyerReliabilityScore(
  customer: ForeignCustomer,
  currentCreditUtilizationPct: number = 0,
  recentPaymentHistoryDelta: number = 0,
  isSanctioned: boolean = false,
): BuyerReliabilityComponents {
  if (isSanctioned) {
    return {
      base_score: 70,
      country_risk_delta: 0,
      credit_utilization_delta: 0,
      payment_history_delta: 0,
      sanctions_check_delta: -100,
      computed_score: 0,
      classification: 'risk',
      computed_at: new Date().toISOString(),
    };
  }
  const base = 70;
  const countryRisk = resolveCountryRisk(customer.country_code);
  const countryRiskDelta = countryRisk === 'high' ? -20 : countryRisk === 'medium' ? -10 : 0;
  const creditUtilDelta = currentCreditUtilizationPct > 80 ? -10 : currentCreditUtilizationPct > 50 ? -5 : 0;
  const computed = Math.max(0, Math.min(100, base + countryRiskDelta + creditUtilDelta + recentPaymentHistoryDelta));
  return {
    base_score: base,
    country_risk_delta: countryRiskDelta,
    credit_utilization_delta: creditUtilDelta,
    payment_history_delta: recentPaymentHistoryDelta,
    sanctions_check_delta: 0,
    computed_score: computed,
    classification: classifyReliability(computed),
    computed_at: new Date().toISOString(),
  };
}

export function aggregateReliabilityForDashboard(
  customers: ForeignCustomer[],
): {
  total: number;
  by_class: Record<BuyerReliabilityClass, number>;
  high_risk_count: number;
  avg_score: number;
} {
  const counts: Record<BuyerReliabilityClass, number> = { excellent: 0, good: 0, attention: 0, risk: 0 };
  let totalScore = 0;
  for (const c of customers) {
    const score = c.buyer_reliability_score ?? 70;
    const cls = classifyReliability(score);
    counts[cls] += 1;
    totalScore += score;
  }
  return {
    total: customers.length,
    by_class: counts,
    high_risk_count: counts.risk,
    avg_score: customers.length > 0 ? Math.round(totalScore / customers.length) : 0,
  };
}
