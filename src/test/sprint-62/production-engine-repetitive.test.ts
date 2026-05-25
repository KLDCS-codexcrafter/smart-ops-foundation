import { describe, it, expect } from 'vitest';
import {
  computeOEETotal,
  computeLineEfficiency,
  buildRepetitiveLineMetricsShell,
} from '@/lib/production-engine';

describe('Sprint 62 · production-engine repetitive helpers', () => {
  it('computeOEETotal multiplies 3 components / 10000', () => {
    expect(computeOEETotal(90, 80, 95)).toBe(Math.round((90 * 80 * 95) / 10000));
  });

  it('computeOEETotal returns null on null input', () => {
    expect(computeOEETotal(null, 80, 95)).toBeNull();
  });

  it('computeLineEfficiency ratio', () => {
    expect(computeLineEfficiency(60, 80)).toBe(75);
    expect(computeLineEfficiency(60, 0)).toBeNull();
  });

  it('buildRepetitiveLineMetricsShell defaults', () => {
    const s = buildRepetitiveLineMetricsShell('L1', 1000);
    expect(s.line_id).toBe('L1');
    expect(s.units_target_this_run).toBe(1000);
    expect(s.units_produced_this_run).toBe(0);
    expect(s.oee_total).toBeNull();
  });
});
