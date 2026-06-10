/**
 * @file        coverage-map.test.ts
 * @purpose     CHART_TYPE_COVERAGE includes all 15 ReportChartType keys.
 * @sprint      RPT-1a · AC#8
 */
import { describe, it, expect } from 'vitest';
import { CHART_TYPE_COVERAGE } from '@/components/operix-core/report-framework/CHART_TYPE_COVERAGE';
import type { ReportChartType } from '@/lib/report-framework/chart-config';

const ALL_TYPES: ReportChartType[] = [
  'column', 'stacked-column', 'bar', 'stacked-bar',
  'line', 'spline', 'area',
  'pie', 'doughnut', 'gauge',
  'bubble', 'range', 'funnel', 'pyramid', 'combo',
];

describe('RPT-1a · CHART_TYPE_COVERAGE', () => {
  it('has exactly 15 entries', () => {
    expect(Object.keys(CHART_TYPE_COVERAGE)).toHaveLength(15);
  });

  it('contains an entry for every ReportChartType', () => {
    for (const t of ALL_TYPES) {
      expect(CHART_TYPE_COVERAGE[t]).toBeDefined();
      expect(CHART_TYPE_COVERAGE[t].primitive.length).toBeGreaterThan(0);
      expect(['native', 'composed', 'approximated']).toContain(CHART_TYPE_COVERAGE[t].strategy);
    }
  });

  it('every primitive description is non-empty', () => {
    for (const v of Object.values(CHART_TYPE_COVERAGE)) {
      expect(v.primitive.trim().length).toBeGreaterThan(3);
    }
  });
});
