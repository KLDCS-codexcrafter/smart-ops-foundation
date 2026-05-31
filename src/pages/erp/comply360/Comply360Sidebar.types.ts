/**
 * @file        src/pages/erp/comply360/Comply360Sidebar.types.ts
 * @purpose     Comply360 mega-menu module union · 24 mega-menus (Sprint 72: +tds, Option C ratified)
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 8 · DP-S72-1
 */
export type Comply360Module =
  | 'welcome'
  | 'home' | 'calendar' | 'companies' | 'tax-gst' | 'tds' | 'payroll' | 'payments'
  | 'challan-vault' | 'roc' | 'whistleblower' | 'fixed-assets' | 'internal-audit' | 'external-audit'
  | 'labour-codes' | 'posh' | 'gig-workers'   // 🆕 S86 v1 · Sector-Pack · Labour/HR section
  | 'sector-nbfc' | 'sector-sebi' | 'sector-rera' | 'sector-fema'  // 🆕 S87 · Sector-Pack regulatory
  | 'ai-control-center' | 'cfo-pitch-deck'    // 🆕 S87 · AI Control Center + CFO Deck OOB-3
  | 'exim' | 'vendor' | 'licenses' | 'esg' | 'legal' | 'finance-hub'
  | 'audit-framework'  // NEW · S80c · Statutory Audit Dashboard
  | 'rule-11g'         // NEW · S80f · MCA Rule 11(g) Auditor Report Generator
  | 'fire-safety' | 'industrial-safety'    // 🆕 S89 · Floor 5 OPENS · Fire Safety + Industrial Safety
  | 'environmental'                         // 🆕 S90 · Floor 5.2 · Environmental Compliance Pt 1
  | 'waste-management'                      // 🆕 S91 · Floor 5.3 · Waste Management (6 sub-regimes)
  | 'reports' | 'ai-center' | 'docs' | 'integrations' | 'workflow' | 'admin';
