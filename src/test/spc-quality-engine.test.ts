import { describe, it, expect } from 'vitest';
import { buildSPCChart, analyzeSPC, computeCpk, computeCp } from '@/lib/spc-quality-engine';
import type { SPCChartConfig, SPCDataPoint } from '@/types/spc';

describe('spc-quality-engine · Sprint 60 PROD-3.5 ST6', () => {
  const config: SPCChartConfig = {
    parameter: 'temperature',
    upper_control_limit: 110, lower_control_limit: 90,
    upper_spec_limit: 115, lower_spec_limit: 85,
    target: 100, sample_size: 1, rule_set: 'nelson',
  };

  it('buildSPCChart computes mean and std_dev', () => {
    const data: SPCDataPoint[] = [98, 100, 102, 99, 101].map(v => ({
      parameter: 'temperature', value: v, timestamp: new Date().toISOString(),
    }));
    const chart = buildSPCChart(config, data);
    expect(chart.mean).toBe(100);
    expect(chart.std_dev).toBeGreaterThan(0);
  });

  it('computeCpk returns finite value for normal data', () => {
    const cpk = computeCpk([98, 100, 102, 99, 101], 85, 115);
    expect(cpk).toBeGreaterThan(0);
    expect(Number.isFinite(cpk)).toBe(true);
  });

  it('computeCp returns capability index', () => {
    const cp = computeCp([98, 100, 102, 99, 101], 85, 115);
    expect(cp).toBeGreaterThan(0);
  });

  it('analyzeSPC detects critical violation (Nelson 1)', () => {
    // Need enough points so a single outlier exceeds 3σ. With 11 points at 100 + 1 at 500:
    // mean ≈ 133.3 · std ≈ 110.6 · 3σ ≈ 331.8 · outlier diff = 366.7 → triggers Nelson 1
    const values = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 500];
    const data: SPCDataPoint[] = values.map(v => ({
      parameter: 'temperature', value: v, timestamp: new Date().toISOString(),
    }));
    const chart = buildSPCChart(config, data);
    const result = analyzeSPC(chart);
    const nelsonViolation = result.violations.find(v => v.rule_id === 'nelson_1');
    expect(nelsonViolation).toBeDefined();
  });
});
