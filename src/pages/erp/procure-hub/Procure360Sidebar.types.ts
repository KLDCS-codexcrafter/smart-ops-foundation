/**
 * @file        Procure360Sidebar.types.ts
 * @purpose     Procure360Module union · type-safe moduleId set consumed by Procure360Page.tsx renderModule switch + HASH_ALLOWLIST + sidebar config
 * @who         Lovable
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration (8 NEW union members · D-NEW-AG · D-NEW-AH)
 * @iso         25010 · Maintainability (single source of truth for module identity · type-safe across 4 surfaces)
 * @decisions   D-250 · D-NEW-AC · D-NEW-AD · D-NEW-AG · D-NEW-AH
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
  | 'bill-passing-pi-status'
  // ─── NEW · A.3.b ───
  | 'supplier-wise-outstanding'
  | 'group-wise-outstanding'
  | 'goods-inward-day-book'
  | 'pi-pending-report'
  | 'three-way-match-status'
  | 'variance-audit-report'
  | 'tds-deduction-report'
  | 'rcm-liability-report'
  // ─── NEW · A.3.c ───
  | 'multi-source-recommendations'
  | 'pre-close-pending'
  | 'po-aging-cross-dept'
  | 'vendor-reliability'
  | 'peq-followup-register'
  | 'peq-followup'
  | 'purchase-enquiry-form-report'
  // ─── NEW · A.3.d (Variance Trident Polish) ───
  | 'purchase-cost-variance-item'
  | 'purchase-cost-variance-group'
  | 'purchase-cost-variance-category'
  | 'rate-variance-graph'
  | 'po-itemwise'
  | 'po-status-by-enquiry'
  | 'enquiry-details-report'
  | 'material-rfq-print';
