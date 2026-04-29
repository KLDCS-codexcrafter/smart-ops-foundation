/**
 * ProjXSidebar.types.ts — Module union for ProjX card
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1
 */
export type ProjXModule =
  | 'welcome'
  | 't-project-entry'
  | 'm-project-centres'
  // Disabled placeholders (1.1.2-b will activate)
  | 't-milestone-tracker-disabled'
  | 't-resource-allocation-disabled'
  | 't-time-entry-disabled'
  | 't-invoice-scheduling-disabled'
  | 'r-project-pnl-disabled'
  | 'r-resource-utilization-disabled'
  | 'r-milestone-status-disabled'
  | 'r-project-margin-disabled';
