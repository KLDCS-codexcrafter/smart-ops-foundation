/**
 * breadcrumb-memory.ts — Remember active module per card in sessionStorage
 * When user switches cards and returns, the full path inside the returned
 * card is restored.
 */

import type { CardId } from '@/types/card-entitlement';

const KEY = 'erp_breadcrumb_memory';

type Memory = Partial<Record<CardId, { moduleId: string | null; updatedAt: string }>>;

function load(): Memory {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Memory) : {};
  } catch { return {}; }
}

function save(m: Memory): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(m)); }
  catch { /* ignore */ }
}

export function rememberModule(cardId: CardId, moduleId: string | null): void {
  const m = load();
  m[cardId] = { moduleId, updatedAt: new Date().toISOString() };
  save(m);
}

export function recallModule(cardId: CardId): string | null {
  const m = load();
  return m[cardId]?.moduleId ?? null;
}

export function clearMemory(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Card id -> base route map. Used to build deep-link URLs with remembered hash. */
export const CARD_BASE_ROUTES: Record<CardId, string> = {
  'command-center':  '/erp/command-center',
  'salesx':          '/erp/salesx',
  'distributor-hub': '/erp/distributor-hub',
  'customer-hub':    '/erp/customer-hub',
  'finecore':        '/erp/finecore',
  'receivx':         '/erp/receivx',
  'peoplepay':       '/erp/pay-hub',
  'payout':          '/erp/payout',
  'insightx':        '/erp/insightx',
  'procure360':      '/erp/procure-hub',
  'inventory-hub':   '/erp/inventory-hub',
  'qulicheak':       '/erp/qulicheak',
  'gateflow':        '/erp/gateflow',
  'production':      '/erp/production',
  'maintainpro':     '/erp/maintainpro',
  'requestx':        '/erp/requestx',
  'frontdesk':       '/erp/frontdesk',
  'servicedesk':     '/erp/servicedesk',
  'dispatch-hub':    '/erp/logistics',
  'dispatch-ops':    '/erp/dispatch',
};

/**
 * Legacy card-id aliases for backward compat (T-Phase-1.1.0 · D-194 rename).
 * Old localStorage breadcrumbs (e.g. cardId='backoffice') still resolve via
 * buildCardRoute() — see lookup below. Untyped on purpose: these IDs no
 * longer exist in CardId by design.
 */
export const LEGACY_CARD_ROUTE_ALIASES: Record<string, string> = {
  'backoffice': '/erp/frontdesk',
};

export function buildCardRoute(cardId: CardId): string {
  const base = CARD_BASE_ROUTES[cardId] ?? LEGACY_CARD_ROUTE_ALIASES[cardId as string];
  const mod = recallModule(cardId);
  return mod ? `${base}#${mod}` : base;
}
