/**
 * @file        cc-masters-engine.ts
 * @sprint      T-Phase-1.2.6f-c-3 · Block B · per D-289
 * @purpose     CRUD for ModeOfPayment · TermsOfPayment · TermsOfDelivery masters.
 * @[JWT]       GET/POST /api/masters/{mode-of-payment|terms-of-payment|terms-of-delivery}
 */
import {
  type ModeOfPayment, type TermsOfPayment, type TermsOfDelivery,
  modeOfPaymentKey, termsOfPaymentKey, termsOfDeliveryKey,
} from '@/types/cc-masters';

const now = (): string => new Date().toISOString();
const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function load<T>(key: string): T[] {
  try {
    // [JWT] GET /api/masters/...
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function save<T>(key: string, list: T[]): void {
  try {
    // [JWT] POST /api/masters/...
    localStorage.setItem(key, JSON.stringify(list));
  } catch { /* quota silent */ }
}

// ---------- ModeOfPayment ----------
export const listModeOfPayment = (e: string): ModeOfPayment[] =>
  load<ModeOfPayment>(modeOfPaymentKey(e));
export function upsertModeOfPayment(
  e: string, m: Omit<ModeOfPayment, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): ModeOfPayment {
  const list = listModeOfPayment(e);
  const existing = m.id ? list.find((x) => x.id === m.id) : null;
  const rec: ModeOfPayment = existing
    ? { ...existing, ...m, id: existing.id, updated_at: now() }
    : { ...m, id: newId('mop'), created_at: now(), updated_at: now() };
  const next = existing ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec];
  save(modeOfPaymentKey(e), next);
  return rec;
}

// ---------- TermsOfPayment ----------
export const listTermsOfPayment = (e: string): TermsOfPayment[] =>
  load<TermsOfPayment>(termsOfPaymentKey(e));
export function upsertTermsOfPayment(
  e: string, t: Omit<TermsOfPayment, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): TermsOfPayment {
  const list = listTermsOfPayment(e);
  const existing = t.id ? list.find((x) => x.id === t.id) : null;
  const rec: TermsOfPayment = existing
    ? { ...existing, ...t, id: existing.id, updated_at: now() }
    : { ...t, id: newId('top'), created_at: now(), updated_at: now() };
  const next = existing ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec];
  save(termsOfPaymentKey(e), next);
  return rec;
}

// ---------- TermsOfDelivery ----------
export const listTermsOfDelivery = (e: string): TermsOfDelivery[] =>
  load<TermsOfDelivery>(termsOfDeliveryKey(e));
export function upsertTermsOfDelivery(
  e: string, t: Omit<TermsOfDelivery, 'id' | 'created_at' | 'updated_at'> & { id?: string },
): TermsOfDelivery {
  const list = listTermsOfDelivery(e);
  const existing = t.id ? list.find((x) => x.id === t.id) : null;
  const rec: TermsOfDelivery = existing
    ? { ...existing, ...t, id: existing.id, updated_at: now() }
    : { ...t, id: newId('tod'), created_at: now(), updated_at: now() };
  const next = existing ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec];
  save(termsOfDeliveryKey(e), next);
  return rec;
}
