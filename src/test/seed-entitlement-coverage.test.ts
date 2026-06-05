/**
 * @file        src/test/seed-entitlement-coverage.test.ts
 * @sprint      T-Phase-1.A.13.T2 Demo Seed Coverage Hotfix · D-NEW-CT 17th canonical
 * @purpose     Invariant: every card_id referenced via `requiredCards` in any sidebar
 *              config MUST be present in seedDemoEntitlements(). Prevents future drift.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
import { buildCardRoute } from '@/lib/breadcrumb-memory';
import type { CardId } from '@/types/card-entitlement';

const CONFIG_DIR = 'src/apps/erp/configs';

function getSidebarConfigFiles(): string[] {
  if (!existsSync(CONFIG_DIR)) return [];
  return readdirSync(CONFIG_DIR).filter((f) => f.endsWith('-sidebar-config.ts'));
}

function extractRequiredCards(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf8');
  const matches = content.matchAll(/requiredCards:\s*\[\s*'([^']+)'/g);
  return new Set([...matches].map((m) => m[1]));
}

describe('A.13.T2 · Demo Seed Coverage Invariant · D-NEW-CT 17th canonical', () => {
  const seeded = new Set(
    seedDemoEntitlements('test-tenant').map((e) => e.card_id as string),
  );
  const sidebarConfigs = getSidebarConfigFiles();

  it('seedDemoEntitlements returns at least 18 cards (institutional baseline)', () => {
    expect(seeded.size).toBeGreaterThanOrEqual(18);
  });

  it('A.13.T2 fix · 3 missing cards now in seed (supplyx γ-DELETED at D14-HK)', () => {
    expect(seeded.has('store-hub')).toBe(true);
    expect(seeded.has('docvault')).toBe(true);
    expect(seeded.has('engineeringx')).toBe(true);
  });

  it('A.14 · sitex in seed (Q-LOCK-13a · D-NEW-CT 17th canonical extension · 10th Shell-pattern card)', () => {
    expect(seeded.has('sitex')).toBe(true);
  });

  it('A.15a · sitex status is ACTIVE not LOCKED (Q-LOCK-16a status flip · MOAT #22 banks)', () => {
    const sitexEntitlement = seedDemoEntitlements('test-tenant').find((e) => e.card_id === 'sitex');
    expect(sitexEntitlement?.status).toBe('active');
  });

  it('C.2.T1 · servicedesk status is ACTIVE not LOCKED (status flip · MOAT #24 banks · 2-step ceremony enforced)', () => {
    const sd = seedDemoEntitlements('test-tenant').find((e) => e.card_id === 'servicedesk');
    expect(sd?.status).toBe('active');
  });

  for (const file of sidebarConfigs) {
    it(`${file} · all requiredCards must be in seedDemoEntitlements`, () => {
      const required = extractRequiredCards(`${CONFIG_DIR}/${file}`);
      const missing = [...required].filter((c) => !seeded.has(c));
      expect(
        missing,
        `Cards required by ${file} but missing from seed: ${missing.join(', ')}. Add to seedDemoEntitlements() in src/lib/card-entitlement-engine.ts`,
      ).toEqual([]);
    });
  }

  it('A.15b.T1 · self-healing migration covers every seeded card_id (D-NEW-CT extension · structural anti-recurrence)', () => {
    // Static-analysis invariant: the migration logic in useCardEntitlement.ts
    // MUST derive expected card_ids from seedDemoEntitlements() · not a static
    // literal array. This prevents the recurring sidebar invisibility bug
    // that fired at A.14 (sitex absent from A13T2_REQUIRED static list).
    const hookSource = readFileSync('src/hooks/useCardEntitlement.ts', 'utf-8');
    expect(hookSource).toMatch(/expectedFromSeed\s*=\s*seedDemoEntitlements/);
    expect(hookSource).not.toMatch(/A13T2_REQUIRED\s*:\s*CardId\[\]\s*=/);
  });
});

// ─── S152.T2 · active-card⇒seed invariant (replaces requiredCards blindness) ───
// S146.T2 abolished per-item requiredCards; A.13.T2 invariant derived expectations
// from requiredCards and was therefore blind to all post-T2 cards (webstorex caught
// this at founder PV). New invariant parses applications.ts directly: every entry
// with status:'active' MUST be present in seedDemoEntitlements (minus an explicit,
// documented exception list — empty today).

const APPLICATIONS_FILE = 'src/components/operix-core/applications.ts';

/** Cards that are intentionally NOT in the demo seed. MUST be documented. */
const SEED_EXEMPT_ACTIVE_CARDS: ReadonlySet<string> = new Set<string>([
  // (empty today — every active card_id must seed)
]);

function extractActiveCardIdsFromApplications(source: string): Set<string> {
  // Match object literals of shape { id: '...', ..., status: 'active', ... }
  const blockRe = /\{\s*id:\s*'([^']+)'[\s\S]*?status:\s*'([^']+)'/g;
  const out = new Set<string>();
  for (const m of source.matchAll(blockRe)) {
    if (m[2] === 'active') out.add(m[1]);
  }
  return out;
}

describe('S152.T2 · Active-card ⇒ seed invariant (enumerate-or-fail · founder-PV credit)', () => {
  const seeded = new Set(
    seedDemoEntitlements('test-tenant').map((e) => e.card_id as string),
  );
  const appsSource = readFileSync(APPLICATIONS_FILE, 'utf-8');
  const activeIds = extractActiveCardIdsFromApplications(appsSource);

  it('S152.T2 · webstorex present in seedDemoEntitlements (S149 3-step ceremony gap repaired)', () => {
    expect(seeded.has('webstorex')).toBe(true);
  });

  it('S152.T2 · every active card in applications.ts is present in seedDemoEntitlements (minus documented exemptions)', () => {
    expect(activeIds.size).toBeGreaterThan(0); // sanity: parser found something
    const missing = [...activeIds]
      .filter((c) => !SEED_EXEMPT_ACTIVE_CARDS.has(c))
      .filter((c) => !seeded.has(c));
    expect(
      missing,
      `Active cards in applications.ts but missing from seedDemoEntitlements: ${missing.join(', ')}. Either add to seedDemoEntitlements() OR add to SEED_EXEMPT_ACTIVE_CARDS with documented reason.`,
    ).toEqual([]);
  });

  it('S152.T2 · negative-control · invariant FAILS when a synthetic active card is absent from seed', () => {
    // Synthesize an active-card source missing from the seed to prove the
    // invariant has teeth (not vacuously true). Uses the same parser the
    // real invariant uses.
    const synthetic = `
      export const applications = [
        { id: 'synthetic-not-in-seed', name: 'X', description: 'x',
          category: 'Ops Hub', route: '/x', icon: 'X', status: 'active' },
      ];
    `;
    const syntheticActive = extractActiveCardIdsFromApplications(synthetic);
    expect(syntheticActive.has('synthetic-not-in-seed')).toBe(true);
    const missing = [...syntheticActive].filter((c) => !seeded.has(c));
    expect(missing).toEqual(['synthetic-not-in-seed']);
  });
});

// ─── S152.T3 · 4-point registration ceremony invariant (canonical) ──────────
// The 4 registration points for any active card are: (1) applications.ts catalog,
// (2) seedDemoEntitlements, (3) ROLE_DEFAULT_CARDS, (4) CARD_BASE_ROUTES route map.
// CardTile → buildCardRoute() → CARD_BASE_ROUTES; a missing entry resolved to
// undefined → navigate(undefined) silent no-op (founder PV catch #4 on webstorex).
// This invariant closes point #4 mechanically.

describe('S152.T3 · 4-point ceremony · buildCardRoute coverage (founder-PV catch #4)', () => {
  const appsSource = readFileSync(APPLICATIONS_FILE, 'utf-8');
  const activeIds = extractActiveCardIdsFromApplications(appsSource);

  it('S152.T3 · buildCardRoute("webstorex") returns "/erp/webstorex"', () => {
    expect(buildCardRoute('webstorex' as CardId)).toBe('/erp/webstorex');
  });

  it('S152.T3 · every active card in applications.ts resolves to a defined, non-empty route starting with "/"', () => {
    expect(activeIds.size).toBeGreaterThan(0);
    const broken: string[] = [];
    for (const id of activeIds) {
      const route = buildCardRoute(id as CardId);
      if (!route || typeof route !== 'string' || !route.startsWith('/') || route === '/') {
        broken.push(`${id}→${String(route)}`);
      }
    }
    expect(
      broken,
      `Active cards with no CARD_BASE_ROUTES entry (point #4 of the 4-point ceremony missed): ${broken.join(', ')}. Add to CARD_BASE_ROUTES in src/lib/breadcrumb-memory.ts.`,
    ).toEqual([]);
  });
});

