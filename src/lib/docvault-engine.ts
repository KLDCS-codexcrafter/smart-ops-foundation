/**
 * @file        src/lib/docvault-engine.ts
 * @purpose     DocVault SSOT engine · CRUD + version state machine + cross-card filtered queries
 * @who         All departments via DocVault page · per-card sub-modules consume via findDocumentsByForeignKey
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Q-LOCK-3a + Q-LOCK-7a + Block A.2
 * @iso         ISO 9001:2015 §7.5 · ISO/IEC 27001 · ISO 25010
 * @whom        Audit Owner · Document Controller · CIO
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema CANONICAL ·
 *              D-NEW-BV Phase 1 mock · D-NEW-BJ-adapt#10 (FR-19 sibling pattern) ·
 *              FR-11 SSOT · FR-13 Cards Render Replicas · FR-19 sibling · FR-50 · FR-25
 * @disciplines FR-19 (siblings only · approval-workflow + audit-trail engines NEVER modified) ·
 *              FR-23 D-194 Phase 1/2 boundary
 * @reuses      audit-trail-engine (Phase 2 wiring · [JWT] markers below)
 * @[JWT]       POST /api/docvault/documents · GET /api/docvault/documents/:id ·
 *              POST /api/docvault/documents/:id/versions ·
 *              POST /api/docvault/documents/:id/versions/:vno/(submit|approve|reject) ·
 *              GET  /api/docvault/documents/by-foreign-key?key={k}&id={id}
 */
import type { Document, DocumentVersion, DocumentVersionStatus } from '@/types/docvault';

const DOCUMENTS_KEY = (entityCode: string): string => `erp_documents_${entityCode}`;

function loadAll(entityCode: string): Document[] {
  if (typeof window === 'undefined') return [];
  // [JWT] GET /api/docvault/documents?entity={entityCode}
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY(entityCode));
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entityCode: string, docs: Document[]): void {
  if (typeof window === 'undefined') return;
  // [JWT] PUT /api/docvault/documents (Phase 2 single-record writes)
  localStorage.setItem(DOCUMENTS_KEY(entityCode), JSON.stringify(docs));
}

export type ForeignKeyName =
  | 'project_id' | 'customer_id' | 'vendor_id'
  | 'equipment_id' | 'nc_id' | 'work_order_id';

/** Q-LOCK-15 cross-card linkage helper (Hub-and-Spoke filter) */
export function findDocumentsByForeignKey(
  entityCode: string,
  key: ForeignKeyName,
  id: string,
): Document[] {
  // [JWT] GET /api/docvault/documents/by-foreign-key?key={key}&id={id}
  return loadAll(entityCode).filter((d) => d[key] === id);
}

export function loadDocuments(entityCode: string): Document[] {
  return loadAll(entityCode);
}

export function getDocument(entityCode: string, id: string): Document | null {
  return loadAll(entityCode).find((d) => d.id === id) ?? null;
}

export function createDocument(
  entityCode: string,
  doc: Omit<Document, 'id' | 'created_at' | 'created_by' | 'versions' | 'current_version'>,
  initialVersion: Omit<DocumentVersion, 'version_status'>,
  createdBy: string,
): Document {
  // [JWT] POST /api/docvault/documents
  const now = new Date().toISOString();
  const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newDoc: Document = {
    ...doc,
    id,
    created_at: now,
    created_by: createdBy,
    current_version: initialVersion.version_no,
    versions: [{ ...initialVersion, version_status: 'draft' }],
  };
  const all = loadAll(entityCode);
  all.push(newDoc);
  saveAll(entityCode, all);
  // [JWT] FR-19 sibling: Phase 2 audit-trail-engine.logAudit(create)
  return newDoc;
}

export function addVersion(
  entityCode: string,
  documentId: string,
  version: Omit<DocumentVersion, 'version_status'>,
): Document | null {
  // [JWT] POST /api/docvault/documents/:id/versions
  const all = loadAll(entityCode);
  const doc = all.find((d) => d.id === documentId);
  if (!doc) return null;
  doc.versions.push({ ...version, version_status: 'draft' });
  doc.current_version = version.version_no;
  saveAll(entityCode, all);
  // [JWT] FR-19 sibling: audit-trail-engine.logAudit(add-version)
  return doc;
}

/** State machine: draft → submitted (FR-19 sibling pattern) */
export function submitVersion(
  entityCode: string, documentId: string, versionNo: string, submittedBy: string,
): { ok: boolean; document?: Document } {
  // [JWT] POST /api/docvault/documents/:id/versions/:vno/submit
  const all = loadAll(entityCode);
  const doc = all.find((d) => d.id === documentId);
  if (!doc) return { ok: false };
  const ver = doc.versions.find((v) => v.version_no === versionNo);
  if (!ver || ver.version_status !== 'draft') return { ok: false };
  ver.version_status = 'submitted';
  ver.submitted_at = new Date().toISOString();
  ver.submitted_by = submittedBy;
  saveAll(entityCode, all);
  // [JWT] FR-19 sibling: approval-workflow-engine.submit + audit-trail-engine.logAudit
  return { ok: true, document: doc };
}

/** State machine: submitted → approved · supersedes prior approved versions */
export function approveVersion(
  entityCode: string, documentId: string, versionNo: string, approvedBy: string,
): { ok: boolean; document?: Document } {
  // [JWT] POST /api/docvault/documents/:id/versions/:vno/approve
  const all = loadAll(entityCode);
  const doc = all.find((d) => d.id === documentId);
  if (!doc) return { ok: false };
  const ver = doc.versions.find((v) => v.version_no === versionNo);
  if (!ver || ver.version_status !== 'submitted') return { ok: false };
  for (const v of doc.versions) {
    if (v.version_status === 'approved' && v.version_no !== versionNo) {
      v.version_status = 'superseded';
    }
  }
  ver.version_status = 'approved';
  ver.approved_at = new Date().toISOString();
  ver.approved_by = approvedBy;
  doc.current_version = versionNo;
  saveAll(entityCode, all);
  // [JWT] FR-19 sibling: approval-workflow-engine.approve + audit-trail-engine.logAudit
  return { ok: true, document: doc };
}

/** State machine: submitted → rejected */
export function rejectVersion(
  entityCode: string, documentId: string, versionNo: string, rejectedBy: string, reason: string,
): { ok: boolean } {
  // [JWT] POST /api/docvault/documents/:id/versions/:vno/reject
  const all = loadAll(entityCode);
  const doc = all.find((d) => d.id === documentId);
  if (!doc) return { ok: false };
  const ver = doc.versions.find((v) => v.version_no === versionNo);
  if (!ver || ver.version_status !== 'submitted') return { ok: false };
  ver.version_status = 'rejected';
  ver.rejected_at = new Date().toISOString();
  ver.rejected_by = rejectedBy;
  ver.rejection_reason = reason;
  saveAll(entityCode, all);
  // [JWT] FR-19 sibling: approval-workflow-engine.reject + audit-trail-engine.logAudit
  return { ok: true };
}

export function getCurrentApprovedVersion(doc: Document): DocumentVersion | null {
  return doc.versions.find(
    (v) => v.version_no === doc.current_version && v.version_status === 'approved',
  ) ?? null;
}

export function loadVersions(entityCode: string, documentId: string): DocumentVersion[] {
  const doc = getDocument(entityCode, documentId);
  return doc?.versions ?? [];
}

export function loadDocumentsByStatus(
  entityCode: string,
  versionStatus: DocumentVersionStatus,
): Document[] {
  return loadAll(entityCode).filter((d) =>
    d.versions.some((v) => v.version_status === versionStatus),
  );
}
