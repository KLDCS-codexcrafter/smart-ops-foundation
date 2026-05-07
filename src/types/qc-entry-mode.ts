/**
 * @file     qc-entry-mode.ts
 * @sprint   T-Phase-1.3-3b-pre-2 · Block A · D-626
 * @purpose  QC Entry/Exit polymorphic types (Q53=a layout · Q54=a pass/fail).
 */

// Q53=a · 3 polymorphic QC entry layout modes
export type QCEntryLayoutMode = 'table' | 'grid' | 'wizard';

// Q54=a · 3 polymorphic Pass/Fail evaluation modes
export type PassFailMode = 'per_param_and' | 'weighted_score' | 'per_param_or';

export interface PassFailResult {
  overall: 'pass' | 'fail';
  mode: PassFailMode;
  reasons: string[];
  weighted_score?: number;
  failed_critical_params?: string[];
  failed_lines_count?: number;
  passed_lines_count?: number;
}
