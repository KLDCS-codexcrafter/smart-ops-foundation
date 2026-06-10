/**
 * @file        chart-config.ts
 * @purpose     Universal chart configuration model for the report-framework.
 *              Drives the 15-type ChartLibrary (RPT-1a) — pure data, no React.
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @who         Operix Reporting
 * @when        Jun-2026
 * @decisions   D-RPT-1 (single ReportChartConfig contract for all 33 cards)
 * @[JWT]       N/A — pure configuration
 */

export type ReportChartType =
  | 'column'
  | 'stacked-column'
  | 'bar'
  | 'stacked-bar'
  | 'line'
  | 'spline'
  | 'area'
  | 'pie'
  | 'doughnut'
  | 'gauge'
  | 'bubble'
  | 'range'
  | 'funnel'
  | 'pyramid'
  | 'combo';

export interface ReportChartSeries {
  key: string;
  label: string;
  color?: string;
  /** combo only: render this series as a 'line' or 'bar' (default 'bar') */
  renderAs?: 'bar' | 'line' | 'area';
}

export interface ReportChartThresholdBand {
  value: number;
  color: string;
  label?: string;
}

export interface ReportChartConfig {
  chartType: ReportChartType;
  xKey: string;
  series: ReportChartSeries[];
  title?: string;
  palette?: string[];
  legend?: boolean;
  showLabels?: boolean;
  thresholdBands?: ReportChartThresholdBand[];
}

/** Operix default palette · HSL tokens-friendly hex set (dark-mode safe). */
export const DEFAULT_PALETTE: string[] = [
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#eab308', // yellow
];

export interface DefaultChartConfigInput {
  chartType?: ReportChartType;
  xKey: string;
  series: ReportChartSeries[];
  title?: string;
  palette?: string[];
  legend?: boolean;
  showLabels?: boolean;
  thresholdBands?: ReportChartThresholdBand[];
}

export function defaultChartConfig(partial: DefaultChartConfigInput): ReportChartConfig {
  return {
    chartType: partial.chartType ?? 'column',
    xKey: partial.xKey,
    series: partial.series,
    title: partial.title,
    palette: partial.palette ?? DEFAULT_PALETTE,
    legend: partial.legend ?? true,
    showLabels: partial.showLabels ?? false,
    thresholdBands: partial.thresholdBands,
  };
}
