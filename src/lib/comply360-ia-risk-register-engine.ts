/**
 * @file        src/lib/comply360-ia-risk-register-engine.ts
 * @sibling     NEW @ Sprint 81a · Comply360 Floor 2 Internal Audit · Pass A · DP-S81-7
 * @realizes    Risk Register & Heat-Map specialist · Q17 Module 3.
 *              Maintains enterprise risk register with inherent + residual risk scoring.
 *              Generates heat-map data (likelihood × impact grid).
 *              Cross-references S80a findings + S80b analytics + S80b payroll-audit findings.
 *              SEPARATE SIBLING (DP-S81-7) for forward extensibility:
 *              S82 External Audit consumes risk register independently.
 * @reads-from  comply360-audit-framework-engine (S80a · listFindings)
 *              comply360-audit-analytics-engine (S80b · procedure run history)
 *              comply360-payroll-audit-engine (S80b · payroll-audit findings)
 *              audit-trail-engine (Phase 4 · logAudit)
 *              comply360-audit-trail-aggregator-engine (S78a · registerAuditEntityType)
 * @sprint      Sprint 81a · T-Phase-5.B.2.2-PASS-A
 * [JWT] Phase 8: POST /api/comply360/risk-register/entry
 *               GET /api/comply360/risk-register/heatmap/:engagement_id
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-analytics-engine',
    'comply360-payroll-audit-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_ia_risk_register', 'erp_ia_risk_heatmaps'],
} as const;

export type RiskLikelihood = 1 | 2 | 3 | 4 | 5;
export type RiskImpact = 1 | 2 | 3 | 4 | 5;
export type RiskRating = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RiskRegisterEntry {
  id: string;
  engagement_id: string;
  risk_code: string;
  risk_description: string;
  risk_category: 'Financial' | 'Operational' | 'Compliance' | 'Strategic' | 'IT' | 'Reputational';
  inherent_likelihood: RiskLikelihood;
  inherent_impact: RiskImpact;
  inherent_score: number;
  inherent_rating: RiskRating;
  controls: string[];
  control_effectiveness: 'Strong' | 'Adequate' | 'Weak' | 'Absent';
  residual_likelihood: RiskLikelihood;
  residual_impact: RiskImpact;
  residual_score: number;
  residual_rating: RiskRating;
  responsible_bap: BAPAccountId | null;
  authored_by_bap: BAPAccountId;
  created_at: string;
  last_reviewed_at: string;
  review_due_at: string;
  linked_finding_ids: string[];
}

export interface RiskHeatmap {
  engagement_id: string;
  generated_at: string;
  cells: Array<{
    likelihood: RiskLikelihood;
    impact: RiskImpact;
    risk_count: number;
    rating: RiskRating;
    risk_ids: string[];
  }>;
  total_risks: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

const RISK_KEY = 'erp_ia_risk_register';

// ─── Helpers ───
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

export function computeRiskRating(score: number): RiskRating {
  if (score >= 20) return 'Critical';
  if (score >= 15) return 'High';
  if (score >= 8) return 'Medium';
  return 'Low';
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function createRiskEntry(
  input: Omit<
    RiskRegisterEntry,
    'id' | 'created_at' | 'last_reviewed_at' | 'review_due_at'
    | 'inherent_score' | 'inherent_rating' | 'residual_score' | 'residual_rating'
  >,
): RiskRegisterEntry {
  const now = new Date().toISOString();
  const inherent_score = input.inherent_likelihood * input.inherent_impact;
  const residual_score = input.residual_likelihood * input.residual_impact;
  const entry: RiskRegisterEntry = {
    ...input,
    id: uid('iarisk'),
    inherent_score,
    inherent_rating: computeRiskRating(inherent_score),
    residual_score,
    residual_rating: computeRiskRating(residual_score),
    created_at: now,
    last_reviewed_at: now,
    review_due_at: addMonths(now, 6),
  };
  const all = readJson<RiskRegisterEntry[]>(RISK_KEY, []);
  all.push(entry);
  writeJson(RISK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_risk_register_entry'),
    recordId: entry.id,
    recordLabel: `Risk · ${entry.risk_code} · ${entry.inherent_rating}`,
    beforeState: null,
    afterState: entry as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-risk-register-engine',
  });
  return entry;
}

export function updateRiskEntry(
  risk_id: string,
  updates: Partial<Omit<RiskRegisterEntry, 'id' | 'engagement_id' | 'created_at'>>,
  by_bap: BAPAccountId,
): RiskRegisterEntry {
  const all = readJson<RiskRegisterEntry[]>(RISK_KEY, []);
  const idx = all.findIndex((r) => r.id === risk_id);
  if (idx < 0) throw new Error(`Risk ${risk_id} not found`);
  const before = { ...all[idx] };
  const merged = { ...all[idx], ...updates, last_reviewed_at: new Date().toISOString() };
  merged.inherent_score = merged.inherent_likelihood * merged.inherent_impact;
  merged.inherent_rating = computeRiskRating(merged.inherent_score);
  merged.residual_score = merged.residual_likelihood * merged.residual_impact;
  merged.residual_rating = computeRiskRating(merged.residual_score);
  all[idx] = merged;
  writeJson(RISK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_risk_register_entry'),
    recordId: risk_id,
    recordLabel: `Risk ${risk_id} updated by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: merged as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-risk-register-engine',
  });
  return merged;
}

export function listRiskRegister(
  engagement_id: string,
  opts?: { category?: RiskRegisterEntry['risk_category']; rating?: RiskRating },
): RiskRegisterEntry[] {
  return readJson<RiskRegisterEntry[]>(RISK_KEY, [])
    .filter((r) => r.engagement_id === engagement_id)
    .filter((r) => !opts?.category || r.risk_category === opts.category)
    .filter((r) => !opts?.rating || r.residual_rating === opts.rating);
}

export function generateHeatmap(engagement_id: string): RiskHeatmap {
  const risks = listRiskRegister(engagement_id);
  const cells: RiskHeatmap['cells'] = [];
  for (let l = 1 as RiskLikelihood; l <= 5; l = (l + 1) as RiskLikelihood) {
    for (let i = 1 as RiskImpact; i <= 5; i = (i + 1) as RiskImpact) {
      const matching = risks.filter((r) => r.residual_likelihood === l && r.residual_impact === i);
      cells.push({
        likelihood: l,
        impact: i,
        risk_count: matching.length,
        rating: computeRiskRating(l * i),
        risk_ids: matching.map((r) => r.id),
      });
    }
  }
  return {
    engagement_id,
    generated_at: new Date().toISOString(),
    cells,
    total_risks: risks.length,
    critical_count: risks.filter((r) => r.residual_rating === 'Critical').length,
    high_count: risks.filter((r) => r.residual_rating === 'High').length,
    medium_count: risks.filter((r) => r.residual_rating === 'Medium').length,
    low_count: risks.filter((r) => r.residual_rating === 'Low').length,
  };
}

export function linkFindingToRisk(risk_id: string, finding_id: string, by_bap: BAPAccountId): RiskRegisterEntry {
  const all = readJson<RiskRegisterEntry[]>(RISK_KEY, []);
  const idx = all.findIndex((r) => r.id === risk_id);
  if (idx < 0) throw new Error(`Risk ${risk_id} not found`);
  const before = { ...all[idx] };
  if (!all[idx].linked_finding_ids.includes(finding_id)) {
    all[idx] = { ...all[idx], linked_finding_ids: [...all[idx].linked_finding_ids, finding_id] };
  }
  writeJson(RISK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_risk_register_entry'),
    recordId: risk_id,
    recordLabel: `Risk ${risk_id} ← linked finding ${finding_id} by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ia-risk-register-engine',
  });
  return all[idx];
}

registerAuditEntityType({ id: 'ia_risk_register_entry', module: 'audit-trail', label: 'IA · Risk Register Entry' });
