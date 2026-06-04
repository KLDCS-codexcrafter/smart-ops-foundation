/**
 * @file        src/lib/docvault-control-engine.ts
 * @realizes    DocVault Control Pt 1 · TF-26 delta (pre-flight verified):
 *              document lifecycle · ownership+transfer (closes S142 TF-35 deferral) ·
 *              confidentiality · numbering · folders · categories · control audit
 * @reads-from  docvault-engine (loadDocuments / getDocument · version machinery UNTOUCHED) ·
 *              audit-trail-engine (logAudit · D-AUDIT-SAFE)
 * @sprint      Sprint 143 · T-TaskFlow-A641.7
 * @[JWT]       P2BB: server numbering sequence · immutable audit
 *
 * FR-19 sibling pattern: docvault-engine, approval-workflow-engine, push-notification-bridge,
 * Comply360 all 0-DIFF. Control meta is an OPTIONAL additive field on Document; all writes
 * route through a single internal updater that rewrites the document additively in the same
 * `erp_documents_${entityCode}` storage key DocVault already owns.
 *
 * Audit type: 'document_control_event' (additive literal in @/types/audit-trail · ADDITIVE).
 */
import type {
  Document, DocumentControlMeta, DocumentLifecycleStatus, ConfidentialityLevel,
  DocumentCategory, DocumentFolder, DocumentTypeNumberingConfig, DocumentControlAuditEntry,
} from '@/types/docvault';
import type { AuditEntityType } from '@/types/audit-trail';
import { loadDocuments, getDocument, addVersion } from '@/lib/docvault-engine';
import { logAudit } from '@/lib/audit-trail-engine';

// ──────────────────────────────────────────────────────────────────────────────
// Storage keys (entity-scoped · additive · DocVault's existing key UNTOUCHED)
// ──────────────────────────────────────────────────────────────────────────────
const DOCUMENTS_KEY = (e: string): string => `erp_documents_${e}`;
const FOLDERS_KEY = (e: string): string => `dv_folders_${e}`;
const NUMBERING_KEY = (e: string): string => `dv_numbering_${e}`;
const AUDIT_KEY = (e: string): string => `dv_control_audit_${e}`;

const DOCUMENT_AUDIT_TYPE = 'document_control_event' as unknown as AuditEntityType;

const nowISO = (): string => new Date().toISOString();
const newId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
};
const writeJSON = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

const safeAudit = (entry: Parameters<typeof logAudit>[0]): void => {
  try { logAudit(entry); } catch { /* D-AUDIT-SAFE */ }
};

// ──────────────────────────────────────────────────────────────────────────────
// Defaults / migration-on-read
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Materialize control defaults for legacy docs WITHOUT persisting.
 * Defaults: lifecycle 'active' · confidentiality 'internal' · owner_id = created_by.
 */
export function getControl(doc: Document): Required<Pick<
  DocumentControlMeta, 'lifecycle_status' | 'confidentiality' | 'owner_id'
>> & DocumentControlMeta {
  const c = doc.control ?? {};
  return {
    document_code: c.document_code ?? null,
    lifecycle_status: c.lifecycle_status ?? 'active',
    category: c.category ?? null,
    confidentiality: c.confidentiality ?? 'internal',
    owner_id: c.owner_id ?? doc.created_by,
    effective_date: c.effective_date ?? null,
    review_date: c.review_date ?? null,
    expiry_date: c.expiry_date ?? null,
    locked_by: c.locked_by ?? null,
    locked_at: c.locked_at ?? null,
    folder_id: c.folder_id ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal: rewrite the docvault record additively (no docvault-engine edits)
// ──────────────────────────────────────────────────────────────────────────────

function loadAllDocs(entityCode: string): Document[] {
  return loadDocuments(entityCode);
}

function saveAllDocs(entityCode: string, docs: Document[]): void {
  if (typeof window === 'undefined') return;
  // [JWT] PUT /api/docvault/documents
  localStorage.setItem(DOCUMENTS_KEY(entityCode), JSON.stringify(docs));
}

function updateDocumentControl(
  entityCode: string,
  docId: string,
  patch: Partial<DocumentControlMeta>,
): Document {
  const all = loadAllDocs(entityCode);
  const idx = all.findIndex((d) => d.id === docId);
  if (idx < 0) throw new Error(`document not found: ${docId}`);
  // getControl() snapshot retained for symmetry with other mutators; audit captures it where needed
  void getControl(all[idx]);
  const next: DocumentControlMeta = { ...(all[idx].control ?? {}), ...patch };
  all[idx] = { ...all[idx], control: next };
  saveAllDocs(entityCode, all);
  return all[idx];
}

function appendControlAudit(
  entityCode: string,
  entry: Omit<DocumentControlAuditEntry, 'id' | 'timestamp' | 'entity_id'>,
): DocumentControlAuditEntry {
  const rec: DocumentControlAuditEntry = {
    id: newId('dca'),
    entity_id: entityCode,
    timestamp: nowISO(),
    ...entry,
  };
  const all = readJSON<DocumentControlAuditEntry[]>(AUDIT_KEY(entityCode), []);
  all.push(rec);
  writeJSON(AUDIT_KEY(entityCode), all);
  safeAudit({
    entityCode,
    action: 'update',
    entityType: DOCUMENT_AUDIT_TYPE,
    recordId: entry.document_id,
    recordLabel: `docvault-control · ${entry.action}`,
    beforeState: entry.before ?? null,
    afterState: entry.after ?? null,
    reason: entry.action,
    sourceModule: 'docvault-control-engine',
  });
  return rec;
}

export function listControlAudit(entityCode: string, documentId: string): DocumentControlAuditEntry[] {
  return readJSON<DocumentControlAuditEntry[]>(AUDIT_KEY(entityCode), [])
    .filter((e) => e.document_id === documentId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ──────────────────────────────────────────────────────────────────────────────
// Numbering · per-category prefix sequence (one active per category)
// ──────────────────────────────────────────────────────────────────────────────

export function listNumberingConfigs(entityCode: string): DocumentTypeNumberingConfig[] {
  return readJSON<DocumentTypeNumberingConfig[]>(NUMBERING_KEY(entityCode), []);
}

export function upsertNumberingConfig(
  entityCode: string,
  input: Omit<DocumentTypeNumberingConfig, 'id' | 'entity_id'> & { id?: string },
): DocumentTypeNumberingConfig {
  if (!input.numbering_prefix || !/^[A-Z0-9]{2,8}$/.test(input.numbering_prefix)) {
    throw new Error('numbering_prefix must be 2-8 uppercase alphanumerics');
  }
  if (!Number.isInteger(input.next_sequence) || input.next_sequence < 1) {
    throw new Error('next_sequence must be a positive integer');
  }
  const all = listNumberingConfigs(entityCode);
  // Enforce one active per category
  if (input.is_active) {
    for (const c of all) {
      if (c.category === input.category && c.id !== input.id) c.is_active = false;
    }
  }
  const existingIdx = input.id ? all.findIndex((c) => c.id === input.id) : -1;
  const rec: DocumentTypeNumberingConfig = {
    id: input.id ?? newId('dnc'),
    entity_id: entityCode,
    category: input.category,
    numbering_prefix: input.numbering_prefix,
    next_sequence: input.next_sequence,
    is_active: input.is_active,
  };
  if (existingIdx >= 0) all[existingIdx] = rec;
  else all.push(rec);
  writeJSON(NUMBERING_KEY(entityCode), all);
  return rec;
}

export function getActiveNumberingConfigForCategory(
  entityCode: string,
  category: DocumentCategory,
): DocumentTypeNumberingConfig | null {
  return listNumberingConfigs(entityCode).find(
    (c) => c.category === category && c.is_active,
  ) ?? null;
}

export function previewNextDocumentCode(
  entityCode: string,
  category: DocumentCategory,
): string | null {
  const cfg = getActiveNumberingConfigForCategory(entityCode, category);
  if (!cfg) return null;
  return `${cfg.numbering_prefix}-${String(cfg.next_sequence).padStart(6, '0')}`;
}

/** Idempotent across re-call only via "already assigned" throw; sequence ALWAYS advances on success. */
export function assignDocumentCode(
  entityCode: string,
  docId: string,
  byUserId: string,
): { document: Document; code: string } {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (ctrl.document_code) throw new Error(`document already has code: ${ctrl.document_code}`);
  if (!ctrl.category) throw new Error('document has no category; set category before assigning code');
  const cfg = getActiveNumberingConfigForCategory(entityCode, ctrl.category);
  if (!cfg) throw new Error(`no active numbering config for category: ${ctrl.category}`);
  const code = `${cfg.numbering_prefix}-${String(cfg.next_sequence).padStart(6, '0')}`;
  // advance sequence
  upsertNumberingConfig(entityCode, { ...cfg, next_sequence: cfg.next_sequence + 1 });
  const after = updateDocumentControl(entityCode, docId, { document_code: code });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'code_assigned', user_id: byUserId,
    before: { document_code: null }, after: { document_code: code },
  });
  return { document: after, code };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle · legal transition map
// ──────────────────────────────────────────────────────────────────────────────

const LIFECYCLE_LEGAL: Record<DocumentLifecycleStatus, DocumentLifecycleStatus[]> = {
  active: ['under_review', 'archived'],
  under_review: ['published', 'active', 'archived'],
  published: ['under_review', 'expired', 'archived'],
  expired: ['archived'],
  archived: [],
};

export function setLifecycleStatus(
  entityCode: string,
  docId: string,
  next: DocumentLifecycleStatus,
  byUserId: string,
): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const current = getControl(doc).lifecycle_status;
  const legal = LIFECYCLE_LEGAL[current];
  if (!legal.includes(next)) {
    throw new Error(`illegal lifecycle transition: ${current} → ${next}`);
  }
  const after = updateDocumentControl(entityCode, docId, { lifecycle_status: next });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'lifecycle_changed', user_id: byUserId,
    before: { lifecycle_status: current }, after: { lifecycle_status: next },
  });
  return after;
}

export interface ExpiryEvaluation {
  toExpire: { documentId: string; expiryDate: string }[];
  reviewDue: { documentId: string; reviewDate: string }[];
}

export function evaluateExpiries(entityCode: string, nowISOArg?: string): ExpiryEvaluation {
  const now = nowISOArg ?? nowISO();
  const docs = loadAllDocs(entityCode);
  const toExpire: ExpiryEvaluation['toExpire'] = [];
  const reviewDue: ExpiryEvaluation['reviewDue'] = [];
  for (const d of docs) {
    const c = getControl(d);
    if (c.lifecycle_status === 'archived' || c.lifecycle_status === 'expired') continue;
    if (c.expiry_date && c.expiry_date <= now) {
      toExpire.push({ documentId: d.id, expiryDate: c.expiry_date });
    }
    if (c.review_date && c.review_date <= now) {
      reviewDue.push({ documentId: d.id, reviewDate: c.review_date });
    }
  }
  return { toExpire, reviewDue };
}

// ──────────────────────────────────────────────────────────────────────────────
// Ownership · closes S142 TF-35 DocVault deferral
// ──────────────────────────────────────────────────────────────────────────────

export function transferDocumentOwnership(
  entityCode: string,
  docId: string,
  toUserId: string,
  byUserId: string,
  reason: string,
): Document {
  if (!reason || !reason.trim()) throw new Error('reason is mandatory for ownership transfer');
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const before = getControl(doc).owner_id;
  if (before === toUserId) return doc;
  const after = updateDocumentControl(entityCode, docId, { owner_id: toUserId });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'owner_transferred', user_id: byUserId,
    before: { owner_id: before, reason }, after: { owner_id: toUserId, reason },
  });
  return after;
}

/** Used by handover protocol — owner = current owner_id (default created_by). */
export function listDocumentsOwnedBy(entityCode: string, userId: string): Document[] {
  return loadAllDocs(entityCode).filter((d) => getControl(d).owner_id === userId);
}

// ──────────────────────────────────────────────────────────────────────────────
// Confidentiality · folder floor enforced
// ──────────────────────────────────────────────────────────────────────────────

const CONF_RANK: Record<ConfidentialityLevel, number> = {
  public: 0, internal: 1, confidential: 2, restricted: 3, top_secret: 4,
};

export function setConfidentiality(
  entityCode: string,
  docId: string,
  level: ConfidentialityLevel,
  byUserId: string,
): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (ctrl.folder_id) {
    const folder = getFolder(entityCode, ctrl.folder_id);
    if (folder?.confidentiality_floor) {
      if (CONF_RANK[level] < CONF_RANK[folder.confidentiality_floor]) {
        throw new Error(
          `confidentiality below folder floor: ${level} < ${folder.confidentiality_floor}`,
        );
      }
    }
  }
  const after = updateDocumentControl(entityCode, docId, { confidentiality: level });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'confidentiality_changed', user_id: byUserId,
    before: { confidentiality: ctrl.confidentiality }, after: { confidentiality: level },
  });
  return after;
}

// ──────────────────────────────────────────────────────────────────────────────
// Lock / check-out · gates new versions via guardedAddVersion wrapper
// ──────────────────────────────────────────────────────────────────────────────

export function lockDocument(entityCode: string, docId: string, byUserId: string): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (ctrl.locked_by && ctrl.locked_by !== byUserId) {
    throw new Error(`document already locked by ${ctrl.locked_by}`);
  }
  const after = updateDocumentControl(entityCode, docId, {
    locked_by: byUserId, locked_at: nowISO(),
  });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'locked', user_id: byUserId,
    before: { locked_by: ctrl.locked_by }, after: { locked_by: byUserId },
  });
  return after;
}

export function unlockDocument(entityCode: string, docId: string, byUserId: string): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (!ctrl.locked_by) return doc;
  if (ctrl.locked_by !== byUserId && ctrl.owner_id !== byUserId) {
    throw new Error('only the locker or the owner may unlock');
  }
  const after = updateDocumentControl(entityCode, docId, { locked_by: null, locked_at: null });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'unlocked', user_id: byUserId,
    before: { locked_by: ctrl.locked_by }, after: { locked_by: null },
  });
  return after;
}

/**
 * Guard wrapper around docvault-engine.addVersion (which itself is UNTOUCHED).
 * UI routes through this so locks are honoured without modifying the source engine.
 */
export function guardedAddVersion(
  entityCode: string,
  docId: string,
  version: Parameters<typeof addVersion>[2],
  byUserId: string,
): Document | null {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (ctrl.locked_by && ctrl.locked_by !== byUserId) {
    throw new Error(`document is locked by ${ctrl.locked_by}`);
  }
  return addVersion(entityCode, docId, version);
}

// ──────────────────────────────────────────────────────────────────────────────
// Folders · CRUD · move with floor check · tree builder · cycle prevention
// ──────────────────────────────────────────────────────────────────────────────

export function listFolders(entityCode: string): DocumentFolder[] {
  return readJSON<DocumentFolder[]>(FOLDERS_KEY(entityCode), []);
}

export function getFolder(entityCode: string, folderId: string): DocumentFolder | null {
  return listFolders(entityCode).find((f) => f.id === folderId) ?? null;
}

export interface CreateFolderInput {
  name: string;
  parent_folder_id?: string | null;
  confidentiality_floor?: ConfidentialityLevel | null;
}

export function createFolder(
  entityCode: string, input: CreateFolderInput, byUserId: string,
): DocumentFolder {
  if (!input.name || !input.name.trim()) throw new Error('folder name is required');
  if (input.parent_folder_id && !getFolder(entityCode, input.parent_folder_id)) {
    throw new Error(`parent folder not found: ${input.parent_folder_id}`);
  }
  const rec: DocumentFolder = {
    id: newId('fld'),
    entity_id: entityCode,
    name: input.name.trim(),
    parent_folder_id: input.parent_folder_id ?? null,
    confidentiality_floor: input.confidentiality_floor ?? null,
    created_by: byUserId,
    created_at: nowISO(),
  };
  const all = listFolders(entityCode);
  all.push(rec);
  writeJSON(FOLDERS_KEY(entityCode), all);
  return rec;
}

export function updateFolder(
  entityCode: string, folderId: string,
  patch: Partial<Pick<DocumentFolder, 'name' | 'parent_folder_id' | 'confidentiality_floor'>>,
): DocumentFolder {
  const all = listFolders(entityCode);
  const idx = all.findIndex((f) => f.id === folderId);
  if (idx < 0) throw new Error(`folder not found: ${folderId}`);
  // cycle prevention
  if (patch.parent_folder_id !== undefined && patch.parent_folder_id !== null) {
    if (patch.parent_folder_id === folderId) throw new Error('folder cannot be its own parent');
    let cursor: string | null | undefined = patch.parent_folder_id;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === folderId) throw new Error('folder move would create a cycle');
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const node: DocumentFolder | undefined = all.find((f) => f.id === cursor);
      cursor = node?.parent_folder_id ?? null;
    }
  }
  all[idx] = { ...all[idx], ...patch };
  writeJSON(FOLDERS_KEY(entityCode), all);
  return all[idx];
}

export function deleteFolder(entityCode: string, folderId: string): void {
  const all = listFolders(entityCode).filter((f) => f.id !== folderId);
  writeJSON(FOLDERS_KEY(entityCode), all);
}

export interface FolderTreeNode {
  folder: DocumentFolder;
  children: FolderTreeNode[];
}

export function listFolderTree(entityCode: string): FolderTreeNode[] {
  const all = listFolders(entityCode);
  const map = new Map<string, FolderTreeNode>();
  for (const f of all) map.set(f.id, { folder: f, children: [] });
  const roots: FolderTreeNode[] = [];
  for (const f of all) {
    const node = map.get(f.id)!;
    if (f.parent_folder_id && map.has(f.parent_folder_id)) {
      map.get(f.parent_folder_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function moveDocumentToFolder(
  entityCode: string, docId: string, folderId: string | null, byUserId: string,
): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  if (folderId) {
    const folder = getFolder(entityCode, folderId);
    if (!folder) throw new Error(`folder not found: ${folderId}`);
    if (folder.confidentiality_floor) {
      const docLevel: ConfidentialityLevel = ctrl.confidentiality ?? 'internal';
      if (CONF_RANK[docLevel] < CONF_RANK[folder.confidentiality_floor]) {
        throw new Error(
          `document confidentiality ${ctrl.confidentiality} below folder floor ${folder.confidentiality_floor}`,
        );
      }
    }
  }
  const after = updateDocumentControl(entityCode, docId, { folder_id: folderId });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'folder_moved', user_id: byUserId,
    before: { folder_id: ctrl.folder_id }, after: { folder_id: folderId },
  });
  return after;
}

// ──────────────────────────────────────────────────────────────────────────────
// Category + control dates
// ──────────────────────────────────────────────────────────────────────────────

export function setCategory(
  entityCode: string, docId: string, category: DocumentCategory, byUserId: string,
): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const before = getControl(doc).category;
  const after = updateDocumentControl(entityCode, docId, { category });
  appendControlAudit(entityCode, {
    document_id: docId, action: 'category_set', user_id: byUserId,
    before: { category: before }, after: { category },
  });
  return after;
}

export interface ControlDatesPatch {
  effective_date?: string | null;
  review_date?: string | null;
  expiry_date?: string | null;
}

export function setControlDates(
  entityCode: string, docId: string, dates: ControlDatesPatch, byUserId: string,
): Document {
  const doc = getDocument(entityCode, docId);
  if (!doc) throw new Error(`document not found: ${docId}`);
  const ctrl = getControl(doc);
  const after = updateDocumentControl(entityCode, docId, dates);
  appendControlAudit(entityCode, {
    document_id: docId, action: 'dates_set', user_id: byUserId,
    before: {
      effective_date: ctrl.effective_date,
      review_date: ctrl.review_date,
      expiry_date: ctrl.expiry_date,
    },
    after: dates as Record<string, unknown>,
  });
  return after;
}
