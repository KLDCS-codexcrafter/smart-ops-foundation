/**
 * @file        src/lib/comply360-posh-engine.ts
 * @sibling     NEW @ Sprint 86 · Comply360 Floor 4 Sector-Pack Arc 4.1 · DP-S86-2
 * @realizes    POSH Act 2013 · Internal Complaints Committee + complaint intake +
 *              Section 21 Annual Report. USE-SITE READS S85 meetings + whistleblower.
 * @reads-from  audit-trail-engine · aggregator · meetings-engine (S85) · whistleblower-engine (S85)
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · FLOOR 4 OPENS
 * [JWT] Phase 8: POST /api/comply360/posh/{icc,complaint,annual-report}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READS S85 meetings (ICC is meeting committee variant) + whistleblower (POSH inherits investigation pattern)
import { listMeetings } from './comply360-meetings-engine';
import { listComplaints as listWhistleblowerComplaints } from './comply360-whistleblower-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-meetings-engine',
    'comply360-whistleblower-engine',
  ],
  storage_keys: ['erp_posh_icc_members', 'erp_posh_complaints', 'erp_posh_annual_reports'],
} as const;

export type ICCMemberRole = 'Presiding_Officer' | 'External_Member' | 'Employee_Member' | 'NGO_Representative';
export type POSHComplaintCategory = 'verbal_harassment' | 'physical_harassment' | 'visual_harassment' | 'quid_pro_quo' | 'hostile_environment';
export type POSHComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';
export type POSHComplaintStatus = 'received' | 'under_investigation' | 'resolved' | 'dismissed';

export interface ICCMember {
  id: string;
  member_name: string;
  role: ICCMemberRole;
  is_woman: boolean;
  appointment_date: string;
  term_end_date: string;
  is_active: boolean;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface POSHComplaint {
  id: string;
  fy: string;
  complaint_date: string;
  complainant_identifier: string | null;
  is_anonymous: boolean;
  category: POSHComplaintCategory;
  severity: POSHComplaintSeverity;
  complaint_summary: string;
  complaint_details_encrypted: string;
  status: POSHComplaintStatus;
  assigned_icc_member_id: string | null;
  resolution_summary: string | null;
  received_at: string;
  closed_at: string | null;
}

export interface POSHAnnualReport {
  id: string;
  fy: string;
  total_complaints_received: number;
  total_complaints_resolved: number;
  total_pending: number;
  category_breakdown: Record<POSHComplaintCategory, number>;
  preventive_actions_taken: string[];
  awareness_programs_conducted: number;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
}

const M_KEY = 'erp_posh_icc_members';
const C_KEY = 'erp_posh_complaints';
const R_KEY = 'erp_posh_annual_reports';

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

export function appointICCMember(input: Omit<ICCMember, 'id' | 'recorded_at' | 'is_active'>): ICCMember {
  const m: ICCMember = { ...input, id: uid('icc'), is_active: true, recorded_at: new Date().toISOString() };
  const all = readJson<ICCMember[]>(M_KEY, []);
  all.push(m); writeJson(M_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('posh_icc_member'),
    recordId: m.id, recordLabel: `ICC · ${input.role} · ${input.member_name}`,
    beforeState: null, afterState: m as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return m;
}

export function deactivateICCMember(member_id: string, by_bap: BAPAccountId): ICCMember {
  const all = readJson<ICCMember[]>(M_KEY, []);
  const idx = all.findIndex((m) => m.id === member_id);
  if (idx < 0) throw new Error(`ICC member not found: ${member_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], is_active: false };
  writeJson(M_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('posh_icc_member'),
    recordId: member_id, recordLabel: `Deactivate ICC member · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return all[idx];
}

export function listICCMembers(opts: { active_only?: boolean } = {}): ICCMember[] {
  return readJson<ICCMember[]>(M_KEY, []).filter((m) => !opts.active_only || m.is_active);
}

export function fileposhComplaint(
  input: Omit<POSHComplaint, 'id' | 'received_at' | 'closed_at' | 'status' | 'resolution_summary' | 'assigned_icc_member_id'>,
): POSHComplaint {
  const identifier = input.is_anonymous ? null : input.complainant_identifier;
  const c: POSHComplaint = {
    ...input,
    complainant_identifier: identifier,
    id: uid('pshc'),
    status: 'received',
    assigned_icc_member_id: null,
    resolution_summary: null,
    received_at: new Date().toISOString(),
    closed_at: null,
  };
  const all = readJson<POSHComplaint[]>(C_KEY, []);
  all.push(c); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('posh_complaint'),
    recordId: c.id, recordLabel: `POSH · ${input.category} · ${input.severity}${input.is_anonymous ? ' · ANON' : ''}`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return c;
}

export function assignICCInvestigator(complaint_id: string, icc_member_id: string, by_bap: BAPAccountId): POSHComplaint {
  const all = readJson<POSHComplaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaint_id);
  if (idx < 0) throw new Error(`POSH complaint not found: ${complaint_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], assigned_icc_member_id: icc_member_id, status: 'under_investigation' };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('posh_complaint'),
    recordId: complaint_id, recordLabel: `Assign ICC ${icc_member_id} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return all[idx];
}

export function resolveposhComplaint(complaint_id: string, resolution_summary: string, by_bap: BAPAccountId): POSHComplaint {
  const all = readJson<POSHComplaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaint_id);
  if (idx < 0) throw new Error(`POSH complaint not found: ${complaint_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], status: 'resolved', resolution_summary, closed_at: new Date().toISOString() };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('posh_complaint'),
    recordId: complaint_id, recordLabel: `Resolve POSH complaint · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return all[idx];
}

export function listposhComplaints(opts: { fy?: string; status?: POSHComplaintStatus; severity?: POSHComplaintSeverity } = {}): POSHComplaint[] {
  return readJson<POSHComplaint[]>(C_KEY, []).filter((c) => {
    if (opts.fy && c.fy !== opts.fy) return false;
    if (opts.status && c.status !== opts.status) return false;
    if (opts.severity && c.severity !== opts.severity) return false;
    return true;
  });
}

export function generateAnnualReport(
  input: Omit<POSHAnnualReport, 'id' | 'prepared_at' | 'filed_at' | 'total_complaints_received' | 'total_complaints_resolved' | 'total_pending' | 'category_breakdown'>,
): POSHAnnualReport {
  const complaints = listposhComplaints({ fy: input.fy });
  const breakdown: Record<POSHComplaintCategory, number> = {
    verbal_harassment: 0, physical_harassment: 0, visual_harassment: 0, quid_pro_quo: 0, hostile_environment: 0,
  };
  let resolved = 0, pending = 0;
  for (const c of complaints) {
    breakdown[c.category]++;
    if (c.status === 'resolved') resolved++;
    else if (c.status !== 'dismissed') pending++;
  }
  const r: POSHAnnualReport = {
    ...input,
    id: uid('pshr'),
    total_complaints_received: complaints.length,
    total_complaints_resolved: resolved,
    total_pending: pending,
    category_breakdown: breakdown,
    prepared_at: new Date().toISOString(),
    filed_at: null,
  };
  const all = readJson<POSHAnnualReport[]>(R_KEY, []);
  all.push(r); writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('posh_annual_report'),
    recordId: r.id, recordLabel: `POSH Annual Report · ${input.fy} · ${complaints.length} complaints`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-posh-engine',
  });
  return r;
}

export function listAnnualReports(opts: { fy?: string } = {}): POSHAnnualReport[] {
  return readJson<POSHAnnualReport[]>(R_KEY, []).filter((r) => !opts.fy || r.fy === opts.fy);
}

/** Section 4(2) ICC composition · presiding officer woman + women majority + 1 external NGO */
export function verifyICCComposition(): { is_valid: boolean; issues: string[]; member_count: number; women_count: number; external_count: number } {
  const active = listICCMembers({ active_only: true });
  const issues: string[] = [];
  const member_count = active.length;
  const women_count = active.filter((m) => m.is_woman).length;
  const external_count = active.filter((m) => m.role === 'External_Member' || m.role === 'NGO_Representative').length;
  const presiding = active.find((m) => m.role === 'Presiding_Officer');
  if (member_count < 3) issues.push('ICC must have minimum 3 members (Section 4(2))');
  if (women_count <= member_count / 2) issues.push('Women must constitute majority of ICC');
  if (external_count < 1) issues.push('At least 1 external NGO/external member required');
  if (!presiding) issues.push('Presiding Officer not appointed');
  else if (!presiding.is_woman) issues.push('Presiding Officer must be a woman (Section 4(2))');
  return { is_valid: issues.length === 0, issues, member_count, women_count, external_count };
}

/** USE-SITE READ helpers · ICC meetings + cross-module whistleblower harassment overlap */
export function getICCMeetingsForFY(fy: string): number {
  return listMeetings({ fy }).filter((m) => m.meeting_type === 'Audit_Committee' || m.meeting_type === 'CSR_Committee').length;
}

export function getOverlappingHarassmentComplaints(fy: string): number {
  return listWhistleblowerComplaints({ fy, category: 'discrimination_harassment' }).length;
}

registerAuditEntityType({ id: 'posh_icc_member', module: 'payroll', label: 'POSH · ICC Member' });
registerAuditEntityType({ id: 'posh_complaint', module: 'payroll', label: 'POSH · Complaint' });
registerAuditEntityType({ id: 'posh_annual_report', module: 'payroll', label: 'POSH · Section 21 Annual Report' });
