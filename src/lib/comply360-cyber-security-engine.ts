/**
 * @file        src/lib/comply360-cyber-security-engine.ts
 * @sibling     NEW @ Sprint 92 · Comply360 Floor 5.4 · CERT-In Directions 2022
 * @realizes    CERT-In 6-hour cyber-incident reporting · Vulnerability
 *              disclosure log · Access Control Matrix · Cyber Security Policy
 *              template. 22nd USE-SITE READ at MAXIMUM SCALE.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · Q36
 * [JWT] Phase 8: POST /api/comply360/cyber-security/{incidents,vulnerabilities,access-control,policy}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine'],
  storage_keys: [
    'erp_cyber_incidents',
    'erp_cyber_vulnerabilities',
    'erp_cyber_access_matrix',
    'erp_cyber_policy',
    'erp_cyber_logs_retention',
  ],
} as const;

// 5 NEW audit entity types · DESIGN-DECISION-FLAG: ComplianceModule union does
// not include 'security' (would require §H 0-DIFF mutation of health-score-engine).
// Using 'other' module bucket pending future v1.32 union extension.
registerAuditEntityType({ id: 'cyber_incident',       module: 'other', label: 'Cyber Security Incident (CERT-In 6hr)' });
registerAuditEntityType({ id: 'cyber_vulnerability',  module: 'other', label: 'Vulnerability Disclosure' });
registerAuditEntityType({ id: 'cyber_access_grant',   module: 'other', label: 'Access Control Grant' });
registerAuditEntityType({ id: 'cyber_policy',         module: 'other', label: 'Cyber Security Policy' });
registerAuditEntityType({ id: 'cyber_log_retention',  module: 'other', label: 'CERT-In Log Retention Attestation' });

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

// ═══ MODULE 1 · CERT-In Incident Reporting (6-hour) ══════════════════
export type IncidentCategory =
  | 'unauthorized_access' | 'malware' | 'phishing' | 'ddos'
  | 'data_breach' | 'ransomware' | 'insider_threat' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'detected' | 'reported_certin' | 'contained' | 'closed';

export interface CyberIncident {
  id: string;
  detected_at: string;
  reported_at: string | null;
  hours_to_report: number | null;     // CERT-In 6-hour threshold
  category: IncidentCategory;
  severity: IncidentSeverity;
  affected_systems: string[];
  description: string;
  status: IncidentStatus;
  certin_reference: string | null;
}

const INC_KEY = 'erp_cyber_incidents';

export function recordCyberIncident(input: Omit<CyberIncident, 'id' | 'hours_to_report'>, by_bap: BAPAccountId): CyberIncident {
  const hours = input.reported_at
    ? Math.round((new Date(input.reported_at).getTime() - new Date(input.detected_at).getTime()) / 3_600_000)
    : null;
  const r: CyberIncident = { ...input, id: uid('cinc'), hours_to_report: hours };
  const all = readJson<CyberIncident[]>(INC_KEY, []); all.push(r); writeJson(INC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cyber_incident'),
    recordId: r.id, recordLabel: `Cyber Incident · ${input.category} · ${input.severity} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cyber-security-engine',
  });
  return r;
}
export function listCyberIncidents(filter: { status?: IncidentStatus; severity?: IncidentSeverity } = {}): CyberIncident[] {
  return readJson<CyberIncident[]>(INC_KEY, []).filter((r) => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.severity && r.severity !== filter.severity) return false;
    return true;
  });
}
export function isIncidentLate(i: CyberIncident): boolean {
  return i.hours_to_report !== null && i.hours_to_report > 6;
}

// ═══ MODULE 2 · Vulnerability Disclosure Log ═════════════════════════
export type VulnSeverity = 'low' | 'medium' | 'high' | 'critical';
export type VulnStatus = 'open' | 'mitigating' | 'patched' | 'accepted_risk';

export interface VulnerabilityRecord {
  id: string;
  cve_id: string | null;
  asset: string;
  severity: VulnSeverity;
  discovered_at: string;
  patched_at: string | null;
  status: VulnStatus;
  description: string;
}

const VUL_KEY = 'erp_cyber_vulnerabilities';

export function recordVulnerability(input: Omit<VulnerabilityRecord, 'id'>, by_bap: BAPAccountId): VulnerabilityRecord {
  const r: VulnerabilityRecord = { ...input, id: uid('vul') };
  const all = readJson<VulnerabilityRecord[]>(VUL_KEY, []); all.push(r); writeJson(VUL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cyber_vulnerability'),
    recordId: r.id, recordLabel: `Vuln · ${input.cve_id ?? 'no-cve'} · ${input.asset} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cyber-security-engine',
  });
  return r;
}
export function listVulnerabilities(filter: { status?: VulnStatus } = {}): VulnerabilityRecord[] {
  return readJson<VulnerabilityRecord[]>(VUL_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ MODULE 3 · Access Control Matrix ════════════════════════════════
export type AccessLevel = 'read' | 'write' | 'admin';

export interface AccessControlEntry {
  id: string;
  user_id: string;
  user_name: string;
  resource: string;
  access_level: AccessLevel;
  granted_at: string;
  revoked_at: string | null;
  approved_by: string;
}

const ACM_KEY = 'erp_cyber_access_matrix';

export function grantAccess(input: Omit<AccessControlEntry, 'id'>, by_bap: BAPAccountId): AccessControlEntry {
  const r: AccessControlEntry = { ...input, id: uid('acc') };
  const all = readJson<AccessControlEntry[]>(ACM_KEY, []); all.push(r); writeJson(ACM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cyber_access_grant'),
    recordId: r.id, recordLabel: `Access · ${input.user_name} → ${input.resource} (${input.access_level}) (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cyber-security-engine',
  });
  return r;
}
export function listAccessGrants(filter: { active?: boolean } = {}): AccessControlEntry[] {
  return readJson<AccessControlEntry[]>(ACM_KEY, []).filter((r) => {
    if (filter.active === true && r.revoked_at) return false;
    return true;
  });
}

// ═══ MODULE 4 · Cyber Security Policy ════════════════════════════════
export interface CyberSecurityPolicy {
  id: string;
  version: string;
  effective_date: string;
  scope: string;
  published: boolean;
}

const POL_KEY = 'erp_cyber_policy';

export function publishCyberPolicy(input: Omit<CyberSecurityPolicy, 'id'>, by_bap: BAPAccountId): CyberSecurityPolicy {
  const r: CyberSecurityPolicy = { ...input, id: uid('cpol') };
  const all = readJson<CyberSecurityPolicy[]>(POL_KEY, []); all.push(r); writeJson(POL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('cyber_policy'),
    recordId: r.id, recordLabel: `Cyber Policy v${input.version} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cyber-security-engine',
  });
  return r;
}
export function listCyberPolicies(): CyberSecurityPolicy[] { return readJson<CyberSecurityPolicy[]>(POL_KEY, []); }

// ═══ Consolidated Cyber Security Summary ═════════════════════════════
export interface CyberComplianceSummary {
  open_incidents: number;
  late_incident_reports: number;
  critical_vulnerabilities_open: number;
  active_access_grants: number;
  cyber_policy_published: boolean;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}

export function getCyberComplianceSummary(): CyberComplianceSummary {
  const incidents = listCyberIncidents();
  const open = incidents.filter((i) => i.status === 'detected' || i.status === 'reported_certin').length;
  const late = incidents.filter(isIncidentLate).length;
  const critOpen = listVulnerabilities().filter((v) => v.severity === 'critical' && (v.status === 'open' || v.status === 'mitigating')).length;
  const active = listAccessGrants({ active: true }).length;
  const polPub = listCyberPolicies().some((p) => p.published);

  let overall_status: CyberComplianceSummary['overall_status'] = 'compliant';
  if (late > 0 || critOpen > 0) overall_status = 'attention_required';
  if (!polPub) overall_status = 'non_compliant';

  return {
    open_incidents: open,
    late_incident_reports: late,
    critical_vulnerabilities_open: critOpen,
    active_access_grants: active,
    cyber_policy_published: polPub,
    overall_status,
  };
}
