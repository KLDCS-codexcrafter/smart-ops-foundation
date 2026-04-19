/**
 * card-context-relay.ts — Pass context between cards via sessionStorage
 * Usage:
 *   pushContext({ from_card: 'distributor-hub', to_card: 'finecore', payload: { voucher_id, party_id } })
 *   navigate(buildCardRoute('finecore'))  -> on target, popContext('finecore')
 */

export interface CardContextEntry {
  from_card: string;
  to_card: string;
  from_module?: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const KEY = 'erp_card_context_relay';
const MAX = 10;

export function pushContext(entry: Omit<CardContextEntry, 'created_at'>): void {
  const full: CardContextEntry = { ...entry, created_at: new Date().toISOString() };
  try {
    const raw = sessionStorage.getItem(KEY);
    const list: CardContextEntry[] = raw ? JSON.parse(raw) : [];
    list.push(full);
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch { /* ignore */ }
}

/** Pop the most recent context targeted at this card (if any). */
export function popContext(toCard: string): CardContextEntry | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const list: CardContextEntry[] = raw ? JSON.parse(raw) : [];
    const idx = [...list].reverse().findIndex(e => e.to_card === toCard);
    if (idx < 0) return null;
    const actualIdx = list.length - 1 - idx;
    const entry = list[actualIdx];
    list.splice(actualIdx, 1);
    sessionStorage.setItem(KEY, JSON.stringify(list));
    return entry;
  } catch { return null; }
}

export function peekContexts(): CardContextEntry[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
