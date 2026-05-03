/**
 * @file        RequestXSidebar.types.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block H1
 */
export type RequestXModule =
  | 'welcome'
  | 'tx-material-indent' | 'tx-service-request' | 'tx-capital-indent' | 'tx-approval-inbox'
  | 'rpt-indent-register' | 'rpt-indent-pending' | 'rpt-indent-closed'
  | 'rpt-po-against-indent' | 'rpt-department-summary'
  | 'rpt-category-spend' | 'rpt-ageing-pending'
  | 'master-departments' | 'master-approval-matrix' | 'master-voucher-types' | 'master-pinned-templates';
