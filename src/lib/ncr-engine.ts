/**
 * @file src/lib/ncr-engine.ts
 * @purpose NCR lifecycle engine · pure compute · consumes qa-plan + qa-spec
 *          · feeds Procure360 vendor scoring (via qulicheak-bridges emit · zero Procure360 touches)
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Maintainability + Reliability + Performance Efficiency
 * @whom Quality Inspector · QA Manager
 * @decisions D-NEW-AV (NCR engine NEW) · D-NEW-AX (close emits applyQaOutcome)
 * @disciplines FR-19 (Sibling · consume-only on qa-plan + qa-spec) ·
 *              FR-21 (Banned patterns · 0 any · 0 console.log · 0 float-money · 0 TODO) ·
 *              FR-22 (ActivityItemKind · 'voucher' citation per A.3 Supplement 2) ·
 *              FR-23 (localStorage with entityCode prefix · [JWT] markers)
 * @reuses cross-card-activity-engine (recordActivity) · types/ncr (ncrKey)
 * @[JWT] GET/POST /api/qulicheak/ncrs · localStorage key: erp_ncr_${entityCode}
 */
import type {
  NonConformanceReport,
  NcrId,
  NcrStatus,
  NcrSeverity,
  NcrSource,
  NcrOutcome,
  NcrAuditEntry,
} from '@/types/ncr';
import { ncrKey } from '@/types/ncr';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function readAll(entityCode: string): NonConformanceReport[] {
  try {
    // [JWT] GET /api/qulicheak/ncrs
    const raw = localStorage.getItem(ncrKey(entityCode));
    return raw ? (JSON.parse(raw) as NonConformanceReport[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: NonConformanceReport[]): void {
  try {
    // [JWT] PUT /api/qulicheak/ncrs (bulk)
    localStorage.setItem(ncrKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota / private-mode · silent */
  }
}

export function listNcrs(entityCode: string): NonConformanceReport[] {
  return readAll(entityCode);
}

export function getNcrById(entityCode: string, id: NcrId): NonConformanceReport | null {
  return readAll(entityCode).find((n) => n.id === id) ?? null;
}

export function raiseNcr(
  entityCode: string,
  userId: string,
  draft: Omit<NonConformanceReport, 'id' | 'audit_log' | 'status' | 'raised_at' | 'raised_by'>,
): NonConformanceReport {
  const id = `NCR-${Date.now().toString(36).toUpperCase()}` as NcrId;
  const now = new Date().toISOString();
  const ncr: NonConformanceReport = {
    ...draft,
    id,
    status: 'open',
    raised_at: now,
    raised_by: userId,
    audit_log: [{ at: now, by: userId, action: 'raise' }],
  };
  const list = readAll(entityCode);
  list.unshift(ncr);
  writeAll(entityCode, list);

  // FR-22 · ActivityItemKind = 'voucher' per A.3 Supplement 2 (NCR is a voucher · Q-LOCK-4(a))
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: id,
    title: `NCR ${id}`,
    subtitle: draft.description.slice(0, 80),
    deep_link: `/erp/qulicheak#ncr-register/${id}`,
  });

  return ncr;
}

export function transitionNcr(
  entityCode: string,
  userId: string,
  id: NcrId,
  next: NcrStatus,
  note?: string,
): NonConformanceReport | null {
  const list = readAll(entityCode);
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const ncr = list[idx];
  if (ncr.status === 'closed' || ncr.status === 'cancelled') return null;

  const action: NcrAuditEntry['action'] =
    next === 'investigating' ? 'investigate' :
    next === 'capa_pending'  ? 'capa_assign' :
    next === 'cancelled'     ? 'cancel' :
    'investigate';

  const updated: NonConformanceReport = {
    ...ncr,
    status: next,
    audit_log: [...ncr.audit_log, { at: new Date().toISOString(), by: userId, action, note }],
  };
  list[idx] = updated;
  writeAll(entityCode, list);
  return updated;
}

export function closeNcr(
  entityCode: string,
  userId: string,
  id: NcrId,
  outcome: NcrOutcome,
  note?: string,
): NonConformanceReport | null {
  const list = readAll(entityCode);
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const ncr = list[idx];
  if (ncr.status === 'closed' || ncr.status === 'cancelled') return null;

  const now = new Date().toISOString();
  const updated: NonConformanceReport = {
    ...ncr,
    status: 'closed',
    closed_at: now,
    closed_by: userId,
    outcome,
    audit_log: [
      ...ncr.audit_log,
      { at: now, by: userId, action: 'close', note: note ? `${outcome} · ${note}` : `outcome=${outcome}` },
    ],
  };
  list[idx] = updated;
  writeAll(entityCode, list);

  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: id,
    title: `NCR ${id} closed`,
    subtitle: `Outcome: ${outcome}`,
    deep_link: `/erp/qulicheak#ncr-register/${id}`,
  });

  return updated;
}

export interface NcrFilter {
  status?: NcrStatus[];
  severity?: NcrSeverity[];
  source?: NcrSource[];
  fromDate?: string;
  toDate?: string;
  partyId?: string;
}

export function filterNcrs(entityCode: string, filter: NcrFilter): NonConformanceReport[] {
  return readAll(entityCode).filter((n) => {
    if (filter.status && !filter.status.includes(n.status)) return false;
    if (filter.severity && !filter.severity.includes(n.severity)) return false;
    if (filter.source && !filter.source.includes(n.source)) return false;
    if (filter.fromDate && n.raised_at < filter.fromDate) return false;
    if (filter.toDate && n.raised_at > filter.toDate) return false;
    if (filter.partyId && n.related_party_id !== filter.partyId) return false;
    return true;
  });
}
