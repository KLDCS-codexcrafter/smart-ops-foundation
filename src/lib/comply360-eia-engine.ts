/**
 * @file        src/lib/comply360-eia-engine.ts
 * @sibling     NEW @ Sprint 90 · Comply360 Floor 5 Comprehensive Compliance Arc 5.2 · DP-F5-1 · Q34 · Environmental Compliance Pt 1
 * @realizes    Environmental Impact Assessment per EIA 2006 Notification framework + CRZ 2019 compliance + public consultation log.
 *              19th USE-SITE READ application · MAXIMUM SCALE.
 * @reads-from  comply360-environmental-engine (S90 base framework) · comply360-audit-framework-engine (S80a) ·
 *              comply360-calendar-engine (S78a · EIA milestones) · audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 90 · T-Phase-5.F.5.2 · Floor 5.2 · Q34
 * [JWT] Phase 8: POST /api/comply360/eia/{process,crz,consultation}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-environmental-engine',
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_eia_processes', 'erp_crz_compliance', 'erp_public_consultations'],
} as const;

// 3 NEW audit entity types · MCA Rule 11(g)(b) coverage
registerAuditEntityType({ id: 'eia_process', module: 'esg', label: 'EIA 2006 Process' });
registerAuditEntityType({ id: 'crz_compliance', module: 'esg', label: 'CRZ 2019 Compliance' });
registerAuditEntityType({ id: 'public_consultation', module: 'esg', label: 'EIA Public Consultation' });

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

// ─── EIA Process ──────────────────────────────────────────────────
export type ProjectCategory = 'A' | 'B1' | 'B2';
export type ProcessStage = 'screening' | 'scoping' | 'public_consultation' | 'appraisal' | 'decision';
export type EIAStatus = 'in_progress' | 'approved' | 'rejected';

export interface EIAProcess {
  id: string;
  project_name: string;
  project_category: ProjectCategory;
  process_stage: ProcessStage;
  initiated_date: string;
  expected_decision_date: string;
  status: EIAStatus;
}

const EIA_KEY = 'erp_eia_processes';

export function recordEIAProcess(input: Omit<EIAProcess, 'id'>, by_bap: BAPAccountId): EIAProcess {
  const p: EIAProcess = { ...input, id: uid('eia') };
  const all = readJson<EIAProcess[]>(EIA_KEY, []);
  all.push(p); writeJson(EIA_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('eia_process'),
    recordId: p.id, recordLabel: `EIA · ${input.project_name} · ${input.project_category} (by ${by_bap})`,
    beforeState: null, afterState: p as unknown as Record<string, unknown>,
    sourceModule: 'comply360-eia-engine',
  });
  return p;
}

export function listEIAProcesses(filter: { status?: EIAStatus } = {}): EIAProcess[] {
  return readJson<EIAProcess[]>(EIA_KEY, []).filter((p) => !filter.status || p.status === filter.status);
}

// ─── CRZ Compliance ───────────────────────────────────────────────
export type CRZZone = 'CRZ-I' | 'CRZ-II' | 'CRZ-III' | 'CRZ-IV';
export type CoastalState = 'MH' | 'KA' | 'TN' | 'KL' | 'GA' | 'GJ' | 'WB' | 'AP' | 'OD' | 'OTHER';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CRZCompliance {
  id: string;
  project_name: string;
  crz_zone: CRZZone;
  state: CoastalState;
  approval_status: ApprovalStatus;
  approval_date?: string;
}

const CRZ_KEY = 'erp_crz_compliance';

export function recordCRZCompliance(input: Omit<CRZCompliance, 'id'>, by_bap: BAPAccountId): CRZCompliance {
  const c: CRZCompliance = { ...input, id: uid('crz') };
  const all = readJson<CRZCompliance[]>(CRZ_KEY, []);
  all.push(c); writeJson(CRZ_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('crz_compliance'),
    recordId: c.id, recordLabel: `CRZ · ${input.project_name} · ${input.crz_zone} · ${input.state} (by ${by_bap})`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-eia-engine',
  });
  return c;
}

export function listCRZCompliances(filter: { crz_zone?: CRZZone } = {}): CRZCompliance[] {
  return readJson<CRZCompliance[]>(CRZ_KEY, []).filter((c) => !filter.crz_zone || c.crz_zone === filter.crz_zone);
}

// ─── Public Consultation ──────────────────────────────────────────
export interface PublicConsultation {
  id: string;
  eia_process_id: string;
  consultation_date: string;
  participants_count: number;
  objections_received: number;
  resolution_summary: string;
}

const PC_KEY = 'erp_public_consultations';

export function recordPublicConsultation(input: Omit<PublicConsultation, 'id'>, by_bap: BAPAccountId): PublicConsultation {
  const c: PublicConsultation = { ...input, id: uid('pc') };
  const all = readJson<PublicConsultation[]>(PC_KEY, []);
  all.push(c); writeJson(PC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('public_consultation'),
    recordId: c.id,
    recordLabel: `Public Consultation · ${input.eia_process_id} · ${input.consultation_date} (by ${by_bap})`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-eia-engine',
  });
  return c;
}

export function listPublicConsultations(filter: { eia_process_id?: string } = {}): PublicConsultation[] {
  return readJson<PublicConsultation[]>(PC_KEY, [])
    .filter((c) => !filter.eia_process_id || c.eia_process_id === filter.eia_process_id);
}
