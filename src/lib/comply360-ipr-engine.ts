/**
 * @file        src/lib/comply360-ipr-engine.ts
 * @sibling     NEW @ Sprint 94 · Comply360 Floor 5.6 CAPSTONE · Q38 IPR
 * @realizes    Trademark + Patent + Copyright + Design registrations + renewal calendar.
 *              27th USE-SITE READ.
 * @reads-from  comply360-audit-framework-engine · comply360-calendar-engine ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 * [JWT] Phase 8: POST /api/comply360/ipr/{trademark,patent,copyright,design,renewal}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_ipr_trademark', 'erp_ipr_patent', 'erp_ipr_copyright',
    'erp_ipr_design', 'erp_ipr_renewal',
  ],
} as const;

registerAuditEntityType({ id: 'trademark_registration',  module: 'other', label: 'Trademark Registration' });
registerAuditEntityType({ id: 'patent_application',      module: 'other', label: 'Patent Application' });
registerAuditEntityType({ id: 'copyright_registration',  module: 'other', label: 'Copyright Registration' });
registerAuditEntityType({ id: 'design_registration',     module: 'other', label: 'Design Registration' });
registerAuditEntityType({ id: 'ipr_renewal_deadline',    module: 'other', label: 'IPR Renewal Deadline' });

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

export type IPRStatus = 'pending' | 'registered' | 'expired' | 'opposed' | 'abandoned';

// ═══ Trademark ═══════════════════════════════════════════════════════
export interface TrademarkRecord {
  id: string; mark: string; tm_class: number; application_no: string;
  registration_no: string | null; filed_on: string; registered_on: string | null;
  valid_until: string | null; status: IPRStatus;
}
const TM_KEY = 'erp_ipr_trademark';
export function registerTrademark(input: Omit<TrademarkRecord, 'id'>, by_bap: BAPAccountId): TrademarkRecord {
  const r: TrademarkRecord = { ...input, id: uid('tm') };
  const all = readJson<TrademarkRecord[]>(TM_KEY, []); all.push(r); writeJson(TM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('trademark_registration'),
    recordId: r.id, recordLabel: `TM · ${input.mark} · Class ${input.tm_class} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ipr-engine',
  });
  return r;
}
export function listTrademarks(filter: { status?: IPRStatus } = {}): TrademarkRecord[] {
  return readJson<TrademarkRecord[]>(TM_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

// ═══ Patent ══════════════════════════════════════════════════════════
export interface PatentRecord {
  id: string; title: string; inventor: string; application_no: string;
  grant_no: string | null; filed_on: string; granted_on: string | null;
  valid_until: string | null; status: IPRStatus;
}
const PT_KEY = 'erp_ipr_patent';
export function registerPatent(input: Omit<PatentRecord, 'id'>, by_bap: BAPAccountId): PatentRecord {
  const r: PatentRecord = { ...input, id: uid('pt') };
  const all = readJson<PatentRecord[]>(PT_KEY, []); all.push(r); writeJson(PT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('patent_application'),
    recordId: r.id, recordLabel: `Patent · ${input.title} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ipr-engine',
  });
  return r;
}
export function listPatents(): PatentRecord[] { return readJson<PatentRecord[]>(PT_KEY, []); }

// ═══ Copyright ═══════════════════════════════════════════════════════
export interface CopyrightRecord {
  id: string; work_title: string; work_kind: 'literary' | 'artistic' | 'musical' | 'cinematograph' | 'sound' | 'software';
  author: string; registration_no: string | null; registered_on: string | null;
}
const CR_KEY = 'erp_ipr_copyright';
export function registerCopyright(input: Omit<CopyrightRecord, 'id'>, by_bap: BAPAccountId): CopyrightRecord {
  const r: CopyrightRecord = { ...input, id: uid('cr') };
  const all = readJson<CopyrightRecord[]>(CR_KEY, []); all.push(r); writeJson(CR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('copyright_registration'),
    recordId: r.id, recordLabel: `Copyright · ${input.work_title} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ipr-engine',
  });
  return r;
}
export function listCopyrights(): CopyrightRecord[] { return readJson<CopyrightRecord[]>(CR_KEY, []); }

// ═══ Design ══════════════════════════════════════════════════════════
export interface DesignRecord {
  id: string; design_name: string; locarno_class: string; registration_no: string;
  registered_on: string; valid_until: string; status: IPRStatus;
}
const DS_KEY = 'erp_ipr_design';
export function registerDesign(input: Omit<DesignRecord, 'id'>, by_bap: BAPAccountId): DesignRecord {
  const r: DesignRecord = { ...input, id: uid('ds') };
  const all = readJson<DesignRecord[]>(DS_KEY, []); all.push(r); writeJson(DS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('design_registration'),
    recordId: r.id, recordLabel: `Design · ${input.design_name} · ${input.locarno_class} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ipr-engine',
  });
  return r;
}
export function listDesigns(): DesignRecord[] { return readJson<DesignRecord[]>(DS_KEY, []); }

// ═══ Renewal Deadlines ═══════════════════════════════════════════════
export interface IPRRenewalDeadline {
  id: string; ipr_type: 'trademark' | 'patent' | 'copyright' | 'design';
  ipr_ref: string; due_on: string; reminded_on: string | null;
}
const RN_KEY = 'erp_ipr_renewal';
export function scheduleIPRRenewal(input: Omit<IPRRenewalDeadline, 'id'>, by_bap: BAPAccountId): IPRRenewalDeadline {
  const r: IPRRenewalDeadline = { ...input, id: uid('rn') };
  const all = readJson<IPRRenewalDeadline[]>(RN_KEY, []); all.push(r); writeJson(RN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('ipr_renewal_deadline'),
    recordId: r.id, recordLabel: `IPR Renewal · ${input.ipr_type} · ${input.ipr_ref} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-ipr-engine',
  });
  return r;
}
export function listIPRRenewals(filter: { upcoming90?: boolean } = {}): IPRRenewalDeadline[] {
  const all = readJson<IPRRenewalDeadline[]>(RN_KEY, []);
  if (!filter.upcoming90) return all;
  const cutoff = Date.now() + 90 * 24 * 3600 * 1000;
  return all.filter((r) => new Date(r.due_on).getTime() <= cutoff);
}

// ═══ Summary ═════════════════════════════════════════════════════════
export interface IPRSummary {
  trademarks_active: number; patents_count: number;
  copyrights_count: number; designs_count: number;
  upcoming_renewals_90_days: number;
}
export function getIPRSummary(): IPRSummary {
  return {
    trademarks_active: listTrademarks({ status: 'registered' }).length,
    patents_count: listPatents().length,
    copyrights_count: listCopyrights().length,
    designs_count: listDesigns().length,
    upcoming_renewals_90_days: listIPRRenewals({ upcoming90: true }).length,
  };
}
