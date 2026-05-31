/**
 * @file        src/lib/comply360-csr-engine.ts
 * @sibling     NEW @ Sprint 85 · DP-S85-1
 * @realizes    CSR framework Section 135 · CSR Committee + CSR-1 + CSR-2 + Implementation Agencies + spend allocation
 *              USE-SITE READS S84 schedule-vii (thematic areas + Section 135 applicability)
 * @reads-from  audit-trail-engine · aggregator · audit-framework · S84 schedule-vii
 * @sprint      Sprint 85 · T-Phase-5.C.3.3 · FLOOR 3 CLOSES
 * [JWT] Phase 8: POST /api/comply360/csr/{committee,agency,form1,form2}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { getCSRThematicAreas, checkSection135Applicability, type CSRThematicArea } from './comply360-schedule-vii-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
    'comply360-schedule-vii-engine',
  ],
  storage_keys: ['erp_csr_committees', 'erp_csr_implementing_agencies', 'erp_csr_form1_filings', 'erp_csr_form2_filings'],
} as const;

export type AgencyType = 'section_8_company' | 'registered_trust' | 'registered_society' | 'self_implementation';

export interface CSRCommittee {
  id: string;
  fy: string;
  director_ids: string[];
  chairperson_director_id: string;
  formed_at: string;
  formed_by_bap: BAPAccountId;
}

export interface ImplementingAgency {
  id: string;
  agency_name: string;
  agency_type: AgencyType;
  csr1_registration_no: string;
  pan: string;
  registered_at: string;
  registered_by_bap: BAPAccountId;
}

export interface CSR1Filing {
  id: string;
  agency_id: string;
  fy: string;
  filing_status: 'draft' | 'filed';
  filed_at: string | null;
  prepared_at: string;
  prepared_by_bap: BAPAccountId;
}

export interface CSR2Filing {
  id: string;
  fy: string;
  required_spend_inr: number;
  actual_spend_inr: number;
  shortfall_inr: number;
  carryforward_inr: number;
  prepared_at: string;
  prepared_by_bap: BAPAccountId;
}

const CMT_KEY = 'erp_csr_committees';
const AG_KEY = 'erp_csr_implementing_agencies';
const F1_KEY = 'erp_csr_form1_filings';
const F2_KEY = 'erp_csr_form2_filings';

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

export function formCSRCommittee(input: Omit<CSRCommittee, 'id' | 'formed_at'>): CSRCommittee {
  if (input.director_ids.length < 3) throw new Error('CSR Committee requires at least 3 directors (Section 135(1))');
  const c: CSRCommittee = { ...input, id: uid('csrc'), formed_at: new Date().toISOString() };
  const all = readJson<CSRCommittee[]>(CMT_KEY, []);
  all.push(c); writeJson(CMT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr_committee'),
    recordId: c.id, recordLabel: `CSR Committee · FY ${input.fy} · ${input.director_ids.length} directors`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-csr-engine',
  });
  return c;
}

export function listCSRCommittees(opts: { fy?: string } = {}): CSRCommittee[] {
  return readJson<CSRCommittee[]>(CMT_KEY, []).filter((c) => (opts.fy ? c.fy === opts.fy : true));
}

export function registerImplementingAgency(input: Omit<ImplementingAgency, 'id' | 'registered_at'>): ImplementingAgency {
  const a: ImplementingAgency = { ...input, id: uid('iag'), registered_at: new Date().toISOString() };
  const all = readJson<ImplementingAgency[]>(AG_KEY, []);
  all.push(a); writeJson(AG_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('implementing_agency'),
    recordId: a.id, recordLabel: `Implementing Agency · ${input.agency_name} · ${input.agency_type}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-csr-engine',
  });
  return a;
}

export function listImplementingAgencies(): ImplementingAgency[] {
  return readJson<ImplementingAgency[]>(AG_KEY, []);
}

export function createCSR1Filing(input: Omit<CSR1Filing, 'id' | 'prepared_at' | 'filed_at' | 'filing_status'>): CSR1Filing {
  const f: CSR1Filing = {
    ...input, id: uid('csr1'), filing_status: 'draft', filed_at: null,
    prepared_at: new Date().toISOString(),
  };
  const all = readJson<CSR1Filing[]>(F1_KEY, []);
  all.push(f); writeJson(F1_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr1_filing'),
    recordId: f.id, recordLabel: `CSR-1 · agency ${input.agency_id} · FY ${input.fy}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-csr-engine',
  });
  return f;
}

export function listCSR1Filings(opts: { fy?: string } = {}): CSR1Filing[] {
  return readJson<CSR1Filing[]>(F1_KEY, []).filter((f) => (opts.fy ? f.fy === opts.fy : true));
}

export function createCSR2Filing(input: {
  fy: string;
  required_spend_inr: number;
  actual_spend_inr: number;
  prepared_by_bap: BAPAccountId;
}): CSR2Filing {
  const shortfall = Math.max(0, input.required_spend_inr - input.actual_spend_inr);
  const f: CSR2Filing = {
    id: uid('csr2'), fy: input.fy,
    required_spend_inr: input.required_spend_inr,
    actual_spend_inr: input.actual_spend_inr,
    shortfall_inr: shortfall,
    carryforward_inr: shortfall,
    prepared_at: new Date().toISOString(),
    prepared_by_bap: input.prepared_by_bap,
  };
  const all = readJson<CSR2Filing[]>(F2_KEY, []);
  all.push(f); writeJson(F2_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr2_filing'),
    recordId: f.id, recordLabel: `CSR-2 · FY ${input.fy} · shortfall ₹${shortfall}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-csr-engine',
  });
  return f;
}

export function listCSR2Filings(opts: { fy?: string } = {}): CSR2Filing[] {
  return readJson<CSR2Filing[]>(F2_KEY, []).filter((f) => (opts.fy ? f.fy === opts.fy : true));
}

// USE-SITE READS S84 schedule-vii (re-exports for surface convenience)
export { getCSRThematicAreas, checkSection135Applicability };
export type { CSRThematicArea };

registerAuditEntityType({ id: 'csr_committee', module: 'mca-roc', label: 'CSR Committee (Section 135)' });
registerAuditEntityType({ id: 'implementing_agency', module: 'mca-roc', label: 'CSR Implementing Agency' });
registerAuditEntityType({ id: 'csr1_filing', module: 'mca-roc', label: 'CSR-1 Filing' });
registerAuditEntityType({ id: 'csr2_filing', module: 'mca-roc', label: 'CSR-2 Filing' });
