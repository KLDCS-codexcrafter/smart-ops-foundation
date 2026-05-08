/**
 * Procure360Sidebar.types.ts
 * @sprint   T-Phase-1.A.3.a-Procure360-Shell-Migration (was Shell Day 1 · types union now consumed by config-driven Shell)
 * @decisions D-250 · D-NEW-AC · D-NEW-AD
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
  | 'po-list'
  | 'po-followup-register'
  | 'git-in-transit'
  | 'git-received'
  | 'aged-git-procure'
  | 'bill-passing-pi-status';
