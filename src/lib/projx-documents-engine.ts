/**
 * @file        src/lib/projx-documents-engine.ts
 * @purpose     Project-scoped document queries · thin wrapper over DocVault engine · D-NEW-CJ Hub-and-Spoke 2nd consumer
 * @who         Project Manager · Project Lead · Project Engineer · Quality · Compliance
 * @when        2026-05-10
 * @sprint      T-Phase-1.SM.ProjX-Documents · Q-LOCK-2a + Q-LOCK-4a + Q-LOCK-5a · Block A
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability + Compatibility
 * @whom        Project Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · 9th at v13 · 2nd CONSUMER at v18 · institutional pattern crystallization) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      docvault-engine.ts (canonical · ZERO TOUCH) · types/docvault.ts (canonical · ZERO TOUCH)
 * @[JWT]       N/A (thin wrapper · uses docvault [JWT] markers)
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
 * List all documents linked to a specific project (D-NEW-CJ Hub-and-Spoke consumer).
 * Thin wrapper over canonical findDocumentsByForeignKey for project_id FK.
 */
export function listProjectDocuments(entityCode: string, projectId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'project_id', projectId);
}

/**
 * List all documents across all projects in entity (entityCode-scoped · for register all-projects view).
 * Filters DocVault loadDocuments to only documents with project_id set.
 */
export function listAllProjectDocuments(entityCode: string): Document[] {
  return loadDocuments(entityCode).filter((d) => d.project_id != null);
}

export interface CreateProjectDocumentInput {
  projectId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  originatingDepartmentId: string;
  initialVersion: Omit<DocumentVersion, 'version_status'>;
  tags?: DocumentTag;
}

/**
 * Create a new document linked to a specific project (D-NEW-CJ Hub-and-Spoke consumer).
 * Uses canonical createDocument with project_id FK pre-set; other 5 FKs default to null.
 */
export function createProjectDocument(
  entityCode: string,
  input: CreateProjectDocumentInput,
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
      project_id: input.projectId,
      customer_id: null,
      vendor_id: null,
      equipment_id: null,
      nc_id: null,
      work_order_id: null,
    },
    input.initialVersion,
    createdBy,
  );
}
