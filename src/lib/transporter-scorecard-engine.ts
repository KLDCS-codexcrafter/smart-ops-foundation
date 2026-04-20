/**
 * transporter-scorecard-engine.ts — Compute transporter scores from match lines
 * Sprint 15c-3. Pure (no React, no localStorage).
 */

import type { MatchLine, Dispute } from '@/types/freight-reconciliation';
import type { TransporterInvoice } from '@/types/transporter-invoice';
import type {
  TransporterScore, ScorecardWeights, LetterGrade,
} from '@/types/transporter-scorecard';
import { scoreToGrade } from '@/types/transporter-scorecard';

export interface ScorecardInput {
  logistic_id: string;
  logistic_name: string;
  period_from: string;
  period_to: string;
  match_lines: MatchLine[];
  invoices: TransporterInvoice[];
  disputes: Dispute[];
  weights: ScorecardWeights;
  previous_score?: TransporterScore | null;
}

/** Normalize weights so they sum to 100 even if admin entered slightly off. */
function normalizeWeights(w: ScorecardWeights): { d: number; a: number; p: number } {
  const sum = w.dispute_rate_pct + w.accuracy_pct + w.payment_cycle_pct;
  if (sum <= 0) return { d: 40, a: 30, p: 30 };
  return {
    d: (w.dispute_rate_pct / sum) * 100,
    a: (w.accuracy_pct / sum) * 100,
    p: (w.payment_cycle_pct / sum) * 100,
  };
}

export function computeDisputeRateScore(totalLines: number, disputedLines: number): number {
  if (totalLines === 0) return 100;
  const rate = disputedLines / totalLines;
  return Math.max(0, Math.min(100, 100 - rate * 200));
}

export function computeAccuracyScore(totalLines: number, withinToleranceLines: number): number {
  if (totalLines === 0) return 100;
  return (withinToleranceLines / totalLines) * 100;
}

export function computePaymentCycleScore(avgDays: number): number {
  if (avgDays <= 7) return 100;
  if (avgDays >= 60) return 0;
  return 100 * (1 - (avgDays - 7) / 53);
}

export function computeTransporterScore(input: ScorecardInput): TransporterScore {
  const { match_lines, disputes, invoices, weights } = input;

  const totalLines = match_lines.length;
  const disputedIds = new Set(
    disputes.filter(d => d.status !== 'withdrawn').map(d => d.match_line_id),
  );
  const disputedLines = match_lines.filter(m => disputedIds.has(m.id)).length;
  const withinToleranceLines = match_lines.filter(m =>
    m.status === 'exact_match' || m.status === 'within_tolerance',
  ).length;
  const overBilledLines = match_lines.filter(m => m.status === 'over_billed').length;

  const cycleMs = invoices
    .filter(i => i.reconciled_at)
    .map(i => new Date(i.reconciled_at!).getTime() - new Date(i.uploaded_at).getTime());
  const avgCycleDays = cycleMs.length > 0
    ? cycleMs.reduce((s, ms) => s + ms, 0) / cycleMs.length / (1000 * 60 * 60 * 24)
    : 0;

  const disputeScore = computeDisputeRateScore(totalLines, disputedLines);
  const accuracyScore = computeAccuracyScore(totalLines, withinToleranceLines);
  const cycleScore = computePaymentCycleScore(avgCycleDays);

  const norm = normalizeWeights(weights);
  const composite =
    (disputeScore * norm.d + accuracyScore * norm.a + cycleScore * norm.p) / 100;

  const grade: LetterGrade = scoreToGrade(composite);
  const delta = input.previous_score
    ? composite - input.previous_score.composite_score
    : null;

  return {
    logistic_id: input.logistic_id,
    logistic_name: input.logistic_name,
    period_from: input.period_from,
    period_to: input.period_to,
    total_lines: totalLines,
    disputed_lines: disputedLines,
    within_tolerance_lines: withinToleranceLines,
    over_billed_lines: overBilledLines,
    avg_payment_cycle_days: avgCycleDays,
    dispute_rate_score: disputeScore,
    accuracy_score: accuracyScore,
    payment_cycle_score: cycleScore,
    composite_score: composite,
    grade,
    delta_vs_prev: delta,
    weights_used: {
      dispute_rate_pct: norm.d,
      accuracy_pct: norm.a,
      payment_cycle_pct: norm.p,
    },
    computed_at: new Date().toISOString(),
  };
}

export function computeAllScorecards(args: {
  logistics: Array<{ id: string; partyName: string }>;
  match_lines: MatchLine[];
  invoices: TransporterInvoice[];
  disputes: Dispute[];
  weights: ScorecardWeights;
  period_from: string;
  period_to: string;
  previous_scores: TransporterScore[];
}): TransporterScore[] {
  const fromMs = new Date(args.period_from).getTime();
  const toMs = new Date(args.period_to).getTime();

  const invIds = new Set(args.invoices
    .filter(i => {
      const t = new Date(i.uploaded_at).getTime();
      return t >= fromMs && t <= toMs;
    })
    .map(i => i.id));
  const periodMatches = args.match_lines.filter(m => invIds.has(m.invoice_id));
  const periodInvoices = args.invoices.filter(i => invIds.has(i.id));
  const periodDisputes = args.disputes.filter(d => invIds.has(d.invoice_id));

  return args.logistics.map(l => {
    const matches = periodMatches.filter(m => {
      const inv = periodInvoices.find(i => i.id === m.invoice_id);
      return inv?.logistic_id === l.id;
    });
    const invoices = periodInvoices.filter(i => i.logistic_id === l.id);
    const disputes = periodDisputes.filter(d => d.logistic_id === l.id);
    const prev = args.previous_scores.find(p => p.logistic_id === l.id) ?? null;

    return computeTransporterScore({
      logistic_id: l.id,
      logistic_name: l.partyName,
      period_from: args.period_from,
      period_to: args.period_to,
      match_lines: matches,
      invoices,
      disputes,
      weights: args.weights,
      previous_score: prev,
    });
  });
}
