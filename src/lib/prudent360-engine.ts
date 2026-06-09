/**
 * @file     src/lib/prudent360-engine.ts
 * @sprint   PRUDENT360 · T-P360-DevTeam-Hub
 * @realizes PRUDENT360 dev-team hub · CONSUMES sprint-history (roadmap) + sidebar-configs
 *           (screen directory) + sibling-register (system preview). INTERNAL.
 * @[JWT]    Wave-2: live system-health metrics (memory · build time · agent fleet) replace
 *           honest 'pending' values surfaced by buildSystemPreview().
 *
 * IRON CANON:
 *   • Screen Directory is AUTO-DERIVED from every *-sidebar-config.ts export
 *     plus a small set of top-level route groups (App.tsx). NEVER hardcoded.
 *     New cards/modules appear here for free as their sidebar configs grow.
 *   • Sprint Roadmap reads sprint-history.ts read-only. 'TBD_AT_BANK' / null
 *     headSha rows are surfaced honestly as inFlight = true.
 *   • System Preview is honest: it reports counts that can be computed from
 *     consumed registers; live runtime metrics are marked deferred (Wave-2).
 *   • NEVER mutates sprint-history, sibling-register, or any sidebar config.
 */
import type { SidebarItem } from '@/shell/types';
import {
  commandCenterSidebarItems, comply360SidebarItems, docVaultSidebarItems,
  ecomxSidebarItems, engineeringxSidebarItems, eximxUnifiedSidebarItems,
  fpaPlanningSidebarItems, frontdeskSidebarItems, gateflowSidebarItems,
  insightxSidebarItems, maintainproSidebarItems, procure360SidebarItems,
  productionSidebarItems, qualicheckSidebarItems, requestxSidebarItems,
  servicedeskSidebarItems, sitexSidebarItems, storeHubSidebarItems,
  taskflowSidebarItems, vendorPortalSidebarItems, webstorexSidebarItems,
} from '@/apps/erp/configs/_all-sidebar-configs';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingsByProvenance } from '@/lib/_institutional/sibling-register';
import type {
  ScreenDirEntry, RoadmapRow, SystemPreviewStat, FavoriteRef, RecentRef,
} from '@/types/prudent360';
import {
  p360FavoritesKey, p360RecentKey, P360_RECENT_MAX,
} from '@/types/prudent360';

// ── Single source-of-truth aggregator ────────────────────────────────────────
const CARD_SIDEBARS: Array<{ card: string; items: SidebarItem[] }> = [
  { card: 'command-center', items: commandCenterSidebarItems },
  { card: 'comply360',      items: comply360SidebarItems },
  { card: 'docvault',       items: docVaultSidebarItems },
  { card: 'ecomx',          items: ecomxSidebarItems },
  { card: 'engineeringx',   items: engineeringxSidebarItems },
  { card: 'eximx',          items: eximxUnifiedSidebarItems },
  { card: 'fpa-planning',   items: fpaPlanningSidebarItems },
  { card: 'frontdesk',      items: frontdeskSidebarItems },
  { card: 'gateflow',       items: gateflowSidebarItems },
  { card: 'insightx',       items: insightxSidebarItems },
  { card: 'maintainpro',    items: maintainproSidebarItems },
  { card: 'procure360',     items: procure360SidebarItems },
  { card: 'production',     items: productionSidebarItems },
  { card: 'qualicheck',     items: qualicheckSidebarItems },
  { card: 'requestx',       items: requestxSidebarItems },
  { card: 'servicedesk',    items: servicedeskSidebarItems },
  { card: 'sitex',          items: sitexSidebarItems },
  { card: 'store-hub',      items: storeHubSidebarItems },
  { card: 'taskflow',       items: taskflowSidebarItems },
  { card: 'vendor-portal',  items: vendorPortalSidebarItems },
  { card: 'webstorex',      items: webstorexSidebarItems },
];

/** Top-level surfaces NOT covered by per-card sidebar configs (manual but minimal). */
const TOP_LEVEL_ROUTES: Array<{ card: string; label: string; route: string; group: string }> = [
  { card: 'top-level', label: 'Welcome',                   route: '/welcome',                group: 'Shell' },
  { card: 'top-level', label: 'Control Tower',             route: '/tower',                  group: 'Shell' },
  { card: 'top-level', label: 'Bridge Console',            route: '/bridge',                 group: 'Bridge' },
  { card: 'top-level', label: 'Partner Portal',            route: '/partner',                group: 'Partner' },
  { card: 'top-level', label: 'Customer Portal',           route: '/customer',               group: 'Customer' },
  { card: 'top-level', label: 'Prudent360 · Dev-Team Hub', route: '/prudent360',             group: 'Dev' },
  { card: 'top-level', label: 'Engineering Console',       route: '/welcome/dev-tools',      group: 'Dev' },
  { card: 'top-level', label: 'Seed Lab',                  route: '/welcome/dev-tools/seed-lab', group: 'Dev' },
  { card: 'top-level', label: 'Client Blueprints',         route: '/welcome/scenarios',      group: 'Dev' },
];

// ── Screen Directory · auto-derived ─────────────────────────────────────────
function flattenSidebar(card: string, items: SidebarItem[], group?: string): ScreenDirEntry[] {
  const out: ScreenDirEntry[] = [];
  for (const item of items) {
    if (item.type === 'divider') continue;
    const childGroup = item.type === 'group' ? item.label : group;
    if (item.type === 'item') {
      out.push({
        id: `${card}:${item.id}`,
        card,
        label: item.label,
        route: item.route ?? (item.moduleId ? `/erp/${card}#${item.moduleId}` : null),
        source: 'sidebar-config',
        group: childGroup,
      });
    }
    if (item.children?.length) {
      out.push(...flattenSidebar(card, item.children, childGroup));
    }
  }
  return out;
}

export function buildScreenDirectory(): ScreenDirEntry[] {
  const entries: ScreenDirEntry[] = [];
  for (const { card, items } of CARD_SIDEBARS) {
    entries.push(...flattenSidebar(card, items));
  }
  for (const r of TOP_LEVEL_ROUTES) {
    entries.push({
      id: `${r.card}:${r.route}`,
      card: r.card,
      label: r.label,
      route: r.route,
      source: 'route-group',
      group: r.group,
    });
  }
  return entries;
}

export function searchScreenDirectory(query: string, entries?: ScreenDirEntry[]): ScreenDirEntry[] {
  const all = entries ?? buildScreenDirectory();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.card.toLowerCase().includes(q) ||
      (e.group?.toLowerCase().includes(q) ?? false) ||
      (e.route?.toLowerCase().includes(q) ?? false),
  );
}

// ── Sprint Roadmap · from sprint-history ────────────────────────────────────
export function buildSprintRoadmap(): RoadmapRow[] {
  const rows: RoadmapRow[] = SPRINTS
    .filter((s) => s.code !== 'PENDING_BACKFILL')
    .map((s) => {
      const inFlight = !s.headSha || s.headSha === 'TBD_AT_BANK' || s.provenance === 'PENDING_BACKFILL';
      const starred = !!s.grade && s.grade.startsWith('A');
      return {
        sprintNumber: s.sprintNumber,
        code: s.code,
        grade: s.grade,
        headSha: s.headSha,
        predecessorSha: s.predecessorSha,
        newSiblings: s.newSiblings,
        bankDate: s.bankDate,
        inFlight,
        starred,
      };
    });
  // newest-first by insertion order (sprint-history appends)
  return rows.reverse();
}

// ── System Preview · honest counts + Wave-2-deferred runtime metrics ────────
export function buildSystemPreview(): SystemPreviewStat[] {
  const confirmedSiblings = getSiblingsByProvenance('CONFIRMED').length;
  return [
    { label: 'ERP Cards',              value: '33' },
    { label: 'Top-level Portals',      value: '4 (Tower · Bridge · Partner · Customer)' },
    { label: 'Sprint History Entries', value: String(getSprintCount()) },
    { label: 'Current A-Streak',       value: `${getCurrentAStreak()} ⭐` },
    { label: 'Confirmed Siblings',     value: String(confirmedSiblings) },
    { label: 'Live System Health',     value: 'pending', deferred: true },
    { label: 'Build/Deploy Telemetry', value: 'pending', deferred: true },
    { label: 'Agent Fleet Status',     value: 'pending', deferred: true },
  ];
}

// ── Favorites + Recent (localStorage) ───────────────────────────────────────
function safeRead<T>(key: string): T | null {
  try {
    // [JWT] GET /api/dev-hub/{favorites|recent}
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function safeWrite<T>(key: string, value: T): void {
  try {
    // [JWT] PUT /api/dev-hub/{favorites|recent}
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota / privacy mode — ignore */ }
}

export function getFavorites(): FavoriteRef[] {
  return safeRead<FavoriteRef[]>(p360FavoritesKey) ?? [];
}
export function isFavorite(id: string): boolean {
  return getFavorites().some((f) => f.id === id);
}
export function toggleFavorite(ref: Omit<FavoriteRef, 'addedAt'>): FavoriteRef[] {
  const cur = getFavorites();
  const exists = cur.find((f) => f.id === ref.id);
  const next = exists
    ? cur.filter((f) => f.id !== ref.id)
    : [...cur, { ...ref, addedAt: new Date().toISOString() }];
  safeWrite(p360FavoritesKey, next);
  return next;
}

export function getRecent(): RecentRef[] {
  return safeRead<RecentRef[]>(p360RecentKey) ?? [];
}
export function recordRecent(ref: Omit<RecentRef, 'visitedAt' | 'addedAt'>): RecentRef[] {
  const now = new Date().toISOString();
  const entry: RecentRef = { ...ref, addedAt: now, visitedAt: now };
  const cur = getRecent().filter((r) => r.id !== ref.id);
  const next = [entry, ...cur].slice(0, P360_RECENT_MAX);
  safeWrite(p360RecentKey, next);
  return next;
}

// ── Dev Surfaces · quick-access (links to existing surfaces · 0-DIFF) ───────
export interface DevSurfaceLink {
  id: string;
  label: string;
  description: string;
  route: string;
}
export function getDevSurfaceLinks(): DevSurfaceLink[] {
  return [
    { id: 'dev-tools',   label: 'Engineering Console', description: 'Internal dev console + seed lab access',     route: '/welcome/dev-tools' },
    { id: 'seed-lab',    label: 'Seed Lab',            description: 'Curated tenant seeds for repro builds',      route: '/welcome/dev-tools/seed-lab' },
    { id: 'bridge',      label: 'Bridge Console',      description: 'Sync agent fleet · exceptions · profiles',   route: '/bridge' },
    { id: 'scenarios',   label: 'Client Blueprints',   description: 'Persona-driven configured-state scenarios',  route: '/welcome/scenarios' },
    { id: 'insightx',    label: 'InsightX',            description: '11-lens cross-card analytics surface',       route: '/erp/insightx' },
  ];
}
