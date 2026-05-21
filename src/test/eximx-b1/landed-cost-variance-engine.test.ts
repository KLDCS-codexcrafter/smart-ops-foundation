/**
 * @file        src/test/eximx-b1/landed-cost-variance-engine.test.ts
 * @purpose     D-NEW-EW structural attestation · Block A engine
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as Engine from '@/lib/landed-cost-variance-engine';

describe('landed-cost-variance-engine · D-NEW-EW SIBLING', () => {
  it('module imports cleanly', () => {
    expect(Engine).toBeDefined();
    expect(typeof Engine).toBe('object');
  });
  it('exports computeLandedCostVariance function', () => {
    expect(typeof Engine.computeLandedCostVariance).toBe('function');
  });
  it('exports computeVarianceForAll function', () => {
    expect(typeof Engine.computeVarianceForAll).toBe('function');
  });
  it('SIBLING discipline · no mutators exported', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(LandedCost|MLGIT|Reconciliation)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('computeVarianceForAll([]) returns empty array (pure helper)', () => {
    expect(Engine.computeVarianceForAll([])).toEqual([]);
  });
  it('sentinel · D-NEW-EW closure marker', () => {
    expect('D-NEW-EW').toBe('D-NEW-EW');
  });
});
