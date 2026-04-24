/**
 * @file     branch-office.ts
 * @purpose  Minimal BranchOffice type for foundation-level branch records stored
 *           in localStorage key 'erp_branch_offices'. Mirrors the persisted shape
 *           from BranchOfficeForm.tsx (only fields read across CC consumers are typed).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T-H1.5-C-S1
 * @sprint   T-H1.5-C-S1
 * @iso      Maintainability (HIGH — replaces `any[]` in FoundationModule)
 *           Reliability (HIGH — explicit status union for filter logic)
 * @consumers FoundationModule.tsx
 */

export interface BranchOffice {
  /** Stable record id (uuid). */
  id: string;
  /** Display name of the branch. */
  name: string;
  /**
   * Status string as written by BranchOfficeForm. Casing is inconsistent in legacy
   * records, so we keep the union loose ('active'/'Active') with a fallback string.
   */
  status: 'Active' | 'Inactive' | 'Under Setup' | 'Temporarily Closed' | 'Permanently Closed' | string;
  /** Optional fields — present in persisted form but not required for status reads. */
  code?: string;
  shortCode?: string;
  branchType?: string;
  parentCompanyId?: string;
  city?: string;
  state?: string;
  pincode?: string;
}
