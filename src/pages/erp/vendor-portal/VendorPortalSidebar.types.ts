/**
 * @file        VendorPortalSidebar.types.ts
 * @sprint      T-VPG-VendorPortal-Gaps (6 new modules · additive)
 */

export type VendorPortalModule =
  | 'welcome'
  | 'vendor-master' | 'vendor-agreements' | 'vendor-onboarding-inbox'
  | 'vendor-categories'
  | 'vendor-scoring' | 'vendor-activity-monitor' | 'msme-compliance'
  | 'vendor-communication-log' | 'vendor-broadcast' | 'saathi-admin'
  // VP-GAPS · 6 new admin surfaces (panels-pattern · 7 types backing)
  | 'vendor-zones' | 'vendor-risk-monitor' | 'vendor-compliance-checklists'
  | 'vendor-dcn' | 'vendor-document-requests' | 'vendor-payment-batches';
