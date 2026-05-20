/**
 * @file        src/lib/realisation-feedback-engine.ts
 * @purpose     Moat #18 Buyer Reliability FULL FEEDBACK CLOSURE · sibling extension · buyer-reliability-engine 0-diff
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q4=a · NEW sibling NOT modify buyer-reliability-engine.ts
 */
import type { ExportRealisation, FEMAState } from '@/types/export-realisation';

export function computeDaysToRealiseFactor(realisations: ExportRealisation[]): number {
  const fullyRealised = realisations.filter((r) => r.status === 'fully_realised');
  if (fullyRealised.length === 0) return 0;
  const avgDays = fullyRealised.reduce((sum, r) => {
    const firstReceipt = r.receipts[0];
    if (!firstReceipt) return sum;
    const dispatched = new Date(r.goods_dispatched_date);
    const received = new Date(firstReceipt.received_date);
    const days = Math.floor((received.getTime() - dispatched.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0) / fullyRealised.length;
  if (avgDays <= 30) return 5;
  if (avgDays <= 60) return 3;
  if (avgDays <= 90) return 1;
  if (avgDays <= 180) return 0;
  if (avgDays <= 225) return -2;
  return -5;
}

export function computeFEMAStatePenalty(realisations: ExportRealisation[]): number {
  const stateWeight: Record<FEMAState, number> = {
    safe: 0, attention: -1, warning: -3, critical: -5, overdue: -10,
  };
  if (realisations.length === 0) return 0;
  const totalWeight = realisations.reduce((sum, r) => sum + stateWeight[r.fema_state], 0);
  return Math.floor(totalWeight / realisations.length);
}

export function computeRealisationHistoryFactor(realisations: ExportRealisation[]): number {
  const fullyRealisedCount = realisations.filter((r) => r.status === 'fully_realised').length;
  return Math.min(10, fullyRealisedCount * 2);
}

export interface ReliabilityFeedbackImpact {
  days_to_realise_factor: number;
  fema_state_penalty: number;
  realisation_history_factor: number;
  net_impact: number;
  rationale: string;
}

export function computeReliabilityFeedbackImpact(realisations: ExportRealisation[]): ReliabilityFeedbackImpact {
  const days_to_realise_factor = computeDaysToRealiseFactor(realisations);
  const fema_state_penalty = computeFEMAStatePenalty(realisations);
  const realisation_history_factor = computeRealisationHistoryFactor(realisations);
  const net_impact = days_to_realise_factor + fema_state_penalty + realisation_history_factor;
  return {
    days_to_realise_factor, fema_state_penalty, realisation_history_factor, net_impact,
    rationale: `Days-to-realise ${days_to_realise_factor >= 0 ? '+' : ''}${days_to_realise_factor} · FEMA penalty ${fema_state_penalty} · Realisation history +${realisation_history_factor} = ${net_impact >= 0 ? '+' : ''}${net_impact}`,
  };
}
