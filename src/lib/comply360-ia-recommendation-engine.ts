/**
 * @file        src/lib/comply360-ia-recommendation-engine.ts
 * @sibling     NEW @ Sprint 81c · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass C · DP-S81-11
 * @realizes    IA Recommendation Engine · suggests next audit programs / procedures based on
 *              engagement state + risk register + open findings.
 *              Phase 5 = pattern-match heuristic STUB. S87 promotes to LLM-driven
 *              (similar pattern to S80f comply360-nlp-audit-ask-engine STUB).
 *              DP-S81-11 founder ratified INCLUDE for AI-ready foundation.
 * @reads-from  comply360-internal-audit-engine (S81a · engagement plan · audit programs library)
 *              comply360-ia-risk-register-engine (S81a · risk register entries · heat-map)
 *              comply360-audit-framework-engine (S80a · open findings)
 *              audit-trail-engine (Phase 4 · logAudit)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 * @sprint      Sprint 81c · T-Phase-5.B.2.2-PASS-C
 * [JWT] Phase 8: POST /api/comply360/ia-recommendation/suggest
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import {
  listAuditUniverse,
  listEngagementPlans,
  listIAIssues,
  getAuditCharter,
  getEngagementMaturityScore,
} from './comply360-internal-audit-engine';
import { listRiskRegister } from './comply360-ia-risk-register-engine';
import { listFindings } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-internal-audit-engine',
    'comply360-ia-risk-register-engine',
    'comply360-audit-framework-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_ia_recommendations'],
} as const;

export type RecommendationCategory =
  | 'audit_program_assignment'
  | 'control_test_execution'
  | 'walkthrough_documentation'
  | 'finding_remediation'
  | 'risk_review'
  | 'audit_universe_update';

export interface IARecommendation {
  id: string;
  engagement_id: string;
  category: RecommendationCategory;
  recommendation_text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  trigger_pattern: string;
  evidence_refs: string[];
  estimated_effort_hours: number;
  generated_at: string;
  // S87 promotes to LLM-driven generation
}

const REC_KEY = 'erp_ia_recommendations';

function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; }
  catch { return 'OPERIX-DEMO'; }
}
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }

export function generateRecommendations(opts: {
  engagement_id: string;
  max_recommendations?: number;
}): IARecommendation[] {
  const max = opts.max_recommendations ?? 10;
  const out: IARecommendation[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Pattern 1 · High inherent risk with no audit program
  const risks = listRiskRegister(opts.engagement_id);
  const plans = listEngagementPlans(opts.engagement_id);
  const plannedAreas = new Set<string>(plans.flatMap((p) => p.scope_areas));
  for (const r of risks) {
    if ((r.inherent_rating === 'Critical' || r.inherent_rating === 'High') && !plannedAreas.has(r.risk_category)) {
      out.push({
        id: uid('rec'),
        engagement_id: opts.engagement_id,
        category: 'audit_program_assignment',
        recommendation_text: `Assign an audit program for high inherent risk in ${r.risk_category}.`,
        priority: r.inherent_rating === 'Critical' ? 'critical' : 'high',
        trigger_pattern: 'high_inherent_risk_no_audit_program',
        evidence_refs: [r.id],
        estimated_effort_hours: 6,
        generated_at: new Date().toISOString(),
      });
    }
  }

  // Pattern 2 · Critical finding with no IA issue log entry
  const findings = listFindings(opts.engagement_id, { status: 'open' });
  const issues = listIAIssues(opts.engagement_id);
  const findingsWithIssue = new Set(issues.map((i) => i.finding_id));
  for (const f of findings) {
    if (f.severity === 'critical' && !findingsWithIssue.has(f.id)) {
      out.push({
        id: uid('rec'),
        engagement_id: opts.engagement_id,
        category: 'finding_remediation',
        recommendation_text: `Open Management Action Plan for critical finding ${f.id}.`,
        priority: 'critical',
        trigger_pattern: 'critical_finding_no_map',
        evidence_refs: [f.id],
        estimated_effort_hours: 3,
        generated_at: new Date().toISOString(),
      });
    }
  }

  // Pattern 3 · Audit universe area overdue
  const universe = listAuditUniverse();
  for (const u of universe) {
    if (u.next_due_at && u.next_due_at < today) {
      out.push({
        id: uid('rec'),
        engagement_id: opts.engagement_id,
        category: 'audit_universe_update',
        recommendation_text: `Schedule overdue audit for area ${u.area_name}.`,
        priority: 'high',
        trigger_pattern: 'audit_universe_overdue',
        evidence_refs: [u.id],
        estimated_effort_hours: 4,
        generated_at: new Date().toISOString(),
      });
    }
  }

  // Pattern 4 · No walkthrough for high-volume processes (heuristic stub)
  if (risks.length > 0) {
    out.push({
      id: uid('rec'),
      engagement_id: opts.engagement_id,
      category: 'walkthrough_documentation',
      recommendation_text: 'Auto-generate walkthroughs for the top-3 high-volume processes (Procure-to-Pay, Order-to-Cash, Hire-to-Retire).',
      priority: 'medium',
      trigger_pattern: 'no_walkthrough_for_high_volume_process',
      evidence_refs: [],
      estimated_effort_hours: 2,
      generated_at: new Date().toISOString(),
    });
  }

  // Pattern 5 · Engagement charter not approved
  const charter = getAuditCharter(opts.engagement_id);
  if (charter && charter.approved_at === null) {
    out.push({
      id: uid('rec'),
      engagement_id: opts.engagement_id,
      category: 'audit_program_assignment',
      recommendation_text: 'Approve the Internal Audit Charter for this engagement.',
      priority: 'high',
      trigger_pattern: 'charter_not_approved',
      evidence_refs: [charter.id],
      estimated_effort_hours: 1,
      generated_at: new Date().toISOString(),
    });
  }

  // Pattern 6 · Risk review overdue (>90 days)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  for (const r of risks) {
    if (r.last_reviewed_at < ninetyDaysAgo) {
      out.push({
        id: uid('rec'),
        engagement_id: opts.engagement_id,
        category: 'risk_review',
        recommendation_text: `Review risk entry "${r.risk_code}" (last reviewed > 90 days ago).`,
        priority: 'medium',
        trigger_pattern: 'risk_review_overdue',
        evidence_refs: [r.id],
        estimated_effort_hours: 1,
        generated_at: new Date().toISOString(),
      });
    }
  }

  // Pattern 7 · Catch-all engagement maturity < 60
  const mat = getEngagementMaturityScore(opts.engagement_id);
  if (mat.maturity_percentage < 60) {
    out.push({
      id: uid('rec'),
      engagement_id: opts.engagement_id,
      category: 'control_test_execution',
      recommendation_text: `Engagement maturity ${mat.maturity_percentage}% < 60. Review IA Maturity dashboard and address sub-score gaps.`,
      priority: 'medium',
      trigger_pattern: 'low_engagement_maturity',
      evidence_refs: [],
      estimated_effort_hours: 4,
      generated_at: new Date().toISOString(),
    });
  }

  const limited = out.slice(0, max);

  // Persist + audit
  const all = readJson<IARecommendation[]>(REC_KEY, []);
  all.push(...limited);
  writeJson(REC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_recommendation'),
    recordId: `recs_${opts.engagement_id}_${Date.now()}`,
    recordLabel: `IA Recommendations · ${opts.engagement_id} · ${limited.length}`,
    beforeState: null,
    afterState: { count: limited.length } as Record<string, unknown>,
    sourceModule: 'comply360-ia-recommendation-engine',
  });

  return limited;
}

export function listRecommendations(
  engagement_id: string,
  opts?: { category?: RecommendationCategory },
): IARecommendation[] {
  return readJson<IARecommendation[]>(REC_KEY, [])
    .filter((r) => r.engagement_id === engagement_id)
    .filter((r) => !opts?.category || r.category === opts.category);
}

export function getRecommendationPatterns(): Array<{
  category: RecommendationCategory;
  trigger_description: string;
  example_recommendation: string;
}> {
  return [
    {
      category: 'audit_program_assignment',
      trigger_description: 'High inherent risk with no audit program assigned',
      example_recommendation: 'Assign an audit program for high inherent risk in Procure-to-Pay.',
    },
    {
      category: 'finding_remediation',
      trigger_description: 'Critical finding with no Management Action Plan',
      example_recommendation: 'Open Management Action Plan for critical finding F-001.',
    },
    {
      category: 'audit_universe_update',
      trigger_description: 'Audit universe area overdue',
      example_recommendation: 'Schedule overdue audit for area Treasury.',
    },
    {
      category: 'walkthrough_documentation',
      trigger_description: 'Top-3 high-volume processes without walkthroughs',
      example_recommendation: 'Auto-generate walkthroughs for P2P, O2C, H2R.',
    },
    {
      category: 'risk_review',
      trigger_description: 'Risk entry not reviewed in >90 days',
      example_recommendation: 'Review risk entry "Cash Disbursement Controls".',
    },
    {
      category: 'control_test_execution',
      trigger_description: 'Engagement maturity below 60%',
      example_recommendation: 'Address IA Maturity dashboard sub-score gaps.',
    },
  ];
}

// ── Entity-type registration ──────────────────────────────────────────
registerAuditEntityType({ id: 'ia_recommendation', module: 'audit-trail', label: 'IA · Recommendation' });
