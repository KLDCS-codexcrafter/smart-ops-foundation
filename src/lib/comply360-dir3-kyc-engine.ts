/**
 * @file        src/lib/comply360-dir3-kyc-engine.ts
 * @sibling     NEW @ Sprint 83 · Comply360 Floor 3 ROC-Suite Arc 3.1 · DP-S83-1
 * @realizes    DIR-3 KYC annual filing workflow (Section 153 · Companies Act 2013).
 *              Director profile master + annual KYC filing (DIR-3 KYC + DIR-3 KYC Web variant) +
 *              deadline tracker (September 30 every year) + filing fee calculator +
 *              bulk DIN status check + DIR-12 resignation tracking.
 *              Phase 5 LIMIT: filing draft generation only · Phase 8 backend wires MCA portal API.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine · comply360-audit-framework-engine
 * @sprint      Sprint 83 · T-Phase-5.C.3.1 · FLOOR 3 OPENS
 * [JWT] Phase 8: POST /api/comply360/dir3-kyc/{draft,file,verify} · GET /api/comply360/directors/{master,list}
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
  storage_keys: ['erp_dir3_kyc_filings', 'erp_directors_master', 'erp_dir12_resignations', 'erp_din_status_checks'],
} as const;

export type DIN = string;
export type DIR3FilingType = 'DIR_3_KYC' | 'DIR_3_KYC_Web';
export type DIR3FilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'verified' | 'rejected';
export type DINStatus = 'approved' | 'disqualified' | 'deactivated_for_non_compliance' | 'surrendered';

export interface DirectorMaster {
  id: string;
  din: DIN;
  name: string;
  date_of_birth: string;
  pan: string;
  passport_no: string | null;
  address: string;
  email: string;
  mobile: string;
  designation: 'Director' | 'Whole_Time_Director' | 'Managing_Director' | 'Independent_Director' | 'Nominee_Director';
  appointment_date: string;
  resignation_date: string | null;
  din_status: DINStatus;
  created_at: string;
  created_by_bap: BAPAccountId;
  updated_at: string;
}

export interface DIR3KYCFiling {
  id: string;
  director_id: string;
  din: DIN;
  filing_type: DIR3FilingType;
  fy: string;
  deadline: string;
  filing_status: DIR3FilingStatus;
  draft_generated_at: string;
  filed_at: string | null;
  verified_at: string | null;
  filing_fee_inr: number;
  late_fee_inr: number;
  rejection_reason: string | null;
  prepared_by_bap: BAPAccountId;
}

export interface DIR12Resignation {
  id: string;
  director_id: string;
  din: DIN;
  resignation_date: string;
  reason: string;
  effective_date: string;
  filed_at: string | null;
  filed_by_bap: BAPAccountId;
  created_at: string;
}

export interface DINStatusCheck {
  id: string;
  din: DIN;
  status: DINStatus;
  checked_at: string;
  source: 'manual_entry' | 'mca_portal_lookup';
  checked_by_bap: BAPAccountId;
}

const DM_KEY = 'erp_directors_master';
const KYC_KEY = 'erp_dir3_kyc_filings';
const RES_KEY = 'erp_dir12_resignations';
const DSC_KEY = 'erp_din_status_checks';

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

export function createDirectorMaster(
  input: Omit<DirectorMaster, 'id' | 'created_at' | 'updated_at' | 'resignation_date' | 'din_status'>,
): DirectorMaster {
  const now = new Date().toISOString();
  const d: DirectorMaster = {
    ...input,
    id: uid('dir'),
    resignation_date: null,
    din_status: 'approved',
    created_at: now,
    updated_at: now,
  };
  const all = readJson<DirectorMaster[]>(DM_KEY, []);
  all.push(d);
  writeJson(DM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('director_master'),
    recordId: d.id, recordLabel: `Director ${d.name} (DIN ${d.din})`,
    beforeState: null, afterState: d as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return d;
}

export function updateDirectorMaster(id: string, updates: Partial<DirectorMaster>, by_bap: BAPAccountId): DirectorMaster {
  const all = readJson<DirectorMaster[]>(DM_KEY, []);
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error(`Director not found: ${id}`);
  const before = { ...all[idx] };
  const next: DirectorMaster = { ...all[idx], ...updates, id, updated_at: new Date().toISOString() };
  all[idx] = next;
  writeJson(DM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('director_master'),
    recordId: id, recordLabel: `Director ${next.name} updated by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return next;
}

export function listDirectors(opts: { din_status?: DINStatus; designation?: DirectorMaster['designation'] } = {}): DirectorMaster[] {
  return readJson<DirectorMaster[]>(DM_KEY, []).filter((d) => {
    if (opts.din_status && d.din_status !== opts.din_status) return false;
    if (opts.designation && d.designation !== opts.designation) return false;
    return true;
  });
}

export function getDirectorMaster(id: string): DirectorMaster | null {
  return readJson<DirectorMaster[]>(DM_KEY, []).find((d) => d.id === id) ?? null;
}

export function getDirectorByDIN(din: DIN): DirectorMaster | null {
  return readJson<DirectorMaster[]>(DM_KEY, []).find((d) => d.din === din) ?? null;
}

/** Parse `2025-26` -> 2025. */
function fyStartYear(fy: string): number {
  const m = fy.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export function generateDIR3KYCDraft(input: {
  director_id: string; filing_type: DIR3FilingType; fy: string; prepared_by_bap: BAPAccountId;
}): DIR3KYCFiling {
  const dir = getDirectorMaster(input.director_id);
  if (!dir) throw new Error(`Director not found: ${input.director_id}`);
  const year = fyStartYear(input.fy);
  const deadline = `${year}-09-30`;
  const today = new Date().toISOString().slice(0, 10);
  const daysLate = today > deadline ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(deadline)) / 86400000)) : 0;
  const existingForDir = readJson<DIR3KYCFiling[]>(KYC_KEY, []).filter((f) => f.din === dir.din);
  const fee = computeDIR3KYCFee({
    fy: input.fy, filing_type: input.filing_type, days_late: daysLate,
    is_first_time_filer: existingForDir.length === 0,
  });
  const filing: DIR3KYCFiling = {
    id: uid('kyc'), director_id: dir.id, din: dir.din,
    filing_type: input.filing_type, fy: input.fy, deadline,
    filing_status: 'draft', draft_generated_at: new Date().toISOString(),
    filed_at: null, verified_at: null,
    filing_fee_inr: fee.filing_fee_inr, late_fee_inr: fee.late_fee_inr,
    rejection_reason: null, prepared_by_bap: input.prepared_by_bap,
  };
  const all = readJson<DIR3KYCFiling[]>(KYC_KEY, []);
  all.push(filing);
  writeJson(KYC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dir3_kyc_filing'),
    recordId: filing.id, recordLabel: `DIR-3 KYC draft · DIN ${dir.din} · FY ${input.fy}`,
    beforeState: null, afterState: filing as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return filing;
}

export function markDIR3KYCFiled(filing_id: string, by_bap: BAPAccountId): DIR3KYCFiling {
  const all = readJson<DIR3KYCFiling[]>(KYC_KEY, []);
  const idx = all.findIndex((x) => x.id === filing_id);
  if (idx < 0) throw new Error(`Filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: 'filed', filed_at: new Date().toISOString() };
  writeJson(KYC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('dir3_kyc_filing'),
    recordId: filing_id, recordLabel: `DIR-3 KYC filed · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return all[idx];
}

export function markDIR3KYCVerified(filing_id: string, by_bap: BAPAccountId): DIR3KYCFiling {
  const all = readJson<DIR3KYCFiling[]>(KYC_KEY, []);
  const idx = all.findIndex((x) => x.id === filing_id);
  if (idx < 0) throw new Error(`Filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: 'verified', verified_at: new Date().toISOString() };
  writeJson(KYC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('dir3_kyc_filing'),
    recordId: filing_id, recordLabel: `DIR-3 KYC verified · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return all[idx];
}

export function listDIR3KYCFilings(opts: { fy?: string; filing_status?: DIR3FilingStatus; din?: DIN } = {}): DIR3KYCFiling[] {
  return readJson<DIR3KYCFiling[]>(KYC_KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.filing_status && f.filing_status !== opts.filing_status) return false;
    if (opts.din && f.din !== opts.din) return false;
    return true;
  });
}

export function recordDIR12Resignation(input: Omit<DIR12Resignation, 'id' | 'created_at' | 'filed_at'>): DIR12Resignation {
  const r: DIR12Resignation = { ...input, id: uid('dir12'), filed_at: null, created_at: new Date().toISOString() };
  const all = readJson<DIR12Resignation[]>(RES_KEY, []);
  all.push(r);
  writeJson(RES_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('dir12_resignation'),
    recordId: r.id, recordLabel: `DIR-12 resignation · DIN ${r.din}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return r;
}

export function markDIR12Filed(resignation_id: string, by_bap: BAPAccountId): DIR12Resignation {
  const all = readJson<DIR12Resignation[]>(RES_KEY, []);
  const idx = all.findIndex((x) => x.id === resignation_id);
  if (idx < 0) throw new Error(`Resignation not found: ${resignation_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filed_at: new Date().toISOString(), filed_by_bap: by_bap };
  writeJson(RES_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('dir12_resignation'),
    recordId: resignation_id, recordLabel: `DIR-12 filed · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return all[idx];
}

export function listDIR12Resignations(opts: { fy?: string } = {}): DIR12Resignation[] {
  const all = readJson<DIR12Resignation[]>(RES_KEY, []);
  if (!opts.fy) return all;
  const year = fyStartYear(opts.fy);
  return all.filter((r) => r.resignation_date.startsWith(String(year)));
}

export function checkDINStatus(
  din: DIN, status: DINStatus, by_bap: BAPAccountId, source: 'manual_entry' | 'mca_portal_lookup' = 'manual_entry',
): DINStatusCheck {
  const c: DINStatusCheck = {
    id: uid('dinchk'), din, status, checked_at: new Date().toISOString(), source, checked_by_bap: by_bap,
  };
  const all = readJson<DINStatusCheck[]>(DSC_KEY, []);
  all.push(c);
  writeJson(DSC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('din_status_check'),
    recordId: c.id, recordLabel: `DIN ${din} status check · ${status}`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dir3-kyc-engine',
  });
  return c;
}

export function listDINStatusChecks(din: DIN): DINStatusCheck[] {
  return readJson<DINStatusCheck[]>(DSC_KEY, []).filter((c) => c.din === din);
}

export function computeDIR3KYCFee(opts: {
  fy: string; filing_type: DIR3FilingType; days_late: number; is_first_time_filer: boolean;
}): { filing_fee_inr: number; late_fee_inr: number } {
  if (opts.is_first_time_filer && opts.filing_type === 'DIR_3_KYC') {
    return { filing_fee_inr: 0, late_fee_inr: 0 };
  }
  const filing_fee_inr = 5000;
  const late_fee_inr = opts.days_late > 0 ? Math.ceil(opts.days_late / 30) * 5000 : 0;
  return { filing_fee_inr, late_fee_inr };
}

export function getUpcomingDIR3Deadlines(days_ahead: number = 60): Array<{
  director_id: string; din: DIN; deadline: string; days_remaining: number; estimated_late_fee_inr: number;
}> {
  const today = new Date();
  const dirs = listDirectors({ din_status: 'approved' });
  const fy = `${today.getFullYear()}-${String((today.getFullYear() + 1) % 100).padStart(2, '0')}`;
  const deadline = `${today.getFullYear()}-09-30`;
  const dl = new Date(deadline);
  const filings = readJson<DIR3KYCFiling[]>(KYC_KEY, []);
  return dirs
    .filter((d) => !filings.some((f) => f.din === d.din && f.fy === fy && (f.filing_status === 'filed' || f.filing_status === 'verified')))
    .map((d) => {
      const days_remaining = Math.floor((dl.getTime() - today.getTime()) / 86400000);
      const days_late = days_remaining < 0 ? -days_remaining : 0;
      const fee = computeDIR3KYCFee({ fy, filing_type: 'DIR_3_KYC', days_late, is_first_time_filer: false });
      return { director_id: d.id, din: d.din, deadline, days_remaining, estimated_late_fee_inr: fee.late_fee_inr };
    })
    .filter((x) => x.days_remaining <= days_ahead)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

registerAuditEntityType({ id: 'dir3_kyc_filing', module: 'mca-roc', label: 'DIR-3 KYC Filing' });
registerAuditEntityType({ id: 'director_master', module: 'mca-roc', label: 'Director Master' });
registerAuditEntityType({ id: 'dir12_resignation', module: 'mca-roc', label: 'DIR-12 Resignation' });
registerAuditEntityType({ id: 'din_status_check', module: 'mca-roc', label: 'DIN Status Check' });
