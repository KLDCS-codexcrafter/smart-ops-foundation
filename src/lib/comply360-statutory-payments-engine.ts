/**
 * @file        src/lib/comply360-statutory-payments-engine.ts
 * @sibling     NEW @ Sprint 78a · Comply360 Main Arc 1.10 · Pass A · PMT
 * @realizes    Central payment-due register for GST + TDS + ESI/PF +
 *              Income Tax advance + late-fee/interest. Auto-compute payment
 *              amount with breakdown; recordPayment marks as paid;
 *              prepareChallan returns the handoff payload that S79 Challan
 *              Vault will persist (DP-S78-5 split: register owned here,
 *              challan documents owned downstream).
 * @reads-from  comply360-calendar-engine (0-DIFF · same-sprint) · comply360-statutory-memory (0-DIFF)
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 * [JWT] Phase 8: GET /api/comply360/payments · POST /api/comply360/payments/record · POST /api/comply360/payments/challan-prep
 */
import { buildCalendar } from './comply360-calendar-engine';

export const READS_FROM = {
  engines: ['comply360-calendar-engine', 'comply360-statutory-memory'],
  storage_keys: [],
} as const;

export type PaymentType =
  | 'gst' | 'tds' | 'esi' | 'pf' | 'income-tax-advance'
  | 'late-fee' | 'interest' | 'penalty';

export type PaymentMode =
  | 'net-banking' | 'neft-rtgs' | 'cheque' | 'cash' | 'challan';

export interface StatutoryPayment {
  id: string;
  entity_code: string;
  payment_type: PaymentType;
  period: string;
  due_date: string;
  amount_inr: number;
  status: 'due' | 'paid' | 'overdue' | 'partial';
  reference: string | null;
  mode: PaymentMode | null;
  paid_at: string | null;
  computed_breakdown?: Record<string, number>;
}

const storageKey = (entity_code: string): string =>
  `erp_comply360_statutory_payments_${entity_code}`;

// [JWT] localStorage — replace with REST GET /api/comply360/payments in Phase 8
function read(entity_code: string): StatutoryPayment[] {
  try {
    const raw = localStorage.getItem(storageKey(entity_code));
    return raw ? (JSON.parse(raw) as StatutoryPayment[]) : [];
  } catch {
    return [];
  }
}

// [JWT] localStorage.setItem — replace with REST POST /api/comply360/payments in Phase 8
function write(entity_code: string, list: StatutoryPayment[]): void {
  try {
    localStorage.setItem(storageKey(entity_code), JSON.stringify(list));
  } catch {
    /* quota — diagnostics handled by useStorageQuota */
  }
}

/**
 * Indicative per-type baseline amounts (paise · matching internal currency
 * discipline). Real filings override via [JWT] Phase 8 backend.
 */
const BASELINE_INR: Record<PaymentType, number> = {
  'gst': 250_000,
  'tds': 75_000,
  'esi': 18_000,
  'pf': 42_000,
  'income-tax-advance': 500_000,
  'late-fee': 5_000,
  'interest': 12_000,
  'penalty': 25_000,
};

function dueDateFor(payment_type: PaymentType, period: string): string {
  // Period format YYYY-MM ⇒ next month's relevant statutory day.
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const day = payment_type === 'gst' ? 20
    : payment_type === 'tds' ? 7
    : payment_type === 'esi' ? 15
    : payment_type === 'pf' ? 15
    : 30;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function loadPayments(entity_code: string, fy: string): StatutoryPayment[] {
  const existing = read(entity_code);
  if (existing.length > 0) return existing;
  // First-run seed: convert pending calendar GST/TDS events into payment rows.
  const cal = buildCalendar(entity_code, fy);
  const seeded: StatutoryPayment[] = cal
    .filter((e) => e.module === 'tax-gst' || e.module === 'tds')
    .slice(0, 12)
    .map((e, idx) => ({
      id: `pmt-${entity_code}-${idx}-${e.id}`,
      entity_code,
      payment_type: e.module === 'tax-gst' ? 'gst' : 'tds',
      period: e.due_date.slice(0, 7),
      due_date: e.due_date,
      amount_inr: BASELINE_INR[e.module === 'tax-gst' ? 'gst' : 'tds'],
      status: 'due',
      reference: e.id,
      mode: null,
      paid_at: null,
    }));
  write(entity_code, seeded);
  return seeded;
}

export function computePaymentDue(
  entity_code: string,
  payment_type: PaymentType,
  period: string,
): StatutoryPayment {
  const base = BASELINE_INR[payment_type];
  const interest = Math.round(base * 0.01);
  const late = payment_type === 'late-fee' ? base : 0;
  const total = base + interest + late;
  const due_date = dueDateFor(payment_type, period);
  const payment: StatutoryPayment = {
    id: `pmt-${entity_code}-${payment_type}-${period}`,
    entity_code,
    payment_type,
    period,
    due_date,
    amount_inr: total,
    status: 'due',
    reference: null,
    mode: null,
    paid_at: null,
    computed_breakdown: { principal: base, interest, late_fee: late },
  };
  const list = read(entity_code);
  if (!list.find((p) => p.id === payment.id)) {
    list.push(payment);
    write(entity_code, list);
  }
  return payment;
}

export function recordPayment(
  entity_code: string,
  payment_id: string,
  amount: number,
  mode: PaymentMode,
  ref: string,
): StatutoryPayment {
  const list = read(entity_code);
  const idx = list.findIndex((p) => p.id === payment_id);
  if (idx < 0) {
    throw new Error(`Payment ${payment_id} not found for entity ${entity_code}`);
  }
  const cur = list[idx];
  const status: StatutoryPayment['status'] = amount >= cur.amount_inr ? 'paid' : 'partial';
  const updated: StatutoryPayment = {
    ...cur,
    status,
    reference: ref,
    mode,
    paid_at: new Date().toISOString(),
  };
  list[idx] = updated;
  write(entity_code, list);
  return updated;
}

/**
 * Prepare the handoff payload for S79 Challan Vault. STUB · this engine does
 * not persist challan documents (DP-S78-5).
 */
export function prepareChallan(payment: StatutoryPayment): { handoff_payload: {
  payment_id: string; entity_code: string; payment_type: PaymentType;
  amount_inr: number; period: string; due_date: string;
  recommended_mode: PaymentMode; portal_endpoint: string;
} } {
  const portal = payment.payment_type === 'gst' ? 'gst.gov.in/payment'
    : payment.payment_type === 'tds' ? 'tin-nsdl.com/etds'
    : payment.payment_type === 'pf' ? 'unifiedportal-emp.epfindia.gov.in'
    : payment.payment_type === 'esi' ? 'esic.in/challan'
    : 'incometax.gov.in/challan';
  return {
    handoff_payload: {
      payment_id: payment.id,
      entity_code: payment.entity_code,
      payment_type: payment.payment_type,
      amount_inr: payment.amount_inr,
      period: payment.period,
      due_date: payment.due_date,
      recommended_mode: 'net-banking',
      portal_endpoint: portal,
    },
  };
}
