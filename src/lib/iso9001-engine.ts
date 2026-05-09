/**
 * @file src/lib/iso9001-engine.ts
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BP · D-NEW-BJ (3-arg signature)
 * @disciplines FR-22 (kind='document') · URL-only storage (rejects base64)
 * @[JWT] GET/POST /api/qulicheak/iso9001 · localStorage key: erp_iso9001_${entityCode}
 */
import type {
  Iso9001AuditDocument, Iso9001ClauseId, Iso9001LinkedRecord,
} from '@/types/iso9001';
import { iso9001Key } from '@/types/iso9001';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function readAll(entityCode: string): Iso9001AuditDocument[] {
  try {
    // [JWT] GET /api/qulicheak/iso9001
    const raw = localStorage.getItem(iso9001Key(entityCode));
    return raw ? (JSON.parse(raw) as Iso9001AuditDocument[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: Iso9001AuditDocument[]): void {
  try {
    // [JWT] PUT /api/qulicheak/iso9001 (bulk)
    localStorage.setItem(iso9001Key(entityCode), JSON.stringify(list));
  } catch {
    /* silent */
  }
}

/**
 * D-NEW-BU · positive http(s) allowlist replacing data: blacklist.
 * Rejects javascript:/vbscript:/file:/chrome:/data: and malformed URLs (FR-21 · ISO 27001 CIA).
 */
export function isSafeHttpUrl(u: string): boolean {
  if (!u || typeof u !== 'string') return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function listIso9001Docs(entityCode: string): Iso9001AuditDocument[] {
  return readAll(entityCode);
}

export function getIso9001DocById(entityCode: string, id: string): Iso9001AuditDocument | null {
  return readAll(entityCode).find((d) => d.id === id) ?? null;
}

export function createIso9001Doc(
  entityCode: string,
  userId: string,
  draft: Omit<Iso9001AuditDocument, 'id' | 'created_at' | 'created_by'>,
): Iso9001AuditDocument | null {
  // D-NEW-BU · positive http(s) allowlist (FR-21 · ISO 27001 CIA)
  if (!isSafeHttpUrl(draft.document_url)) return null;
  const id = `ISO-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const doc: Iso9001AuditDocument = {
    ...draft,
    id,
    created_at: now,
    created_by: userId,
  };
  const all = readAll(entityCode);
  all.unshift(doc);
  writeAll(entityCode, all);
  // FR-22 · kind='document'
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'document',
    ref_id: id,
    title: `ISO 9001: ${draft.title}`,
    subtitle: draft.clause,
    deep_link: `/erp/qulicheak#iso9001-register/${id}`,
  });
  return doc;
}

export function linkRecordToIso9001Doc(
  entityCode: string,
  docId: string,
  link: Iso9001LinkedRecord,
): Iso9001AuditDocument | null {
  const all = readAll(entityCode);
  const idx = all.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  if (all[idx].linked_records.some((r) => r.type === link.type && r.id === link.id)) {
    return all[idx];
  }
  const updated = { ...all[idx], linked_records: [...all[idx].linked_records, link] };
  all[idx] = updated;
  writeAll(entityCode, all);
  return updated;
}

export interface Iso9001Filter {
  clause?: Iso9001ClauseId[];
  fromDate?: string;
  toDate?: string;
  linkedType?: string;
  search?: string;
}

export function filterIso9001Docs(
  entityCode: string,
  f: Iso9001Filter,
): Iso9001AuditDocument[] {
  return readAll(entityCode).filter((d) => {
    if (f.clause && !f.clause.includes(d.clause)) return false;
    if (f.fromDate && d.audit_date < f.fromDate) return false;
    if (f.toDate && d.audit_date > f.toDate) return false;
    if (f.linkedType && !d.linked_records.some((r) => r.type === f.linkedType)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (![d.title, d.description ?? '', d.auditor].join(' ').toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });
}
