/**
 * @file        src/lib/comply360-mgt7-engine.ts
 * @sibling     NEW @ Sprint 83 · Floor 3 ROC-Suite · DP-S83-3
 * @realizes    MGT-7 Annual Return (Section 92) + MGT-7A (small companies). 60-day deadline from AGM.
 * @reads-from  audit-trail-engine · aggregator · audit-framework
 * @sprint      Sprint 83 · T-Phase-5.C.3.1
 * [JWT] Phase 8: POST /api/comply360/mgt7/{draft,file}
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
  storage_keys: ['erp_mgt7_filings', 'erp_shareholding_patterns', 'erp_board_composition_snapshots', 'erp_mgt7_meeting_summaries'],
} as const;

export type MGT7FilingType = 'MGT_7' | 'MGT_7A';
export type MGT7FilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';

export interface MGT7Filing {
  id: string;
  filing_type: MGT7FilingType;
  fy: string;
  agm_date: string;
  filing_deadline: string;
  paid_up_capital_inr: number;
  total_members: number;
  filing_fee_inr: number;
  filing_status: MGT7FilingStatus;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
  rejection_reason: string | null;
}

export interface ShareholdingPattern {
  id: string;
  mgt7_filing_id: string;
  promoter_holding_pct: number;
  promoter_pledged_pct: number;
  public_holding_pct: number;
  institutional_holding_pct: number;
  fii_holding_pct: number;
  total_outstanding_shares: number;
  top_10_shareholders: Array<{ name: string; pan: string; shares: number; pct: number }>;
  recorded_at: string;
}

export interface BoardCompositionSnapshot {
  id: string;
  mgt7_filing_id: string;
  total_directors: number;
  executive_directors: number;
  non_executive_directors: number;
  independent_directors: number;
  women_directors: number;
  audit_committee_count: number;
  nomination_committee_count: number;
  csr_committee_count: number;
  recorded_at: string;
}

export interface MGT7MeetingSummary {
  id: string;
  mgt7_filing_id: string;
  agm_held: boolean;
  agm_date: string | null;
  board_meetings_count: number;
  audit_committee_meetings_count: number;
  csr_committee_meetings_count: number;
  related_party_transactions_count: number;
  indebtedness_inr: number;
  penalties_history: Array<{ year: string; section: string; penalty_inr: number; description: string }>;
  recorded_at: string;
}

const F_KEY = 'erp_mgt7_filings';
const SH_KEY = 'erp_shareholding_patterns';
const BC_KEY = 'erp_board_composition_snapshots';
const MS_KEY = 'erp_mgt7_meeting_summaries';

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

export function computeMGT7Fee(paid_up_capital_inr: number, days_late: number): { filing_fee_inr: number; late_fee_inr: number } {
  const c = paid_up_capital_inr;
  let filing_fee_inr: number;
  if (c < 100000) filing_fee_inr = 200;
  else if (c < 500000) filing_fee_inr = 300;
  else if (c < 2500000) filing_fee_inr = 400;
  else if (c < 10000000) filing_fee_inr = 500;
  else filing_fee_inr = 600;
  const months_late = days_late > 0 ? Math.min(12, Math.ceil(days_late / 30)) : 0;
  return { filing_fee_inr, late_fee_inr: months_late * 12 * filing_fee_inr };
}

export function determineMGT7Variant(opts: { paid_up_capital_inr: number; turnover_inr: number }): MGT7FilingType {
  return opts.paid_up_capital_inr <= 20000000 && opts.turnover_inr <= 200000000 ? 'MGT_7A' : 'MGT_7';
}

export function createMGT7Filing(
  input: Omit<MGT7Filing, 'id' | 'prepared_at' | 'filed_at' | 'filing_status' | 'rejection_reason' | 'filing_deadline' | 'filing_fee_inr'>,
): MGT7Filing {
  const filing_deadline = addDays(input.agm_date, 60);
  const today = new Date().toISOString().slice(0, 10);
  const days_late = today > filing_deadline
    ? Math.floor((Date.parse(today) - Date.parse(filing_deadline)) / 86400000) : 0;
  const fee = computeMGT7Fee(input.paid_up_capital_inr, days_late);
  const filing: MGT7Filing = {
    ...input,
    id: uid('mgt7'), filing_deadline, filing_fee_inr: fee.filing_fee_inr + fee.late_fee_inr,
    filing_status: 'draft', prepared_at: new Date().toISOString(), filed_at: null, rejection_reason: null,
  };
  const all = readJson<MGT7Filing[]>(F_KEY, []);
  all.push(filing);
  writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('mgt7_filing'),
    recordId: filing.id, recordLabel: `MGT-7 · ${filing.filing_type} · FY ${filing.fy}`,
    beforeState: null, afterState: filing as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mgt7-engine',
  });
  return filing;
}

export function updateMGT7Status(filing_id: string, status: MGT7FilingStatus, by_bap: BAPAccountId): MGT7Filing {
  const all = readJson<MGT7Filing[]>(F_KEY, []);
  const idx = all.findIndex((x) => x.id === filing_id);
  if (idx < 0) throw new Error(`MGT-7 filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx], filing_status: status,
    filed_at: status === 'filed' ? new Date().toISOString() : all[idx].filed_at,
  };
  writeJson(F_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('mgt7_filing'),
    recordId: filing_id, recordLabel: `MGT-7 → ${status} · ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mgt7-engine',
  });
  return all[idx];
}

export function listMGT7Filings(opts: { fy?: string; filing_type?: MGT7FilingType } = {}): MGT7Filing[] {
  return readJson<MGT7Filing[]>(F_KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.filing_type && f.filing_type !== opts.filing_type) return false;
    return true;
  });
}

export function getMGT7Filing(id: string): MGT7Filing | null {
  return readJson<MGT7Filing[]>(F_KEY, []).find((f) => f.id === id) ?? null;
}

export function recordShareholdingPattern(input: Omit<ShareholdingPattern, 'id' | 'recorded_at'>): ShareholdingPattern {
  const r: ShareholdingPattern = { ...input, id: uid('sh'), recorded_at: new Date().toISOString() };
  const all = readJson<ShareholdingPattern[]>(SH_KEY, []);
  all.push(r);
  writeJson(SH_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('shareholding_pattern'),
    recordId: r.id, recordLabel: `Shareholding pattern · MGT-7 ${input.mgt7_filing_id}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mgt7-engine',
  });
  return r;
}

export function getShareholdingPattern(mgt7_filing_id: string): ShareholdingPattern | null {
  return readJson<ShareholdingPattern[]>(SH_KEY, []).find((r) => r.mgt7_filing_id === mgt7_filing_id) ?? null;
}

export function recordBoardComposition(input: Omit<BoardCompositionSnapshot, 'id' | 'recorded_at'>): BoardCompositionSnapshot {
  const r: BoardCompositionSnapshot = { ...input, id: uid('bc'), recorded_at: new Date().toISOString() };
  const all = readJson<BoardCompositionSnapshot[]>(BC_KEY, []);
  all.push(r);
  writeJson(BC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('board_composition_snapshot'),
    recordId: r.id, recordLabel: `Board composition · MGT-7 ${input.mgt7_filing_id}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mgt7-engine',
  });
  return r;
}

export function getBoardComposition(mgt7_filing_id: string): BoardCompositionSnapshot | null {
  return readJson<BoardCompositionSnapshot[]>(BC_KEY, []).find((r) => r.mgt7_filing_id === mgt7_filing_id) ?? null;
}

export function recordMeetingSummary(input: Omit<MGT7MeetingSummary, 'id' | 'recorded_at'>): MGT7MeetingSummary {
  const r: MGT7MeetingSummary = { ...input, id: uid('ms'), recorded_at: new Date().toISOString() };
  const all = readJson<MGT7MeetingSummary[]>(MS_KEY, []);
  all.push(r);
  writeJson(MS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('mgt7_meeting_summary'),
    recordId: r.id, recordLabel: `Meeting summary · MGT-7 ${input.mgt7_filing_id}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-mgt7-engine',
  });
  return r;
}

export function getMeetingSummary(mgt7_filing_id: string): MGT7MeetingSummary | null {
  return readJson<MGT7MeetingSummary[]>(MS_KEY, []).find((r) => r.mgt7_filing_id === mgt7_filing_id) ?? null;
}

registerAuditEntityType({ id: 'mgt7_filing', module: 'mca-roc', label: 'MGT-7 Filing' });
registerAuditEntityType({ id: 'shareholding_pattern', module: 'mca-roc', label: 'Shareholding Pattern' });
registerAuditEntityType({ id: 'board_composition_snapshot', module: 'mca-roc', label: 'Board Composition' });
registerAuditEntityType({ id: 'mgt7_meeting_summary', module: 'mca-roc', label: 'MGT-7 Meeting Summary' });
