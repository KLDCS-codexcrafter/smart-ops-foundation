/**
 * @file        src/lib/comply360-sector-rera-engine.ts
 * @sibling     NEW @ Sprint 87 · DP-S87-3
 * @realizes    Real Estate (Regulation and Development) Act 2016 · Project registration +
 *              Form REA-1 + Quarterly progress reports + Form REA-3.
 * @reads-from  audit-trail-engine · audit-trail-aggregator · audit-framework
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES
 * [JWT] Phase 8: POST /api/comply360/rera/{project,progress}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine', 'comply360-audit-framework-engine'],
  storage_keys: ['erp_rera_projects', 'erp_rera_progress_reports'],
} as const;

export type RERAProjectStatus = 'planned' | 'registration_pending' | 'registered' | 'under_construction' | 'completed' | 'cancelled';
export type RERAProjectType = 'residential' | 'commercial' | 'mixed_use' | 'plotted';

export interface RERAProject {
  id: string;
  project_name: string;
  rera_registration_no: string | null;
  state_rera_authority: string;
  promoter_name: string;
  project_type: RERAProjectType;
  total_units: number;
  total_area_sqft: number;
  estimated_completion_date: string;
  status: RERAProjectStatus;
  registration_date: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface QuarterlyProgressReport {
  id: string;
  project_id: string;
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  reporting_date: string;
  physical_progress_pct: number;
  financial_progress_pct: number;
  units_sold: number;
  units_remaining: number;
  receivables_inr: number;
  filing_status: 'draft' | 'filed';
  filed_at: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const P_KEY = 'erp_rera_projects';
const R_KEY = 'erp_rera_progress_reports';

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

export function registerRERAProject(
  input: Omit<RERAProject, 'id' | 'recorded_at' | 'status' | 'registration_date'>,
): RERAProject {
  const r: RERAProject = {
    ...input, id: uid('rera_proj'), status: 'registration_pending',
    registration_date: null, recorded_at: new Date().toISOString(),
  };
  const all = readJson<RERAProject[]>(P_KEY, []);
  all.push(r); writeJson(P_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('rera_project'),
    recordId: r.id, recordLabel: `RERA Project · ${input.project_name} · ${input.state_rera_authority}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-rera-engine',
  });
  return r;
}

export function updateProjectStatus(project_id: string, status: RERAProjectStatus, by_bap: BAPAccountId): RERAProject {
  const all = readJson<RERAProject[]>(P_KEY, []);
  const idx = all.findIndex((p) => p.id === project_id);
  if (idx < 0) throw new Error(`RERA project not found: ${project_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx], status,
    registration_date: status === 'registered' && !all[idx].registration_date ? new Date().toISOString() : all[idx].registration_date,
  };
  writeJson(P_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('rera_project_status_change'),
    recordId: project_id, recordLabel: `RERA status → ${status} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-rera-engine',
  });
  return all[idx];
}

export function listRERAProjects(opts: { status?: RERAProjectStatus; state_rera_authority?: string } = {}): RERAProject[] {
  return readJson<RERAProject[]>(P_KEY, []).filter((p) => {
    if (opts.status && p.status !== opts.status) return false;
    if (opts.state_rera_authority && p.state_rera_authority !== opts.state_rera_authority) return false;
    return true;
  });
}

export function recordQuarterlyProgress(
  input: Omit<QuarterlyProgressReport, 'id' | 'recorded_at' | 'filed_at' | 'filing_status'>,
): QuarterlyProgressReport {
  const r: QuarterlyProgressReport = {
    ...input, id: uid('rera_qpr'),
    filing_status: 'draft', filed_at: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<QuarterlyProgressReport[]>(R_KEY, []);
  all.push(r); writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('rera_quarterly_progress_report'),
    recordId: r.id, recordLabel: `RERA QPR · ${input.fy} ${input.quarter} · ${input.physical_progress_pct}%`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-rera-engine',
  });
  return r;
}

export function markProgressReportFiled(report_id: string, by_bap: BAPAccountId): QuarterlyProgressReport {
  const all = readJson<QuarterlyProgressReport[]>(R_KEY, []);
  const idx = all.findIndex((r) => r.id === report_id);
  if (idx < 0) throw new Error(`Progress report not found: ${report_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: 'filed', filed_at: new Date().toISOString() };
  writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('rera_quarterly_progress_report'),
    recordId: report_id, recordLabel: `RERA QPR filed · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-rera-engine',
  });
  return all[idx];
}

export function listProgressReports(opts: { project_id?: string; fy?: string } = {}): QuarterlyProgressReport[] {
  return readJson<QuarterlyProgressReport[]>(R_KEY, []).filter((r) => {
    if (opts.project_id && r.project_id !== opts.project_id) return false;
    if (opts.fy && r.fy !== opts.fy) return false;
    return true;
  });
}

registerAuditEntityType({ id: 'rera_project', module: 'tax-gst', label: 'RERA · Project Registration' });
registerAuditEntityType({ id: 'rera_quarterly_progress_report', module: 'tax-gst', label: 'RERA · Quarterly Progress Report' });
registerAuditEntityType({ id: 'rera_project_status_change', module: 'tax-gst', label: 'RERA · Project Status Change' });
