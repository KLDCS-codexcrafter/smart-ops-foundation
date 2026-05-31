/**
 * @file        src/lib/comply360-labour-codes-engine.ts
 * @sibling     NEW @ Sprint 86 · Comply360 Floor 4 Sector-Pack Arc 4.1 · DP-S86-1
 * @realizes    Labour Codes 2026 orchestrator · 4 consolidated codes via discriminated union:
 *                Code on Wages 2019 · Code on Social Security 2020
 *                Industrial Relations Code 2020 · OSH&WC Code 2020
 *              Compliance tracker per code + filing draft generation + provisions registry.
 * @reads-from  audit-trail-engine · aggregator · audit-framework · payroll-audit (S80b · USE-SITE READ)
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · FLOOR 4 OPENS
 * [JWT] Phase 8: POST /api/comply360/labour-codes/{compliance,filing}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { listPayrollAuditModulesByLayer } from './comply360-payroll-audit-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
    'comply360-payroll-audit-engine',
  ],
  storage_keys: ['erp_labour_code_compliance_entries', 'erp_labour_code_filings'],
} as const;

export type LabourCodeType = 'Code_on_Wages' | 'Code_on_Social_Security' | 'Industrial_Relations_Code' | 'OSH_WC_Code';
export type LabourCodeComplianceStatus = 'compliant' | 'pending_action' | 'non_compliant' | 'exempt';
export type LabourCodeFilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';

export interface LabourCodeComplianceEntry {
  id: string;
  code_type: LabourCodeType;
  fy: string;
  establishment_id: string;
  applicable_provisions: string[];
  compliance_status: LabourCodeComplianceStatus;
  evidence_refs: string[];
  last_reviewed_at: string;
  reviewed_by_bap: BAPAccountId;
  remedial_action: string | null;
}

export interface LabourCodeFiling {
  id: string;
  code_type: LabourCodeType;
  form_number: string;
  fy: string;
  filing_deadline: string;
  filing_status: LabourCodeFilingStatus;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
  rejection_reason: string | null;
}

const C_KEY = 'erp_labour_code_compliance_entries';
const F_KEY = 'erp_labour_code_filings';

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

function entityTypeFor(c: LabourCodeType): string {
  switch (c) {
    case 'Code_on_Wages': return 'labour_code_compliance_wages';
    case 'Code_on_Social_Security': return 'labour_code_compliance_social_security';
    case 'Industrial_Relations_Code': return 'labour_code_compliance_industrial_relations';
    case 'OSH_WC_Code': return 'labour_code_compliance_osh_wc';
  }
}

export function recordComplianceEntry(
  input: Omit<LabourCodeComplianceEntry, 'id' | 'last_reviewed_at' | 'remedial_action'>,
): LabourCodeComplianceEntry {
  const e: LabourCodeComplianceEntry = {
    ...input,
    id: uid('lce'),
    last_reviewed_at: new Date().toISOString(),
    remedial_action: null,
  };
  const all = readJson<LabourCodeComplianceEntry[]>(C_KEY, []);
  all.push(e); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD(entityTypeFor(input.code_type)),
    recordId: e.id, recordLabel: `Labour Code · ${input.code_type} · ${input.fy} · ${input.establishment_id}`,
    beforeState: null, afterState: e as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-codes-engine',
  });
  return e;
}

export function updateComplianceStatus(
  entry_id: string, status: LabourCodeComplianceStatus, remedial_action: string | null, by_bap: BAPAccountId,
): LabourCodeComplianceEntry {
  const all = readJson<LabourCodeComplianceEntry[]>(C_KEY, []);
  const idx = all.findIndex((e) => e.id === entry_id);
  if (idx < 0) throw new Error(`Compliance entry not found: ${entry_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], compliance_status: status, remedial_action, last_reviewed_at: new Date().toISOString(), reviewed_by_bap: by_bap };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD(entityTypeFor(all[idx].code_type)),
    recordId: entry_id, recordLabel: `Status → ${status} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-codes-engine',
  });
  return all[idx];
}

export function listComplianceEntries(
  opts: { code_type?: LabourCodeType; fy?: string; status?: LabourCodeComplianceStatus } = {},
): LabourCodeComplianceEntry[] {
  return readJson<LabourCodeComplianceEntry[]>(C_KEY, []).filter((e) => {
    if (opts.code_type && e.code_type !== opts.code_type) return false;
    if (opts.fy && e.fy !== opts.fy) return false;
    if (opts.status && e.compliance_status !== opts.status) return false;
    return true;
  });
}

export function createLabourCodeFiling(
  input: Omit<LabourCodeFiling, 'id' | 'prepared_at' | 'filed_at' | 'filing_status' | 'rejection_reason'>,
): LabourCodeFiling {
  const f: LabourCodeFiling = {
    ...input,
    id: uid('lcf'),
    filing_status: 'draft',
    prepared_at: new Date().toISOString(),
    filed_at: null,
    rejection_reason: null,
  };
  const all = readJson<LabourCodeFiling[]>(F_KEY, []);
  all.push(f); writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD(entityTypeFor(input.code_type)),
    recordId: f.id, recordLabel: `Filing · ${input.code_type} · ${input.form_number} · ${input.fy}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-codes-engine',
  });
  return f;
}

export function updateFilingStatus(
  filing_id: string, status: LabourCodeFilingStatus, by_bap: BAPAccountId, rejection_reason?: string,
): LabourCodeFiling {
  const all = readJson<LabourCodeFiling[]>(F_KEY, []);
  const idx = all.findIndex((f) => f.id === filing_id);
  if (idx < 0) throw new Error(`Filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    filing_status: status,
    filed_at: status === 'filed' ? new Date().toISOString() : all[idx].filed_at,
    rejection_reason: status === 'rejected' ? (rejection_reason ?? null) : all[idx].rejection_reason,
  };
  writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD(entityTypeFor(all[idx].code_type)),
    recordId: filing_id, recordLabel: `Filing → ${status} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-labour-codes-engine',
  });
  return all[idx];
}

export function listLabourCodeFilings(opts: { code_type?: LabourCodeType; fy?: string } = {}): LabourCodeFiling[] {
  return readJson<LabourCodeFiling[]>(F_KEY, []).filter((f) => {
    if (opts.code_type && f.code_type !== opts.code_type) return false;
    if (opts.fy && f.fy !== opts.fy) return false;
    return true;
  });
}

const PROVISIONS: Record<LabourCodeType, Array<{ section: string; title: string; applicable_to: string[] }>> = {
  Code_on_Wages: [
    { section: 'S 6', title: 'Minimum wages — floor wage', applicable_to: ['all_establishments'] },
    { section: 'S 15', title: 'Time of payment of wages', applicable_to: ['all_establishments'] },
    { section: 'S 26', title: 'Payment of bonus', applicable_to: ['factories', 'establishments_20_plus'] },
    { section: 'S 3', title: 'Equal remuneration — no gender discrimination', applicable_to: ['all_establishments'] },
  ],
  Code_on_Social_Security: [
    { section: 'S 15', title: 'EPF contribution', applicable_to: ['establishments_20_plus'] },
    { section: 'S 28', title: 'ESI contribution', applicable_to: ['establishments_10_plus'] },
    { section: 'S 53', title: 'Gratuity — continuous service 5 years', applicable_to: ['establishments_10_plus'] },
    { section: 'S 60', title: 'Maternity benefit', applicable_to: ['all_establishments'] },
    { section: 'S 113A', title: 'Gig & platform workers — welfare', applicable_to: ['aggregators'] },
  ],
  Industrial_Relations_Code: [
    { section: 'S 14', title: 'Recognition of trade union', applicable_to: ['establishments_100_plus'] },
    { section: 'S 28', title: 'Standing orders', applicable_to: ['industrial_establishments_300_plus'] },
    { section: 'S 62', title: 'Notice of strike / lockout', applicable_to: ['public_utility_services'] },
  ],
  OSH_WC_Code: [
    { section: 'S 6', title: 'Registration of establishment', applicable_to: ['factories', 'mines', 'dock_works'] },
    { section: 'S 22', title: 'Duty of employer — safety', applicable_to: ['all_establishments'] },
    { section: 'S 26', title: 'Annual health examination', applicable_to: ['hazardous_processes'] },
  ],
};

export function getCodeProvisions(code_type: LabourCodeType): Array<{ section: string; title: string; applicable_to: string[] }> {
  return PROVISIONS[code_type];
}

export function computeComplianceScore(code_type: LabourCodeType, fy: string): {
  score: number; compliant_count: number; pending_count: number; non_compliant_count: number; exempt_count: number;
} {
  const entries = listComplianceEntries({ code_type, fy });
  let c = 0, p = 0, n = 0, e = 0;
  for (const x of entries) {
    if (x.compliance_status === 'compliant') c++;
    else if (x.compliance_status === 'pending_action') p++;
    else if (x.compliance_status === 'non_compliant') n++;
    else e++;
  }
  const denom = c + p + n; // exempt entries don't count toward score
  const score = denom === 0 ? 100 : Math.round((c / denom) * 100);
  return { score, compliant_count: c, pending_count: p, non_compliant_count: n, exempt_count: e };
}

export function getLabourCodeTypes(): Array<{ code_type: LabourCodeType; label: string; consolidates: string[] }> {
  return [
    { code_type: 'Code_on_Wages', label: 'Code on Wages 2019', consolidates: ['Minimum Wages Act 1948', 'Payment of Wages Act 1936', 'Payment of Bonus Act 1965', 'Equal Remuneration Act 1976'] },
    { code_type: 'Code_on_Social_Security', label: 'Code on Social Security 2020', consolidates: ['EPF Act 1952', 'ESI Act 1948', 'Maternity Benefit Act 1961', 'Gratuity Act 1972', 'Building & Other Construction Workers 1996'] },
    { code_type: 'Industrial_Relations_Code', label: 'Industrial Relations Code 2020', consolidates: ['Trade Unions Act 1926', 'Industrial Employment Standing Orders Act 1946', 'Industrial Disputes Act 1947'] },
    { code_type: 'OSH_WC_Code', label: 'OSH & WC Code 2020', consolidates: ['Factories Act 1948', 'Mines Act 1952', 'Dock Workers Act 1986', 'Plantations Labour Act 1951'] },
  ];
}

/** USE-SITE READ S80b · cross-reference Social Security to payroll-audit Layer E (Labour Codes 2026 prep) */
export function getSocialSecurityAuditCrossRefs(): string[] {
  return listPayrollAuditModulesByLayer('E_labour_codes_2026_prep').map((m) => m.code);
}

registerAuditEntityType({ id: 'labour_code_compliance_wages', module: 'payroll', label: 'Labour Code Compliance · Wages' });
registerAuditEntityType({ id: 'labour_code_compliance_social_security', module: 'payroll', label: 'Labour Code Compliance · Social Security' });
registerAuditEntityType({ id: 'labour_code_compliance_industrial_relations', module: 'payroll', label: 'Labour Code Compliance · Industrial Relations' });
registerAuditEntityType({ id: 'labour_code_compliance_osh_wc', module: 'payroll', label: 'Labour Code Compliance · OSH&WC' });
