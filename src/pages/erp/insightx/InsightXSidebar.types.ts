/**
 * @file        src/pages/erp/insightx/InsightXSidebar.types.ts
 * @purpose     InsightX sidebar module union · mirrors Comply360Sidebar.types / FpaPlanningSidebar.types
 * @sprint      Sprint 130 · S131 extends with ix-cockpit + ix-viewer
 */
export type InsightXModule =
  | 'ix-overview'
  | 'ix-cockpit'
  | 'ix-viewer';
  // Reserved (added as D.3 sprints land):
  // | 'ix-drill-to-root'  (S132)
  // | 'ix-operix-score'   (S133)
  // | 'ix-insights-inbox' (S134)
  // | 'ix-predictive'     (S135)
