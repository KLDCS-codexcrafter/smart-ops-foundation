/**
 * @file        src/pages/erp/sitex/SiteXSidebar.types.ts
 * @purpose     SiteXModule discriminated union · maps to sidebar moduleId values · 9 groups · Q-LOCK-10a
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Block C.3
 * @decisions   Q-LOCK-10a 9 groups · matches institutional EngineeringXSidebar.types pattern
 */

export type SiteXModule =
  // Welcome
  | 'welcome'
  // Site Setup & Master
  | 'site-list' | 'mobilize-site' | 'site-detail' | 'subcontractor-master' | 'local-vendor-submaster'
  // Daily Operations
  | 'dpr' | 'snag-register' | 'look-ahead-plan' | 'sop-compliance' | 'task-allocation'
  // Workforce & Safety
  | 'labour-roster' | 'attendance' | 'ppe-log' | 'toolbox-talks' | 'ptw' | 'jsa' | 'safety-incidents'
  // Materials & Stock
  | 'site-stock' | 'material-receipts' | 'material-issues' | 'returns-to-ho' | 'wastage-register'
  // Procurement & Site Finance
  | 'site-pr' | 'site-po' | 'imprest-receipt' | 'site-payments' | 'petty-cash' | 'site-reconciliation' | 'boq' | 'ra-bills'
  // Quality
  | 'site-inspections' | 'site-ncr' | 'pre-commissioning-tests' | 'drawing-currency-alerts'
  // Equipment
  | 'equipment-deployed' | 'equipment-log' | 'fuel-maintenance'
  // Logistics
  | 'site-inward-gate' | 'site-outward-gate' | 'vehicle-movement'
  // Closeout & Reports
  | 'customer-signoff' | 'commissioning-report' | 'servicedesk-handoff' | 'maintainpro-handoff'
  | 'asset-capitalization' | 'turnkey-checklist' | 'surplus-returns' | 'final-reconciliation'
  | 'close-certificate' | 'sitex-reports';
