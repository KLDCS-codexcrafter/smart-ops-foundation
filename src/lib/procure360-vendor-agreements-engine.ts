/**
 * @file        src/lib/procure360-vendor-agreements-engine.ts
 * @purpose     Vendor-scoped document queries · thin wrapper over DocVault engine · D-NEW-CJ Hub-and-Spoke 3rd consumer
 * @who         Procurement · Vendor Manager · Quality · Legal · Compliance
 * @when        2026-05-10
 * @sprint      T-Phase-1.SM.Procure360-Vendor-Agreements · Q-LOCK-2a + Q-LOCK-4a + Q-LOCK-5a · Block A
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability + Compatibility
 * @whom        Procurement Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · 9th at v13 · 3rd CONSUMER at v19 · institutional pattern at-scale validation · 4th consumer FR promotion threshold MET at QualiCheck NCR evidence v20) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      docvault-engine.ts (canonical · ZERO TOUCH) · types/docvault.ts (canonical · ZERO TOUCH) · projx-documents-engine.ts (institutional pattern reference at 2nd consumer)
 * @[JWT]       N/A (thin wrapper · uses docvault [JWT] markers) · [JWT] GET /api/masters/vendors for production
 */

import {
  findDocumentsByForeignKey,
  createDocument,
  loadDocuments,
} from '@/lib/docvault-engine';
import type {
  Document,
  DocumentVersion,
  DocumentType,
  DocumentTag,
} from '@/types/docvault';

/**
 * VendorRow (institutional Phase 1 mock pattern · D-NEW-BV)
 */
export interface VendorRow {
  id: string;
  name: string;
  vendorCode?: string;
}

/**
 * Load vendor master from Phase 1 localStorage (D-NEW-BV pattern)
 * [JWT] Phase 2: GET /api/masters/vendors
 */
export function loadVendors(): VendorRow[] {
  try {
    const raw = localStorage.getItem('erp_group_vendor_master');
    return raw ? (JSON.parse(raw) as VendorRow[]) : [];
  } catch { return []; }
}

/**
 * List all documents linked to a specific vendor (D-NEW-CJ Hub-and-Spoke consumer).
 */
export function listVendorAgreements(entityCode: string, vendorId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'vendor_id', vendorId);
}

/**
 * List all documents across all vendors in entity.
 */
export function listAllVendorAgreements(entityCode: string): Document[] {
  return loadDocuments(entityCode).filter((d) => d.vendor_id != null);
}

export interface CreateVendorAgreementInput {
  vendorId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  originatingDepartmentId: string;
  initialVersion: Omit<DocumentVersion, 'version_status'>;
  tags?: DocumentTag;
}

/**
 * Create a new document linked to a specific vendor (D-NEW-CJ Hub-and-Spoke consumer).
 */
export function createVendorAgreement(
  entityCode: string,
  input: CreateVendorAgreementInput,
  createdBy: string,
): Document {
  return createDocument(
    entityCode,
    {
      entity_id: entityCode,
      title: input.title,
      description: input.description,
      document_type: input.documentType,
      tags: input.tags ?? {},
      originating_department_id: input.originatingDepartmentId,
      project_id: null,
      customer_id: null,
      vendor_id: input.vendorId,
      equipment_id: null,
      nc_id: null,
      work_order_id: null,
    },
    input.initialVersion,
    createdBy,
  );
}
