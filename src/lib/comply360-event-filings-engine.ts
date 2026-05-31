/**
 * @file        src/lib/comply360-event-filings-engine.ts
 * @sibling     NEW @ Sprint 84 · Comply360 Floor 3 ROC-Suite Arc 3.2 · DP-S84-1
 * @realizes    Event-based ROC filing orchestrator · 6 event types via discriminated union:
 *                MGT-14 · DIR-12 · CHG-1 · CHG-4 · INC-22 · INC-28
 *              All 30-day filing deadlines from event date. Late fee slabs.
 *              USE-SITE READS S83 dir3-kyc + statutory-registers + adt1 (v1.26 canon).
 *              Phase 5 LIMIT: filing draft generation · Phase 8 backend wires MCA portal.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              comply360-audit-framework-engine · comply360-dir3-kyc-engine (USE-SITE) ·
 *              comply360-statutory-registers-engine (USE-SITE) ·
 *              comply360-adt1-engine (USE-SITE · DSC Vault)
 * @sprint      Sprint 84 · T-Phase-5.C.3.2 · FLOOR 3 PASS 2
 * [JWT] Phase 8: POST /api/comply360/event-filings/{create,update,file}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READS (S83 engines stay 0-DIFF · v1.26 canon)
import { getDirectorMaster } from './comply360-dir3-kyc-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
    'comply360-dir3-kyc-engine',
    'comply360-statutory-registers-engine',
    'comply360-adt1-engine',
  ],
  storage_keys: ['erp_event_filings'],
} as const;

export type EventFilingType = 'MGT_14' | 'DIR_12' | 'CHG_1' | 'CHG_4' | 'INC_22' | 'INC_28';
export type EventFilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';

export interface MGT14Payload {
  kind: 'MGT_14';
  resolution_type: 'special' | 'ordinary' | 'board';
  resolution_text: string;
  meeting_date: string;
  attached_documents: string[];
}
export interface DIR12Payload {
  kind: 'DIR_12';
  director_id: string;
  change_type: 'appointment' | 'cessation' | 'change_in_particulars';
  effective_date: string;
  reason: string;
}
export interface CHG1Payload {
  kind: 'CHG_1';
  charge_type: 'first' | 'modification';
  charge_amount_inr: number;
  chargee_name: string;
  property_description: string;
  registry_entry_id: string | null;
}
export interface CHG4Payload {
  kind: 'CHG_4';
  original_chg1_filing_id: string;
  satisfaction_date: string;
  satisfaction_evidence_ref: string;
}
export interface INC22Payload {
  kind: 'INC_22';
  old_registered_office_address: string;
  new_registered_office_address: string;
  change_type: 'intra_state' | 'inter_state';
  effective_date: string;
}
export interface INC28Payload {
  kind: 'INC_28';
  court_or_tribunal: string;
  order_number: string;
  order_date: string;
  order_summary: string;
}

export type EventFilingPayload =
  | MGT14Payload | DIR12Payload | CHG1Payload | CHG4Payload | INC22Payload | INC28Payload;

export interface EventFiling {
  id: string;
  filing_type: EventFilingType;
  event_date: string;
  filing_deadline: string;
  fy: string;
  payload: EventFilingPayload;
  filing_status: EventFilingStatus;
  filing_fee_inr: number;
  late_fee_inr: number;
  dsc_signed_by: string | null;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
  rejection_reason: string | null;
}

const KEY = 'erp_event_filings';
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
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeEventFilingFee(
  filing_type: EventFilingType,
  days_late: number,
  paid_up_capital_inr?: number,
): { filing_fee_inr: number; late_fee_inr: number } {
  let base = 300;
  if (filing_type === 'MGT_14') {
    const cap = paid_up_capital_inr ?? 0;
    if (cap < 100000) base = 300;
    else if (cap < 500000) base = 400;
    else if (cap < 2500000) base = 500;
    else base = 600;
  } else if (filing_type === 'CHG_1' || filing_type === 'CHG_4') {
    base = 500;
  } else if (filing_type === 'INC_22' || filing_type === 'INC_28') {
    base = 400;
  } else {
    base = 300;
  }
  let lateMultiplier = 0;
  if (days_late > 0) {
    const months = Math.min(12, Math.ceil(days_late / 30));
    lateMultiplier = 12 * months;
  }
  return { filing_fee_inr: base, late_fee_inr: base * lateMultiplier };
}

export function createEventFiling(
  input: Omit<EventFiling, 'id' | 'prepared_at' | 'filed_at' | 'filing_status'
    | 'filing_deadline' | 'filing_fee_inr' | 'late_fee_inr' | 'rejection_reason'>,
): EventFiling {
  const deadline = addDays(input.event_date, 30);
  const today = new Date().toISOString().slice(0, 10);
  const days_late = today > deadline ? Math.floor((Date.parse(today) - Date.parse(deadline)) / 86400000) : 0;
  const fee = computeEventFilingFee(input.filing_type, days_late);
  const f: EventFiling = {
    ...input,
    id: uid('evf'),
    filing_status: 'draft',
    filing_deadline: deadline,
    filing_fee_inr: fee.filing_fee_inr,
    late_fee_inr: fee.late_fee_inr,
    prepared_at: new Date().toISOString(),
    filed_at: null,
    rejection_reason: null,
  };
  const all = readJson<EventFiling[]>(KEY, []);
  all.push(f);
  writeJson(KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD(`event_filing_${input.filing_type.toLowerCase()}`),
    recordId: f.id, recordLabel: `Event Filing ${input.filing_type} · ${input.event_date}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-event-filings-engine',
  });
  return f;
}

export function updateEventFilingStatus(
  filing_id: string, status: EventFilingStatus, by_bap: BAPAccountId, notes?: string,
): EventFiling {
  const all = readJson<EventFiling[]>(KEY, []);
  const idx = all.findIndex((x) => x.id === filing_id);
  if (idx < 0) throw new Error(`Event filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  const next: EventFiling = {
    ...all[idx],
    filing_status: status,
    filed_at: status === 'filed' ? new Date().toISOString() : all[idx].filed_at,
    rejection_reason: status === 'rejected' ? (notes ?? null) : all[idx].rejection_reason,
  };
  all[idx] = next;
  writeJson(KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD(`event_filing_${next.filing_type.toLowerCase()}`),
    recordId: filing_id, recordLabel: `Event Filing ${next.filing_type} → ${status} by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: next as unknown as Record<string, unknown>,
    sourceModule: 'comply360-event-filings-engine',
  });
  return next;
}

export function listEventFilings(opts: { fy?: string; filing_type?: EventFilingType; filing_status?: EventFilingStatus } = {}): EventFiling[] {
  return readJson<EventFiling[]>(KEY, []).filter((f) => {
    if (opts.fy && f.fy !== opts.fy) return false;
    if (opts.filing_type && f.filing_type !== opts.filing_type) return false;
    if (opts.filing_status && f.filing_status !== opts.filing_status) return false;
    return true;
  });
}

export function getEventFiling(id: string): EventFiling | null {
  return readJson<EventFiling[]>(KEY, []).find((f) => f.id === id) ?? null;
}

export function getEventFilingsByDirector(director_id: string): EventFiling[] {
  return listEventFilings().filter(
    (f) => f.filing_type === 'DIR_12' && (f.payload as DIR12Payload).director_id === director_id,
  );
}

export function getUpcomingEventDeadlines(days_ahead = 30): Array<{ filing_id: string; filing_type: EventFilingType; deadline: string; days_remaining: number }> {
  const today = new Date();
  const horizon = new Date(today); horizon.setUTCDate(horizon.getUTCDate() + days_ahead);
  return listEventFilings()
    .filter((f) => f.filing_status === 'draft' || f.filing_status === 'ready_to_file')
    .map((f) => ({
      filing_id: f.id, filing_type: f.filing_type, deadline: f.filing_deadline,
      days_remaining: Math.ceil((Date.parse(f.filing_deadline) - today.getTime()) / 86400000),
    }))
    .filter((x) => x.days_remaining <= days_ahead)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

export function deriveDIR12FromResignation(
  director_id: string, resignation_date: string, reason: string, by_bap: BAPAccountId,
): EventFiling {
  // USE-SITE READ S83 dir3-kyc Director Master
  const dir = getDirectorMaster(director_id);
  if (!dir) throw new Error(`Director not found: ${director_id}`);
  const fy = `${new Date(resignation_date).getFullYear()}-${String((new Date(resignation_date).getFullYear() + 1) % 100).padStart(2, '0')}`;
  return createEventFiling({
    filing_type: 'DIR_12',
    event_date: resignation_date,
    fy,
    payload: {
      kind: 'DIR_12',
      director_id,
      change_type: 'cessation',
      effective_date: resignation_date,
      reason,
    },
    dsc_signed_by: null,
    prepared_by_bap: by_bap,
  });
}

// ── Register 6 NEW audit entity types ──
registerAuditEntityType({ id: 'event_filing_mgt_14', module: 'mca-roc', label: 'Event Filing · MGT-14' });
registerAuditEntityType({ id: 'event_filing_dir_12', module: 'mca-roc', label: 'Event Filing · DIR-12' });
registerAuditEntityType({ id: 'event_filing_chg_1', module: 'mca-roc', label: 'Event Filing · CHG-1' });
registerAuditEntityType({ id: 'event_filing_chg_4', module: 'mca-roc', label: 'Event Filing · CHG-4' });
registerAuditEntityType({ id: 'event_filing_inc_22', module: 'mca-roc', label: 'Event Filing · INC-22' });
registerAuditEntityType({ id: 'event_filing_inc_28', module: 'mca-roc', label: 'Event Filing · INC-28' });
