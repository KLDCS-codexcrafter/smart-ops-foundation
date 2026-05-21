/**
 * @file        src/test/eximx/iec-lut-engine.test.ts
 * @purpose     TIER 1 · Combined engine test · iec-engine + lut-engine (EX-1 foundation)
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block A
 * @anchored    EX-1 · Moat #4 LUT-as-Workflow · IEC foundation
 */
import { describe, it, expect } from 'vitest';
import * as IEC from '@/lib/iec-engine';
import * as LUT from '@/lib/lut-engine';

describe('iec-engine · 18-field IEC Master', () => {
  it('exports engine surface', () => {
    expect(typeof IEC).toBe('object');
    expect(Object.keys(IEC).length).toBeGreaterThan(0);
  });

  it('module imports cleanly', () => {
    expect(IEC).toBeDefined();
  });

  it('has at least one function exported', () => {
    const fns = Object.values(IEC).filter((v) => typeof v === 'function');
    expect(fns.length).toBeGreaterThan(0);
  });
});

describe('lut-engine · 7-state LUT workflow', () => {
  it('exports engine surface', () => {
    expect(typeof LUT).toBe('object');
    expect(Object.keys(LUT).length).toBeGreaterThan(0);
  });

  it('module imports cleanly', () => {
    expect(LUT).toBeDefined();
  });
});
