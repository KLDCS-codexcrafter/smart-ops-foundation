/**
 * @file        src/lib/comply360-health-score-engine.ts
 * @purpose     Compliance Health Score · OOB-1 · 0-100 with breakdown by overdue/upcoming/breach/coverage
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · OOB-1
 * @decisions   D-S69-1 (100% native) · D-S69-3 (Health Score engine) · D-S69-4 (LIVE tile refresh)
 * @iso         Reliability · Maintainability
 * @disciplines SD-13
 */

export type HealthBand = 'excellent' | 'good' | 'warning' | 'critical';

export interface FilingObligation {
  id: string;
  /** e.g. 'GSTR-3B Apr 2026', 'TDS Q4 FY25-26' */
  label: string;
  /** Mega-menu module id (sidebar key) */
  module: string;
  due_date: string; // ISO yyyy-mm-dd
  status: 'pending' | 'filed' | 'overdue' | 'breach';
  /** Optional acknowledgement / ARN once filed */
  arn?: string;
  filed_at?: string;
}

export interface HealthBreakdown {
  total: number;
  overdue_penalty: number;
  upcoming_penalty: number;
  breach_penalty: number;
  coverage_penalty: number;
  band: HealthBand;
  counts: {
    total: number;
    filed: number;
    pending: number;
    overdue: number;
    breach: number;
    due_in_7_days: number;
  };
}

export function bandFromScore(score: number): HealthBand {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Compute Compliance Health Score (0-100).
 * Penalties:
 *  - overdue: 6 pts per overdue filing (cap 40)
 *  - breach: 12 pts per statutory breach (cap 30)
 *  - upcoming <7d: 2 pts per filing (cap 15)
 *  - coverage: 1 pt per pending module beyond first 5 (cap 15)
 */
export function computeComplianceHealth(
  obligations: FilingObligation[],
  asOf: string = new Date().toISOString().slice(0, 10),
): HealthBreakdown {
  const counts = {
    total: obligations.length,
    filed: 0,
    pending: 0,
    overdue: 0,
    breach: 0,
    due_in_7_days: 0,
  };

  for (const o of obligations) {
    if (o.status === 'filed') counts.filed += 1;
    else if (o.status === 'overdue') counts.overdue += 1;
    else if (o.status === 'breach') counts.breach += 1;
    else counts.pending += 1;
    if (o.status === 'pending') {
      const d = daysBetween(asOf, o.due_date);
      if (d >= 0 && d <= 7) counts.due_in_7_days += 1;
    }
  }

  const overdue_penalty = Math.min(40, counts.overdue * 6);
  const breach_penalty = Math.min(30, counts.breach * 12);
  const upcoming_penalty = Math.min(15, counts.due_in_7_days * 2);
  const coverage_penalty = Math.min(15, Math.max(0, counts.pending - 5));

  const total = Math.max(
    0,
    100 - overdue_penalty - breach_penalty - upcoming_penalty - coverage_penalty,
  );

  return {
    total,
    overdue_penalty,
    upcoming_penalty,
    breach_penalty,
    coverage_penalty,
    band: bandFromScore(total),
    counts,
  };
}

export function nextUpcoming(
  obligations: FilingObligation[],
  limit = 5,
  asOf: string = new Date().toISOString().slice(0, 10),
): FilingObligation[] {
  return [...obligations]
    .filter((o) => o.status === 'pending' || o.status === 'overdue')
    .sort((a, b) => daysBetween(asOf, a.due_date) - daysBetween(asOf, b.due_date))
    .slice(0, limit);
}
