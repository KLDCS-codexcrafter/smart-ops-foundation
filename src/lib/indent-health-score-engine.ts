/**
 * @file        indent-health-score-engine.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block C1 · OOB-4
 * @purpose     Live 0-100 health score with breakdown by age/bottleneck/vendor/price-drift.
 * @disciplines SD-13
 */
import type { MaterialIndent } from '@/types/material-indent';
import { computeIndentHealthScore, indentAgeDays } from './requestx-report-engine';

export interface HealthBreakdown {
  total: number;
  age_penalty: number;
  bottleneck_penalty: number;
  vendor_penalty: number;
  price_drift_penalty: number;
  band: 'excellent' | 'good' | 'warning' | 'critical';
}

export function bandFromScore(score: number): HealthBreakdown['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

export function computeHealthBreakdown(indent: MaterialIndent): HealthBreakdown {
  const days = indentAgeDays(indent.date);
  const age_penalty = days > 7 ? Math.min(30, (days - 7) * 1.5) : 0;
  let bottleneck_penalty = 0;
  if (indent.status === 'pending_hod' && days > 2) bottleneck_penalty += 15;
  if (indent.status === 'pending_purchase' && days > 5) bottleneck_penalty += 15;
  if (indent.status === 'pending_finance' && days > 7) bottleneck_penalty += 15;
  if (indent.status === 'rejected' || indent.status === 'cancelled') bottleneck_penalty += 40;
  if (indent.status === 'short_supplied' || indent.status === 'quality_rejected_partial') bottleneck_penalty += 20;
  const vendor_penalty = !indent.preferred_vendor_id ? 5 : 0;
  const driftLines = indent.lines.filter(l => l.estimated_rate <= 0).length;
  const price_drift_penalty = Math.min(10, driftLines * 3);
  const total = computeIndentHealthScore(indent);
  return {
    total,
    age_penalty: Math.round(age_penalty),
    bottleneck_penalty,
    vendor_penalty,
    price_drift_penalty,
    band: bandFromScore(total),
  };
}

export function topNByHealthAscending(indents: MaterialIndent[], n: number): MaterialIndent[] {
  return [...indents]
    .map(i => ({ i, s: computeIndentHealthScore(i) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, n)
    .map(x => x.i);
}
