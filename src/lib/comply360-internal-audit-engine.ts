/**
 * @file        src/lib/comply360-internal-audit-engine.ts
 * @sibling     NEW @ Sprint 81a · Comply360 Floor 2 Internal Audit Arc 2.2 · Pass A · DP-S81-1 · DP-S81-2
 * @realizes    Master Internal Audit workflow engine. Orchestrates IA engagements.
 *              Provides 5 of 12 Q17 modules:
 *                Module 1 · Engagement Plan & Scoping
 *                Module 2 · Audit Universe Definition
 *                Module 4 · Audit Programs Library (CARO + Cost + Tax + Operational)
 *                Module 5 · Audit Charter & Policies
 *                Module 8 · Issue Log & Findings Register (consumes S80a raiseFinding)
 *              CONSUMED BY: S81b InternalAuditDashboardPage · S81c Mock Audit Simulator ·
 *              S81d sample engagement seed · S82 External Audit
 * @reads-from  comply360-audit-framework-engine (S80a · 0-DIFF · BAP visibility + raiseFinding + working papers)
 *              comply360-auditor-workspace-engine (S80a · 0-DIFF · engagement persistence)
 *              comply360-audit-analytics-engine (S80b · 0-DIFF · 18 procedures for audit programs)
 *              comply360-audit-trail-aggregator-engine (S78a · 0-DIFF · registerAuditEntityType)
 *              audit-trail-engine (Phase 4 + S80d hardened · 0-DIFF · logAudit)
 * @sprint      Sprint 81a · T-Phase-5.B.2.2-PASS-A
 * [JWT] Phase 8: POST /api/comply360/internal-audit/engagement-plan
 *               GET /api/comply360/internal-audit/audit-universe
 *               POST /api/comply360/internal-audit/audit-program
 *               POST /api/comply360/internal-audit/issue-log
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import {
  type BAPAccountId,
  type AuditFinding,
  listFindings,
} from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-auditor-workspace-engine',
    'comply360-audit-analytics-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
  ],
  storage_keys: [
    'erp_ia_engagement_plans',
    'erp_ia_audit_universe',
    'erp_ia_audit_programs',
    'erp_ia_audit_charter',
    'erp_ia_issue_log',
  ],
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; }
  catch { return 'OPERIX-DEMO'; }
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function readJson<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; }
  catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }

// ─── Q17 Module 1 · Engagement Plan & Scoping ───
export interface EngagementPlanInput {
  engagement_id: string;
  audit_period_start: string;
  audit_period_end: string;
  scope_areas: string[];
  objectives: string[];
  authored_by_bap: BAPAccountId;
}
export interface EngagementPlan extends EngagementPlanInput {
  id: string;
  created_at: string;
  status: 'draft' | 'approved' | 'in_execution' | 'closed';
}
const PLAN_KEY = 'erp_ia_engagement_plans';

export function createEngagementPlan(input: EngagementPlanInput): EngagementPlan {
  const plan: EngagementPlan = {
    ...input,
    id: uid('iaplan'),
    created_at: new Date().toISOString(),
    status: 'draft',
  };
  const all = readJson<EngagementPlan[]>(PLAN_KEY, []);
  all.push(plan);
  writeJson(PLAN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_engagement_plan'),
    recordId: plan.id,
    recordLabel: `IA Engagement Plan ${plan.id}`,
    beforeState: null,
    afterState: plan as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return plan;
}

export function listEngagementPlans(engagement_id: string): EngagementPlan[] {
  return readJson<EngagementPlan[]>(PLAN_KEY, []).filter((p) => p.engagement_id === engagement_id);
}

export function approveEngagementPlan(plan_id: string, by_bap: BAPAccountId): EngagementPlan {
  const all = readJson<EngagementPlan[]>(PLAN_KEY, []);
  const idx = all.findIndex((p) => p.id === plan_id);
  if (idx < 0) throw new Error(`EngagementPlan ${plan_id} not found`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], status: 'approved' };
  writeJson(PLAN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'approve',
    entityType: AUD('ia_engagement_plan'),
    recordId: plan_id,
    recordLabel: `IA Plan ${plan_id} approved by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return all[idx];
}

// ─── Q17 Module 2 · Audit Universe ───
export interface AuditUniverseEntry {
  id: string;
  area_code: string;
  area_name: string;
  area_description: string;
  inherent_risk_score: number;
  audit_cycle_months: number;
  last_audited_at: string | null;
  next_due_at: string | null;
  responsible_bap: BAPAccountId | null;
  authored_by_bap: BAPAccountId;
  created_at: string;
}
const UNIVERSE_KEY = 'erp_ia_audit_universe';

export function defineAuditUniverseEntry(input: Omit<AuditUniverseEntry, 'id' | 'created_at'>): AuditUniverseEntry {
  const entry: AuditUniverseEntry = { ...input, id: uid('iauni'), created_at: new Date().toISOString() };
  const all = readJson<AuditUniverseEntry[]>(UNIVERSE_KEY, []);
  all.push(entry);
  writeJson(UNIVERSE_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_audit_universe'),
    recordId: entry.id,
    recordLabel: `Audit Universe · ${entry.area_code}`,
    beforeState: null,
    afterState: entry as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return entry;
}

export function listAuditUniverse(opts?: { area_code?: string }): AuditUniverseEntry[] {
  return readJson<AuditUniverseEntry[]>(UNIVERSE_KEY, [])
    .filter((u) => !opts?.area_code || u.area_code === opts.area_code);
}

export function updateLastAudited(entry_id: string, last_audited_at: string, by_bap: BAPAccountId): AuditUniverseEntry {
  const all = readJson<AuditUniverseEntry[]>(UNIVERSE_KEY, []);
  const idx = all.findIndex((u) => u.id === entry_id);
  if (idx < 0) throw new Error(`AuditUniverseEntry ${entry_id} not found`);
  const before = { ...all[idx] };
  const nextDue = new Date(last_audited_at);
  nextDue.setMonth(nextDue.getMonth() + all[idx].audit_cycle_months);
  all[idx] = { ...all[idx], last_audited_at, next_due_at: nextDue.toISOString() };
  writeJson(UNIVERSE_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_audit_universe'),
    recordId: entry_id,
    recordLabel: `Audit Universe ${entry_id} last_audited by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return all[idx];
}

// ─── Q17 Module 4 · Audit Programs Library ───
export type AuditProgramCategory = 'CARO' | 'Cost' | 'Tax' | 'Operational' | 'Compliance' | 'IT';

export interface AuditProgramStep {
  step_number: number;
  procedure: string;
  analytics_code?: string;
  expected_evidence: string;
  caro_clauses?: string[];
}
export interface AuditProgram {
  id: string;
  name: string;
  category: AuditProgramCategory;
  description: string;
  steps: AuditProgramStep[];
  authored_by_bap: BAPAccountId;
  created_at: string;
  version: number;
}
const PROGRAM_KEY = 'erp_ia_audit_programs';

export function createAuditProgram(input: Omit<AuditProgram, 'id' | 'created_at' | 'version'>): AuditProgram {
  const prog: AuditProgram = { ...input, id: uid('iaprog'), created_at: new Date().toISOString(), version: 1 };
  const all = readJson<AuditProgram[]>(PROGRAM_KEY, []);
  all.push(prog);
  writeJson(PROGRAM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_audit_program'),
    recordId: prog.id,
    recordLabel: `Audit Program · ${prog.name}`,
    beforeState: null,
    afterState: prog as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return prog;
}

export function listAuditPrograms(opts?: { category?: AuditProgramCategory }): AuditProgram[] {
  return readJson<AuditProgram[]>(PROGRAM_KEY, [])
    .filter((p) => !opts?.category || p.category === opts.category);
}

export function getAuditProgram(id: string): AuditProgram | null {
  return readJson<AuditProgram[]>(PROGRAM_KEY, []).find((p) => p.id === id) ?? null;
}

export function seedStandardAuditProgramsLibrary(by_bap: BAPAccountId): AuditProgram[] {
  const defs: Array<Omit<AuditProgram, 'id' | 'created_at' | 'version'>> = [
    {
      name: 'CARO 2020 Compliance Program',
      category: 'CARO',
      description: 'Standard CARO 2020 audit procedures · paragraph 3(i)-(xxi)',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Verify timely deposit of statutory dues', analytics_code: 'STATUTORY_PAYMENTS', expected_evidence: 'Challan vault entries', caro_clauses: ['3(vii)'] },
        { step_number: 2, procedure: 'Inspect pending documents register', analytics_code: 'PENDING_DOCUMENTS', expected_evidence: 'Pending docs list', caro_clauses: ['3(ii)'] },
      ],
    },
    {
      name: 'Internal Controls Review',
      category: 'Operational',
      description: 'Internal control effectiveness over cash and bank transactions',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Review unusual cash withdrawals', analytics_code: 'CASH_WITHDRAWAL', expected_evidence: 'Cash book + vouchers' },
        { step_number: 2, procedure: 'Test inter-bank transfers', analytics_code: 'INTER_BANK_TRANSFER', expected_evidence: 'Bank reconciliation' },
      ],
    },
    {
      name: 'Payroll Audit Program',
      category: 'Operational',
      description: 'PF/ESI/TDS compliance + headcount reconciliation',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Verify statutory payroll deposits', analytics_code: 'STATUTORY_PAYMENTS', expected_evidence: 'PF/ESI challans' },
        { step_number: 2, procedure: 'Reconcile headcount to payroll register', expected_evidence: 'Payroll register + HR master' },
      ],
    },
    {
      name: 'Fixed Assets Audit Program',
      category: 'Operational',
      description: 'Fixed asset existence + valuation + capitalization',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Run FA analytics suite', analytics_code: 'FIXED_ASSETS_ANALYSIS', expected_evidence: 'FA register' },
      ],
    },
    {
      name: 'Tax Compliance Program',
      category: 'Tax',
      description: 'GST + TDS + Income Tax compliance walkthrough',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Verify statutory payment timeliness', analytics_code: 'STATUTORY_PAYMENTS', expected_evidence: 'Challans + returns' },
      ],
    },
    {
      name: 'Cost Audit Program',
      category: 'Cost',
      description: 'CARO + Cost Records Rules 2014 compliance',
      authored_by_bap: by_bap,
      steps: [
        { step_number: 1, procedure: 'Review cost records maintenance', expected_evidence: 'Cost ledgers' },
      ],
    },
  ];
  return defs.map((d) => createAuditProgram(d));
}

// ─── Q17 Module 5 · Audit Charter & Policies ───
export interface AuditCharter {
  id: string;
  engagement_id: string;
  authority_statement: string;
  scope_statement: string;
  responsibility_statement: string;
  independence_statement: string;
  reporting_statement: string;
  approved_at: string | null;
  approved_by_bap: BAPAccountId | null;
  created_at: string;
  authored_by_bap: BAPAccountId;
}
const CHARTER_KEY = 'erp_ia_audit_charter';

export function createAuditCharter(
  input: Omit<AuditCharter, 'id' | 'created_at' | 'approved_at' | 'approved_by_bap'>,
): AuditCharter {
  const charter: AuditCharter = {
    ...input,
    id: uid('iachar'),
    created_at: new Date().toISOString(),
    approved_at: null,
    approved_by_bap: null,
  };
  const all = readJson<AuditCharter[]>(CHARTER_KEY, []);
  all.push(charter);
  writeJson(CHARTER_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_audit_charter'),
    recordId: charter.id,
    recordLabel: `Audit Charter · ${charter.engagement_id}`,
    beforeState: null,
    afterState: charter as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return charter;
}

export function approveAuditCharter(charter_id: string, by_bap: BAPAccountId): AuditCharter {
  const all = readJson<AuditCharter[]>(CHARTER_KEY, []);
  const idx = all.findIndex((c) => c.id === charter_id);
  if (idx < 0) throw new Error(`AuditCharter ${charter_id} not found`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], approved_at: new Date().toISOString(), approved_by_bap: by_bap };
  writeJson(CHARTER_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'approve',
    entityType: AUD('ia_audit_charter'),
    recordId: charter_id,
    recordLabel: `Charter ${charter_id} approved by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return all[idx];
}

export function getAuditCharter(engagement_id: string): AuditCharter | null {
  return readJson<AuditCharter[]>(CHARTER_KEY, []).find((c) => c.engagement_id === engagement_id) ?? null;
}

// ─── Q17 Module 8 · Issue Log ───
export interface IAIssueLogEntryInput {
  engagement_id: string;
  finding_id: string;
  severity_class: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  management_response: string;
  remediation_deadline: string;
  responsible_bap: BAPAccountId;
  raised_by_bap: BAPAccountId;
}
export interface IAIssueLogEntry extends IAIssueLogEntryInput {
  id: string;
  status: 'open' | 'in_remediation' | 'remediated' | 'risk_accepted';
  remediated_at: string | null;
  created_at: string;
  finding_summary?: AuditFinding;
}
const ISSUE_KEY = 'erp_ia_issue_log';

export function logIAIssue(input: IAIssueLogEntryInput): IAIssueLogEntry {
  const findings = listFindings(input.engagement_id);
  const found = findings.find((f) => f.id === input.finding_id);
  if (!found) throw new Error(`Finding ${input.finding_id} not found in engagement ${input.engagement_id}`);
  const issue: IAIssueLogEntry = {
    ...input,
    id: uid('iaiss'),
    status: 'open',
    remediated_at: null,
    created_at: new Date().toISOString(),
    finding_summary: found,
  };
  const all = readJson<IAIssueLogEntry[]>(ISSUE_KEY, []);
  all.push(issue);
  writeJson(ISSUE_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('ia_issue_log_entry'),
    recordId: issue.id,
    recordLabel: `IA Issue · ${issue.severity_class} · ${input.finding_id}`,
    beforeState: null,
    afterState: issue as unknown as Record<string, unknown>,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return issue;
}

export function updateIAIssueStatus(
  issue_id: string,
  status: IAIssueLogEntry['status'],
  by_bap: BAPAccountId,
  notes?: string,
): IAIssueLogEntry {
  const all = readJson<IAIssueLogEntry[]>(ISSUE_KEY, []);
  const idx = all.findIndex((i) => i.id === issue_id);
  if (idx < 0) throw new Error(`IAIssue ${issue_id} not found`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    status,
    remediated_at: status === 'remediated' ? new Date().toISOString() : all[idx].remediated_at,
  };
  writeJson(ISSUE_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('ia_issue_log_entry'),
    recordId: issue_id,
    recordLabel: `IA Issue ${issue_id} → ${status} by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    reason: notes ?? null,
    sourceModule: 'comply360-internal-audit-engine',
  });
  return all[idx];
}

export function listIAIssues(
  engagement_id: string,
  opts?: { status?: IAIssueLogEntry['status'] },
): IAIssueLogEntry[] {
  return readJson<IAIssueLogEntry[]>(ISSUE_KEY, [])
    .filter((i) => i.engagement_id === engagement_id)
    .filter((i) => !opts?.status || i.status === opts.status);
}

// ─── Convenience · maturity score ───
export function getEngagementMaturityScore(engagement_id: string): {
  plan_approved: boolean;
  universe_defined: boolean;
  programs_assigned: number;
  charter_approved: boolean;
  open_issues: number;
  maturity_percentage: number;
} {
  const plans = listEngagementPlans(engagement_id);
  const plan_approved = plans.some((p) => p.status === 'approved');
  const universe = listAuditUniverse();
  const universe_defined = universe.length > 0;
  const programs_assigned = listAuditPrograms().length;
  const charter = getAuditCharter(engagement_id);
  const charter_approved = !!(charter && charter.approved_at);
  const open_issues = listIAIssues(engagement_id, { status: 'open' }).length;
  const noCritical = listIAIssues(engagement_id).every(
    (i) => i.severity_class !== 'critical' || i.status !== 'open',
  );
  const maturity_percentage = Math.round(
    (plan_approved ? 25 : 0) +
    (universe_defined ? 25 : 0) +
    (programs_assigned > 0 ? 20 : 0) +
    (charter_approved ? 15 : 0) +
    (noCritical ? 15 : 0),
  );
  return { plan_approved, universe_defined, programs_assigned, charter_approved, open_issues, maturity_percentage };
}

// ─── Entity-type registration (side-effect on import) ───
registerAuditEntityType({ id: 'ia_engagement_plan', module: 'audit-trail', label: 'IA · Engagement Plan' });
registerAuditEntityType({ id: 'ia_audit_universe', module: 'audit-trail', label: 'IA · Audit Universe' });
registerAuditEntityType({ id: 'ia_audit_program', module: 'audit-trail', label: 'IA · Audit Program' });
registerAuditEntityType({ id: 'ia_audit_charter', module: 'audit-trail', label: 'IA · Audit Charter' });
registerAuditEntityType({ id: 'ia_issue_log_entry', module: 'audit-trail', label: 'IA · Issue Log Entry' });
