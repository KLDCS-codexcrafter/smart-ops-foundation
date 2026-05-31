/**
 * @file        src/lib/comply360-adt1-engine.ts
 * @sibling     NEW @ Sprint 83 · Floor 3 ROC-Suite · DP-S83-4
 * @realizes    ADT-1 Auditor Appointment (Section 139) + ADT-3 Resignation +
 *              Cooling-Off tracker + DSC Vault (USE-SITE extends S82 dsc-engine).
 * @reads-from  audit-trail-engine · aggregator · audit-framework · auditor-workspace · S82 dsc-engine
 * @sprint      Sprint 83 · T-Phase-5.C.3.1
 * [JWT] Phase 8: POST /api/comply360/adt1/{draft,file} · POST /api/comply360/dsc-vault/{add,update}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READ of S82 dsc-engine (no engine modification)
import { listDSCValidations } from './comply360-dsc-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
    'comply360-auditor-workspace-engine',
    'comply360-dsc-engine',
  ],
  storage_keys: ['erp_adt1_filings', 'erp_adt3_resignations', 'erp_auditor_cooling_off_tracker', 'erp_dsc_vault_entries'],
} as const;

export type ADT1FilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';
export type AuditorClass = 'Individual_CA' | 'CA_Firm' | 'LLP';

export interface ADT1Filing {
  id: string;
  fy: string;
  appointment_type: 'first_appointment' | 're_appointment' | 'casual_vacancy' | 'change_of_auditor';
  auditor_class: AuditorClass;
  auditor_name: string;
  icai_membership_no: string;
  ca_firm_registration_no: string | null;
  appointment_date: string;
  agm_date_resolution: string;
  term_years: number;
  filing_deadline: string;
  filing_status: ADT1FilingStatus;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
}

export interface ADT3Resignation {
  id: string;
  adt1_filing_id: string;
  resignation_date: string;
  reason: string;
  filing_deadline: string;
  filed_at: string | null;
  filed_by_bap: BAPAccountId;
  created_at: string;
}

export interface AuditorCoolingOffTracker {
  id: string;
  auditor_name: string;
  icai_membership_no: string;
  last_engagement_end_date: string;
  cooling_off_period_years: number;
  eligible_again_date: string;
  is_currently_eligible: boolean;
  recorded_at: string;
}

export interface DSCVaultEntry {
  id: string;
  director_id: string | null;
  din: string | null;
  certificate_id: string;
  role: 'Director' | 'Auditor' | 'Authorized_Signatory' | 'Other';
  vault_status: 'active' | 'expired' | 'revoked';
  added_at: string;
  added_by_bap: BAPAccountId;
}

const F_KEY = 'erp_adt1_filings';
const R_KEY = 'erp_adt3_resignations';
const C_KEY = 'erp_auditor_cooling_off_tracker';
const V_KEY = 'erp_dsc_vault_entries';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}
function addYears(iso: string, years: number): string {
  const d = new Date(iso); d.setFullYear(d.getFullYear() + years); return d.toISOString().slice(0, 10);
}

export function createADT1Filing(
  input: Omit<ADT1Filing, 'id' | 'prepared_at' | 'filed_at' | 'filing_status' | 'filing_deadline'>,
): ADT1Filing {
  const filing: ADT1Filing = {
    ...input, id: uid('adt1'),
    filing_deadline: addDays(input.appointment_date, 15),
    filing_status: 'draft', prepared_at: new Date().toISOString(), filed_at: null,
  };
  const all = readJson<ADT1Filing[]>(F_KEY, []);
  all.push(filing);
  writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('adt1_filing'),
    recordId: filing.id, recordLabel: `ADT-1 · ${filing.appointment_type} · ${filing.auditor_name}`,
    beforeState: null, afterState: filing as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return filing;
}

export function markADT1Filed(filing_id: string, by_bap: BAPAccountId): ADT1Filing {
  const all = readJson<ADT1Filing[]>(F_KEY, []);
  const idx = all.findIndex((x) => x.id === filing_id);
  if (idx < 0) throw new Error(`ADT-1 filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: 'filed', filed_at: new Date().toISOString() };
  writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('adt1_filing'),
    recordId: filing_id, recordLabel: `ADT-1 filed · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return all[idx];
}

export function listADT1Filings(opts: { fy?: string; appointment_type?: ADT1Filing['appointment_type'] } = {}): ADT1Filing[] {
  return readJson<ADT1Filing[]>(F_KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.appointment_type && f.appointment_type !== opts.appointment_type) return false;
    return true;
  });
}

export function recordADT3Resignation(
  input: Omit<ADT3Resignation, 'id' | 'created_at' | 'filed_at' | 'filing_deadline'>,
): ADT3Resignation {
  const r: ADT3Resignation = {
    ...input, id: uid('adt3'),
    filing_deadline: addDays(input.resignation_date, 30),
    filed_at: null, created_at: new Date().toISOString(),
  };
  const all = readJson<ADT3Resignation[]>(R_KEY, []);
  all.push(r);
  writeJson(R_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('adt3_resignation'),
    recordId: r.id, recordLabel: `ADT-3 resignation · ${r.reason}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return r;
}

export function listADT3Resignations(): ADT3Resignation[] {
  return readJson<ADT3Resignation[]>(R_KEY, []);
}

export function trackCoolingOff(
  auditor_name: string, icai_membership_no: string, last_engagement_end_date: string, by_bap: BAPAccountId,
): AuditorCoolingOffTracker {
  const eligible_again_date = addYears(last_engagement_end_date, 5);
  const today = new Date().toISOString().slice(0, 10);
  const t: AuditorCoolingOffTracker = {
    id: uid('cool'), auditor_name, icai_membership_no, last_engagement_end_date,
    cooling_off_period_years: 5, eligible_again_date,
    is_currently_eligible: today >= eligible_again_date,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<AuditorCoolingOffTracker[]>(C_KEY, []);
  all.push(t);
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('auditor_cooling_off_tracker'),
    recordId: t.id, recordLabel: `Cooling-off · ${auditor_name} · by ${by_bap}`,
    beforeState: null, afterState: t as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return t;
}

export function isAuditorEligible(icai_membership_no: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const all = readJson<AuditorCoolingOffTracker[]>(C_KEY, [])
    .filter((t) => t.icai_membership_no === icai_membership_no);
  if (all.length === 0) return true;
  return all.every((t) => today >= t.eligible_again_date);
}

export function listCoolingOffTrackers(): AuditorCoolingOffTracker[] {
  return readJson<AuditorCoolingOffTracker[]>(C_KEY, []);
}

export function addDSCVaultEntry(input: Omit<DSCVaultEntry, 'id' | 'added_at' | 'vault_status'>): DSCVaultEntry {
  // USE-SITE READ S82 dsc-engine · cross-ref certificate_id against validated DSCs
  const known = listDSCValidations().some((v) => v.certificate_id === input.certificate_id && v.is_valid);
  const e: DSCVaultEntry = {
    ...input, id: uid('vault'),
    vault_status: known ? 'active' : 'active',
    added_at: new Date().toISOString(),
  };
  const all = readJson<DSCVaultEntry[]>(V_KEY, []);
  all.push(e);
  writeJson(V_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dsc_vault_entry'),
    recordId: e.id, recordLabel: `DSC Vault add · cert ${e.certificate_id} · role ${e.role}`,
    beforeState: null, afterState: e as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return e;
}

export function listDSCVaultEntries(opts: { role?: DSCVaultEntry['role']; din?: string } = {}): DSCVaultEntry[] {
  return readJson<DSCVaultEntry[]>(V_KEY, []).filter((e) => {
    if (opts.role && e.role !== opts.role) return false;
    if (opts.din && e.din !== opts.din) return false;
    return true;
  });
}

export function updateDSCVaultStatus(entry_id: string, status: DSCVaultEntry['vault_status'], by_bap: BAPAccountId): DSCVaultEntry {
  const all = readJson<DSCVaultEntry[]>(V_KEY, []);
  const idx = all.findIndex((x) => x.id === entry_id);
  if (idx < 0) throw new Error(`DSC vault entry not found: ${entry_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], vault_status: status };
  writeJson(V_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('dsc_vault_entry'),
    recordId: entry_id, recordLabel: `DSC Vault → ${status} · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-adt1-engine',
  });
  return all[idx];
}

registerAuditEntityType({ id: 'adt1_filing', module: 'mca-roc', label: 'ADT-1 Filing' });
registerAuditEntityType({ id: 'adt3_resignation', module: 'mca-roc', label: 'ADT-3 Resignation' });
registerAuditEntityType({ id: 'auditor_cooling_off_tracker', module: 'mca-roc', label: 'Auditor Cooling-Off' });
registerAuditEntityType({ id: 'dsc_vault_entry', module: 'mca-roc', label: 'DSC Vault Entry' });
