/**
 * @file        Procure360Sidebar.types.ts
 * @purpose     Procure360Module union · type-safe moduleId set consumed by Procure360Page.tsx renderModule switch + HASH_ALLOWLIST + sidebar config
 * @who         Lovable
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration (mop-up from A.3.a · types union now consumed by config-driven Shell)
 * @iso         25010 · Maintainability (single source of truth for module identity · type-safe across 4 surfaces)
 * @decisions   D-250 · D-NEW-AC · D-NEW-AD
 * @reuses      n/a (foundational type)
 * @[JWT]       n/a (type only)
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
