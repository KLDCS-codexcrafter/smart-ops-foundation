/**
 * @file        src/lib/tt-payment-engine.ts
 * @purpose     TT Payment CRUD + 4-way integration validators + status transitions
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q1=b sibling · EX-8-Q8=a 4-way integration
 */
import type { TTPayment, TTPaymentStatus } from '@/types/tt-payment';
import { ttPaymentKey, TT_VALID_TRANSITIONS } from '@/types/tt-payment';
import { SINHA_TT_PAYMENTS } from '@/data/sinha-tt-hedge-seed-data';

export function loadTTPayments(entityCode: string): TTPayment[] {
  try {
    const raw = localStorage.getItem(ttPaymentKey(entityCode));
    if (!raw) {
      localStorage.setItem(ttPaymentKey(entityCode), JSON.stringify(SINHA_TT_PAYMENTS));
      return SINHA_TT_PAYMENTS;
    }
    return JSON.parse(raw) as TTPayment[];
  } catch { return SINHA_TT_PAYMENTS; }
}

export function saveTTPayments(entityCode: string, list: TTPayment[]): void {
  localStorage.setItem(ttPaymentKey(entityCode), JSON.stringify(list));
}

export function getTTPayment(entityCode: string, id: string): TTPayment | null {
  return loadTTPayments(entityCode).find((t) => t.id === id) ?? null;
}

export function transitionTTPayment(entityCode: string, id: string, next: TTPaymentStatus): TTPayment {
  const list = loadTTPayments(entityCode);
  const tt = list.find((t) => t.id === id);
  if (!tt) throw new Error(`TT not found: ${id}`);
  if (!TT_VALID_TRANSITIONS[tt.status].includes(next)) {
    throw new Error(`Invalid TT transition: ${tt.status} → ${next}`);
  }
  const now = new Date().toISOString();
  const updated: TTPayment = { ...tt, status: next, updated_at: now };
  if (next === 'pending_15ca_15cb') updated.pending_15ca_15cb_at = now;
  if (next === 'submitted_to_bank') updated.submitted_to_bank_at = now;
  if (next === 'in_transit') updated.in_transit_at = now;
  if (next === 'credited_to_beneficiary') updated.credited_at = now;
  saveTTPayments(entityCode, list.map((t) => (t.id === id ? updated : t)));
  return updated;
}

export interface TTSummary {
  total: number;
  by_status: Record<string, number>;
  total_outflow_inr: number;
  by_currency: Record<string, number>;
}

export function summarizeTTPayments(list: TTPayment[]): TTSummary {
  const s: TTSummary = { total: list.length, by_status: {}, total_outflow_inr: 0, by_currency: {} };
  for (const t of list) {
    s.by_status[t.status] = (s.by_status[t.status] ?? 0) + 1;
    s.total_outflow_inr += t.total_debit_inr;
    s.by_currency[t.currency_code] = (s.by_currency[t.currency_code] ?? 0) + t.amount_foreign;
  }
  return s;
}
