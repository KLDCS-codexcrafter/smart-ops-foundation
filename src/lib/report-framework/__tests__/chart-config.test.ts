/**
 * @file        chart-config.test.ts
 * @purpose     Verify chart-config defaults + ReportChartType union completeness.
 * @sprint      RPT-1a
 */
import { describe, it, expect } from 'vitest';
import {
  defaultChartConfig,
  DEFAULT_PALETTE,
  type ReportChartType,
  type ReportChartConfig,
} from '../chart-config';

describe('RPT-1a · chart-config', () => {
  it('fills sane defaults when only required fields supplied', () => {
    const cfg = defaultChartConfig({ xKey: 'month', series: [{ key: 'rev', label: 'Revenue' }] });
    expect(cfg.chartType).toBe('column');
    expect(cfg.legend).toBe(true);
    expect(cfg.showLabels).toBe(false);
    expect(cfg.palette).toEqual(DEFAULT_PALETTE);
    expect(cfg.xKey).toBe('month');
    expect(cfg.series).toHaveLength(1);
  });

  it('preserves user overrides', () => {
    const cfg = defaultChartConfig({
      chartType: 'stacked-column',
      xKey: 'party',
      series: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }],
      legend: false,
      showLabels: true,
      palette: ['#000', '#fff'],
      title: 'X',
    });
    expect(cfg.chartType).toBe('stacked-column');
    expect(cfg.legend).toBe(false);
    expect(cfg.showLabels).toBe(true);
    expect(cfg.palette).toEqual(['#000', '#fff']);
    expect(cfg.title).toBe('X');
  });

  it('ReportChartType union covers all 15 documented types', () => {
    const all: ReportChartType[] = [
      'column', 'stacked-column', 'bar', 'stacked-bar',
      'line', 'spline', 'area',
      'pie', 'doughnut', 'gauge',
      'bubble', 'range', 'funnel', 'pyramid', 'combo',
    ];
    expect(all).toHaveLength(15);
    expect(new Set(all).size).toBe(15);
  });

  it('ReportChartConfig accepts thresholdBands', () => {
    const cfg: ReportChartConfig = defaultChartConfig({
      xKey: 'x',
      series: [{ key: 'y', label: 'Y' }],
      thresholdBands: [{ value: 100, color: '#f00', label: 'red' }],
    });
    expect(cfg.thresholdBands).toHaveLength(1);
    expect(cfg.thresholdBands?.[0].value).toBe(100);
  });
});
