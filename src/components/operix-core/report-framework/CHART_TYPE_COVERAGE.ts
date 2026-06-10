/**
 * @file        CHART_TYPE_COVERAGE.ts
 * @purpose     Committed coverage map · one entry per ReportChartType · the contract.
 * @sprint      RPT-1a · AC#8
 */
import type { ReportChartType } from '@/lib/report-framework/chart-config';

export interface ChartCoverageEntry {
  strategy: 'native' | 'composed' | 'approximated';
  primitive: string;
}

export const CHART_TYPE_COVERAGE: Record<ReportChartType, ChartCoverageEntry> = {
  // Native recharts 2.15.4
  'column':         { strategy: 'native',       primitive: 'BarChart + Bar (vertical)' },
  'stacked-column': { strategy: 'native',       primitive: 'BarChart + Bar stackId="stack"' },
  'bar':            { strategy: 'native',       primitive: 'BarChart layout="vertical" + Bar' },
  'stacked-bar':    { strategy: 'native',       primitive: 'BarChart layout="vertical" + Bar stackId="stack"' },
  'line':           { strategy: 'native',       primitive: 'LineChart + Line type="linear"' },
  'area':           { strategy: 'native',       primitive: 'AreaChart + Area' },
  'pie':            { strategy: 'native',       primitive: 'PieChart + Pie (innerRadius=0)' },
  'doughnut':       { strategy: 'native',       primitive: 'PieChart + Pie (innerRadius>0)' },
  'funnel':         { strategy: 'native',       primitive: 'FunnelChart + Funnel' },
  // Composed (recharts-only · no new dep)
  'combo':          { strategy: 'composed',     primitive: 'ComposedChart + Bar/Line/Area mix' },
  // Approximated (recharts primitives configured to render the type)
  'spline':         { strategy: 'approximated', primitive: 'LineChart + Line type="monotone"' },
  'gauge':          { strategy: 'approximated', primitive: 'RadialBarChart half-circle (180°→0°)' },
  'bubble':         { strategy: 'approximated', primitive: 'ScatterChart + Scatter + ZAxis' },
  'range':          { strategy: 'approximated', primitive: 'AreaChart stackId="range" (low+delta)' },
  'pyramid':        { strategy: 'approximated', primitive: 'FunnelChart with data reversed' },
};
