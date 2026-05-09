/**
 * @file src/lib/fai-engine.ts
 * @purpose FAI lifecycle engine · evaluateDimension · recomputeOverallStatus · createFai · transitionFai · approveFai
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability · ISO 9001:2015 Clause 8.5.1.1
 * @whom Quality Inspector · QA Manager · Production Lead
 * @decisions D-NEW-BG (FAI engine NEW) · D-NEW-BJ (3-arg userId-2nd signature)
 * @disciplines FR-21 · FR-22 (ActivityItemKind 'voucher')
 * @reuses cross-card-activity-engine.recordActivity
 * @[JWT] GET/POST /api/qulicheak/fais · localStorage key: erp_fai_${entityCode}
 */
import type {
  FirstArticleInspection,
  FaiId,
  FaiStatus,
  FaiOverall,
  FaiDimension,
  FaiDimStatus,
} from '@/types/fai';
import { faiKey } from '@/types/fai';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function readAll(entityCode: string): FirstArticleInspection[] {
  try {
    // [JWT] GET /api/qulicheak/fais
    const raw = localStorage.getItem(faiKey(entityCode));
    return raw ? (JSON.parse(raw) as FirstArticleInspection[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: FirstArticleInspection[]): void {
  try {
    // [JWT] PUT /api/qulicheak/fais (bulk)
    localStorage.setItem(faiKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota / private-mode · silent */
  }
}

function upsert(entityCode: string, fai: FirstArticleInspection): void {
  const all = readAll(entityCode);
  const idx = all.findIndex((f) => f.id === fai.id);
  if (idx >= 0) all[idx] = fai; else all.unshift(fai);
  writeAll(entityCode, all);
}

/**
 * Pure · evaluate a dimension against nominal ± tolerance.
 * Non-numeric observed: preserve caller-set status.
 */
export function evaluateDimension(d: FaiDimension): FaiDimStatus {
  const num = d.observed_numeric;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return d.status === 'na' ? 'na' : d.status;
  }
  if (d.nominal === null || d.nominal === undefined) {
    // No nominal · cannot evaluate · preserve
    return d.status === 'na' ? 'na' : d.status;
  }
  const minOk = d.tol_minus === null || d.tol_minus === undefined || num >= (d.nominal - d.tol_minus);
  const maxOk = d.tol_plus === null || d.tol_plus === undefined || num <= (d.nominal + d.tol_plus);
  return minOk && maxOk ? 'pass' : 'fail';
}

/**
 * Pure · derive overall status · fail-dominant.
 */
export function recomputeOverallStatus(dims: FaiDimension[]): FaiOverall {
  if (dims.some((d) => d.status === 'fail')) return 'fail';
  if (dims.every((d) => d.status === 'na')) return 'conditional';
  return 'pass';
}

export function listFais(entityCode: string): FirstArticleInspection[] {
  return readAll(entityCode);
}

export function getFaiById(entityCode: string, id: FaiId): FirstArticleInspection | null {
  return readAll(entityCode).find((f) => f.id === id) ?? null;
}

export function createFai(
  entityCode: string,
  userId: string,
  draft: Omit<FirstArticleInspection,
    'id' | 'audit_log' | 'status' | 'overall' | 'inspected_at' | 'inspected_by'
  >,
): FirstArticleInspection {
  const id = `FAI-${Date.now().toString(36).toUpperCase()}` as FaiId;
  const now = new Date().toISOString();
  const evaluated = draft.dimensions.map((d) => ({ ...d, status: evaluateDimension(d) }));
  const fai: FirstArticleInspection = {
    ...draft,
    id,
    status: 'submitted',
    overall: recomputeOverallStatus(evaluated),
    dimensions: evaluated,
    inspected_at: now,
    inspected_by: userId,
    audit_log: [{ at: now, by: userId, action: 'create' }],
  };
  upsert(entityCode, fai);

  // FR-22 · ActivityItemKind = 'voucher'
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: id,
    title: `FAI ${id}`,
    subtitle: `${draft.part_no} · ${draft.part_name}`,
    deep_link: `/erp/qulicheak#fai-register/${id}`,
  });

  return fai;
}

export function transitionFai(
  entityCode: string,
  userId: string,
  id: FaiId,
  next: FaiStatus,
  note?: string,
): FirstArticleInspection | null {
  const fai = getFaiById(entityCode, id);
  if (!fai) return null;
  if (fai.status === 'archived') return null;

  const action =
    next === 'approved'  ? 'approve'  :
    next === 'rejected'  ? 'reject'   :
    next === 'archived'  ? 'archive'  :
    next === 'submitted' ? 'submit'   :
    'update';

  const isApprove = next === 'approved';
  const updated: FirstArticleInspection = {
    ...fai,
    status: next,
    approved_at: isApprove ? new Date().toISOString() : fai.approved_at,
    approved_by: isApprove ? userId : fai.approved_by,
    audit_log: [...fai.audit_log, { at: new Date().toISOString(), by: userId, action, note }],
  };
  upsert(entityCode, updated);
  return updated;
}

/**
 * Convenience · approve-with-note shortcut.
 */
export function approveFai(
  entityCode: string,
  userId: string,
  id: FaiId,
  note?: string,
): FirstArticleInspection | null {
  return transitionFai(entityCode, userId, id, 'approved', note);
}

export interface FaiFilter {
  status?: FaiStatus[];
  overall?: FaiOverall[];
  partyId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export function filterFais(entityCode: string, filter: FaiFilter): FirstArticleInspection[] {
  return readAll(entityCode).filter((f) => {
    if (filter.status && !filter.status.includes(f.status)) return false;
    if (filter.overall && !filter.overall.includes(f.overall)) return false;
    if (filter.partyId && f.related_party_id !== filter.partyId) return false;
    if (filter.fromDate && f.inspected_at < filter.fromDate) return false;
    if (filter.toDate && f.inspected_at > filter.toDate) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const hay = [
        f.id, f.part_no, f.part_name, f.drawing_no ?? '',
        f.supplier_name ?? '', f.related_po_id ?? '',
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
