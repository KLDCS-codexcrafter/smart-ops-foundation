/**
 * Procure360Sidebar.types.ts
 * Sprint T-Phase-1.2.6f-a
 */
export type Procure360Module =
  | 'welcome'
  | 'enquiry-entry' | 'enquiry-list'
  | 'rfq-list'
  | 'quotation-comparison'
  | 'award-history'
  | 'rfq-register-report' | 'pending-rfq-report' | 'comparison-report'
  | 'award-history-report' | 'vendor-perf-report' | 'best-price-report'
  | 'spend-by-vendor-report'
  | 'rfq-followup-register-report'
  | 'cross-dept-procurement-handoff'
  | 'vendor-scoring-dashboard'
  // Sprint T-Phase-1.2.6f-c-1 · Block G · 5 NEW
  | 'po-list'
  | 'po-followup-register'
  | 'git-in-transit'
  | 'git-received'
  | 'aged-git-procure';
