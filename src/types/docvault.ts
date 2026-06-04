/**
 * @file        src/types/docvault.ts
 * @purpose     Canonical Document type schema · Hub-and-Spoke SSOT for ALL company documents
 * @who         All departments · Engineering · Quality · Production · Procurement · Sales · HR · Finance · Compliance · Projects · Service · Site
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Q-LOCK-2a + Q-LOCK-9a + Q-LOCK-15a + Block A.1
 * @iso         ISO 9001:2015 §7.5 · ISO/IEC 27001 · ISO 25010 Maintainability + Compatibility
 * @whom        Audit Owner · Document Controller · CIO
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · 9th at v13) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas ·
 *              FR-50 multi-entity · FR-25 dept-scoped · Q-LOCK-15a Hub-and-Spoke linkage
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      Phase 2 backend per Master Plan §6.3
 * @[JWT]       Schema for /api/docvault/* (Phase 2)
 */

export type DocumentType =
  | 'drawing'
  | 'mom'
  | 'certification'
  | 'iso_iec_doc'
  | 'other';

export type DocumentVersionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'superseded'
  | 'rejected';

export interface DocumentTag {
  iso_clause?: string;
  iec_clause?: string;
  custom_tags?: string[];
}

export interface DocumentVersion {
  version_no: string;
  version_status: DocumentVersionStatus;
  file_url: string;
  file_hash?: string;
  file_size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  submitted_at?: string;
  submitted_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  supersedes_version?: string;
}

export interface Document {
  id: string;
  entity_id: string;
  document_type: DocumentType;
  title: string;
  description?: string;
  current_version: string;
  versions: DocumentVersion[];
  tags: DocumentTag;
  originating_department_id: string;

  // Q-LOCK-15a · Cross-card linkage foreign keys (Hub-and-Spoke pattern)
  project_id?: string | null;
  customer_id?: string | null;
  vendor_id?: string | null;
  equipment_id?: string | null;
  nc_id?: string | null;
  work_order_id?: string | null;

  created_at: string;
  created_by: string;
  // [JWT] Phase 2 backend may add: audit_immutable, cdn_url, etc.

  // Sprint 143 · T-TaskFlow-A641.7 · DocVault Control Pt 1 · ADDITIVE OPTIONAL · legacy docs read defaults via getControl()
  control?: DocumentControlMeta | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sprint 143 · T-TaskFlow-A641.7 · DocVault Control Pt 1 · ADDITIVE (snake_case)
// Existing Document/DocumentVersion fields and 5 version states UNTOUCHED.
// Q-LOCK-15a foreign keys FROZEN-IN-PLACE.
// ──────────────────────────────────────────────────────────────────────────────

export type DocumentLifecycleStatus =
  | 'active' | 'under_review' | 'published' | 'expired' | 'archived';

export type ConfidentialityLevel =
  | 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

export type DocumentCategory =
  | 'policy' | 'procedure' | 'work_instruction' | 'contract' | 'agreement'
  | 'certificate' | 'license' | 'statutory' | 'legal' | 'financial'
  | 'technical' | 'quality' | 'hr' | 'correspondence' | 'general';

export interface DocumentControlMeta {
  document_code?: string | null;        // type-prefixed numbering, e.g. POL-000123
  lifecycle_status?: DocumentLifecycleStatus | null;   // default 'active' for legacy docs
  category?: DocumentCategory | null;
  confidentiality?: ConfidentialityLevel | null;       // default 'internal'
  owner_id?: string | null;             // defaults to created_by for legacy docs
  effective_date?: string | null;
  review_date?: string | null;
  expiry_date?: string | null;
  locked_by?: string | null;            // check-out lock
  locked_at?: string | null;
  folder_id?: string | null;
  financial_year?: string | null;       // S144 · TDL FY facet · 'FY2026-27'
}

export interface DocumentFolder {
  id: string; entity_id: string;
  name: string; parent_folder_id?: string | null;
  confidentiality_floor?: ConfidentialityLevel | null;  // folder minimum
  created_by: string; created_at: string;
}

export interface DocumentTypeNumberingConfig {
  id: string; entity_id: string;
  category: DocumentCategory;
  numbering_prefix: string;             // e.g. 'POL'
  next_sequence: number;
  is_active: boolean;
}

export interface DocumentControlAuditEntry {
  id: string; entity_id: string; document_id: string;
  action: string;                       // created·code_assigned·lifecycle_changed·confidentiality_changed·owner_transferred·locked·unlocked·folder_moved·category_set·dates_set·viewed
  user_id: string; before?: Record<string, unknown>; after?: Record<string, unknown>;
  timestamp: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sprint 144 · T-TaskFlow-A641.8 · DocVault Control Pt 2 · ADDITIVE (snake_case)
// Sharing+Watermark+ACL · Retention/Review · B.7 Generalized Binding ·
// TF-34 Read-and-Understood Circulars · TF-38 Required-Documents Completeness ·
// FY facet (added to DocumentControlMeta above).
// docvault-engine + Q-LOCK-15a FKs + version state machinery UNTOUCHED.
// ──────────────────────────────────────────────────────────────────────────────

export type SharePermission = 'view' | 'view_watermark' | 'download' | 'comment' | 'edit';

export interface DocumentShare {
  id: string; entity_id: string; document_id: string;
  grantee_user_id?: string | null;          // internal grant
  external_email?: string | null;           // external grant (P2BB delivery · modeled now)
  permission: SharePermission;
  expires_at?: string | null;
  requires_approval: boolean;               // external default true
  approved_by?: string | null; approved_at?: string | null;
  created_by: string; created_at: string; revoked_at?: string | null;
}

export interface DocVaultUserACL {          // TDL 6-action set (Scan = desktop-agent seam · excluded)
  user_id: string; entity_id: string;
  allow_config: boolean; allow_upload: boolean; allow_view: boolean;
  allow_download: boolean; allow_delete: boolean;
  updated_by: string; updated_at: string;
}

export interface DocumentRetentionRule {
  id: string; entity_id: string;
  category?: DocumentCategory | null;       // null = default
  retain_years: number | null;              // null = forever
  action_at_end: 'archive' | 'flag_delete';
  is_active: boolean; created_at: string; updated_at: string;
}

export interface DocumentReviewCycle {
  id: string; entity_id: string;
  category: DocumentCategory;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'biennial';
  escalate_to_owner: boolean;
  is_active: boolean;
}

export interface DocumentLinkRef {          // B.7 generalized (Q-LOCK FKs remain for legacy refs)
  id: string; entity_id: string; document_id: string;
  ref_type: 'task' | 'conversation' | 'obligation' | 'employee' | 'voucher';
  ref_id: string; ref_label: string;
  created_by: string; created_at: string;
}

// TF-34 · Read-and-Understood Circulars
export interface Circular {
  id: string; entity_id: string; document_id: string;
  title: string;
  target: 'all' | 'department';
  target_department_id?: string | null;
  obligation_ref?: { id: string; label: string } | null;   // Comply360 read-only linkage
  published_by: string; published_at: string;
  due_by?: string | null; closed_at?: string | null;
}
export interface CircularAcknowledgment {
  id: string; circular_id: string; user_id: string; acknowledged_at: string;
}

// TF-38 · Required-Documents Templates (TDL adoption)
export interface DocumentRequirementTemplate {
  id: string; entity_id: string;
  target_kind: 'customer' | 'vendor' | 'employee' | 'document_category';
  target_filter?: string | null;            // e.g. vendor group / employee role per Block-0 shapes · null = all of kind
  required_items: { title: string; category: DocumentCategory; mandatory: boolean }[];
  is_active: boolean; created_at: string; updated_at: string;
}
export interface CompletenessResult {
  target_kind: string; target_id: string; target_label: string;
  required: number; present: number; missing: { title: string; category: string }[];
}
