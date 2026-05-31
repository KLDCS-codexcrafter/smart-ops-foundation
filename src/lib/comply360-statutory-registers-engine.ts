/**
 * @file        src/lib/comply360-statutory-registers-engine.ts
 * @sibling     NEW @ Sprint 83 · Floor 3 ROC-Suite · DP-S83-5
 * @realizes    7 statutory registers framework (Members · Directors/KMP · Charges ·
 *              Loans/Investments · Share Certificates · Sweat Equity · ESOP).
 *              Append-only with supersedence.
 * @reads-from  audit-trail-engine · aggregator · audit-framework
 * @sprint      Sprint 83 · T-Phase-5.C.3.1
 * [JWT] Phase 8: GET/POST /api/comply360/statutory-registers
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
  storage_keys: ['erp_statutory_register_entries'],
} as const;

export type StatutoryRegisterType =
  | 'Register_of_Members'
  | 'Register_of_Directors_KMP'
  | 'Register_of_Charges'
  | 'Register_of_Loans_Investments'
  | 'Register_of_Share_Certificates'
  | 'Register_of_Sweat_Equity'
  | 'Register_of_ESOP';

export interface StatutoryRegisterEntry {
  id: string;
  register_type: StatutoryRegisterType;
  entry_payload: Record<string, unknown>;
  effective_date: string;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
  is_active: boolean;
  superseded_by: string | null;
}

const KEY = 'erp_statutory_register_entries';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

const TYPE_TO_AUDIT: Record<StatutoryRegisterType, string> = {
  Register_of_Members: 'register_of_members',
  Register_of_Directors_KMP: 'register_of_directors',
  Register_of_Charges: 'register_of_charges',
  Register_of_Loans_Investments: 'register_of_loans',
  Register_of_Share_Certificates: 'register_of_share_certificates',
  Register_of_Sweat_Equity: 'register_of_sweat_equity',
  Register_of_ESOP: 'register_of_esop',
};

export function recordRegisterEntry(
  input: Omit<StatutoryRegisterEntry, 'id' | 'recorded_at' | 'is_active' | 'superseded_by'>,
): StatutoryRegisterEntry {
  const e: StatutoryRegisterEntry = {
    ...input, id: uid('reg'), recorded_at: new Date().toISOString(),
    is_active: true, superseded_by: null,
  };
  const all = readJson<StatutoryRegisterEntry[]>(KEY, []);
  all.push(e);
  writeJson(KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD(TYPE_TO_AUDIT[input.register_type]),
    recordId: e.id, recordLabel: `${input.register_type} entry`,
    beforeState: null, afterState: e as unknown as Record<string, unknown>,
    sourceModule: 'comply360-statutory-registers-engine',
  });
  return e;
}

export function supersedeRegisterEntry(
  old_entry_id: string, new_payload: Record<string, unknown>, by_bap: BAPAccountId,
): { old_entry: StatutoryRegisterEntry; new_entry: StatutoryRegisterEntry } {
  const all = readJson<StatutoryRegisterEntry[]>(KEY, []);
  const idx = all.findIndex((x) => x.id === old_entry_id);
  if (idx < 0) throw new Error(`Register entry not found: ${old_entry_id}`);
  const before = { ...all[idx] };
  const new_entry: StatutoryRegisterEntry = {
    id: uid('reg'),
    register_type: all[idx].register_type,
    entry_payload: new_payload,
    effective_date: new Date().toISOString().slice(0, 10),
    recorded_at: new Date().toISOString(),
    recorded_by_bap: by_bap,
    is_active: true,
    superseded_by: null,
  };
  all[idx] = { ...all[idx], is_active: false, superseded_by: new_entry.id };
  all.push(new_entry);
  writeJson(KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update',
    entityType: AUD(TYPE_TO_AUDIT[before.register_type]),
    recordId: old_entry_id, recordLabel: `${before.register_type} superseded by ${new_entry.id}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-statutory-registers-engine',
  });
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD(TYPE_TO_AUDIT[new_entry.register_type]),
    recordId: new_entry.id, recordLabel: `${new_entry.register_type} entry (supersedes ${old_entry_id})`,
    beforeState: null, afterState: new_entry as unknown as Record<string, unknown>,
    sourceModule: 'comply360-statutory-registers-engine',
  });
  return { old_entry: all[idx], new_entry };
}

export function listRegisterEntries(
  register_type: StatutoryRegisterType, opts: { is_active?: boolean } = {},
): StatutoryRegisterEntry[] {
  return readJson<StatutoryRegisterEntry[]>(KEY, []).filter((e) => {
    if (e.register_type !== register_type) return false;
    if (opts.is_active !== undefined && e.is_active !== opts.is_active) return false;
    return true;
  });
}

export function getRegisterEntry(entry_id: string): StatutoryRegisterEntry | null {
  return readJson<StatutoryRegisterEntry[]>(KEY, []).find((e) => e.id === entry_id) ?? null;
}

export function getRegisterTypes(): Array<{ register_type: StatutoryRegisterType; label: string; section: string }> {
  return [
    { register_type: 'Register_of_Members', label: 'Register of Members', section: 'Section 88' },
    { register_type: 'Register_of_Directors_KMP', label: 'Register of Directors & KMP', section: 'Section 170' },
    { register_type: 'Register_of_Charges', label: 'Register of Charges', section: 'Section 85' },
    { register_type: 'Register_of_Loans_Investments', label: 'Register of Loans & Investments', section: 'Section 186' },
    { register_type: 'Register_of_Share_Certificates', label: 'Register of Share Certificates', section: 'Section 46' },
    { register_type: 'Register_of_Sweat_Equity', label: 'Register of Sweat Equity', section: 'Rule 8' },
    { register_type: 'Register_of_ESOP', label: 'Register of ESOP', section: 'Rule 12' },
  ];
}

registerAuditEntityType({ id: 'register_of_members', module: 'mca-roc', label: 'Register of Members' });
registerAuditEntityType({ id: 'register_of_directors', module: 'mca-roc', label: 'Register of Directors & KMP' });
registerAuditEntityType({ id: 'register_of_charges', module: 'mca-roc', label: 'Register of Charges' });
registerAuditEntityType({ id: 'register_of_loans', module: 'mca-roc', label: 'Register of Loans & Investments' });
registerAuditEntityType({ id: 'register_of_share_certificates', module: 'mca-roc', label: 'Register of Share Certificates' });
registerAuditEntityType({ id: 'register_of_sweat_equity', module: 'mca-roc', label: 'Register of Sweat Equity' });
registerAuditEntityType({ id: 'register_of_esop', module: 'mca-roc', label: 'Register of ESOP' });
