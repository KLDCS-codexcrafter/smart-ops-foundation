/**
 * @file        src/pages/erp/comply360/Comply360Sidebar.types.ts
 * @purpose     Comply360 mega-menu module union · 24 mega-menus (Sprint 72: +tds, Option C ratified)
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 8 · DP-S72-1
 */
export type Comply360Module =
  | 'welcome'
  | 'home' | 'calendar' | 'companies' | 'tax-gst' | 'tds' | 'payroll' | 'payments'
  | 'challan-vault' | 'roc' | 'fixed-assets' | 'internal-audit' | 'external-audit'
  | 'exim' | 'vendor' | 'licenses' | 'esg' | 'legal' | 'finance-hub'
  | 'audit-framework'  // NEW · S80c · Statutory Audit Dashboard
  | 'reports' | 'ai-center' | 'docs' | 'integrations' | 'workflow' | 'admin';
