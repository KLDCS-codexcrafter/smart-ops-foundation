/**
 * @file        src/lib/comply360-health-score-engine.test.ts
 * @purpose     Unit tests · DP-S69-5 module-weighted Compliance Health Score
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Remediation · Block 7
 * @disciplines FR-43 unit tests · FR-91 honest disclosure (Cycle-1 penalty-only regression test)
 */
import { describe, it, expect } from 'vitest';
import {
  COMPLIANCE_MODULE_WEIGHTS,
  computeWeightedComplianceHealth,
  computeModuleSubScore,
  computeComplianceHealth,
  normaliseObligation,
  bandFromScore,
  type FilingObligation,
} from './comply360-health-score-engine';

const ASOF = '2026-05-27';

function ob(partial: Partial<FilingObligation>): FilingObligation {
  return {
    id: partial.id ?? 'o1',
    label: partial.label ?? 'GSTR-3B Apr 2026',
    module: partial.module ?? 'tax-gst',
    due_date: partial.due_date ?? '2026-06-20',
    status: partial.status ?? 'pending',
    ...partial,
  };
}

describe('DP-S69-5 weights · sum to 1.0', () => {
  it('all module weights sum to exactly 1.0', () => {
    const sum = Object.values(COMPLIANCE_MODULE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 1000) / 1000).toBe(1);
  });
});

describe('bandFromScore thresholds', () => {
  it.each([
    [100, 'excellent'], [85, 'excellent'],
    [84, 'good'], [65, 'good'],
    [64, 'warning'], [40, 'warning'],
    [39, 'critical'], [0, 'critical'],
  ])('score %i → %s', (s, b) => {
    expect(bandFromScore(s)).toBe(b);
  });
});

describe('normaliseObligation · TDS detection inside tax-gst sidebar', () => {
  it('classifies TDS labels under tds module', () => {
    expect(normaliseObligation(ob({ module: 'tax-gst', label: 'TDS 26Q Q4' }))).toBe('tds');
  });
  it('keeps GST labels under tax-gst', () => {
    expect(normaliseObligation(ob({ module: 'tax-gst', label: 'GSTR-3B Apr 2026' }))).toBe('tax-gst');
  });
  it('maps roc/companies to mca-roc', () => {
    expect(normaliseObligation(ob({ module: 'roc', label: 'AOC-4' }))).toBe('mca-roc');
    expect(normaliseObligation(ob({ module: 'companies', label: 'MGT-7' }))).toBe('mca-roc');
  });
});

describe('computeModuleSubScore · empty module = 100', () => {
  it('returns raw_score 100 for module with no obligations', () => {
    const s = computeModuleSubScore([], 'tax-gst', ASOF);
    expect(s.raw_score).toBe(100);
    expect(s.weight).toBe(0.20);
    expect(s.weighted_contribution).toBe(20);
  });
});

describe('computeWeightedComplianceHealth · clean slate', () => {
  it('no obligations → total 100 / excellent', () => {
    const r = computeWeightedComplianceHealth([], ASOF);
    expect(r.total).toBe(100);
    expect(r.band).toBe('excellent');
    expect(r.modules.length).toBe(9);
  });
});

describe('computeWeightedComplianceHealth · weighted penalty propagation', () => {
  it('one overdue GST obligation reduces total proportional to GST weight', () => {
    const obligations: FilingObligation[] = [
      ob({ id: 'g1', module: 'tax-gst', status: 'overdue', due_date: '2026-04-20' }),
    ];
    const r = computeWeightedComplianceHealth(obligations, ASOF);
    // GST raw = 100 - 6 = 94 ; other modules = 100
    // total = 94*0.20 + 100*0.80 = 18.8 + 80 = 98.8 → round 99
    expect(r.total).toBe(99);
    const gst = r.modules.find((m) => m.module === 'tax-gst')!;
    expect(gst.raw_score).toBe(94);
  });

  it('breach in ROC dominates ROC sub-score', () => {
    const r = computeWeightedComplianceHealth(
      [ob({ id: 'r1', module: 'roc', label: 'AOC-4', status: 'breach', due_date: '2026-01-30' })],
      ASOF,
    );
    const roc = r.modules.find((m) => m.module === 'mca-roc')!;
    expect(roc.raw_score).toBe(88); // 100 - 12
  });
});

describe('computeComplianceHealth shim · total mirrors weighted total', () => {
  it('legacy shape returns weighted total in .total', () => {
    const obligations = [
      ob({ id: 'g1', module: 'tax-gst', status: 'overdue', due_date: '2026-04-20' }),
    ];
    const legacy = computeComplianceHealth(obligations, ASOF);
    const weighted = computeWeightedComplianceHealth(obligations, ASOF);
    expect(legacy.total).toBe(weighted.total);
    expect(legacy.band).toBe(weighted.band);
    expect(legacy.counts.overdue).toBe(1);
  });
});
