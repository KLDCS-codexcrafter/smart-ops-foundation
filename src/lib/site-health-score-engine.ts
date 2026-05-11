/**
 * @file        src/lib/site-health-score-engine.ts
 * @purpose     Site Health Score canonical engine (OOB #3) · 5-dim weighted 0-100 per Q-LOCK-13a · rule-based Phase 1 stub
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Q-LOCK-13a · Block D.2
 * @decisions   D-NEW-CR pattern (rule-based Phase 1 · ML Phase 2)
 * @[JWT]       Phase 2 ML refinement candidate
 */

import { getSite } from './sitex-engine';
import { computeImprestHealthMetrics } from './sitex-imprest-engine';

export interface SiteHealthScoreBreakdown {
  site_id: string;
  overall_score: number;
  rag_status: 'green' | 'amber' | 'red';
  dimensions: {
    safety: { score: number; weight: 0.25; evidence: string };
    schedule: { score: number; weight: 0.25; evidence: string };
    cost: { score: number; weight: 0.20; evidence: string };
    quality: { score: number; weight: 0.15; evidence: string };
    workforce: { score: number; weight: 0.15; evidence: string };
  };
  computed_at: string;
}

export function getSiteHealthRAG(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

export function computeSiteHealthScore(entityCode: string, siteId: string): SiteHealthScoreBreakdown {
  const site = getSite(entityCode, siteId);
  const now = new Date().toISOString();

  // Stub heuristics; Phase 2 plugs real signals
  const incidents30d = 0;
  const plannedProgress = 50;
  const actualProgress = 48;
  const costToDate = site?.cost_to_date ?? 0;
  const budget = site?.approved_budget || 1;
  const closedNcrs = 0;
  const totalNcrs = 0;
  const attendanceAvg = 92;

  const safety = Math.max(0, 100 - incidents30d * 20);
  const schedule = plannedProgress > 0 ? Math.min(120, (actualProgress / plannedProgress) * 100) : 100;
  const costRatio = costToDate / budget;
  const cost = Math.max(0, Math.min(100, 100 - (costRatio - 1) * 200));
  const quality = totalNcrs > 0 ? (closedNcrs / totalNcrs) * 100 : 100;
  const workforce = (attendanceAvg / 100) * 100;

  // Optional imprest tilt (small influence on cost dim)
  const imp = computeImprestHealthMetrics(entityCode, siteId);
  const adjustedCost = (cost * 0.7) + (imp.health_score_contribution * 0.3);

  const overall = Math.round(
    0.25 * safety + 0.25 * schedule + 0.20 * adjustedCost + 0.15 * quality + 0.15 * workforce,
  );

  return {
    site_id: siteId,
    overall_score: Math.max(0, Math.min(100, overall)),
    rag_status: getSiteHealthRAG(overall),
    dimensions: {
      safety: { score: safety, weight: 0.25, evidence: `incidents_30d=${incidents30d}` },
      schedule: { score: schedule, weight: 0.25, evidence: `actual=${actualProgress}% planned=${plannedProgress}%` },
      cost: { score: adjustedCost, weight: 0.20, evidence: `cost/budget=${costRatio.toFixed(2)} · imprest=${imp.health_score_contribution}` },
      quality: { score: quality, weight: 0.15, evidence: `${closedNcrs}/${totalNcrs} NCRs closed` },
      workforce: { score: workforce, weight: 0.15, evidence: `attendance_avg=${attendanceAvg}%` },
    },
    computed_at: now,
  };
}
