/**
 * @file        src/lib/engineeringx-engine.ts
 * @purpose     Drawing-scoped DocVault queries · thin wrapper · FR-73 Hub-and-Spoke 5th CONSUMER
 * @who         Engineering Lead · Document Controller · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-1a + Q-LOCK-2a + Q-LOCK-4a + Q-LOCK-5a · Block B · 5th FR-73 consumer registration
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability + Compatibility
 * @whom        Audit Owner · Engineering Lead
 * @decisions   FR-73 Hub-and-Spoke (5th CONSUMER at v22 · institutional FR pattern at-scale) ·
 *              D-NEW-CO drawing version supersession workflow (delegated to DocVault canonical approveVersion · 13th) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas
 * @disciplines FR-21 · FR-29 · FR-30 · FR-33
 * @reuses      docvault-engine.ts canonical (ABSOLUTE zero touch · FR-73 Hub) ·
 *              types/docvault.ts canonical (ABSOLUTE zero touch) ·
 *              types/engineering-drawing.ts (refactored to type alias)
 * @[JWT]       N/A (thin wrapper · uses docvault [JWT] markers)
 */
import {
  findDocumentsByForeignKey,
  createDocument,
  loadDocuments,
  getDocument,
  loadDocumentsByStatus,
  submitVersion,
  approveVersion,
  rejectVersion,
  getCurrentApprovedVersion,
  loadVersions,
} from '@/lib/docvault-engine';
import type {
  Document,
  DocumentVersion,
  DocumentVersionStatus,
  DocumentTag,
} from '@/types/docvault';
import type { DrawingType } from '@/types/engineering-drawing';
import { buildDrawingCustomTags } from '@/types/engineering-drawing';

/** List all drawings in entity (filter to document_type === 'drawing'). FR-73.2 spoke · 5th consumer. */
export function listDrawings(entityCode: string): Document[] {
  return loadDocuments(entityCode).filter((d) => d.document_type === 'drawing');
}

/** List drawings linked to a specific project. */
export function listDrawingsByProject(entityCode: string, projectId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'project_id', projectId)
    .filter((d) => d.document_type === 'drawing');
}

/** List drawings linked to a specific equipment (raw string FK · MaintainPro master pending). */
export function listDrawingsByEquipment(entityCode: string, equipmentId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'equipment_id', equipmentId)
    .filter((d) => d.document_type === 'drawing');
}

/** List drawings linked to a specific work order (raw string FK · PlantOps WO master pending). */
export function listDrawingsByWorkOrder(entityCode: string, workOrderId: string): Document[] {
  return findDocumentsByForeignKey(entityCode, 'work_order_id', workOrderId)
    .filter((d) => d.document_type === 'drawing');
}

/** Get a single drawing by Document ID. */
export function getDrawing(entityCode: string, id: string): Document | null {
  const doc = getDocument(entityCode, id);
  if (!doc || doc.document_type !== 'drawing') return null;
  return doc;
}

/** List all drawings whose versions include the given status. */
export function listDrawingsByStatus(
  entityCode: string,
  status: DocumentVersionStatus,
): Document[] {
  return loadDocumentsByStatus(entityCode, status)
    .filter((d) => d.document_type === 'drawing');
}

/** Load all version rows for a drawing (delegated to DocVault canonical). */
export function listDrawingVersions(entityCode: string, drawingId: string): DocumentVersion[] {
  return loadVersions(entityCode, drawingId);
}

export interface CreateDrawingInput {
  drawing_no: string;
  title: string;
  description?: string;
  drawing_type: DrawingType;
  related_project_id?: string | null;
  related_equipment_id?: string | null;
  related_work_order_id?: string | null;
  initial_version: {
    version_no: string;
    file_url: string;
    file_size_bytes: number;
    uploaded_at: string;
    uploaded_by: string;
  };
  originating_department_id: string;
  iso_clause?: string;
  iec_clause?: string;
}

/**
 * Create a drawing as a DocVault Document (document_type: 'drawing').
 * Engineering metadata in DocumentTag.custom_tags · FR-73 5th consumer pattern.
 */
export function createDrawing(
  entityCode: string,
  input: CreateDrawingInput,
  createdBy: string,
): Document {
  const tags: DocumentTag = {
    iso_clause: input.iso_clause,
    iec_clause: input.iec_clause,
    custom_tags: buildDrawingCustomTags({
      drawing_no: input.drawing_no,
      drawing_subtype: input.drawing_type,
    }),
  };

  return createDocument(
    entityCode,
    {
      entity_id: entityCode,
      title: input.title,
      description: input.description,
      document_type: 'drawing',
      tags,
      originating_department_id: input.originating_department_id,
      project_id: input.related_project_id ?? null,
      customer_id: null,
      vendor_id: null,
      equipment_id: input.related_equipment_id ?? null,
      nc_id: null,
      work_order_id: input.related_work_order_id ?? null,
    },
    input.initial_version,
    createdBy,
  );
}

/** Submit a drawing version for approval (DocVault canonical workflow · zero-touch). */
export function submitDrawingVersion(
  entityCode: string,
  drawingId: string,
  versionNo: string,
  submittedBy: string,
): Document | null {
  const r = submitVersion(entityCode, drawingId, versionNo, submittedBy);
  return r.ok && r.document ? r.document : null;
}

/**
 * Approve a drawing version. D-NEW-CO drawing version supersession: prior approved
 * versions auto-superseded by DocVault canonical approveVersion (13th canonical).
 */
export function approveDrawingVersion(
  entityCode: string,
  drawingId: string,
  versionNo: string,
  approvedBy: string,
): Document | null {
  const r = approveVersion(entityCode, drawingId, versionNo, approvedBy);
  return r.ok && r.document ? r.document : null;
}

/** Reject a drawing version (DocVault canonical workflow · zero-touch). */
export function rejectDrawingVersion(
  entityCode: string,
  drawingId: string,
  versionNo: string,
  reason: string,
  rejectedBy: string,
): Document | null {
  const r = rejectVersion(entityCode, drawingId, versionNo, rejectedBy, reason);
  if (!r.ok) return null;
  return getDrawing(entityCode, drawingId);
}

/** Get the current approved version of a drawing (DocVault canonical · zero-touch). */
export function getCurrentApprovedDrawingVersion(drawing: Document): DocumentVersion | null {
  return getCurrentApprovedVersion(drawing);
}
