/**
 * @file        src/pages/erp/insightx/InsightXSidebar.types.ts
 * @purpose     InsightX sidebar module union
 * @sprint      Sprint 130 · S131 (cockpit/viewer) · S132 (lens-explorer/drill-to-root)
 *              · S133 (operix-score) · S134 (insights-inbox)
 */
export type InsightXModule =
  | 'ix-overview'
  | 'ix-cockpit'
  | 'ix-viewer'
  | 'ix-lens-explorer'
  | 'ix-drill-to-root'
  | 'ix-operix-score'
  | 'ix-insights-inbox';
  // Reserved (added as D.3 sprints land):
  // | 'ix-predictive'     (S135)

