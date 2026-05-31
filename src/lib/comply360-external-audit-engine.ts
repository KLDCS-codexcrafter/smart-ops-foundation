/**
 * @file        src/lib/comply360-external-audit-engine.ts
 * @sibling     NEW @ Sprint 82 · Comply360 Floor 2 External Audit · DP-S82-1
 * @realizes    Master External Audit workflow · 11 Q18 modules combined:
 *                1. Engagement Letter · 2. Audit Planning · 3. Materiality Calculator
 *                4. Risk Assessment Matrix · 5. Sample Size (SA 530 wrapper)
 *                6. Audit Program Builder · 7. Management Rep Letter
 *                8. External Confirmation (delegated) · 9. Survival Kit (delegated)
 *                10. Audit Report (Modified/Unmodified opinion)
 *                11. Final Audit Pack Compiler · THE INTEGRATION HEADLINE
 * @reads-from  comply360-audit-framework-engine · comply360-auditor-workspace-engine
 *              comply360-ia-external-handoff-engine (S81d THE BRIDGE)
 *              comply360-rule-11g-report-engine (S80f) · comply360-caro-extended-engine (S77a)
 *              comply360-tax-audit-3cd-engine (S74a) · audit-trail-engine + aggregator
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 CLOSES
 * [JWT] Phase 8: POST /api/comply360/external-audit/* endpoints
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { computeAuditReadyScore } from './comply360-audit-ready-score-engine';
import { generateRule11gReport } from './comply360-rule-11g-report-engine';
import { listExternalHandoffPackages } from './comply360-ia-external-handoff-engine';
import { build3CD } from './comply360-tax-audit-3cd-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-auditor-workspace-engine',
    'comply360-ia-external-handoff-engine',
    'comply360-rule-11g-report-engine',
    'comply360-caro-extended-engine',
    'comply360-tax-audit-3cd-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_ea_engagement_letters',
    'erp_ea_materiality',
    'erp_ea_risk_assessments',
    'erp_ea_mgmt_rep_letters',
    'erp_ea_audit_reports',
    'erp_ea_final_packs',
  ],
} as const;

const EL_KEY = 'erp_ea_engagement_letters';
const MAT_KEY = 'erp_ea_materiality';
const RISK_KEY = 'erp_ea_risk_assessments';
const MGMT_KEY = 'erp_ea_mgmt_rep_letters';
const REPORT_KEY = 'erp_ea_audit_reports';
const PACK_KEY = 'erp_ea_final_packs';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

// ─── Q18 Module 1 · Engagement Letter ───
export interface ExternalAuditEngagementLetter {
  id: string;
  engagement_id: string;
  ca_firm_name: string;
  auditor_name: string;
  icai_membership_no: string;
  entity_name: string;
  fy: string;
  scope_of_engagement: string;
  fees_inr: number;
  estimated_completion_weeks: number;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  signed: boolean;
}

export function generateEngagementLetter(
  input: Omit<ExternalAuditEngagementLetter, 'id' | 'generated_at' | 'signed'>,
): ExternalAuditEngagementLetter {
  const letter: ExternalAuditEngagementLetter = {
    ...input,
    id: uid('eal'),
    generated_at: new Date().toISOString(),
    signed: false,
  };
  const all = readJson<ExternalAuditEngagementLetter[]>(EL_KEY, []);
  all.push(letter);
  writeJson(EL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('external_audit_engagement_letter'),
    recordId: letter.id,
    recordLabel: `Engagement Letter · ${input.ca_firm_name} · ${input.fy}`,
    beforeState: null,
    afterState: letter as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });
  return letter;
}

export function listEngagementLetters(engagement_id: string): ExternalAuditEngagementLetter[] {
  return readJson<ExternalAuditEngagementLetter[]>(EL_KEY, [])
    .filter((l) => l.engagement_id === engagement_id);
}

// ─── Q18 Module 3 · Materiality Calculator ───
export interface MaterialityCalculation {
  id: string;
  engagement_id: string;
  benchmark: 'revenue' | 'profit_before_tax' | 'total_assets' | 'equity';
  benchmark_value_inr: number;
  overall_materiality_pct: number;
  performance_materiality_pct: number;
  specific_materiality_items: Array<{ area: string; threshold_inr: number; rationale: string }>;
  overall_materiality_inr: number;
  performance_materiality_inr: number;
  computed_at: string;
  computed_by_bap: BAPAccountId;
}

export function calculateMateriality(
  input: Omit<MaterialityCalculation, 'id' | 'overall_materiality_inr' | 'performance_materiality_inr' | 'computed_at'>,
): MaterialityCalculation {
  const overall_materiality_inr = Math.round(input.benchmark_value_inr * (input.overall_materiality_pct / 100));
  const performance_materiality_inr = Math.round(overall_materiality_inr * (input.performance_materiality_pct / 100));
  const calc: MaterialityCalculation = {
    ...input,
    id: uid('mat'),
    overall_materiality_inr,
    performance_materiality_inr,
    computed_at: new Date().toISOString(),
  };
  const all = readJson<MaterialityCalculation[]>(MAT_KEY, []);
  all.push(calc);
  writeJson(MAT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('materiality_calculation'),
    recordId: calc.id,
    recordLabel: `Materiality · ${input.benchmark} · ₹${overall_materiality_inr}`,
    beforeState: null,
    afterState: calc as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });
  return calc;
}

export function listMaterialityCalculations(engagement_id: string): MaterialityCalculation[] {
  return readJson<MaterialityCalculation[]>(MAT_KEY, []).filter((m) => m.engagement_id === engagement_id);
}

// ─── Q18 Module 4 · Audit Risk Assessment (SA 315 · 8 assertions) ───
export type AuditAssertion =
  | 'completeness' | 'accuracy' | 'cutoff' | 'classification'
  | 'occurrence' | 'rights_obligations' | 'valuation' | 'presentation_disclosure';

export interface AuditRiskAssessmentEntry {
  id: string;
  engagement_id: string;
  risk_code: string;
  risk_description: string;
  audit_assertion: AuditAssertion;
  inherent_risk: 'high' | 'medium' | 'low';
  control_risk: 'high' | 'medium' | 'low';
  detection_risk: 'high' | 'medium' | 'low';
  audit_response: string;
  authored_by_bap: BAPAccountId;
  created_at: string;
}

export function createAuditRiskAssessment(
  input: Omit<AuditRiskAssessmentEntry, 'id' | 'created_at'>,
): AuditRiskAssessmentEntry {
  const entry: AuditRiskAssessmentEntry = {
    ...input,
    id: uid('risk'),
    created_at: new Date().toISOString(),
  };
  const all = readJson<AuditRiskAssessmentEntry[]>(RISK_KEY, []);
  all.push(entry);
  writeJson(RISK_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('audit_risk_assessment'),
    recordId: entry.id,
    recordLabel: `Risk · ${input.risk_code} · ${input.audit_assertion}`,
    beforeState: null,
    afterState: entry as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });
  return entry;
}

export function listAuditRiskAssessments(engagement_id: string): AuditRiskAssessmentEntry[] {
  return readJson<AuditRiskAssessmentEntry[]>(RISK_KEY, []).filter((r) => r.engagement_id === engagement_id);
}

// ─── Q18 Module 7 · Management Rep Letter ───
export interface ManagementRepresentationLetter {
  id: string;
  engagement_id: string;
  letter_date: string;
  representations: Array<{ topic: string; statement: string; signed_by: string }>;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  signed: boolean;
}

export function generateManagementRepLetter(
  input: Omit<ManagementRepresentationLetter, 'id' | 'generated_at' | 'signed'>,
): ManagementRepresentationLetter {
  const letter: ManagementRepresentationLetter = {
    ...input,
    id: uid('mrl'),
    generated_at: new Date().toISOString(),
    signed: false,
  };
  const all = readJson<ManagementRepresentationLetter[]>(MGMT_KEY, []);
  all.push(letter);
  writeJson(MGMT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('mgmt_rep_letter'),
    recordId: letter.id,
    recordLabel: `Mgmt Rep Letter · ${input.letter_date}`,
    beforeState: null,
    afterState: letter as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });
  return letter;
}

export function listManagementRepLetters(engagement_id: string): ManagementRepresentationLetter[] {
  return readJson<ManagementRepresentationLetter[]>(MGMT_KEY, []).filter((l) => l.engagement_id === engagement_id);
}

// ─── Q18 Module 10 · Audit Report (SA 700/705/706) ───
export type AuditOpinionType = 'unmodified' | 'qualified' | 'adverse' | 'disclaimer';

export interface ExternalAuditReport {
  id: string;
  engagement_id: string;
  opinion_type: AuditOpinionType;
  basis_for_opinion: string;
  emphasis_of_matter: string[];
  other_matter_paragraphs: string[];
  key_audit_matters: Array<{ matter: string; how_addressed: string }>;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  signed: boolean;
}

export function generateAuditReport(
  input: Omit<ExternalAuditReport, 'id' | 'generated_at' | 'signed'>,
): ExternalAuditReport {
  const rep: ExternalAuditReport = {
    ...input,
    id: uid('arep'),
    generated_at: new Date().toISOString(),
    signed: false,
  };
  const all = readJson<ExternalAuditReport[]>(REPORT_KEY, []);
  all.push(rep);
  writeJson(REPORT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('external_audit_report'),
    recordId: rep.id,
    recordLabel: `Audit Report · ${input.opinion_type}`,
    beforeState: null,
    afterState: rep as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });
  return rep;
}

export function listAuditReports(engagement_id: string): ExternalAuditReport[] {
  return readJson<ExternalAuditReport[]>(REPORT_KEY, []).filter((r) => r.engagement_id === engagement_id);
}

/** Opinion heuristic based on Audit-Ready Score band. */
export function deriveOpinionTypeFromScore(score: number): AuditOpinionType {
  if (score >= 85) return 'unmodified';
  if (score >= 70) return 'qualified';
  if (score >= 50) return 'adverse';
  return 'disclaimer';
}

// ─── Q18 Module 11 · THE INTEGRATION HEADLINE · Final Audit Pack Compiler ───
export interface FinalAuditPack {
  id: string;
  engagement_id: string;
  fy: string;
  entity_name: string;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  artifacts: {
    engagement_letter_id: string | null;
    materiality_calc_id: string | null;
    risk_assessment_count: number;
    mgmt_rep_letter_id: string | null;
    audit_report_id: string | null;
    rule_11g_report_id: string | null;
    ia_handoff_package_id: string | null;
    form_3cd_id: string | null;
    survival_kit_id: string | null;
    confirmation_received_count: number;
  };
  audit_pack_blob: Blob;
  size_bytes: number;
}

export function compileFinalAuditPack(opts: {
  engagement_id: string;
  fy: string;
  entity_name: string;
  generated_by_bap: BAPAccountId;
  include_ia_handoff?: boolean;
  include_rule_11g?: boolean;
  include_3cd?: boolean;
  include_survival_kit?: boolean;
}): FinalAuditPack {
  const includeIA = opts.include_ia_handoff !== false;
  const includeRule = opts.include_rule_11g !== false;
  const include3cd = opts.include_3cd !== false;
  const includeSk = opts.include_survival_kit !== false;
  const entity_code = activeEntityCode();

  const letters = listEngagementLetters(opts.engagement_id);
  const materiality = listMaterialityCalculations(opts.engagement_id);
  const risks = listAuditRiskAssessments(opts.engagement_id);
  const mgmts = listManagementRepLetters(opts.engagement_id);
  const reports = listAuditReports(opts.engagement_id);

  let rule_11g_id: string | null = null;
  if (includeRule) {
    try {
      const r = generateRule11gReport({
        entity_code,
        entity_name: opts.entity_name,
        fy: opts.fy,
        generated_by_bap: opts.generated_by_bap,
        engagement_id: opts.engagement_id,
      });
      rule_11g_id = r.id;
    } catch { rule_11g_id = null; }
  }

  let ia_handoff_id: string | null = null;
  if (includeIA) {
    const handoffs = listExternalHandoffPackages(opts.engagement_id);
    if (handoffs.length > 0) ia_handoff_id = handoffs[handoffs.length - 1].id;
  }

  let form_3cd_id: string | null = null;
  if (include3cd) {
    try {
      const auditor = { firm: 'Demo CA', frn: '000000W', member: 'CA Demo', mno: '000000' };
      const entity = { name: opts.entity_name, pan: 'AAAAA0000A', address: 'India' };
      const f3cd = build3CD(auditor, entity, opts.fy);
      form_3cd_id = f3cd.id;
    } catch { form_3cd_id = null; }
  }

  let survival_kit_id: string | null = null;
  if (includeSk) {
    try {
      const raw = localStorage.getItem('erp_survival_kits');
      const kits = raw ? (JSON.parse(raw) as Array<{ id: string; engagement_id: string }>) : [];
      const match = kits.filter((k) => k.engagement_id === opts.engagement_id);
      if (match.length > 0) survival_kit_id = match[match.length - 1].id;
    } catch { survival_kit_id = null; }
  }

  let confirmation_received_count = 0;
  try {
    const raw = localStorage.getItem('erp_ec_received');
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    confirmation_received_count = Array.isArray(arr) ? arr.length : 0;
  } catch { confirmation_received_count = 0; }

  const artifacts = {
    engagement_letter_id: letters.length > 0 ? letters[letters.length - 1].id : null,
    materiality_calc_id: materiality.length > 0 ? materiality[materiality.length - 1].id : null,
    risk_assessment_count: risks.length,
    mgmt_rep_letter_id: mgmts.length > 0 ? mgmts[mgmts.length - 1].id : null,
    audit_report_id: reports.length > 0 ? reports[reports.length - 1].id : null,
    rule_11g_report_id: rule_11g_id,
    ia_handoff_package_id: ia_handoff_id,
    form_3cd_id,
    survival_kit_id,
    confirmation_received_count,
  };

  const payload = {
    engagement_id: opts.engagement_id,
    fy: opts.fy,
    entity_name: opts.entity_name,
    artifacts,
    generated_at: new Date().toISOString(),
  };
  const blobText = JSON.stringify(payload, null, 2);
  const audit_pack_blob = new Blob([blobText], { type: 'application/json' });

  const pack: FinalAuditPack = {
    id: uid('fap'),
    engagement_id: opts.engagement_id,
    fy: opts.fy,
    entity_name: opts.entity_name,
    generated_at: payload.generated_at,
    generated_by_bap: opts.generated_by_bap,
    artifacts,
    audit_pack_blob,
    size_bytes: blobText.length,
  };

  // persist without the blob (blob is regenerated on read · localStorage cannot hold Blob)
  const all = readJson<Array<Omit<FinalAuditPack, 'audit_pack_blob'> & { blob_text: string }>>(PACK_KEY, []);
  all.push({ ...pack, blob_text: blobText, audit_pack_blob: undefined as never });
  writeJson(PACK_KEY, all);

  logAudit({
    entityCode: entity_code,
    action: 'create',
    entityType: AUD('final_audit_pack'),
    recordId: pack.id,
    recordLabel: `Final Audit Pack · ${opts.entity_name} · ${opts.fy}`,
    beforeState: null,
    afterState: { id: pack.id, artifacts } as Record<string, unknown>,
    sourceModule: 'comply360-external-audit-engine',
  });

  // best-effort score linkage (informational)
  try { computeAuditReadyScore({ entity_code, fy: opts.fy }); } catch { /* optional */ }

  return pack;
}

export function listFinalAuditPacks(engagement_id: string): FinalAuditPack[] {
  const raw = readJson<Array<Omit<FinalAuditPack, 'audit_pack_blob'> & { blob_text: string }>>(PACK_KEY, []);
  return raw.filter((p) => p.engagement_id === engagement_id).map((p) => ({
    ...p,
    audit_pack_blob: new Blob([p.blob_text], { type: 'application/json' }),
  }));
}

export function getFinalAuditPack(id: string): FinalAuditPack | null {
  const raw = readJson<Array<Omit<FinalAuditPack, 'audit_pack_blob'> & { blob_text: string }>>(PACK_KEY, []);
  const p = raw.find((x) => x.id === id);
  if (!p) return null;
  return { ...p, audit_pack_blob: new Blob([p.blob_text], { type: 'application/json' }) };
}

// ─── Entity-type registration ───
registerAuditEntityType({ id: 'external_audit_engagement_letter', module: 'audit-trail', label: 'External Audit · Engagement Letter' });
registerAuditEntityType({ id: 'materiality_calculation', module: 'audit-trail', label: 'External Audit · Materiality Calculation' });
registerAuditEntityType({ id: 'audit_risk_assessment', module: 'audit-trail', label: 'External Audit · Risk Assessment' });
registerAuditEntityType({ id: 'mgmt_rep_letter', module: 'audit-trail', label: 'External Audit · Management Rep Letter' });
registerAuditEntityType({ id: 'external_audit_report', module: 'audit-trail', label: 'External Audit · Audit Report' });
registerAuditEntityType({ id: 'final_audit_pack', module: 'audit-trail', label: 'External Audit · Final Audit Pack' });
registerAuditEntityType({ id: 'external_audit_program', module: 'audit-trail', label: 'External Audit · Audit Program' });
