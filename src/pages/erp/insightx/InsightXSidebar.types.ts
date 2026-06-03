/**
 * @file        src/pages/erp/insightx/InsightXSidebar.types.ts
 * @purpose     InsightX sidebar module union
 * @sprint      Sprint 130 · S131 extended (cockpit/viewer) · S132 extended (lens-explorer/drill-to-root)
 */
export type InsightXModule =
  | 'ix-overview'
  | 'ix-cockpit'
  | 'ix-viewer'
  | 'ix-lens-explorer'
  | 'ix-drill-to-root'
  | 'ix-operix-score';
  // Reserved (added as D.3 sprints land):
  // | 'ix-insights-inbox' (S134)
  // | 'ix-predictive'     (S135)
