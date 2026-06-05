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
  'fincore':        '/erp/fincore',
  'receivx':         '/erp/receivx',
  'peoplepay':       '/erp/pay-hub',
  'payout':          '/erp/payout',
  'insightx':        '/erp/insightx',
  'procure360':      '/erp/procure-hub',
  'inventory-hub':   '/erp/inventory-hub',
  'qualicheck':       '/erp/qualicheck',
  'gateflow':        '/erp/gateflow',
  'production':      '/erp/production',
  'maintainpro':     '/erp/maintainpro',
  'requestx':        '/erp/requestx',
  'frontdesk':       '/erp/frontdesk',
  'servicedesk':     '/erp/servicedesk',
  'logistics':    '/erp/logistics',
  'dispatch-hub':    '/erp/dispatch',
  'projx':           '/erp/projx',
  // ── Sprint T-Phase-1.3-DashboardLanes-Fix · 11 NEW IDs ──
  'engineeringx':    '/erp/engineeringx',
  'sitex':           '/erp/sitex',
  'store-hub':       '/erp/store-hub',
  'bill-passing':    '/erp/bill-passing',
  'supplyx':         '/erp/supplyx',
  'eximx':           '/erp/eximx',
  'docvault':        '/erp/docvault',
  'taskflow':        '/erp/taskflow',
  'unicomm':         '/erp/unicomm',
  'webstorex':       '/erp/webstorex',  // S152.T3 · S149 4th registration point missed · founder PV catch #4 (entry confirmed present; ceremony documented in src/lib/card-context-relay.ts CARD_BASE_ROUTES canonical mirror)
  'comply360':       '/erp/comply360',
  'vendor-portal':   '/erp/vendor-portal',
  'fpa-planning':    '/erp/fpa-planning',  // Sprint 116 · T-Phase-7.D.0.1 · Phase 7 opener · new card landing

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
  if (!base) {
    // S152.T3 · defensive: never navigate(undefined) silently — log + safe fallback.
    // eslint-disable-next-line no-console
    console.error(`[breadcrumb-memory] buildCardRoute: no CARD_BASE_ROUTES entry for cardId="${cardId}". 4-point registration ceremony (catalog + seed + role-default + route-map) violated.`);
    return '/';
  }
  const mod = recallModule(cardId);
  return mod ? `${base}#${mod}` : base;
}
