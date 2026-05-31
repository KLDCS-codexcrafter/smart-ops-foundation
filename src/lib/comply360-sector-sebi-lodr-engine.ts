/**
 * @file        src/lib/comply360-sector-sebi-lodr-engine.ts
 * @sibling     NEW @ Sprint 87 · DP-S87-2
 * @realizes    SEBI LODR Regulations 2015 · Reg 33 quarterly + Reg 49 Audit Committee + Reg 30 disclosures.
 *              USE-SITE READS S85 meetings-engine (Audit Committee composition · meeting_type='Audit_Committee').
 * @reads-from  audit-trail-engine · audit-trail-aggregator · meetings-engine
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES
 * [JWT] Phase 8: POST /api/comply360/sebi/{quarterly,audit-committee,disclosure}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { listMeetings } from './comply360-meetings-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine', 'comply360-meetings-engine'],
  storage_keys: ['erp_sebi_quarterly_filings', 'erp_sebi_audit_committee_composition', 'erp_sebi_material_disclosures'],
} as const;

export type SEBIFilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';
export type MaterialDisclosureCategory = 'financial' | 'governance' | 'litigation' | 'strategic' | 'regulatory' | 'other';
export type DisclosureCompliance = 'within_24h' | 'late' | 'pending';

export interface SEBIQuarterlyFiling {
  id: string;
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  filing_deadline: string;
  filed_at: string | null;
  filing_status: SEBIFilingStatus;
  reg33_data: { revenue_inr: number; pat_inr: number; eps_inr: number; qualifications: string[] };
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AuditCommitteeComposition {
  id: string;
  fy: string;
  composition_date: string;
  member_count: number;
  independent_director_count: number;
  is_chairman_independent: boolean;
  is_compliant: boolean;
  meetings_held_count: number;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface MaterialDisclosure {
  id: string;
  fy: string;
  event_date: string;
  disclosure_date: string;
  category: MaterialDisclosureCategory;
  event_summary: string;
  compliance: DisclosureCompliance;
  hours_to_disclosure: number;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const Q_KEY = 'erp_sebi_quarterly_filings';
const A_KEY = 'erp_sebi_audit_committee_composition';
const D_KEY = 'erp_sebi_material_disclosures';

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

export function createQuarterlyFiling(
  input: Omit<SEBIQuarterlyFiling, 'id' | 'recorded_at' | 'filed_at' | 'filing_status'>,
): SEBIQuarterlyFiling {
  const f: SEBIQuarterlyFiling = {
    ...input, id: uid('sebi_q'), filed_at: null, filing_status: 'draft',
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<SEBIQuarterlyFiling[]>(Q_KEY, []);
  all.push(f); writeJson(Q_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('sebi_quarterly_filing'),
    recordId: f.id, recordLabel: `SEBI Reg33 · ${input.fy} ${input.quarter}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-sebi-lodr-engine',
  });
  return f;
}

export function updateFilingStatus(filing_id: string, status: SEBIFilingStatus, by_bap: BAPAccountId): SEBIQuarterlyFiling {
  const all = readJson<SEBIQuarterlyFiling[]>(Q_KEY, []);
  const idx = all.findIndex((f) => f.id === filing_id);
  if (idx < 0) throw new Error(`SEBI filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: status, filed_at: status === 'filed' ? new Date().toISOString() : all[idx].filed_at };
  writeJson(Q_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('sebi_quarterly_filing'),
    recordId: filing_id, recordLabel: `SEBI status → ${status} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-sebi-lodr-engine',
  });
  return all[idx];
}

export function listQuarterlyFilings(opts: { fy?: string; quarter?: string } = {}): SEBIQuarterlyFiling[] {
  return readJson<SEBIQuarterlyFiling[]>(Q_KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.quarter && f.quarter !== opts.quarter) return false;
    return true;
  });
}

export function recordAuditCommitteeComposition(
  input: Omit<AuditCommitteeComposition, 'id' | 'recorded_at' | 'is_compliant'>,
): AuditCommitteeComposition {
  const indep_ratio = input.member_count > 0 ? input.independent_director_count / input.member_count : 0;
  const is_compliant = input.member_count >= 3 && indep_ratio >= (2 / 3) && input.is_chairman_independent && input.meetings_held_count >= 4;
  const r: AuditCommitteeComposition = {
    ...input, id: uid('sebi_ac'), is_compliant, recorded_at: new Date().toISOString(),
  };
  const all = readJson<AuditCommitteeComposition[]>(A_KEY, []);
  all.push(r); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('sebi_audit_committee_composition'),
    recordId: r.id, recordLabel: `SEBI AC · ${input.fy} · ${is_compliant ? 'compliant' : 'non-compliant'}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-sebi-lodr-engine',
  });
  return r;
}

export function listAuditCommitteeCompositions(opts: { fy?: string } = {}): AuditCommitteeComposition[] {
  return readJson<AuditCommitteeComposition[]>(A_KEY, []).filter((r) => !opts.fy || r.fy === opts.fy);
}

export function recordMaterialDisclosure(
  input: Omit<MaterialDisclosure, 'id' | 'recorded_at' | 'compliance' | 'hours_to_disclosure'>,
): MaterialDisclosure {
  const hours = Math.max(0, (new Date(input.disclosure_date).getTime() - new Date(input.event_date).getTime()) / 3_600_000);
  const compliance: DisclosureCompliance = hours <= 24 ? 'within_24h' : 'late';
  const r: MaterialDisclosure = {
    ...input, id: uid('sebi_md'), compliance, hours_to_disclosure: Math.round(hours * 100) / 100,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<MaterialDisclosure[]>(D_KEY, []);
  all.push(r); writeJson(D_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('sebi_material_disclosure'),
    recordId: r.id, recordLabel: `SEBI Reg30 · ${input.category} · ${compliance}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-sebi-lodr-engine',
  });
  return r;
}

export function listMaterialDisclosures(opts: { fy?: string; category?: MaterialDisclosureCategory } = {}): MaterialDisclosure[] {
  return readJson<MaterialDisclosure[]>(D_KEY, []).filter((m) => {
    if (opts.fy && m.fy !== opts.fy) return false;
    if (opts.category && m.category !== opts.category) return false;
    return true;
  });
}

export function verifyAuditCommitteeCompliance(composition_id: string): { is_compliant: boolean; issues: string[] } {
  const c = readJson<AuditCommitteeComposition[]>(A_KEY, []).find((x) => x.id === composition_id);
  const issues: string[] = [];
  if (!c) return { is_compliant: false, issues: ['Composition not found'] };
  if (c.member_count < 3) issues.push('Reg 49(2)(a): minimum 3 members required');
  if (c.independent_director_count / c.member_count < 2 / 3) issues.push('Reg 49(2)(b): 2/3 must be independent');
  if (!c.is_chairman_independent) issues.push('Reg 49(2)(c): chairman must be independent');
  if (c.meetings_held_count < 4) issues.push('Reg 49(2)(f): minimum 4 meetings/year');
  return { is_compliant: issues.length === 0, issues };
}

/** USE-SITE READ S85 meetings-engine · Audit Committee meeting count for FY */
export function getAuditCommitteeMeetingsForFY(fy: string): number {
  return listMeetings({ fy, meeting_type: 'Audit_Committee' }).length;
}

registerAuditEntityType({ id: 'sebi_quarterly_filing', module: 'tax-gst', label: 'SEBI · Quarterly Filing (Reg 33)' });
registerAuditEntityType({ id: 'sebi_audit_committee_composition', module: 'tax-gst', label: 'SEBI · Audit Committee (Reg 49)' });
registerAuditEntityType({ id: 'sebi_material_disclosure', module: 'tax-gst', label: 'SEBI · Material Disclosure (Reg 30)' });
registerAuditEntityType({ id: 'sebi_compliance_check', module: 'tax-gst', label: 'SEBI · Compliance Check' });
