/**
 * @file        src/pages/erp/webstorex/WebStoreXSidebar.types.ts
 * @sprint      Sprint 149 (PIM/Catalog) · Sprint 150 (Commerce Engines · DP-WS-4/9/10/11/16/17/19.3)
 */
export type WebStoreXModule =
  // S149 · PIM
  | 'welcome'
  | 'catalog'
  | 'variants'
  | 'brands'
  | 'categories'
  | 'settings'
  // S150 · Commerce Engines
  | 'price-lists'
  | 'schemes'
  | 'loyalty'
  | 'vouchers'
  | 'campaigns'
  | 'testimonials'
  // Coming-soon panes
  | 'storefront-coming-soon'
  | 'visualizer-coming-soon';
