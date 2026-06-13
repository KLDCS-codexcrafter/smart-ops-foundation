/**
 * @file        no-page-direct-writes.test.ts
 * @sprint      W1C-5 · Block 4b · audit B9-F1 HIGH
 * @purpose     Grep-assert: ClientBlueprintsPage.tsx must contain ZERO
 *              localStorage.setItem('erp_group_vouchers'…) or ('erp_outstanding'…)
 *              page-direct writes. All such purges must route through
 *              purgeLegacyGroupStoresForEntity() in fincore-engine.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = resolve(__dirname, '../../pages/welcome/scenarios/ClientBlueprintsPage.tsx');

describe('W1C-5 · Block 4b · ClientBlueprintsPage page-direct writes (grep-assert)', () => {
  const src = readFileSync(FILE, 'utf8');

  it('contains ZERO setItem to erp_group_vouchers', () => {
    expect(/localStorage\.setItem\(\s*['"]erp_group_vouchers['"]/.test(src)).toBe(false);
  });

  it('contains ZERO setItem to erp_outstanding', () => {
    expect(/localStorage\.setItem\(\s*['"]erp_outstanding['"]/.test(src)).toBe(false);
  });

  it('imports purgeLegacyGroupStoresForEntity from fincore-engine', () => {
    expect(/purgeLegacyGroupStoresForEntity.*from\s+['"]@\/lib\/fincore-engine['"]/.test(src))
      .toBe(true);
  });
});
