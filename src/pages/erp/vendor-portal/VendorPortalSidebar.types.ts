/**
 * @file        VendorPortalSidebar.types.ts
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation
 */

export type VendorPortalModule =
  | 'welcome'
  | 'vendor-master' | 'vendor-agreements' | 'vendor-onboarding-inbox'
  | 'vendor-categories'
  | 'vendor-scoring' | 'vendor-activity-monitor' | 'msme-compliance'
  | 'vendor-communication-log' | 'vendor-broadcast' | 'saathi-admin'
  // 🆕 VP-GAPS additive surfaces
  | 'vendor-zones' | 'vendor-risk-monitor' | 'vendor-compliance-checklists'
  | 'vendor-dcn' | 'vendor-document-requests' | 'vendor-payment-batches';
