/**
 * @file        src/types/vendor-compliance-record.ts
 * @purpose     Vendor compliance document tracking · doc verification workflow · expiry + renewal reminders
 * @who         Admin · Compliance Officer · Procurement HOD
 * @when        2026-05-18 (Sprint A.2)
 * @sprint      T-Phase-1.A.2-VendorPortal-Architecture-Seeds
 * @iso         ISO 25010 Functional Suitability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-DP (craft_canvas hybrid port) · D-NEW-DN (Vendor Portal canonical) ·
 *              A-Q14=A (plant all 3 vendor-risk types in A.2)
 * @disciplines FR-30
 * @reuses      none (pure type seed)
 * @[JWT]       N/A (type file)
 *
 * Hybrid port from craft_canvas/src/types/vendor-risk.ts.
 * Tracks GST · PAN · MSME · ISO · BIS · FSSAI · bank · address · registration documents per vendor.
 */

export type ComplianceStatus =
  | 'compliant'
  | 'partial'
  | 'non_compliant'
  | 'pending';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'expired'
  | 'rejected'
  | 'not_applicable';

/**
 * Per-document compliance record · multiple records per vendor (one per document).
 */
export interface VendorComplianceRecord {
  // Identity (3)
  id: string;
  party_id: string;
  entity_code: string;                  // FR-50 multi-entity scope

  // Document metadata (5)
  compliance_type: string;              // 'gst' | 'pan' | 'msme' | 'iso' | 'bis' | 'fssai' | 'bank' | 'address' | 'registration' | custom
  document_name: string;
  document_number?: string;
  issuing_authority?: string;
  document_url?: string;                // localStorage stub or future Supabase storage URL

  // Validity (3)
  issue_date?: string;                  // ISO date
  expiry_date?: string;                 // ISO date · null means perpetual
  is_recurring: boolean;                // true if needs renewal

  // Verification (4)
  verification_status: VerificationStatus;
  verified_by?: string;
  verified_at?: string;                 // ISO datetime
  rejection_reason?: string;

  // Renewal (2)
  renewal_reminder_days?: number;       // alert N days before expiry
  is_mandatory: boolean;

  // Metadata (3)
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/** localStorage key generator · entity-scoped per FR-50 */
export function vendorComplianceRecordKey(entityCode: string): string {
  return `erp_vendor_compliance_records_${entityCode}`;
}
