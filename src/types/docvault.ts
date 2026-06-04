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
