/**
 * @file        src/features/master-visibility/classifyCell.ts
 * @purpose     Pure colour-state classifier extracted for testability + react-refresh.
 * @sprint      T-Phase-6.A.0.5 · Sprint 100 · Block 3
 */
export type HeatmapCellState = 'green' | 'yellow' | 'red';

/**
 * Heatmap colour logic — pure for testability.
 *  - red    : missing in target entity
 *  - yellow : present + a per-entity override exists for any field
 *  - green  : present and fully synced
 */
export function classifyCell(input: {
  present: boolean;
  hasOverride: boolean;
}): HeatmapCellState {
  if (!input.present) return 'red';
  if (input.hasOverride) return 'yellow';
  return 'green';
}
