/**
 * @file        src/types/vendor-compliance-checklist.ts
 * @purpose     Per-vendor compliance checklist · BUILDS ON vendor-compliance-record requirements
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_compliance_checklists) · CONSUMES VendorComplianceRecord (never duplicates docs)
 */

export type ChecklistItemStatus = 'pending' | 'submitted' | 'verified';
export type ChecklistOverallStatus = 'pending' | 'partial' | 'complete';

export interface VendorComplianceChecklistItem {
  label: string;
  required: boolean;
  status: ChecklistItemStatus;
  doc_ref?: string;
}

export interface VendorComplianceChecklist {
  id: string;
  vendor_id: string;
  items: VendorComplianceChecklistItem[];
  overall_status: ChecklistOverallStatus;
  created_at: string;
  updated_at: string;
}

export const vendorComplianceChecklistsKey = (entityCode: string): string =>
  `erp_vendor_compliance_checklists_${entityCode}`;
