/**
 * @file src/lib/welder-engine.ts
 * @purpose Welder Qualification engine · ASME IX + AWS D1.1 · Welder→WPS→PQR→WPQ chain
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.c-QualiCheck-Welder-Vendor-ISO-IQC
 * @iso 25010 + ASME IX QW-322 (expiry) · AWS D1.1 4.20
 * @decisions D-NEW-BN · D-NEW-BJ (3-arg userId-2nd signature)
 * @disciplines FR-21 (no any/console/TODO) · FR-22 (Welder='master' · cert='document')
 * @reuses cross-card-activity-engine.recordActivity
 * @[JWT] GET/POST /api/qualicheck/welders|wps|pqr|wpq · localStorage keys per types/welder.ts
 */
import type {
  Welder, WelderId, WeldingProcedureSpec, WpsId,
  ProcedureQualificationRecord, PqrId,
  WelderPerformanceQualification, WpqId,
  QualificationStatus, WeldingStandard, WeldingProcess, WeldingPosition,
} from '@/types/welder';
import { welderKey, wpsKey, pqrKey, wpqKey } from '@/types/welder';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function read<T>(key: string): T[] {
  try {
    // [JWT] GET via key
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]): void {
  try {
    // [JWT] PUT via key
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* silent */
  }
}

// ───── Welder ─────
export function listWelders(entityCode: string): Welder[] {
  return read<Welder>(welderKey(entityCode));
}

export function getWelderById(entityCode: string, id: WelderId): Welder | null {
  return listWelders(entityCode).find((w) => w.id === id) ?? null;
}

export function createWelder(
  entityCode: string,
  userId: string,
  draft: Omit<Welder, 'id'>,
): Welder {
  const id = `WLD-${Date.now().toString(36).toUpperCase()}` as WelderId;
  const w: Welder = { ...draft, id };
  const all = listWelders(entityCode);
  all.unshift(w);
  write(welderKey(entityCode), all);
  // FR-22 · Welder = 'master'
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qualicheck',
    kind: 'master',
    ref_id: id,
    title: `Welder ${draft.full_name}`,
    subtitle: draft.employee_code ?? draft.party_id,
    deep_link: `/erp/qualicheck#welder-qualification/${id}`,
  });
  return w;
}

// ───── WPS ─────
export function listWps(entityCode: string): WeldingProcedureSpec[] {
  return read<WeldingProcedureSpec>(wpsKey(entityCode));
}

export function getWpsById(entityCode: string, id: WpsId): WeldingProcedureSpec | null {
  return listWps(entityCode).find((w) => w.id === id) ?? null;
}

export function createWps(
  entityCode: string,
  userId: string,
  draft: Omit<WeldingProcedureSpec, 'id'>,
): WeldingProcedureSpec {
  const id = `WPS-${Date.now().toString(36).toUpperCase()}` as WpsId;
  const wps: WeldingProcedureSpec = { ...draft, id };
  const all = listWps(entityCode);
  all.unshift(wps);
  write(wpsKey(entityCode), all);
  recordActivity(entityCode, userId, {
    card_id: 'qualicheck', kind: 'document', ref_id: id,
    title: `WPS ${draft.wps_no}`, subtitle: draft.standard.toUpperCase(),
    deep_link: `/erp/qualicheck#welder-qualification/wps/${id}`,
  });
  return wps;
}

export function approveWps(
  entityCode: string,
  userId: string,
  wpsId: WpsId,
): WeldingProcedureSpec | null {
  const all = listWps(entityCode);
  const idx = all.findIndex((w) => w.id === wpsId);
  if (idx < 0) return null;
  const updated = { ...all[idx], approved_by: userId, approved_at: new Date().toISOString() };
  all[idx] = updated;
  write(wpsKey(entityCode), all);
  return updated;
}

// ───── PQR ─────
export function listPqr(entityCode: string): ProcedureQualificationRecord[] {
  return read<ProcedureQualificationRecord>(pqrKey(entityCode));
}

export function getPqrById(entityCode: string, id: PqrId): ProcedureQualificationRecord | null {
  return listPqr(entityCode).find((p) => p.id === id) ?? null;
}

export function createPqr(
  entityCode: string,
  userId: string,
  draft: Omit<ProcedureQualificationRecord, 'id'>,
): ProcedureQualificationRecord | null {
  // Validate WPS link
  if (!getWpsById(entityCode, draft.related_wps_id)) return null;
  const id = `PQR-${Date.now().toString(36).toUpperCase()}` as PqrId;
  const pqr: ProcedureQualificationRecord = { ...draft, id };
  const all = listPqr(entityCode);
  all.unshift(pqr);
  write(pqrKey(entityCode), all);
  recordActivity(entityCode, userId, {
    card_id: 'qualicheck', kind: 'document', ref_id: id,
    title: `PQR ${draft.pqr_no}`, subtitle: `Tensile ${draft.tensile_strength_mpa} MPa`,
    deep_link: `/erp/qualicheck#welder-qualification/pqr/${id}`,
  });
  return pqr;
}

// ───── WPQ ─────
export function listWpq(entityCode: string): WelderPerformanceQualification[] {
  return read<WelderPerformanceQualification>(wpqKey(entityCode));
}

export function getWpqById(entityCode: string, id: WpqId): WelderPerformanceQualification | null {
  return listWpq(entityCode).find((w) => w.id === id) ?? null;
}

export function createWpq(
  entityCode: string,
  userId: string,
  draft: Omit<WelderPerformanceQualification, 'id'>,
): WelderPerformanceQualification | null {
  if (!getWelderById(entityCode, draft.related_welder_id)) return null;
  if (!getWpsById(entityCode, draft.related_wps_id)) return null;
  const id = `WPQ-${Date.now().toString(36).toUpperCase()}` as WpqId;
  const wpq: WelderPerformanceQualification = { ...draft, id };
  const all = listWpq(entityCode);
  all.unshift(wpq);
  write(wpqKey(entityCode), all);
  recordActivity(entityCode, userId, {
    card_id: 'qualicheck', kind: 'document', ref_id: id,
    title: `WPQ ${draft.wpq_no}`, subtitle: `${draft.standard.toUpperCase()} · expires ${draft.qualified_through.slice(0, 10)}`,
    deep_link: `/erp/qualicheck#welder-qualification/wpq/${id}`,
  });
  return wpq;
}

/** ASME IX QW-322 · auto-flip status when qualified_through has passed. */
export function recomputeWpqStatus(
  entityCode: string,
  wpqId: WpqId,
): WelderPerformanceQualification | null {
  const all = listWpq(entityCode);
  const idx = all.findIndex((w) => w.id === wpqId);
  if (idx < 0) return null;
  const w = all[idx];
  if (w.status !== 'qualified') return w;
  const expired = new Date(w.qualified_through).getTime() < Date.now();
  if (!expired) return w;
  const updated: WelderPerformanceQualification = { ...w, status: 'expired' };
  all[idx] = updated;
  write(wpqKey(entityCode), all);
  return updated;
}

export function listExpiringWpqs(
  entityCode: string,
  withinDays: number,
): WelderPerformanceQualification[] {
  const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  return listWpq(entityCode)
    .filter((w) => w.status === 'qualified')
    .filter((w) => new Date(w.qualified_through).getTime() <= cutoff)
    .sort(
      (a, b) =>
        new Date(a.qualified_through).getTime() -
        new Date(b.qualified_through).getTime(),
    );
}

// ───── Filters ─────
export interface WelderFilter {
  active?: boolean;
  search?: string;
}

export function filterWelders(entityCode: string, f: WelderFilter): Welder[] {
  return listWelders(entityCode).filter((w) => {
    if (f.active !== undefined && w.active !== f.active) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (![w.full_name, w.id, w.party_id, w.employee_code ?? ''].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export interface WpqFilter {
  status?: QualificationStatus[];
  standard?: WeldingStandard[];
  process?: WeldingProcess[];
  position?: WeldingPosition[];
  expiringWithinDays?: number;
}

export function filterWpqs(entityCode: string, f: WpqFilter): WelderPerformanceQualification[] {
  const cutoff = f.expiringWithinDays === undefined
    ? null
    : Date.now() + f.expiringWithinDays * 24 * 60 * 60 * 1000;
  return listWpq(entityCode).filter((w) => {
    if (f.status && !f.status.includes(w.status)) return false;
    if (f.standard && !f.standard.includes(w.standard)) return false;
    if (f.process && !w.processes.some((p) => f.process!.includes(p))) return false;
    if (f.position && !w.positions.some((p) => f.position!.includes(p))) return false;
    if (cutoff !== null && new Date(w.qualified_through).getTime() > cutoff) return false;
    return true;
  });
}
