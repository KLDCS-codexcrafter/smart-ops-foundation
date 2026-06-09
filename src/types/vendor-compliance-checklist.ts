/**
 * @file        src/types/vendor-compliance-checklist.ts
 * @purpose     Per-vendor compliance checklist · aggregates VendorComplianceRecord items into a rollup view
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · D-NEW-DP (ccc reference)
 * @reuses      VendorComplianceRecord (consumed read-only · NEVER mutated)
 */

export type ChecklistItemStatus = 'satisfied' | 'pending' | 'expired' | 'not_applicable';

export interface VendorChecklistItem {
  key: string;                           // e.g. 'gst' | 'pan' | 'msme' | 'iso' | custom
  label: string;
  is_mandatory: boolean;
  status: ChecklistItemStatus;
  ref_compliance_record_id?: string;     // FK to VendorComplianceRecord (read-only ref)
  expiry_date?: string;
}

export interface VendorComplianceChecklist {
  id: string;
  party_id: string;
  entity_code: string;
  items: VendorChecklistItem[];
  mandatory_satisfied_count: number;
  mandatory_total_count: number;
  completion_percent: number;            // 0-100
  last_evaluated_at: string;
  created_at: string;
  updated_at: string;
}

export const vendorComplianceChecklistKey = (entityCode: string): string =>
  `erp_vendor_compliance_checklists_${entityCode}`;
