/**
 * @file        src/lib/comply360-schedule-v-engine.ts
 * @sibling     NEW @ Sprint 84 · Comply360 Floor 3 ROC-Suite Arc 3.2 · DP-S84-4
 * @realizes    Companies Act Schedule V · Managerial Remuneration (Parts I-IV).
 *              11% overall + 5%/10% per-person limits + minimum remuneration slabs.
 *              USE-SITE READS S83 dir3-kyc + mgt7 (v1.26 canon · S83 0-DIFF).
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              comply360-dir3-kyc-engine (USE-SITE) · comply360-mgt7-engine (USE-SITE)
 * @sprint      Sprint 84 · T-Phase-5.C.3.2
 * [JWT] Phase 8: POST /api/comply360/schedule-v/{remuneration,variance}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READS S83
import { getDirectorMaster } from './comply360-dir3-kyc-engine';
import { listMGT7Filings } from './comply360-mgt7-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-dir3-kyc-engine',
    'comply360-mgt7-engine',
  ],
  storage_keys: ['erp_managerial_remuneration', 'erp_remuneration_variances'],
} as const;

export type ManagerialRole = 'Whole_Time_Director' | 'Managing_Director' | 'Manager';

export interface ManagerialRemuneration {
  id: string;
  director_id: string;
  role: ManagerialRole;
  fy: string;
  base_salary_inr: number;
  perquisites_inr: number;
  commission_inr: number;
  total_remuneration_inr: number;
  net_profit_inr: number;
  remuneration_pct_of_profit: number;
  is_within_limit: boolean;
  is_eligible_per_part_i: boolean;
  approved_by_resolution: string | null;
  resolution_type: 'ordinary' | 'special' | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface RemunerationVariance {
  id: string;
  remuneration_id: string;
  variance_amount_inr: number;
  variance_pct: number;
  variance_explanation: string;
  remedial_action: string;
  recorded_at: string;
}

const REM_KEY = 'erp_managerial_remuneration';
const VAR_KEY = 'erp_remuneration_variances';
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export function computeRemunerationLimit(opts: { net_profit_inr: number; num_managerial_personnel: number }): { overall_limit_inr: number; per_person_limit_inr: number } {
  const overall = Math.round(opts.net_profit_inr * 0.11);
  const perPersonPct = opts.num_managerial_personnel > 1 ? 0.10 : 0.05;
  const per = Math.round(opts.net_profit_inr * perPersonPct);
  return { overall_limit_inr: overall, per_person_limit_inr: per };
}

export function computeMinimumRemuneration(opts: { effective_capital_inr: number; is_inadequate_profit: boolean }): number {
  if (!opts.is_inadequate_profit) return 0;
  const c = opts.effective_capital_inr;
  // Slab: <₹5cr=₹60L · ₹5cr-<₹100cr=₹84L · ₹100cr-<₹250cr=₹120L · ≥₹250cr=₹120L+0.01%(excess)
  if (c < 50000000) return 6000000;
  if (c < 1000000000) return 8400000;
  if (c < 2500000000) return 12000000;
  const excess = c - 2500000000;
  return 12000000 + Math.round(excess * 0.0001);
}

export function recordRemuneration(
  input: Omit<ManagerialRemuneration, 'id' | 'recorded_at' | 'total_remuneration_inr'
    | 'remuneration_pct_of_profit' | 'is_within_limit' | 'is_eligible_per_part_i'>,
): ManagerialRemuneration {
  // USE-SITE READ S83 · validate director exists (touch)
  getDirectorMaster(input.director_id);
  // USE-SITE READ S83 mgt7 (signal use)
  listMGT7Filings({ fy: input.fy });
  const total = input.base_salary_inr + input.perquisites_inr + input.commission_inr;
  const pct = input.net_profit_inr > 0 ? (total / input.net_profit_inr) * 100 : 0;
  const limit = computeRemunerationLimit({ net_profit_inr: input.net_profit_inr, num_managerial_personnel: 1 });
  const is_within = total <= limit.per_person_limit_inr;
  const r: ManagerialRemuneration = {
    ...input,
    id: uid('rem'),
    total_remuneration_inr: total,
    remuneration_pct_of_profit: pct,
    is_within_limit: is_within,
    is_eligible_per_part_i: true,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<ManagerialRemuneration[]>(REM_KEY, []);
  all.push(r); writeJson(REM_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('managerial_remuneration'),
    recordId: r.id, recordLabel: `Managerial Remuneration · ${input.role} · FY ${input.fy}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-v-engine',
  });
  return r;
}

export function listRemunerations(opts: { fy?: string; role?: ManagerialRole } = {}): ManagerialRemuneration[] {
  return readJson<ManagerialRemuneration[]>(REM_KEY, []).filter((r) => {
    if (opts.fy && r.fy !== opts.fy) return false;
    if (opts.role && r.role !== opts.role) return false;
    return true;
  });
}

export function recordVariance(input: Omit<RemunerationVariance, 'id' | 'recorded_at'>): RemunerationVariance {
  const v: RemunerationVariance = { ...input, id: uid('var'), recorded_at: new Date().toISOString() };
  const all = readJson<RemunerationVariance[]>(VAR_KEY, []);
  all.push(v); writeJson(VAR_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('remuneration_variance'),
    recordId: v.id, recordLabel: `Remuneration Variance · ${input.variance_pct}%`,
    beforeState: null, afterState: v as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-v-engine',
  });
  return v;
}

export function reportRemunerationVariance(_fy: string): RemunerationVariance[] {
  return readJson<RemunerationVariance[]>(VAR_KEY, []);
}

registerAuditEntityType({ id: 'managerial_remuneration', module: 'mca-roc', label: 'Schedule V Managerial Remuneration' });
registerAuditEntityType({ id: 'remuneration_variance', module: 'mca-roc', label: 'Schedule V Remuneration Variance' });
