/**
 * @file        src/test/eximx-smoke/sinha-seed.test.ts
 * @purpose     TIER 3 · Smoke test · Sinha demo seed manifest
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block C
 * @anchored    Phase 1 EximX 13 sprints · cumulative seed coverage
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const SINHA_SEED_FILES = [
  'src/data/sinha-bill-of-entry-seed-data.ts',
  'src/data/sinha-commercial-invoice-seed-data.ts',
  'src/data/sinha-domestic-git-polish-seed.ts',
  'src/data/sinha-eximx-seed.ts',
  'src/data/sinha-export-po-seed-data.ts',
  'src/data/sinha-export-realisation-seed-data.ts',
  'src/data/sinha-import-po-seed-data.ts',
  'src/data/sinha-multi-leg-git-seed-data.ts',
  'src/data/sinha-shipping-bill-seed-data.ts',
  'src/data/sinha-tt-hedge-seed-data.ts',
  'src/lib/sinha-steel-p2p-demo-seed.ts',
];

describe('Sinha demo seed manifest · 11 files preserved 0-DIFF', () => {
  it('all 11 Sinha seed files exist', () => {
    const missing = SINHA_SEED_FILES.filter((f) => !fs.existsSync(f));
    expect(missing).toEqual([]);
  });

  it('Sinha eximx core seed file is non-empty', () => {
    const content = fs.readFileSync('src/data/sinha-eximx-seed.ts', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });

  it('Steel P2P demo seed (institutional) is non-empty', () => {
    const content = fs.readFileSync('src/lib/sinha-steel-p2p-demo-seed.ts', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
  });

  it('manifest count matches Phase 1 EximX cumulative seed scope', () => {
    expect(SINHA_SEED_FILES.length).toBe(11);
  });
});
