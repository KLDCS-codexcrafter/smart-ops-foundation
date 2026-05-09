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
}
