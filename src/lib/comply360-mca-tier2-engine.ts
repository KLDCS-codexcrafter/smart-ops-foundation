/**
 * @file        src/lib/comply360-mca-tier2-engine.ts
 * @sibling     NEW @ Sprint 94 · Comply360 Floor 5.6 CAPSTONE · Q38 MCA Tier-2
 * @realizes    CSR-2 Form + Section 135 CSR tracker (2% net profit + Schedule VII activities)
 *              + Section 204 Secretarial Audit Form MR-3 + CSR Committee meetings.
 *              25th USE-SITE READ at MAXIMUM SCALE.
 * @reads-from  comply360-whistleblower-engine (existing · S82 Section 177 Vigil ref) ·
 *              comply360-caro-extended-engine (S77a CARO observations) ·
 *              comply360-audit-framework-engine (S80a) · comply360-calendar-engine (S78a) ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE · CLOSES FLOOR 5
 * [JWT] Phase 8: POST /api/comply360/mca-tier2/{csr2,sec135,mr3,committee}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-whistleblower-engine',
    'comply360-caro-extended-engine',
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_mca_csr2', 'erp_mca_sec135_csr', 'erp_mca_sec204_mr3',
    'erp_mca_csr_committee', 'erp_mca_csr_activity', 'erp_mca_form_mr3',
  ],
} as const;

registerAuditEntityType({ id: 'csr2_form',                  module: 'mca-roc', label: 'CSR-2 Form (MCA)' });
registerAuditEntityType({ id: 'section_135_csr_tracker',    module: 'mca-roc', label: 'Section 135 CSR Tracker' });
registerAuditEntityType({ id: 'section_204_secretarial_audit', module: 'mca-roc', label: 'Section 204 Secretarial Audit' });
registerAuditEntityType({ id: 'form_mr3',                   module: 'mca-roc', label: 'Form MR-3 (Secretarial Audit Report)' });
registerAuditEntityType({ id: 'csr_committee_meeting',      module: 'mca-roc', label: 'CSR Committee Meeting' });
registerAuditEntityType({ id: 'csr_activity_calendar',      module: 'mca-roc', label: 'CSR Activity Calendar' });

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

export type FilingStatus = 'draft' | 'filed' | 'late_filed';

// ═══ MODULE 1 · CSR-2 Form ═══════════════════════════════════════════
export interface CSR2Form {
  id: string; fy: string; cin: string;
  net_profit_paise: number; csr_obligation_paise: number;
  csr_spent_paise: number; unspent_paise: number;
  filing_status: FilingStatus; filed_on: string | null;
}
const CSR2_KEY = 'erp_mca_csr2';
export function recordCSR2Form(input: Omit<CSR2Form, 'id'>, by_bap: BAPAccountId): CSR2Form {
  const r: CSR2Form = { ...input, id: uid('csr2') };
  const all = readJson<CSR2Form[]>(CSR2_KEY, []); all.push(r); writeJson(CSR2_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr2_form'),
    recordId: r.id, recordLabel: `CSR-2 · ${input.fy} · ${input.cin} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mca-tier2-engine',
  });
  return r;
}
export function listCSR2Forms(filter: { fy?: string } = {}): CSR2Form[] {
  return readJson<CSR2Form[]>(CSR2_KEY, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 2 · Section 135 CSR Tracker ══════════════════════════════
export type Sched7Activity =
  | 'eradicating_hunger' | 'education' | 'gender_equality' | 'environment'
  | 'national_heritage' | 'armed_forces' | 'sports' | 'pm_relief' | 'rural_dev' | 'slum_dev' | 'other';

export interface Section135CSRRecord {
  id: string; fy: string;
  avg_net_profit_3y_paise: number;     // base for 2% calc
  required_spend_paise: number;        // 2% of avg net profit
  actual_spend_paise: number;
  activity: Sched7Activity;
  beneficiary: string;
  project_ref: string | null;
}
const SEC135_KEY = 'erp_mca_sec135_csr';

/** 2% of average net profit of last 3 FY · Section 135(5). */
export function compute2PctCSR(avgNetProfitPaise: number): number {
  return Math.round(avgNetProfitPaise * 0.02);
}
export function recordSection135(input: Omit<Section135CSRRecord, 'id' | 'required_spend_paise'>, by_bap: BAPAccountId): Section135CSRRecord {
  const required = compute2PctCSR(input.avg_net_profit_3y_paise);
  const r: Section135CSRRecord = { ...input, id: uid('s135'), required_spend_paise: required };
  const all = readJson<Section135CSRRecord[]>(SEC135_KEY, []); all.push(r); writeJson(SEC135_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('section_135_csr_tracker'),
    recordId: r.id, recordLabel: `Sec 135 · ${input.fy} · ${input.activity} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mca-tier2-engine',
  });
  return r;
}
export function listSection135(filter: { fy?: string } = {}): Section135CSRRecord[] {
  return readJson<Section135CSRRecord[]>(SEC135_KEY, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 3 · Section 204 Secretarial Audit · Form MR-3 ════════════
export interface FormMR3 {
  id: string; fy: string; cs_name: string; cs_membership_no: string;
  auditor_firm: string; observations: string[]; filing_status: FilingStatus;
  filed_on: string | null;
}
const MR3_KEY = 'erp_mca_form_mr3';
export function recordFormMR3(input: Omit<FormMR3, 'id'>, by_bap: BAPAccountId): FormMR3 {
  const r: FormMR3 = { ...input, id: uid('mr3') };
  const all = readJson<FormMR3[]>(MR3_KEY, []); all.push(r); writeJson(MR3_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('form_mr3'),
    recordId: r.id, recordLabel: `MR-3 · ${input.fy} · ${input.auditor_firm} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mca-tier2-engine',
  });
  return r;
}
export function listFormMR3(filter: { fy?: string } = {}): FormMR3[] {
  return readJson<FormMR3[]>(MR3_KEY, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

// ═══ MODULE 4 · CSR Committee Meetings ═══════════════════════════════
export interface CSRCommitteeMeeting {
  id: string; meeting_date: string; attendees: string[]; agenda: string;
  minutes_ref: string | null;
}
const COM_KEY = 'erp_mca_csr_committee';
export function recordCSRCommitteeMeeting(input: Omit<CSRCommitteeMeeting, 'id'>, by_bap: BAPAccountId): CSRCommitteeMeeting {
  const r: CSRCommitteeMeeting = { ...input, id: uid('com') };
  const all = readJson<CSRCommitteeMeeting[]>(COM_KEY, []); all.push(r); writeJson(COM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr_committee_meeting'),
    recordId: r.id, recordLabel: `CSR Committee · ${input.meeting_date} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mca-tier2-engine',
  });
  return r;
}
export function listCSRCommitteeMeetings(): CSRCommitteeMeeting[] {
  return readJson<CSRCommitteeMeeting[]>(COM_KEY, []);
}

// ═══ Consolidated MCA T2 Summary ═════════════════════════════════════
export interface MCATier2Summary {
  csr2_filed_current_fy: number;
  csr_shortfall_paise: number;
  mr3_filed_current_fy: number;
  csr_committee_meetings_count: number;
  overall_status: 'compliant' | 'attention_required' | 'non_compliant';
}
export function getMCATier2Summary(fy: string): MCATier2Summary {
  const csr2 = listCSR2Forms({ fy }).filter((r) => r.filing_status === 'filed').length;
  const shortfall = listSection135({ fy }).reduce((s, r) => s + Math.max(0, r.required_spend_paise - r.actual_spend_paise), 0);
  const mr3 = listFormMR3({ fy }).filter((r) => r.filing_status === 'filed').length;
  const committee = listCSRCommitteeMeetings().length;

  let overall_status: MCATier2Summary['overall_status'] = 'compliant';
  if (shortfall > 0 || committee === 0) overall_status = 'attention_required';
  if (csr2 === 0 && mr3 === 0) overall_status = 'non_compliant';
  return {
    csr2_filed_current_fy: csr2,
    csr_shortfall_paise: shortfall,
    mr3_filed_current_fy: mr3,
    csr_committee_meetings_count: committee,
    overall_status,
  };
}
