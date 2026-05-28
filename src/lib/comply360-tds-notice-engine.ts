/**
 * @file        src/lib/comply360-tds-notice-engine.ts
 * @purpose     TDS notice / demand tracking · short-deduction · late-fee 234E ·
 *              interest 201(1A) · default notices · resolution lifecycle.
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 4
 * @decisions   D-S69-1 (100% native) · DP-S74-1 (TDS-notice lands as tds sub-tab)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-58 typed-storage ·
 *              FR-91 honest disclosure · FR-104 RECG
 */
import { dAdd, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export type TDSNoticeType =
  | 'short_deduction'
  | 'short_payment'
  | 'late_fee_234e'
  | 'interest_201_1a'
  | 'default_notice'
  | 'mismatch_26as';

export type TDSNoticeStatus =
  | 'open'
  | 'responded'
  | 'paid'
  | 'partial_paid'
  | 'disputed'
  | 'closed';

export interface TDSNotice {
  id: string;
  entity_code: string;
  fy: string;
  notice_type: TDSNoticeType;
  notice_no: string;
  notice_date: string;        // ISO
  section?: string;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  party_id?: string;
  party_name?: string;
  tds_amount: number;         // principal short / default
  interest_amount: number;
  late_fee_amount: number;
  demand_amount: number;      // total demand
  due_date: string;           // ISO
  status: TDSNoticeStatus;
  paid_amount: number;
  resolution_ref?: string;    // challan / appeal / order id
  resolved_on?: string;
  created_at: string;
  updated_at: string;
}

export interface TDSNoticeResponse {
  notice_id: string;
  computed_demand: number;
  outstanding: number;
  days_to_due: number;
  recommended_action:
    | 'pay_full'
    | 'pay_balance'
    | 'file_response'
    | 'no_action_resolved'
    | 'escalate_overdue';
  rationale: string;
}

// ── Storage layer (localStorage · per-entity scope) ──────────────────

function storageKey(entityCode: string): string {
  return `comply360.tdsnotice.${entityCode}`;
}

// [JWT] localStorage — replace with REST GET /api/comply360/tds-notices?entity=<code>
export function loadNotices(entityCode: string): TDSNotice[] {
  try {
    const raw = localStorage.getItem(storageKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TDSNotice[]) : [];
  } catch {
    return [];
  }
}

// [JWT] localStorage.setItem — replace with REST POST /api/comply360/tds-notices
function persistNotices(entityCode: string, notices: TDSNotice[]): void {
  try {
    localStorage.setItem(storageKey(entityCode), JSON.stringify(notices));
  } catch {
    /* quota — surfaced by useStorageQuota */
  }
}

// ── Public API ───────────────────────────────────────────────────────

/** Record a new notice OR upsert an existing one (matched by id). */
export function recordNotice(
  notice: Omit<TDSNotice, 'created_at' | 'updated_at'> & Partial<Pick<TDSNotice, 'created_at' | 'updated_at'>>,
): TDSNotice {
  const now = new Date().toISOString();
  const demand = round2(
    dAdd(dAdd(notice.tds_amount || 0, notice.interest_amount || 0), notice.late_fee_amount || 0),
  );
  const full: TDSNotice = {
    ...notice,
    demand_amount: notice.demand_amount > 0 ? round2(notice.demand_amount) : demand,
    paid_amount: round2(notice.paid_amount || 0),
    status: notice.status || 'open',
    created_at: notice.created_at || now,
    updated_at: now,
  };
  const list = loadNotices(notice.entity_code);
  const idx = list.findIndex((n) => n.id === full.id);
  if (idx >= 0) list[idx] = full;
  else list.push(full);
  persistNotices(notice.entity_code, list);
  return full;
}

/** Compute a recommended response for a notice (does not mutate). */
export function computeNoticeResponse(notice: TDSNotice): TDSNoticeResponse {
  const outstanding = round2(Math.max(0, notice.demand_amount - notice.paid_amount));
  const due = new Date(notice.due_date).getTime();
  const now = Date.now();
  const days_to_due = Math.floor((due - now) / (1000 * 60 * 60 * 24));

  let recommended_action: TDSNoticeResponse['recommended_action'];
  let rationale: string;

  if (notice.status === 'closed' || notice.status === 'paid') {
    recommended_action = 'no_action_resolved';
    rationale = 'Notice already resolved — retain copy for audit trail.';
  } else if (outstanding <= 0) {
    recommended_action = 'no_action_resolved';
    rationale = 'Full demand has been paid; awaiting closure order.';
  } else if (days_to_due < 0) {
    recommended_action = 'escalate_overdue';
    rationale = `Overdue by ${Math.abs(days_to_due)} day(s) — additional interest u/s 220(2) may accrue.`;
  } else if (notice.paid_amount > 0) {
    recommended_action = 'pay_balance';
    rationale = `Balance INR ${outstanding} pending; ${days_to_due} day(s) to due date.`;
  } else if (notice.notice_type === 'mismatch_26as' || notice.notice_type === 'default_notice') {
    recommended_action = 'file_response';
    rationale = 'Mismatch / default notice — file reconciliation response before payment.';
  } else {
    recommended_action = 'pay_full';
    rationale = `Full demand INR ${notice.demand_amount} payable within ${days_to_due} day(s).`;
  }

  return {
    notice_id: notice.id,
    computed_demand: round2(notice.demand_amount),
    outstanding,
    days_to_due,
    recommended_action,
    rationale,
  };
}

/** Mark a notice as resolved (status transition with optional payment). */
export function trackResolution(
  entityCode: string,
  noticeId: string,
  status: TDSNoticeStatus,
  options: { paid_amount?: number; resolution_ref?: string } = {},
): TDSNotice | null {
  const list = loadNotices(entityCode);
  const idx = list.findIndex((n) => n.id === noticeId);
  if (idx < 0) return null;
  const cur = list[idx];
  const paid = options.paid_amount !== undefined ? round2(options.paid_amount) : cur.paid_amount;
  const updated: TDSNotice = {
    ...cur,
    status,
    paid_amount: paid,
    resolution_ref: options.resolution_ref ?? cur.resolution_ref,
    resolved_on:
      status === 'closed' || status === 'paid'
        ? new Date().toISOString().slice(0, 10)
        : cur.resolved_on,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  persistNotices(entityCode, list);
  return updated;
}

/** Roll-up: counts + outstanding demand by status for a header strip. */
export function summarizeNotices(entityCode: string): {
  total: number;
  open: number;
  outstanding_demand: number;
  overdue: number;
} {
  const list = loadNotices(entityCode);
  const now = Date.now();
  let open = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const n of list) {
    if (n.status !== 'closed' && n.status !== 'paid') {
      open += 1;
      outstanding = dAdd(outstanding, Math.max(0, n.demand_amount - n.paid_amount));
      if (new Date(n.due_date).getTime() < now) overdue += 1;
    }
  }
  return {
    total: list.length,
    open,
    outstanding_demand: round2(outstanding),
    overdue,
  };
}
