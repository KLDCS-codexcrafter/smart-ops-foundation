/**
 * @file        src/test/eximx/cth-history-engine.test.ts
 * @purpose     TIER 1 · Engine test · cth-history-engine.ts
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block A · Tier 1
 * @anchored    EX-2 · #8
 * @discipline  PURE TEST · 0 production code change · structural attestation
 */
import { describe, it, expect } from 'vitest';
import * as Engine from '@/lib/cth-history-engine';

describe('cth-history-engine · CTH × Country × Date', () => {
  it('module imports cleanly (no runtime errors at load)', () => {
    expect(Engine).toBeDefined();
    expect(typeof Engine).toBe('object');
  });

  it('exports public surface (Object.keys non-empty)', () => {
    expect(Object.keys(Engine).length).toBeGreaterThan(0);
  });

  it('exports at least one function (engine surface attestation)', () => {
    const fns = Object.values(Engine).filter((v) => typeof v === 'function');
    expect(fns.length).toBeGreaterThan(0);
  });

  it('SIBLING discipline · does NOT export mutation utilities for canonical line types', () => {
    const exportNames = Object.keys(Engine);
    const mutators = exportNames.filter((n) =>
      /^(mutate|override|set)(BoELine|CILine|ImportPOLine|ExportPOLine|ShippingBillLine)/.test(n)
    );
    expect(mutators).toEqual([]);
  });
});
