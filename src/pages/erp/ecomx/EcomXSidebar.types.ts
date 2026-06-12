/**
 * @file   src/pages/erp/ecomx/EcomXSidebar.types.ts
 * @sprint Sprint 153/154 · EcomX
 */
export type EcomXModule =
  | 'welcome'
  | 'dashboard'
  | 'cockpit'
  | 'marketplaces'
  | 'listings'
  | 'unmapped'
  | 'import-center'
  | 'orders'
  | 'settlements'
  | 'reconciliation'
  | 'claims'
  | 'returns'
  | 'allocation'
  // RPT-9d · User Report Builder · embedded mount
  | 'ecomx-rpt-report-builder';
