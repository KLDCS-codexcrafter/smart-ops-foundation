/**
 * @file        src/lib/comply360-whistleblower-engine.ts
 * @sibling     NEW @ Sprint 85 · OOB-7 · DP-S85-2 v2 · FIRST-CLASS
 * @realizes    Vigil Mechanism Section 177(9) · whistleblower complaint intake +
 *              anonymous protection + investigation tracking + audit committee escalation.
 *              FIRST-CLASS engine paired with standalone WhistleblowerPage at case 'whistleblower'.
 * @reads-from  audit-trail-engine · audit-trail-aggregator · audit-framework
 * @sprint      Sprint 85 · T-Phase-5.C.3.3 · OOB-7 FUNCTIONAL
 * [JWT] Phase 8: POST /api/comply360/whistleblower/{complaint,investigation,escalation}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: ['erp_whistleblower_complaints', 'erp_whistleblower_investigations', 'erp_whistleblower_escalations'],
} as const;

export type ComplaintCategory =
  | 'financial_fraud' | 'corruption_bribery' | 'safety_violation' | 'discrimination_harassment'
  | 'data_breach' | 'environmental_violation' | 'regulatory_non_compliance' | 'other';
export type ComplaintStatus = 'received' | 'under_investigation' | 'resolved' | 'escalated_to_audit_committee' | 'dismissed';
export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WhistleblowerComplaint {
  id: string;
  fy: string;
  complaint_date: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  is_anonymous: boolean;
  complainant_identifier: string | null;
  complaint_summary: string;
  complaint_details_encrypted: string;
  status: ComplaintStatus;
  assigned_investigator_id: string | null;
  received_at: string;
  closed_at: string | null;
}

export interface Investigation {
  id: string;
  complaint_id: string;
  investigator_director_id: string;
  investigation_start_date: string;
  investigation_end_date: string | null;
  findings_summary: string;
  evidence_refs: string[];
  recommendation: 'no_action' | 'corrective_action' | 'disciplinary' | 'legal_escalation';
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AuditCommitteeEscalation {
  id: string;
  complaint_id: string;
  escalation_date: string;
  escalation_reason: string;
  audit_committee_response: string | null;
  audit_committee_action_taken: string | null;
  resolved_at: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const C_KEY = 'erp_whistleblower_complaints';
const I_KEY = 'erp_whistleblower_investigations';
const E_KEY = 'erp_whistleblower_escalations';

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

export function fileComplaint(
  input: Omit<WhistleblowerComplaint, 'id' | 'received_at' | 'closed_at' | 'status' | 'assigned_investigator_id'>,
): WhistleblowerComplaint {
  // Enforce anonymous protection at engine level
  const identifier = input.is_anonymous ? null : input.complainant_identifier;
  const c: WhistleblowerComplaint = {
    ...input,
    complainant_identifier: identifier,
    id: uid('wbc'),
    status: 'received',
    assigned_investigator_id: null,
    received_at: new Date().toISOString(),
    closed_at: null,
  };
  const all = readJson<WhistleblowerComplaint[]>(C_KEY, []);
  all.push(c); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('whistleblower_complaint'),
    recordId: c.id, recordLabel: `Whistleblower · ${input.category} · ${input.severity}${input.is_anonymous ? ' · ANON' : ''}`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-whistleblower-engine',
  });
  return c;
}

export function assignInvestigator(complaint_id: string, investigator_director_id: string, by_bap: BAPAccountId): WhistleblowerComplaint {
  const all = readJson<WhistleblowerComplaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaint_id);
  if (idx < 0) throw new Error(`Complaint not found: ${complaint_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], assigned_investigator_id: investigator_director_id, status: 'under_investigation' };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('whistleblower_complaint'),
    recordId: complaint_id, recordLabel: `Assign investigator ${investigator_director_id} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-whistleblower-engine',
  });
  return all[idx];
}

export function recordInvestigation(input: Omit<Investigation, 'id' | 'recorded_at'>): Investigation {
  const r: Investigation = { ...input, id: uid('inv'), recorded_at: new Date().toISOString() };
  const all = readJson<Investigation[]>(I_KEY, []);
  all.push(r); writeJson(I_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('whistleblower_investigation'),
    recordId: r.id, recordLabel: `Investigation · complaint ${input.complaint_id} · ${input.recommendation}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-whistleblower-engine',
  });
  return r;
}

export function escalateToAuditCommittee(
  input: Omit<AuditCommitteeEscalation, 'id' | 'recorded_at' | 'audit_committee_response' | 'audit_committee_action_taken' | 'resolved_at'>,
): AuditCommitteeEscalation {
  const e: AuditCommitteeEscalation = {
    ...input, id: uid('esc'),
    audit_committee_response: null, audit_committee_action_taken: null, resolved_at: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<AuditCommitteeEscalation[]>(E_KEY, []);
  all.push(e); writeJson(E_KEY, all);
  // mark complaint escalated
  const comps = readJson<WhistleblowerComplaint[]>(C_KEY, []);
  const idx = comps.findIndex((c) => c.id === input.complaint_id);
  if (idx >= 0) { comps[idx] = { ...comps[idx], status: 'escalated_to_audit_committee' }; writeJson(C_KEY, comps); }
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('audit_committee_escalation'),
    recordId: e.id, recordLabel: `Escalation · complaint ${input.complaint_id}`,
    beforeState: null, afterState: e as unknown as Record<string, unknown>,
    sourceModule: 'comply360-whistleblower-engine',
  });
  return e;
}

export function resolveEscalation(escalation_id: string, response: string, action: string, by_bap: BAPAccountId): AuditCommitteeEscalation {
  const all = readJson<AuditCommitteeEscalation[]>(E_KEY, []);
  const idx = all.findIndex((e) => e.id === escalation_id);
  if (idx < 0) throw new Error(`Escalation not found: ${escalation_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    audit_committee_response: response,
    audit_committee_action_taken: action,
    resolved_at: new Date().toISOString(),
  };
  writeJson(E_KEY, all);
  // mark complaint resolved
  const comps = readJson<WhistleblowerComplaint[]>(C_KEY, []);
  const ci = comps.findIndex((c) => c.id === all[idx].complaint_id);
  if (ci >= 0) {
    comps[ci] = { ...comps[ci], status: 'resolved', closed_at: new Date().toISOString() };
    writeJson(C_KEY, comps);
  }
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('audit_committee_escalation'),
    recordId: escalation_id, recordLabel: `Resolve escalation ${escalation_id} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-whistleblower-engine',
  });
  return all[idx];
}

export function listComplaints(opts: { fy?: string; category?: ComplaintCategory; status?: ComplaintStatus; severity?: ComplaintSeverity } = {}): WhistleblowerComplaint[] {
  return readJson<WhistleblowerComplaint[]>(C_KEY, []).filter((c) => {
    if (opts.fy && c.fy !== opts.fy) return false;
    if (opts.category && c.category !== opts.category) return false;
    if (opts.status && c.status !== opts.status) return false;
    if (opts.severity && c.severity !== opts.severity) return false;
    return true;
  });
}

export function listInvestigations(complaint_id: string): Investigation[] {
  return readJson<Investigation[]>(I_KEY, []).filter((r) => r.complaint_id === complaint_id);
}

export function listEscalations(complaint_id?: string): AuditCommitteeEscalation[] {
  const all = readJson<AuditCommitteeEscalation[]>(E_KEY, []);
  return complaint_id ? all.filter((e) => e.complaint_id === complaint_id) : all;
}

export function verifyAnonymousProtection(complaint_id: string): { is_protected: boolean; reason: string } {
  const c = readJson<WhistleblowerComplaint[]>(C_KEY, []).find((x) => x.id === complaint_id);
  if (!c) return { is_protected: false, reason: 'Complaint not found' };
  if (!c.is_anonymous) return { is_protected: false, reason: 'Complaint is not marked anonymous' };
  if (c.complainant_identifier !== null) return { is_protected: false, reason: 'Anonymous complaint has identifier (violation)' };
  return { is_protected: true, reason: 'OK · anonymous protection verified' };
}

export function getWhistleblowerStats(fy: string): {
  total_complaints: number;
  by_category: Record<ComplaintCategory, number>;
  by_severity: Record<ComplaintSeverity, number>;
  by_status: Record<ComplaintStatus, number>;
  anonymous_count: number;
  escalated_count: number;
  resolved_count: number;
} {
  const all = listComplaints({ fy });
  const by_category: Record<ComplaintCategory, number> = {
    financial_fraud: 0, corruption_bribery: 0, safety_violation: 0, discrimination_harassment: 0,
    data_breach: 0, environmental_violation: 0, regulatory_non_compliance: 0, other: 0,
  };
  const by_severity: Record<ComplaintSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const by_status: Record<ComplaintStatus, number> = {
    received: 0, under_investigation: 0, resolved: 0, escalated_to_audit_committee: 0, dismissed: 0,
  };
  let anonymous_count = 0, escalated_count = 0, resolved_count = 0;
  for (const c of all) {
    by_category[c.category]++;
    by_severity[c.severity]++;
    by_status[c.status]++;
    if (c.is_anonymous) anonymous_count++;
    if (c.status === 'escalated_to_audit_committee') escalated_count++;
    if (c.status === 'resolved') resolved_count++;
  }
  return {
    total_complaints: all.length,
    by_category, by_severity, by_status,
    anonymous_count, escalated_count, resolved_count,
  };
}

registerAuditEntityType({ id: 'whistleblower_complaint', module: 'mca-roc', label: 'Whistleblower Complaint (S 177(9))' });
registerAuditEntityType({ id: 'whistleblower_investigation', module: 'mca-roc', label: 'Whistleblower Investigation' });
registerAuditEntityType({ id: 'audit_committee_escalation', module: 'mca-roc', label: 'Audit Committee Escalation' });
