/**
 * @file src/lib/mtc-engine.ts
 * @purpose MTC lifecycle engine · pure compute · per-parameter evaluation + overall status derivation
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability · ISO 9001:2015 Clause 8.4.2
 * @whom Quality Inspector · QA Manager
 * @decisions D-NEW-BF (MTC engine NEW) · D-NEW-BJ (3-arg userId-2nd signature)
 * @disciplines FR-21 (Banned patterns · 0 any · 0 console.log · 0 float-money · 0 TODO) ·
 *              FR-22 (ActivityItemKind 'voucher')
 * @reuses cross-card-activity-engine.recordActivity
 * @[JWT] GET/POST /api/qualicheck/mtcs · localStorage key: erp_mtc_${entityCode}
 */
import type {
  MaterialTestCertificate,
  MtcId,
  MtcStatus,
  MtcOverall,
  MtcParameter,
  MtcParamStatus,
} from '@/types/mtc';
import { mtcKey } from '@/types/mtc';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function readAll(entityCode: string): MaterialTestCertificate[] {
  try {
    // [JWT] GET /api/qualicheck/mtcs
    const raw = localStorage.getItem(mtcKey(entityCode));
    return raw ? (JSON.parse(raw) as MaterialTestCertificate[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: MaterialTestCertificate[]): void {
  try {
    // [JWT] PUT /api/qualicheck/mtcs (bulk)
    localStorage.setItem(mtcKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota / private-mode · silent */
  }
}

function upsert(entityCode: string, mtc: MaterialTestCertificate): void {
  const all = readAll(entityCode);
  const idx = all.findIndex((m) => m.id === mtc.id);
  if (idx >= 0) all[idx] = mtc; else all.unshift(mtc);
  writeAll(entityCode, all);
}

/**
 * Pure · evaluate a parameter against its spec. If observed is non-numeric and
 * caller did not pre-set status, returns existing status (defaults to 'na').
 */
export function evaluateParameter(p: MtcParameter): MtcParamStatus {
  const num = p.observed_numeric;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return p.status === 'na' ? 'na' : p.status;
  }
  const minOk = p.spec_min === null || p.spec_min === undefined || num >= p.spec_min;
  const maxOk = p.spec_max === null || p.spec_max === undefined || num <= p.spec_max;
  return minOk && maxOk ? 'pass' : 'fail';
}

/**
 * Pure · derive overall status from parameters · fail-dominant.
 * Any 'fail' → 'fail'. All 'pass'/'na' with at least one 'pass' → 'pass'.
 * Mixed pass + na with explicit 'conditional' marker preserved by caller.
 */
export function deriveOverall(params: MtcParameter[]): MtcOverall {
  if (params.some((p) => p.status === 'fail')) return 'fail';
  if (params.every((p) => p.status === 'na')) return 'conditional';
  return 'pass';
}

export function listMtcs(entityCode: string): MaterialTestCertificate[] {
  return readAll(entityCode);
}

export function getMtcById(entityCode: string, id: MtcId): MaterialTestCertificate | null {
  return readAll(entityCode).find((m) => m.id === id) ?? null;
}

export function createMtc(
  entityCode: string,
  userId: string,
  draft: Omit<MaterialTestCertificate,
    'id' | 'audit_log' | 'status' | 'overall' | 'uploaded_at' | 'uploaded_by'
  >,
): MaterialTestCertificate {
  const id = `MTC-${Date.now().toString(36).toUpperCase()}` as MtcId;
  const now = new Date().toISOString();
  const evaluated = draft.parameters.map((p) => ({ ...p, status: evaluateParameter(p) }));
  const mtc: MaterialTestCertificate = {
    ...draft,
    id,
    status: 'submitted',
    overall: deriveOverall(evaluated),
    parameters: evaluated,
    uploaded_at: now,
    uploaded_by: userId,
    audit_log: [{ at: now, by: userId, action: 'create' }],
  };
  upsert(entityCode, mtc);

  // FR-22 · ActivityItemKind = 'voucher'
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qualicheck',
    kind: 'voucher',
    ref_id: id,
    title: `MTC ${id}`,
    subtitle: `${draft.supplier_name} · ${draft.certificate_no}`,
    deep_link: `/erp/qualicheck#mtc-register/${id}`,
  });

  return mtc;
}

export function transitionMtc(
  entityCode: string,
  userId: string,
  id: MtcId,
  next: MtcStatus,
  note?: string,
): MaterialTestCertificate | null {
  const mtc = getMtcById(entityCode, id);
  if (!mtc) return null;
  if (mtc.status === 'archived') return null;

  const action: MtcAuditMap[typeof next] | 'update' =
    next === 'approved'  ? 'approve'  :
    next === 'rejected'  ? 'reject'   :
    next === 'archived'  ? 'archive'  :
    next === 'submitted' ? 'submit'   :
    'update';

  const isApprove = next === 'approved';
  const updated: MaterialTestCertificate = {
    ...mtc,
    status: next,
    approved_at: isApprove ? new Date().toISOString() : mtc.approved_at,
    approved_by: isApprove ? userId : mtc.approved_by,
    audit_log: [...mtc.audit_log, { at: new Date().toISOString(), by: userId, action, note }],
  };
  upsert(entityCode, updated);
  return updated;
}

// internal mapping for transitionMtc audit-action lookup
type MtcAuditMap = {
  draft: 'update';
  submitted: 'submit';
  approved: 'approve';
  rejected: 'reject';
  archived: 'archive';
};

export interface MtcFilter {
  status?: MtcStatus[];
  overall?: MtcOverall[];
  partyId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export function filterMtcs(entityCode: string, filter: MtcFilter): MaterialTestCertificate[] {
  return readAll(entityCode).filter((m) => {
    if (filter.status && !filter.status.includes(m.status)) return false;
    if (filter.overall && !filter.overall.includes(m.overall)) return false;
    if (filter.partyId && m.related_party_id !== filter.partyId) return false;
    if (filter.fromDate && m.uploaded_at < filter.fromDate) return false;
    if (filter.toDate && m.uploaded_at > filter.toDate) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const hay = [
        m.id, m.certificate_no, m.supplier_name, m.lot_no ?? '',
        m.heat_no ?? '', m.item_name ?? '',
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
