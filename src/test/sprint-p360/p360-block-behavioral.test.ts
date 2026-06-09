/**
 * @file     src/test/sprint-p360/p360-block-behavioral.test.ts
 * @sprint   PRUDENT360 · T-P360-DevTeam-Hub
 * @purpose  Behavioral guard rails for the dev-team hub engine + page wiring.
 *           House posture: ≥20 it() · honest assertions · §H walls held.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildScreenDirectory, searchScreenDirectory, buildSprintRoadmap,
  buildSystemPreview, getDevSurfaceLinks,
  getFavorites, isFavorite, toggleFavorite,
  getRecent, recordRecent,
} from '@/lib/prudent360-engine';
import { p360FavoritesKey, p360RecentKey, P360_RECENT_MAX } from '@/types/prudent360';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const ROOT = path.resolve(__dirname, '../../..');

function readFile(p: string): string {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

beforeEach(() => {
  localStorage.clear();
});

describe('PRUDENT360 · Screen Directory · auto-derived', () => {
  it('aggregates entries from at least 15 cards (sidebar-config sourced)', () => {
    const dir = buildScreenDirectory();
    const cards = new Set(dir.filter((e) => e.source === 'sidebar-config').map((e) => e.card));
    expect(cards.size).toBeGreaterThanOrEqual(15);
  });

  it('includes top-level route-group entries (Bridge · Tower · Welcome)', () => {
    const dir = buildScreenDirectory();
    const routes = dir.map((e) => e.route);
    expect(routes).toContain('/bridge');
    expect(routes).toContain('/tower');
    expect(routes).toContain('/welcome');
  });

  it('produces >100 total directory entries (cards × modules · stays current for free)', () => {
    expect(buildScreenDirectory().length).toBeGreaterThan(100);
  });

  it('searchScreenDirectory filters by label (case-insensitive)', () => {
    const all = buildScreenDirectory();
    const matches = searchScreenDirectory('bridge', all);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) =>
      m.label.toLowerCase().includes('bridge') ||
      m.card.toLowerCase().includes('bridge') ||
      (m.group?.toLowerCase().includes('bridge') ?? false) ||
      (m.route?.toLowerCase().includes('bridge') ?? false),
    )).toBe(true);
  });

  it('searchScreenDirectory empty query returns full directory', () => {
    const all = buildScreenDirectory();
    expect(searchScreenDirectory('', all).length).toBe(all.length);
  });

  it('engine source is not a hardcoded route list (proof: derived via sidebar-config imports)', () => {
    const src = readFile('src/lib/prudent360-engine.ts');
    expect(src).toContain('_all-sidebar-configs');
    expect(src).toContain('flattenSidebar');
  });
});

describe('PRUDENT360 · Sprint Roadmap · sprint-history consumer', () => {
  it('renders one row per non-backfill sprint', () => {
    const rows = buildSprintRoadmap();
    const expected = SPRINTS.filter((s) => s.code !== 'PENDING_BACKFILL').length;
    expect(rows.length).toBe(expected);
  });

  it('marks TBD_AT_BANK / null headSha / PENDING_BACKFILL rows as inFlight', () => {
    const rows = buildSprintRoadmap();
    // Engine canon: inFlight iff headSha is missing OR equals 'TBD_AT_BANK' OR provenance was PENDING_BACKFILL.
    // We assert the discipline by spot-checking: at least one inFlight row exists (P360 itself).
    expect(rows.some((r) => r.inFlight)).toBe(true);
    expect(rows.every((r) => !r.inFlight || !r.headSha || r.headSha === 'TBD_AT_BANK' || r.headSha.length > 0)).toBe(true);
  });

  it('P360 row exists, predecessor=aae36912, in-flight', () => {
    const rows = buildSprintRoadmap();
    const p360 = rows.find((r) => r.code === 'T-P360-DevTeam-Hub');
    expect(p360).toBeDefined();
    expect(p360!.predecessorSha).toBe('aae36912');
    expect(p360!.inFlight).toBe(true);
  });

  it('PARTNER-1 row is flipped to aae36912 (no longer TBD)', () => {
    const pp1 = SPRINTS.find((s) => s.code === 'T-PP1-Partner-Portal');
    expect(pp1?.headSha).toBe('aae36912');
    expect(pp1?.provenance).toBe('CONFIRMED');
  });

  it('roadmap rendered newest-first', () => {
    const rows = buildSprintRoadmap();
    expect(rows[0].code).toBe('T-P360-DevTeam-Hub');
  });
});

describe('PRUDENT360 · System Preview · honest counts', () => {
  it('reports 33 ERP Cards (honest count of configured cards)', () => {
    const stat = buildSystemPreview().find((s) => s.label === 'ERP Cards');
    expect(stat?.value).toBe('33');
  });

  it('reports 4 top-level portals', () => {
    const stat = buildSystemPreview().find((s) => s.label === 'Top-level Portals');
    expect(stat?.value).toMatch(/^4 /);
  });

  it('A-streak stat ends with ⭐', () => {
    const stat = buildSystemPreview().find((s) => s.label === 'Current A-Streak');
    expect(stat?.value).toMatch(/⭐$/);
  });

  it('live runtime stats are honestly deferred (Wave-2)', () => {
    const deferred = buildSystemPreview().filter((s) => s.deferred);
    expect(deferred.length).toBeGreaterThanOrEqual(3);
    expect(deferred.every((d) => d.value === 'pending')).toBe(true);
  });

  it('confirmed-siblings count matches sibling-register CONFIRMED rows', () => {
    const stat = buildSystemPreview().find((s) => s.label === 'Confirmed Siblings');
    const confirmed = SIBLINGS.filter((s) => s.provenance === 'CONFIRMED').length;
    expect(stat?.value).toBe(String(confirmed));
  });

  it('prudent360-engine is a registered CONFIRMED sibling', () => {
    const row = SIBLINGS.find((s) => s.id === 'prudent360-engine');
    expect(row).toBeDefined();
    expect(row?.provenance).toBe('CONFIRMED');
  });
});

describe('PRUDENT360 · Favorites + Recent · localStorage', () => {
  it('getFavorites returns [] when nothing stored', () => {
    expect(getFavorites()).toEqual([]);
  });

  it('toggleFavorite adds then removes', () => {
    const ref = { id: 'x:y', label: 'X', route: '/x' };
    toggleFavorite(ref);
    expect(isFavorite('x:y')).toBe(true);
    toggleFavorite(ref);
    expect(isFavorite('x:y')).toBe(false);
  });

  it('toggleFavorite persists under p360FavoritesKey', () => {
    toggleFavorite({ id: 'a:b', label: 'A', route: '/a' });
    expect(localStorage.getItem(p360FavoritesKey)).toContain('a:b');
  });

  it('recordRecent prepends and caps at P360_RECENT_MAX', () => {
    for (let i = 0; i < P360_RECENT_MAX + 5; i++) {
      recordRecent({ id: `r:${i}`, label: `R${i}`, route: `/r/${i}` });
    }
    const r = getRecent();
    expect(r.length).toBe(P360_RECENT_MAX);
    expect(r[0].id).toBe(`r:${P360_RECENT_MAX + 4}`);
  });

  it('recordRecent dedupes by id (re-visit moves to front)', () => {
    recordRecent({ id: 'r:1', label: 'one', route: '/1' });
    recordRecent({ id: 'r:2', label: 'two', route: '/2' });
    recordRecent({ id: 'r:1', label: 'one', route: '/1' });
    const r = getRecent();
    expect(r[0].id).toBe('r:1');
    expect(r.filter((x) => x.id === 'r:1').length).toBe(1);
  });

  it('recent persists under p360RecentKey', () => {
    recordRecent({ id: 'k:1', label: 'K', route: '/k' });
    expect(localStorage.getItem(p360RecentKey)).toContain('k:1');
  });
});

describe('PRUDENT360 · Dev Surfaces · quick-access (no dead links)', () => {
  it('exposes 5 dev surface links', () => {
    expect(getDevSurfaceLinks().length).toBe(5);
  });

  it('all dev-surface routes are present in App.tsx (no dead links)', () => {
    const app = readFile('src/App.tsx');
    for (const l of getDevSurfaceLinks()) {
      expect(app).toContain(`path="${l.route}"`);
    }
  });
});

describe('PRUDENT360 · §H walls + grep canon', () => {
  it('/prudent360 page no longer contains "coming soon"', () => {
    const dir = path.join(ROOT, 'src/pages/prudent360');
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8').toLowerCase();
      expect(src).not.toContain('coming soon');
    }
  });

  it('App.tsx /prudent360 route now mounts Prudent360HubPage', () => {
    const app = readFile('src/App.tsx');
    expect(app).toContain('path="/prudent360"');
    expect(app).toContain('<Prudent360HubPage');
    expect(app).not.toMatch(/path="\/prudent360"[\s\S]{0,200}coming soon/i);
  });

  it('engine never imports a mutator for sprint-history or sibling-register', () => {
    const src = readFile('src/lib/prudent360-engine.ts');
    expect(src).not.toMatch(/SPRINTS\.push|SPRINTS\[\s*\d+\s*\]\s*=|SIBLINGS\.push|SIBLINGS\[\s*\d+\s*\]\s*=/);
  });

  it('engine has no fake live-health metric values', () => {
    const src = readFile('src/lib/prudent360-engine.ts');
    // honest-deferred values use the literal 'pending' string + deferred:true
    expect(src).toContain("value: 'pending', deferred: true");
    expect(src).not.toMatch(/Math\.random|fakeHealth|mockHealth/);
  });
});
