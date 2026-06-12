/**
 * @file dsc-card-id-integrity.test.ts
 * @fix  T1 · DSC Card-Id Drift · permanent join-integrity guard
 * @why  Builder mounts join on entitlement CardId. Drift between DSC `card`
 *       and the CardId union produces a ZERO-source preview (the bug this
 *       fix resolves for Inventory + Logistic). Locked forever.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listSources, listSourcesByCard } from '../data-source-catalog';
import '../data-sources';

// Extract the CardId union directly from card-entitlement.ts source — keeps
// this test honest as new ids land without re-editing the test.
function loadCardIdUnion(): Set<string> {
  const src = readFileSync(
    join(process.cwd(), 'src/types/card-entitlement.ts'),
    'utf8',
  );
  const match = src.match(/export type CardId\s*=([\s\S]*?);/);
  if (!match) throw new Error('CardId union not found in card-entitlement.ts');
  const ids = Array.from(match[1].matchAll(/'([a-z0-9-]+)'/g)).map((m) => m[1]);
  expect(ids.length).toBeGreaterThan(10);
  return new Set(ids);
}

describe('DSC ↔ CardId join integrity (T1 drift lock)', () => {
  const cardIds = loadCardIdUnion();
  // Cross-card aggregate sources legitimately use the 'xc' sentinel.
  const allowed = new Set<string>([...cardIds, 'xc']);

  it('every DSC source.card is in the entitlement CardId union (or xc)', () => {
    const sources = listSources();
    expect(sources.length).toBeGreaterThan(0);
    const offenders = sources
      .filter((s) => !allowed.has(s.card))
      .map((s) => `${s.id} → ${s.card}`);
    expect(offenders, `DSC card drift: ${offenders.join(', ')}`).toEqual([]);
  });

  it('inventory-hub resolves ≥ 2 sources after fix', () => {
    expect(listSourcesByCard('inventory-hub').length).toBeGreaterThanOrEqual(2);
  });

  it('logistics resolves ≥ 1 source after fix', () => {
    expect(listSourcesByCard('logistics').length).toBeGreaterThanOrEqual(1);
  });

  it('dispatch-hub resolves ≥ 1 source (pre-9e mount readiness)', () => {
    expect(listSourcesByCard('dispatch-hub').length).toBeGreaterThanOrEqual(1);
  });

  it('peoplepay resolves ≥ 1 source (pre-9e mount readiness)', () => {
    expect(listSourcesByCard('peoplepay').length).toBeGreaterThanOrEqual(1);
  });

  it('legacy directory-style keys list zero sources (drift cannot recur silently)', () => {
    expect(listSourcesByCard('inventory')).toHaveLength(0);
    expect(listSourcesByCard('logistic')).toHaveLength(0);
    expect(listSourcesByCard('dispatch')).toHaveLength(0);
    expect(listSourcesByCard('pay-hub')).toHaveLength(0);
  });
});
