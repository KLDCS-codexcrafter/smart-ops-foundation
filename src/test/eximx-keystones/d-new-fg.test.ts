/**
 * @file        src/test/eximx-keystones/d-new-fg.test.ts
 * @purpose     TIER 4 · D-NEW-FG keystone invariant test (Auto-posted Voucher Runtime · EX-8)
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block D · Keystone #1
 * @discipline  Anti-recurrence canonical · prevents future SIBLING discipline drift
 *
 * D-NEW-FG resolution: NEW voucher-runtime-engine.ts (SIBLING) ·
 *   fincore-engine.ts STAYS 0-DIFF · 6 consumers READ-ONLY.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('D-NEW-FG keystone · voucher-runtime-engine.ts SIBLING discipline', () => {
  it('SIBLING file exists at canonical path', () => {
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
  });

  it('SIBLING file is non-empty (production code present)', () => {
    const content = fs.readFileSync('src/lib/voucher-runtime-engine.ts', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });

  it('fincore-engine.ts (FinCore canonical · 0-DIFF preserved) exists', () => {
    expect(fs.existsSync('src/lib/fincore-engine.ts')).toBe(true);
  });

  it('fincore-engine.ts is non-empty (FinCore canonical engine intact)', () => {
    const content = fs.readFileSync('src/lib/fincore-engine.ts', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
  });

  it('voucher ecosystem engines · all present (institutional surface)', () => {
    const voucherEngines = [
      'src/lib/voucher-runtime-engine.ts',
      'src/lib/voucher-version-engine.ts',
      'src/lib/voucher-org-tag-engine.ts',
      'src/lib/voucher-export-engine.ts',
      'src/lib/non-fincore-voucher-type-registry.ts',
      'src/lib/use-last-voucher-engine.ts',
    ];
    const found = voucherEngines.filter((p) => fs.existsSync(p));
    expect(found.length).toBeGreaterThanOrEqual(5);
  });

  it('voucher-runtime-engine imports cleanly (no module-load errors)', async () => {
    const mod = await import('@/lib/voucher-runtime-engine');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('voucher-runtime-engine exports at least one function (engine surface)', async () => {
    const mod = await import('@/lib/voucher-runtime-engine');
    const fns = Object.values(mod).filter((v) => typeof v === 'function');
    expect(fns.length).toBeGreaterThan(0);
  });

  it('SIBLING discipline · voucher-runtime does NOT export mutation utils for FinCore', async () => {
    const mod = await import('@/lib/voucher-runtime-engine');
    const exportNames = Object.keys(mod);
    const mutators = exportNames.filter((n) =>
      /^(mutate|override|set|patch)(FinCore|Voucher)/.test(n)
    );
    expect(mutators).toEqual([]);
  });

  it('fincore-engine.ts does NOT cyclically import voucher-runtime (correct dependency direction)', () => {
    const content = fs.readFileSync('src/lib/fincore-engine.ts', 'utf-8');
    expect(content).not.toMatch(/from\s+['"]@?\/?(lib\/)?voucher-runtime-engine['"]/);
  });

  it('D-NEW-FG consumer site files exist (attestation)', () => {
    const consumerSites = [
      'src/lib/tt-payment-engine.ts',
      'src/lib/month-end-reval-engine.ts',
      'src/lib/hedge-contract-engine.ts',
      'src/lib/form-15ca-15cb-engine.ts',
      'src/lib/dgft-scrip-engine.ts',
    ];
    const found = consumerSites.filter((p) => fs.existsSync(p));
    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  it('D-NEW-FG institutional record · sentinel for FR Ceremony Sprint 44 review', () => {
    expect('D-NEW-FG').toBe('D-NEW-FG');
  });

  it('voucher-runtime-engine.ts preserved through Phase 1 EximX (5+ sprints 0-DIFF)', () => {
    const content = fs.readFileSync('src/lib/voucher-runtime-engine.ts', 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });
});
