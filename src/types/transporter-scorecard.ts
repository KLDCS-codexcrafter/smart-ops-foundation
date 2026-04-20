/**
 * transporter-scorecard.ts — Transporter performance scoring types
 * Sprint 15c-3. Numeric 0-100 score with derived 7-bucket letter grade.
 * [JWT] GET/POST /api/dispatch/transporter-scorecards
 */

export type LetterGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';

/** Grade thresholds — change in ONE place if business rules shift. */
export const GRADE_THRESHOLDS: Array<{ min: number; grade: LetterGrade }> = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 85, grade: 'B+' },
  { min: 75, grade: 'B' },
  { min: 65, grade: 'C+' },
  { min: 55, grade: 'C' },
  { min: 0,  grade: 'D' },
];

export function scoreToGrade(score: number): LetterGrade {
  const clamped = Math.max(0, Math.min(100, score));
  for (const t of GRADE_THRESHOLDS) {
    if (clamped >= t.min) return t.grade;
  }
  return 'D';
}

/** Metric weights — percentages that must sum to 100. */
export interface ScorecardWeights {
  dispute_rate_pct: number;
  accuracy_pct: number;
  payment_cycle_pct: number;
  updated_at: string;
  updated_by: string;
}

export const DEFAULT_WEIGHTS: Omit<ScorecardWeights, 'updated_at' | 'updated_by'> = {
  dispute_rate_pct: 40,
  accuracy_pct: 30,
  payment_cycle_pct: 30,
};

/** Weight presets — tenants pick from these or customize. */
export const WEIGHT_PRESETS: Record<string, Omit<ScorecardWeights, 'updated_at' | 'updated_by'>> = {
  balanced: { dispute_rate_pct: 33, accuracy_pct: 33, payment_cycle_pct: 34 },
  accuracy: { dispute_rate_pct: 50, accuracy_pct: 40, payment_cycle_pct: 10 },
  cost:     { dispute_rate_pct: 30, accuracy_pct: 30, payment_cycle_pct: 40 },
  default:  { dispute_rate_pct: 40, accuracy_pct: 30, payment_cycle_pct: 30 },
};

export const scorecardWeightsKey = (e: string) => `erp_scorecard_weights_${e}`;

/** Computed score for a transporter over a period. */
export interface TransporterScore {
  logistic_id: string;
  logistic_name: string;
  period_from: string;
  period_to: string;
  total_lines: number;
  disputed_lines: number;
  within_tolerance_lines: number;
  over_billed_lines: number;
  avg_payment_cycle_days: number;
  dispute_rate_score: number;
  accuracy_score: number;
  payment_cycle_score: number;
  composite_score: number;
  grade: LetterGrade;
  delta_vs_prev: number | null;
  weights_used: {
    dispute_rate_pct: number;
    accuracy_pct: number;
    payment_cycle_pct: number;
  };
  computed_at: string;
}

export const transporterScoresKey = (e: string) => `erp_transporter_scores_${e}`;

/** ROI benchmark — tenant's monthly subscription cost for ROI math. */
export interface ROIBenchmark {
  monthly_subscription_paise: number;
  tier_label: string;
  updated_at: string;
  updated_by: string;
}

export const DEFAULT_ROI_BENCHMARK: ROIBenchmark = {
  monthly_subscription_paise: 249900, // ₹2,499 Growth tier
  tier_label: 'Growth',
  updated_at: new Date(0).toISOString(),
  updated_by: 'system',
};

export const roiBenchmarkKey = (e: string) => `erp_roi_benchmark_${e}`;

/** Top-line opportunity surfaced on the ROI dashboard. */
export interface SavingsOpportunity {
  match_line_id: string;
  lr_no: string;
  logistic_id: string;
  logistic_name: string;
  variance_amount: number;
  status: string;
  dispute_id: string | null;
  dispute_status: string | null;
  age_days: number;
  resolution_potential: 'high' | 'medium' | 'low';
}
