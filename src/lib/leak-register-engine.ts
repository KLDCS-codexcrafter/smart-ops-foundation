/**
 * @file        leak-register-engine.ts
 * @sprint      T-Phase-1.2.6f-b-2 · Block J · per D-279
 * @purpose     FR-44 Leak Register foundation · 12 categories · Block J emits Cost Leakage.
 * @decisions   D-274 (>110% threshold) · D-279 (NEW lightweight engine)
 * @[JWT]       POST /api/leak-register/events
 */

export type LeakCategory =
  | 'inventory' | 'revenue' | 'cost' | 'compliance' | 'receivables'
  | 'cash' | 'people' | 'time' | 'data' | 'process' | 'audit' | 'governance';

export interface LeakEvent {
  id: string;
  entity_id: string;
  category: LeakCategory;
  sub_kind: string;
  ref_type?: 'enquiry' | 'rfq' | 'quotation' | 'po' | 'grn' | 'invoice';
  ref_id?: string;
  ref_label?: string;
  amount?: number;
  baseline_amount?: number;
  variance_pct?: number;
  notes?: string;
  emitted_at: string;
  emitted_by: string;
}

export const leakRegisterKey = (entityCode: string): string =>
  `erp_leak_register_${entityCode}`;

export function emitLeakEvent(input: Omit<LeakEvent, 'id' | 'emitted_at'>): LeakEvent {
  // [JWT] POST /api/leak-register/events
  const event: LeakEvent = {
    ...input,
    id: `leak-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    emitted_at: new Date().toISOString(),
  };
  try {
    const key = leakRegisterKey(input.entity_id);
    const raw = localStorage.getItem(key);
    const list = (raw ? JSON.parse(raw) : []) as LeakEvent[];
    localStorage.setItem(key, JSON.stringify([event, ...list].slice(0, 1000)));
  } catch {
    /* quota silent */
  }
  return event;
}

export function listLeakEvents(entityCode: string, category?: LeakCategory): LeakEvent[] {
  // [JWT] GET /api/leak-register/events
  try {
    const raw = localStorage.getItem(leakRegisterKey(entityCode));
    const all = (raw ? JSON.parse(raw) : []) as LeakEvent[];
    return category ? all.filter(e => e.category === category) : all;
  } catch {
    return [];
  }
}
