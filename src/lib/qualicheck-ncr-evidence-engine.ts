/**
 * @file        src/lib/qualicheck-ncr-evidence-engine.ts
 * @purpose     NC-scoped document queries · thin wrapper over DocVault engine · D-NEW-CJ Hub-and-Spoke 4th CONSUMER · INSTITUTIONAL FR PROMOTION THRESHOLD MET
 * @who         Quality Inspector · QA Manager · Vendor Manager · Compliance · Audit
 * @when        2026-05-10
 * @sprint      T-Phase-1.SM.QualiCheck-NCR-Evidence · Q-LOCK-2a + Q-LOCK-4a + Q-LOCK-5a · Block A
 * @iso         ISO 9001:2015 §10.2 · ISO 25010 Maintainability + Compatibility
 * @whom        Quality Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · 9th at v13 · 4th CONSUMER at v20 · INSTITUTIONAL FR PROMOTION THRESHOLD MET · founder verdict candidate) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      docvault-engine.ts (canonical · ZERO TOUCH) · types/docvault.ts (canonical · ZERO TOUCH) ·
 *              ncr-engine.ts (canonical · ZERO TOUCH · KEY DIVERGENCE from Procure360 v19 LOCAL pattern · canonical reuse over LOCAL helper) ·
 *              types/ncr.ts (canonical · ZERO TOUCH)
 * @[JWT]       N/A (thin wrapper · uses docvault [JWT] markers)
 */

import {
  findDocumentsByForeignKey,
  createDocument,
  loadDocuments,
} from '@/lib/docvault-engine';
import { listNcrs } from '@/lib/ncr-engine';
import type {
  Document,
  DocumentVersion,
  DocumentType,
  DocumentTag,
} from '@/types/docvault';
import type { NonConformanceReport } from '@/types/ncr';

/**
 * List all documents linked to a specific NC (D-NEW-CJ Hub-and-Spoke 4th CONSUMER).
 */
export function listNcrEvidence(entityCode: string, ncId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'nc_id', ncId);
}

/**
 * List all documents across all NCs in entity (filters to nc_id-bearing docs).
 */
export function listAllNcrEvidence(entityCode: string): Document[] {
  return loadDocuments(entityCode).filter((d) => d.nc_id != null);
}

/**
 * Re-export canonical NCR query · institutional discipline · ZERO TOUCH on ncr-engine.
 * KEY DIVERGENCE from Procure360 v19 LOCAL loadVendors pattern.
 */
export function listAvailableNcrs(entityCode: string): NonConformanceReport[] {
  return listNcrs(entityCode);
}

export interface CreateNcrEvidenceInput {
  ncId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  originatingDepartmentId: string;
  initialVersion: Omit<DocumentVersion, 'version_status'>;
  tags?: DocumentTag;
}

/**
 * Create a new document linked to a specific NC (D-NEW-CJ 4th CONSUMER).
 */
export function createNcrEvidence(
  entityCode: string,
  input: CreateNcrEvidenceInput,
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
      vendor_id: null,
      equipment_id: null,
      nc_id: input.ncId,
      work_order_id: null,
    },
    input.initialVersion,
    createdBy,
  );
}
