/**
 * @file     src/types/prudent360.ts
 * @sprint   PRUDENT360 · T-P360-DevTeam-Hub
 * @purpose  Dev-team hub types — Screen Directory · Sprint Roadmap · System Preview · Favorites.
 *           INTERNAL ONLY (behind app shell · no external auth).
 * @[JWT]    Wave-2: live system-health metrics replace honest 'pending' values.
 */

export interface ScreenDirEntry {
  /** Stable id (card-id + ':' + module/route id) */
  id: string;
  /** Card / source bucket (e.g. 'insightx', 'bridge', 'partner', 'top-level') */
  card: string;
  /** Display label (sidebar label or route slug) */
  label: string;
  /** Navigation target — route path or moduleId hash */
  route: string | null;
  /** Source the entry was derived from */
  source: 'sidebar-config' | 'route-group' | 'dev-surface';
  /** Optional grouping label (sidebar group, etc.) */
  group?: string;
}

export interface RoadmapRow {
  sprintNumber: number | string;
  code: string;
  grade: string | null;
  headSha: string | null;
  predecessorSha: string | null;
  newSiblings: string[];
  bankDate: string | null;
  /** true when headSha is null OR 'TBD_AT_BANK' or provenance is PENDING */
  inFlight: boolean;
  /** Honest indicator: 'A first-pass-clean' counts as star */
  starred: boolean;
}

export interface SystemPreviewStat {
  label: string;
  value: string;
  /** When true, the value is honestly deferred — render with Wave-2 note */
  deferred?: boolean;
}

export type P360Section =
  | 'screen-directory'
  | 'sprint-roadmap'
  | 'system-preview'
  | 'dev-surfaces'
  | 'docs';

export interface FavoriteRef {
  id: string;            // ScreenDirEntry.id
  label: string;
  route: string;
  addedAt: string;       // ISO
}

export interface RecentRef extends FavoriteRef {
  visitedAt: string;     // ISO
}

// ── Storage keys (per-user · global · no entity scoping needed for dev hub) ──
export const p360FavoritesKey = 'p360_favorites_v1';
export const p360RecentKey    = 'p360_recent_v1';
export const P360_RECENT_MAX  = 12;
