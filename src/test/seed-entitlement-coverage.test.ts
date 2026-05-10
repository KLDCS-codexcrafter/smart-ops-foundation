/**
 * @file        src/test/seed-entitlement-coverage.test.ts
 * @sprint      T-Phase-1.A.13.T2 Demo Seed Coverage Hotfix · D-NEW-CT 17th canonical
 * @purpose     Invariant: every card_id referenced via `requiredCards` in any sidebar
 *              config MUST be present in seedDemoEntitlements(). Prevents future drift.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';

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

  it('A.13.T2 fix · 4 missing cards now in seed', () => {
    expect(seeded.has('store-hub')).toBe(true);
    expect(seeded.has('supplyx')).toBe(true);
    expect(seeded.has('docvault')).toBe(true);
    expect(seeded.has('engineeringx')).toBe(true);
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
});
