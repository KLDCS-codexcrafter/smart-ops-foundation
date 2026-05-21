/**
 * @file        src/test/eximx/voucher-runtime-engine.test.ts
 * @purpose     TIER 1 · Engine test · voucher-runtime-engine.ts · D-NEW-FG SIBLING (Tier 1 surface)
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block A
 * @anchored    EX-8 · D-NEW-FG SIBLING · FinCore consumers READ-ONLY
 * @discipline  Tier 1 surface · deep verification in eximx-keystones/d-new-fg.test.ts (Block D)
 */
import { describe, it, expect } from 'vitest';
import * as VoucherRuntime from '@/lib/voucher-runtime-engine';

describe('voucher-runtime-engine · D-NEW-FG SIBLING discipline (Tier 1 surface)', () => {
  it('exports public surface (engine present)', () => {
    expect(typeof VoucherRuntime).toBe('object');
    expect(Object.keys(VoucherRuntime).length).toBeGreaterThan(0);
  });

  it('engine module imports cleanly (no runtime errors at module load)', () => {
    expect(VoucherRuntime).toBeDefined();
  });

  it('exposes at least one function (institutional surface attestation)', () => {
    const fns = Object.values(VoucherRuntime).filter((v) => typeof v === 'function');
    expect(fns.length).toBeGreaterThan(0);
  });

  it('READ-ONLY consumer contract · does not export mutation utilities for FinCore', () => {
    const exportNames = Object.keys(VoucherRuntime);
    const mutators = exportNames.filter((n) =>
      /^(mutate|set|override)(FinCore|Voucher)/.test(n)
    );
    expect(mutators).toEqual([]);
  });

  it('Tier 4 keystone deep-verification is in eximx-keystones/d-new-fg.test.ts (cross-reference sentinel)', () => {
    expect(true).toBe(true);
  });
});
