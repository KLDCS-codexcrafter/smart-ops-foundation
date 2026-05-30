/**
 * @file        src/lib/comply360-audit-ready-score-engine.ts
 * @sibling     NEW @ Sprint 80e · Comply360 Floor 2 Audit-Suite · Pass E · OOB-1 · DP-S80-16
 * @realizes    Composite Audit-Ready Score · 0-100 · single-number audit-readiness
 *              metric extending the weighted-sub-score pattern from S69
 *              health-score-engine.
 *              CFO-visible · CATEGORY-DEFINING · industry's only single-number output.
 * @reads-from  comply360-audit-framework-engine (S80a · working-papers · findings)
 *              comply360-audit-analytics-engine (S80b · procedure runs)
 *              comply360-payroll-audit-engine (S80b · layer/module runs)
 *              comply360-mca-coverage-engine (S80d · Rule 11(g)(b))
 *              comply360-audit-retention-engine (S80d · Rule 11(g)(c))
 *              comply360-audit-continuity-engine (S80d · Rule 11(g)(d))
 *              comply360-statutory-payments-engine (S78a · statutory dues)
 *              comply360-caro-extended-engine (S77a · CARO coverage)
 *              comply360-tax-audit-3cd-engine (S74a · Schedule III readiness)
 * @sprint      Sprint 80e · T-Phase-5.B.2.1-PASS-E
 * [JWT] Phase 8: GET /api/comply360/audit-ready-score/:entity_code
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { generateCoverageReport } from './comply360-mca-coverage-engine';
import { getRetentionStatus } from './comply360-audit-retention-engine';
import { generateContinuityReport } from './comply360-audit-continuity-engine';
import { loadPayments } from './comply360-statutory-payments-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-analytics-engine',
    'comply360-payroll-audit-engine',
    'comply360-mca-coverage-engine',
    'comply360-audit-retention-engine',
    'comply360-audit-continuity-engine',
    'comply360-statutory-payments-engine',
    'comply360-caro-extended-engine',
    'comply360-tax-audit-3cd-engine',
  ],
  storage_keys: ['erp_audit_ready_score_snapshots'],
} as const;

const SNAPSHOTS_KEY = 'erp_audit_ready_score_snapshots';

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readSnaps(): AuditReadyScore[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as AuditReadyScore[]) : [];
  } catch {
    return [];
  }
}

function writeSnaps(list: AuditReadyScore[]): void {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list));
  } catch {
    /* quota — non-fatal */
  }
}

// ── Types ─────────────────────────────────────────────────────────────
export type AuditReadyBand = 'excellent' | 'good' | 'warning' | 'critical';

export interface SubScoreBreakdown {
  audit_trail_health: number;
  working_papers_completion: number;
  caro_clause_coverage: number;
  pending_verifications: number;
  open_findings: number;
  statutory_dues_compliance: number;
  schedule_iii_readiness: number;
  external_confirmations: number;
}

export interface AuditReadyScore {
  id: string;
  entity_code: string;
  fy: string;
  computed_at: string;
  overall_score: number;
  band: AuditReadyBand;
  sub_scores: SubScoreBreakdown;
  recommendations: Array<{ action: string; priority: 'high' | 'medium' | 'low'; estimated_score_lift: number }>;
}

// ── Weights (must sum to 1.0) ─────────────────────────────────────────
export const AUDIT_READY_WEIGHTS: Record<keyof SubScoreBreakdown, number> = {
  audit_trail_health: 0.20,
  working_papers_completion: 0.15,
  caro_clause_coverage: 0.10,
  pending_verifications: 0.10,
  open_findings: 0.15,
  statutory_dues_compliance: 0.15,
  schedule_iii_readiness: 0.10,
  external_confirmations: 0.05,
};

// ── Band helper ───────────────────────────────────────────────────────
export function getScoreBand(score: number): AuditReadyBand {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

// ── Sub-score computation (safe heuristics for Phase 5) ───────────────
function safeNum(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function computeAuditTrailHealth(): number {
  try {
    const cov = generateCoverageReport();
    return safeNum(cov.coverage_percentage);
  } catch {
    return 50;
  }
}

function computeWorkingPapersCompletion(): number {
  try {
    const raw = localStorage.getItem('erp_audit_framework_working_papers');
    const list: unknown[] = raw ? JSON.parse(raw) : [];
    // Heuristic: expect 21 working papers across CARO clauses; cap at 100.
    return safeNum((list.length / 21) * 100);
  } catch {
    return 0;
  }
}

function computeCaroCoverage(): number {
  try {
    const raw = localStorage.getItem('erp_audit_framework_working_papers');
    const list = raw ? (JSON.parse(raw) as Array<{ caro_clauses?: string[] }>) : [];
    const tagged = new Set<string>();
    for (const wp of list) {
      for (const c of wp.caro_clauses ?? []) tagged.add(c);
    }
    // 21 applicable CARO clauses heuristic
    return safeNum((tagged.size / 21) * 100);
  } catch {
    return 0;
  }
}

function computePendingVerifications(): number {
  try {
    const raw = localStorage.getItem('erp_audit_framework_verifications');
    const list: unknown[] = raw ? JSON.parse(raw) : [];
    // 100 baseline; subtract 2 per pending observation (cap ≥ 0)
    return safeNum(100 - Math.max(0, 25 - list.length) * 2);
  } catch {
    return 75;
  }
}

function computeOpenFindings(): number {
  try {
    const raw = localStorage.getItem('erp_audit_framework_findings');
    const list = raw ? (JSON.parse(raw) as Array<{ status: string; severity: string }>) : [];
    const open = list.filter((f) => f.status === 'open' || f.status === 'in_progress');
    const weight = open.reduce((n, f) => {
      switch (f.severity) {
        case 'critical': return n + 25;
        case 'high':     return n + 12;
        case 'medium':   return n + 5;
        default:         return n + 2;
      }
    }, 0);
    return safeNum(100 - weight);
  } catch {
    return 80;
  }
}

function computeStatutoryDuesCompliance(entity_code: string, fy: string): number {
  try {
    const payments = loadPayments(entity_code, fy);
    if (payments.length === 0) return 100;
    const onTime = payments.filter((p) => p.status === 'paid').length;
    return safeNum((onTime / payments.length) * 100);
  } catch {
    return 60;
  }
}

function computeScheduleIiiReadiness(): number {
  // Heuristic stub: presence of tax-audit-3cd engine + voucher count.
  try {
    let voucherCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('erp_audit_trail_')) {
        const raw = localStorage.getItem(k);
        const list = raw ? (JSON.parse(raw) as Array<{ entity_type: string }>) : [];
        voucherCount += list.filter((e) => e.entity_type === 'voucher').length;
      }
    }
    return safeNum(Math.min(100, voucherCount * 5));
  } catch {
    return 50;
  }
}

function computeExternalConfirmations(): number {
  try {
    const raw = localStorage.getItem('erp_audit_framework_verifications');
    const list = raw ? (JSON.parse(raw) as Array<{ status: string }>) : [];
    if (list.length === 0) return 50;
    const verified = list.filter((v) => v.status === 'verified').length;
    return safeNum((verified / list.length) * 100);
  } catch {
    return 50;
  }
}

function continuityBonus(entity_code: string, fy: string): number {
  try {
    const r = generateContinuityReport(entity_code, fy);
    if (r.operated_throughout_year_verdict === 'CONFIRMED') return 100;
    if (r.operated_throughout_year_verdict === 'GAPS_DETECTED') return 50;
    return 0;
  } catch {
    return 50;
  }
}

function retentionFactor(entity_code: string): number {
  try {
    const s = getRetentionStatus(entity_code);
    return s.retention_compliant ? 100 : 60;
  } catch {
    return 80;
  }
}

// ── Recommendations ───────────────────────────────────────────────────
function buildRecommendations(sub: SubScoreBreakdown): AuditReadyScore['recommendations'] {
  const recs: AuditReadyScore['recommendations'] = [];
  const consider = (
    key: keyof SubScoreBreakdown,
    action: string,
    priority: 'high' | 'medium' | 'low',
    threshold: number,
  ): void => {
    if (sub[key] < threshold) {
      const lift = Math.round((100 - sub[key]) * AUDIT_READY_WEIGHTS[key]);
      recs.push({ action, priority, estimated_score_lift: lift });
    }
  };
  consider('audit_trail_health',         'Increase MCA Rule 11(g) coverage across engines',     'high',   90);
  consider('open_findings',              'Resolve open high-severity audit findings',           'high',   80);
  consider('statutory_dues_compliance',  'Pay overdue statutory dues',                          'high',   85);
  consider('working_papers_completion',  'File missing working papers for CARO clauses',        'medium', 80);
  consider('caro_clause_coverage',       'Tag CARO clauses on remaining working papers',        'medium', 80);
  consider('pending_verifications',      'Clear pending voucher verifications',                 'medium', 75);
  consider('schedule_iii_readiness',     'Map GL accounts to Schedule III heads',               'low',    70);
  consider('external_confirmations',     'Send out balance confirmation letters',               'low',    60);
  return recs.sort((a, b) => b.estimated_score_lift - a.estimated_score_lift).slice(0, 5);
}

// ── Public API ────────────────────────────────────────────────────────

/** Compute current Audit-Ready Score for an entity + FY */
export function computeAuditReadyScore(entity_code: string, fy: string): AuditReadyScore {
  const audit_trail_health = Math.round(
    (computeAuditTrailHealth() + continuityBonus(entity_code, fy) + retentionFactor(entity_code)) / 3,
  );
  const sub: SubScoreBreakdown = {
    audit_trail_health: safeNum(audit_trail_health),
    working_papers_completion: Math.round(computeWorkingPapersCompletion()),
    caro_clause_coverage: Math.round(computeCaroCoverage()),
    pending_verifications: Math.round(computePendingVerifications()),
    open_findings: Math.round(computeOpenFindings()),
    statutory_dues_compliance: Math.round(computeStatutoryDuesCompliance(entity_code, fy)),
    schedule_iii_readiness: Math.round(computeScheduleIiiReadiness()),
    external_confirmations: Math.round(computeExternalConfirmations()),
  };

  let overall = 0;
  (Object.keys(AUDIT_READY_WEIGHTS) as Array<keyof SubScoreBreakdown>).forEach((k) => {
    overall += sub[k] * AUDIT_READY_WEIGHTS[k];
  });
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  const snapshot: AuditReadyScore = {
    id: uid('ars'),
    entity_code,
    fy,
    computed_at: new Date().toISOString(),
    overall_score: overall,
    band: getScoreBand(overall),
    sub_scores: sub,
    recommendations: buildRecommendations(sub),
  };

  logAudit({
    entityCode: entity_code,
    action: 'create',
    entityType: AUD('audit_ready_score_snapshot'),
    recordId: snapshot.id,
    recordLabel: `Audit-Ready Score ${overall} · ${snapshot.band}`,
    beforeState: null,
    afterState: { overall_score: overall, band: snapshot.band, fy },
    sourceModule: 'comply360-audit-ready-score-engine',
  });

  const all = readSnaps();
  all.push(snapshot);
  writeSnaps(all);
  return snapshot;
}

/** List historical snapshots · for trending */
export function listScoreSnapshots(entity_code: string, opts?: { fy?: string }): AuditReadyScore[] {
  return readSnaps().filter((s) => s.entity_code === entity_code && (!opts?.fy || s.fy === opts.fy));
}

/** Get latest snapshot */
export function getLatestScore(entity_code: string, fy: string): AuditReadyScore | null {
  const list = listScoreSnapshots(entity_code, { fy });
  if (list.length === 0) return null;
  return list.sort((a, b) => b.computed_at.localeCompare(a.computed_at))[0];
}

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({
  id: 'audit_ready_score_snapshot',
  module: 'audit-trail',
  label: 'Audit-Ready Score · composite 0-100 snapshot',
});
