/**
 * @file     index.ts
 * @purpose  Barrel for report-framework UI (RPT-1a).
 * @sprint   RPT-1a
 */
export { ReportChart, type ReportChartProps } from './ChartLibrary';
export { TableChartToggle, type TableChartToggleProps, type TableChartColumn } from './TableChartToggle';
export { CHART_TYPE_COVERAGE, type ChartCoverageEntry } from './CHART_TYPE_COVERAGE';
export { ScorecardTile, type ScorecardTileProps } from './ScorecardTile';
export { RoleDashboard } from './RoleDashboard';
// RPT-9a · User Report Builder
export { default as ReportBuilder, type ReportBuilderProps } from './ReportBuilder';
// RPT-12a · Block 1 · Pivot matrix
export { PivotMatrix, type PivotMatrixProps } from './PivotMatrix';
export { buildPivotModel, type PivotModel } from './pivot-model';
