/**
 * @file FAR-0 Theme 2 · 7-scenario FA depth smoke test · Lesson 19 ID-lookup only
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFAUniverse } from '@/lib/demo-seed-orchestrator';
import { faUnitsKey } from '@/types/fixed-asset';
import { faUniversalCategoriesKey } from '@/data/fa-universal-categories-seed-data';
import { SINHA_FA_IMPORTED_MACHINERY } from '@/data/sinha-fa-imported-machinery-seed-data';

const ENTITIES = ['ABDOS', 'CHRSE', 'BCPL', 'SMRTP', 'AMITH', 'SHKPH', 'SINHA'] as const;

beforeEach(() => {
  for (const e of ENTITIES) {
    localStorage.removeItem(faUnitsKey(e));
    localStorage.removeItem(faUniversalCategoriesKey(e));
  }
});

describe('FAR-0 Theme 2 · 7-entity FA depth via seedFAUniverse', () => {
  it('SINHA gets imported machinery records', () => {
    seedFAUniverse('SINHA');
    const stored = JSON.parse(localStorage.getItem(faUnitsKey('SINHA')) || '[]');
    expect(stored.length).toBe(SINHA_FA_IMPORTED_MACHINERY.length);
    expect(stored.find((u: { id: string }) => u.id === 'sinha-fa-im-001')).toBeDefined();
  });

  it('all 7 entities receive universal FA category catalog', () => {
    for (const e of ENTITIES) {
      seedFAUniverse(e);
      const cats = JSON.parse(localStorage.getItem(faUniversalCategoriesKey(e)) || '[]');
      expect(cats.length).toBeGreaterThan(0);
    }
  });
});
