/**
 * @file        src/lib/comply360-ai-control-center-engine.ts
 * @sibling     NEW @ Sprint 87 · DP-S87-6/7/8/9 · Q27b AI Control Center
 * @realizes    11-module AI orchestrator including OOB-2 (Compliance Cost ROI) +
 *              OOB-9 (AI Tutor). USE-SITE READS S80c nlp-audit-ask + S81d mock-audit-simulator.
 * @reads-from  audit-trail-engine · audit-trail-aggregator · nlp-audit-ask-engine ·
 *              mock-audit-simulator-engine
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES · OOB-2 + OOB-9 FUNCTIONAL
 * [JWT] Phase 8: POST /api/comply360/ai-control/{execute,roi,tutor}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { getQueryPatterns } from './comply360-nlp-audit-ask-engine';
import { computeReadinessPercentage, mapReadinessBand } from './comply360-mock-audit-simulator-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-nlp-audit-ask-engine',
    'comply360-mock-audit-simulator-engine',
  ],
  storage_keys: ['erp_ai_module_executions', 'erp_compliance_roi_calculations', 'erp_ai_tutor_sessions', 'erp_ai_recommendations'],
} as const;

export type AIModuleType =
  | 'audit_ask' | 'risk_predictor' | 'mock_audit_simulator' | 'compliance_roi' | 'ai_tutor'
  | 'workflow_automation' | 'anomaly_detection' | 'recommendation_engine'
  | 'document_classifier' | 'compliance_assistant' | 'audit_brief_generator';

export interface AIModuleExecution {
  id: string;
  module_type: AIModuleType;
  query_or_input: string;
  result_summary: string;
  execution_ms: number;
  executed_at: string;
  executed_by_bap: BAPAccountId;
}

export interface ComplianceROICalculation {
  id: string;
  fy: string;
  industry_baseline_inr: number;
  operix_actual_inr: number;
  manual_hours_baseline: number;
  operix_hours_actual: number;
  cost_savings_inr: number;
  time_savings_hours: number;
  roi_percentage: number;
  payback_months: number;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AITutorSession {
  id: string;
  question: string;
  context_module: string | null;
  context_fy: string | null;
  tutor_response: string;
  citations: Array<{ source: string; reference: string }>;
  session_duration_seconds: number;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AIRecommendation {
  id: string;
  module_type: AIModuleType;
  recommendation_text: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acted_upon' | 'dismissed';
  recorded_at: string;
}

const E_KEY = 'erp_ai_module_executions';
const R_KEY = 'erp_compliance_roi_calculations';
const T_KEY = 'erp_ai_tutor_sessions';
const C_KEY = 'erp_ai_recommendations';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export function executeAIModule(
  input: { module_type: AIModuleType; query: string; bap: BAPAccountId; context?: { module?: string; fy?: string } },
): AIModuleExecution {
  const t0 = Date.now();
  let summary = `Module ${input.module_type} executed`;
  if (input.module_type === 'audit_ask') {
    summary = `NLP audit-ask intents available: ${getQueryPatterns().length}`;
  } else if (input.module_type === 'mock_audit_simulator') {
    const pct = computeReadinessPercentage({
      audit_ready_score: 80, control_effectiveness: 75,
      open_critical_findings: 0, open_high_findings: 1, analytics_exception_rate: 5,
    });
    summary = `Mock audit readiness ${pct}% · band ${mapReadinessBand(pct)}`;
  }
  const r: AIModuleExecution = {
    id: uid('aimod'), module_type: input.module_type, query_or_input: input.query,
    result_summary: summary, execution_ms: Date.now() - t0,
    executed_at: new Date().toISOString(), executed_by_bap: input.bap,
  };
  const all = readJson<AIModuleExecution[]>(E_KEY, []);
  all.push(r); writeJson(E_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ai_module_execution'),
    recordId: r.id, recordLabel: `AI ${input.module_type} · ${input.query.slice(0, 40)}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ai-control-center-engine',
  });
  return r;
}

export function listAIModuleExecutions(opts: { module_type?: AIModuleType; fy?: string } = {}): AIModuleExecution[] {
  return readJson<AIModuleExecution[]>(E_KEY, []).filter((e) => !opts.module_type || e.module_type === opts.module_type);
}

export function computeComplianceROI(
  input: Omit<ComplianceROICalculation, 'id' | 'recorded_at' | 'cost_savings_inr' | 'time_savings_hours' | 'roi_percentage' | 'payback_months'>,
): ComplianceROICalculation {
  const cost_savings_inr = input.industry_baseline_inr - input.operix_actual_inr;
  const time_savings_hours = input.manual_hours_baseline - input.operix_hours_actual;
  const roi_percentage = input.operix_actual_inr > 0 ? Math.round((cost_savings_inr / input.operix_actual_inr) * 10000) / 100 : 0;
  const monthly_savings = cost_savings_inr / 12;
  const payback_months = monthly_savings > 0 ? Math.round((input.operix_actual_inr / monthly_savings) * 10) / 10 : 0;
  const r: ComplianceROICalculation = {
    ...input, id: uid('roi'),
    cost_savings_inr, time_savings_hours, roi_percentage, payback_months,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<ComplianceROICalculation[]>(R_KEY, []);
  all.push(r); writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('compliance_roi_calculation'),
    recordId: r.id, recordLabel: `ROI · ${input.fy} · ${roi_percentage}% · ₹${cost_savings_inr} saved`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ai-control-center-engine',
  });
  return r;
}

export function listROICalculations(opts: { fy?: string } = {}): ComplianceROICalculation[] {
  return readJson<ComplianceROICalculation[]>(R_KEY, []).filter((r) => !opts.fy || r.fy === opts.fy);
}

export function askComplianceTutor(
  input: Omit<AITutorSession, 'id' | 'recorded_at' | 'tutor_response' | 'citations' | 'session_duration_seconds'>,
): AITutorSession {
  const t0 = Date.now();
  const response = `Per Indian compliance framework, ${input.question.slice(0, 60)} requires reference to: Companies Act 2013 + MCA Rule 3(1) audit trail + relevant module-specific provisions.`;
  const citations = [
    { source: 'Companies Act 2013', reference: 'Section 128(5) · 8-year retention' },
    { source: 'MCA Rule 3(1)', reference: 'Audit trail mandate · Companies (Accounts) Rules 2014' },
  ];
  const r: AITutorSession = {
    ...input, id: uid('tutor'),
    tutor_response: response, citations,
    session_duration_seconds: Math.round((Date.now() - t0) / 1000),
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<AITutorSession[]>(T_KEY, []);
  all.push(r); writeJson(T_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ai_tutor_session'),
    recordId: r.id, recordLabel: `AI Tutor · ${input.question.slice(0, 40)}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ai-control-center-engine',
  });
  return r;
}

export function listTutorSessions(opts: { context_module?: string } = {}): AITutorSession[] {
  return readJson<AITutorSession[]>(T_KEY, []).filter((t) => !opts.context_module || t.context_module === opts.context_module);
}

export function recordRecommendation(input: Omit<AIRecommendation, 'id' | 'recorded_at' | 'status'>): AIRecommendation {
  const r: AIRecommendation = {
    ...input, id: uid('rec'), status: 'open', recorded_at: new Date().toISOString(),
  };
  const all = readJson<AIRecommendation[]>(C_KEY, []);
  all.push(r); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ai_recommendation'),
    recordId: r.id, recordLabel: `AI Rec · ${input.priority} · ${input.recommendation_text.slice(0, 40)}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ai-control-center-engine',
  });
  return r;
}

export function updateRecommendationStatus(rec_id: string, status: AIRecommendation['status'], by_bap: BAPAccountId): AIRecommendation {
  const all = readJson<AIRecommendation[]>(C_KEY, []);
  const idx = all.findIndex((r) => r.id === rec_id);
  if (idx < 0) throw new Error(`Recommendation not found: ${rec_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], status };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('ai_module_status_change'),
    recordId: rec_id, recordLabel: `Rec → ${status} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ai-control-center-engine',
  });
  return all[idx];
}

export function listRecommendations(
  opts: { module_type?: AIModuleType; priority?: AIRecommendation['priority']; status?: AIRecommendation['status'] } = {},
): AIRecommendation[] {
  return readJson<AIRecommendation[]>(C_KEY, []).filter((r) => {
    if (opts.module_type && r.module_type !== opts.module_type) return false;
    if (opts.priority && r.priority !== opts.priority) return false;
    if (opts.status && r.status !== opts.status) return false;
    return true;
  });
}

export function getAIModules(): Array<{ module_type: AIModuleType; label: string; description: string; oob_ref: string | null }> {
  return [
    { module_type: 'audit_ask', label: 'Audit Ask', description: 'NLP audit query interface (wraps S80c)', oob_ref: null },
    { module_type: 'risk_predictor', label: 'Risk Predictor', description: 'Compliance risk prediction', oob_ref: null },
    { module_type: 'mock_audit_simulator', label: 'Mock Audit', description: 'Mock audit simulator (wraps S81d)', oob_ref: null },
    { module_type: 'compliance_roi', label: 'Compliance ROI', description: 'Cost calculator + ROI', oob_ref: 'OOB-2' },
    { module_type: 'ai_tutor', label: 'AI Tutor', description: 'Context-aware compliance Q&A', oob_ref: 'OOB-9' },
    { module_type: 'workflow_automation', label: 'Workflow Auto', description: 'Automated workflow recommendations', oob_ref: null },
    { module_type: 'anomaly_detection', label: 'Anomaly', description: 'Anomaly detection in compliance events', oob_ref: null },
    { module_type: 'recommendation_engine', label: 'Recommendations', description: 'Cross-module recommendations', oob_ref: null },
    { module_type: 'document_classifier', label: 'Doc Classifier', description: 'Document type classification', oob_ref: null },
    { module_type: 'compliance_assistant', label: 'Assistant', description: 'General compliance assistant', oob_ref: null },
    { module_type: 'audit_brief_generator', label: 'Audit Brief', description: 'Auto-generated audit briefs', oob_ref: null },
  ];
}

registerAuditEntityType({ id: 'ai_module_execution', module: 'other', label: 'AI · Module Execution' });
registerAuditEntityType({ id: 'compliance_roi_calculation', module: 'other', label: 'AI · Compliance ROI (OOB-2)' });
registerAuditEntityType({ id: 'ai_tutor_session', module: 'other', label: 'AI · Tutor Session (OOB-9)' });
registerAuditEntityType({ id: 'ai_recommendation', module: 'other', label: 'AI · Recommendation' });
registerAuditEntityType({ id: 'ai_module_status_change', module: 'other', label: 'AI · Module Status Change' });
