/**
 * @file        src/lib/comply360-meetings-engine.ts
 * @sibling     NEW @ Sprint 85 · DP-S85-4
 * @realizes    AGM + EGM + Board + Committee meeting minutes · discriminated union by meeting_type
 *              + attendance + voting · USE-SITE READS S83 mgt7 (MGT7MeetingSummary)
 * @reads-from  audit-trail-engine · aggregator · audit-framework · S83 mgt7
 * @sprint      Sprint 85 · T-Phase-5.C.3.3 · FLOOR 3 CLOSES
 * [JWT] Phase 8: POST /api/comply360/meetings/{record,attendance,voting}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { listMGT7Filings, type MGT7MeetingSummary } from './comply360-mgt7-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-mgt7-engine',
  ],
  storage_keys: ['erp_meetings', 'erp_attendance_records', 'erp_voting_records'],
} as const;

export type MeetingType = 'AGM' | 'EGM' | 'Board' | 'Audit_Committee' | 'CSR_Committee' | 'Nomination_Committee';
export type VotingMethod = 'voice_vote' | 'show_of_hands' | 'poll' | 'postal_ballot' | 'electronic';
export type AttendanceMode = 'in_person' | 'video_conference' | 'proxy';

export interface Meeting {
  id: string;
  meeting_type: MeetingType;
  fy: string;
  meeting_date: string;
  meeting_number: string;
  agenda_items: string[];
  minutes_summary: string;
  required_quorum: number;
  attendees_count: number;
  is_quorum_met: boolean;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AttendanceRecord {
  id: string;
  meeting_id: string;
  director_id: string;
  attendance_mode: AttendanceMode;
  recorded_at: string;
}

export interface VotingRecord {
  id: string;
  meeting_id: string;
  resolution_text: string;
  voting_method: VotingMethod;
  ayes: number;
  nays: number;
  abstain: number;
  outcome: 'passed' | 'rejected';
  recorded_at: string;
}

const M_KEY = 'erp_meetings';
const A_KEY = 'erp_attendance_records';
const V_KEY = 'erp_voting_records';

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

export function recordMeeting(input: Omit<Meeting, 'id' | 'recorded_at' | 'is_quorum_met'>): Meeting {
  const m: Meeting = {
    ...input,
    id: uid('mtg'),
    is_quorum_met: input.attendees_count >= input.required_quorum,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<Meeting[]>(M_KEY, []);
  all.push(m); writeJson(M_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('meeting'),
    recordId: m.id, recordLabel: `${input.meeting_type} · ${input.meeting_date} · ${input.meeting_number}`,
    beforeState: null, afterState: m as unknown as Record<string, unknown>,
    sourceModule: 'comply360-meetings-engine',
  });
  return m;
}

export function listMeetings(opts: { fy?: string; meeting_type?: MeetingType } = {}): Meeting[] {
  return readJson<Meeting[]>(M_KEY, []).filter((m) => {
    if (opts.fy && m.fy !== opts.fy) return false;
    if (opts.meeting_type && m.meeting_type !== opts.meeting_type) return false;
    return true;
  });
}

export function recordAttendance(input: Omit<AttendanceRecord, 'id' | 'recorded_at'>): AttendanceRecord {
  const a: AttendanceRecord = { ...input, id: uid('att'), recorded_at: new Date().toISOString() };
  const all = readJson<AttendanceRecord[]>(A_KEY, []);
  all.push(a); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('attendance_record'),
    recordId: a.id, recordLabel: `Attendance · meeting ${input.meeting_id} · ${input.attendance_mode}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-meetings-engine',
  });
  return a;
}

export function recordVoting(input: Omit<VotingRecord, 'id' | 'recorded_at' | 'outcome'>): VotingRecord {
  const outcome: VotingRecord['outcome'] = input.ayes > input.nays ? 'passed' : 'rejected';
  const v: VotingRecord = { ...input, id: uid('vot'), outcome, recorded_at: new Date().toISOString() };
  const all = readJson<VotingRecord[]>(V_KEY, []);
  all.push(v); writeJson(V_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('voting_record'),
    recordId: v.id, recordLabel: `Vote · meeting ${input.meeting_id} · ${input.voting_method} · ${outcome}`,
    beforeState: null, afterState: v as unknown as Record<string, unknown>,
    sourceModule: 'comply360-meetings-engine',
  });
  return v;
}

export function checkQuorum(meeting_id: string): { is_quorum_met: boolean; attendees: number; required: number } {
  const m = readJson<Meeting[]>(M_KEY, []).find((x) => x.id === meeting_id);
  if (!m) return { is_quorum_met: false, attendees: 0, required: 0 };
  const attendees = readJson<AttendanceRecord[]>(A_KEY, []).filter((a) => a.meeting_id === meeting_id).length;
  return { is_quorum_met: attendees >= m.required_quorum, attendees, required: m.required_quorum };
}

// USE-SITE READS S83 mgt7
export function getMGT7MeetingContext(fy: string): { mgt7_filing_id: string | null; existing_summary: MGT7MeetingSummary | null } {
  const filings = listMGT7Filings({ fy });
  return { mgt7_filing_id: filings[0]?.id ?? null, existing_summary: null };
}

registerAuditEntityType({ id: 'meeting', module: 'mca-roc', label: 'Meeting (AGM/EGM/Board/Committee)' });
registerAuditEntityType({ id: 'attendance_record', module: 'mca-roc', label: 'Attendance Record' });
registerAuditEntityType({ id: 'voting_record', module: 'mca-roc', label: 'Voting Record' });
