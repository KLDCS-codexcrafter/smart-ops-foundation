/**
 * @file        src/lib/comply360-gig-workers-engine.ts
 * @sibling     NEW @ Sprint 86 · Comply360 Floor 4 Sector-Pack Arc 4.1 · DP-S86-3
 * @realizes    Code on Social Security 2020 · Section 113A · gig workers welfare.
 *              Platform aggregator registration + worker enrolment +
 *              welfare board contributions (1-2% of turnover · Section 114).
 *              USE-SITE READS S80b payroll-audit (welfare contribution audit trail).
 * @reads-from  audit-trail-engine · aggregator · payroll-audit (S80b)
 * @sprint      Sprint 86 · T-Phase-5.D.4.1 · FLOOR 4 OPENS
 * [JWT] Phase 8: POST /api/comply360/gig-workers/{aggregator,worker,contribution}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { PAYROLL_AUDIT_MODULES } from './comply360-payroll-audit-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-payroll-audit-engine',
  ],
  storage_keys: ['erp_gig_aggregator_registrations', 'erp_gig_workers', 'erp_gig_welfare_contributions'],
} as const;

export type PlatformCategory = 'transportation' | 'food_delivery' | 'logistics' | 'professional_services' | 'home_services' | 'e_commerce' | 'other';
export type ContributionQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface AggregatorRegistration {
  id: string;
  aggregator_name: string;
  registration_number: string;
  platform_category: PlatformCategory;
  state: string;
  total_gig_workers: number;
  registration_date: string;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface GigWorker {
  id: string;
  aggregator_id: string;
  worker_name: string;
  worker_id: string;
  category: PlatformCategory;
  enrolment_date: string;
  is_active: boolean;
  recorded_at: string;
}

export interface WelfareContribution {
  id: string;
  aggregator_id: string;
  fy: string;
  quarter: ContributionQuarter;
  turnover_inr: number;
  contribution_pct: number;
  contribution_amount_inr: number;
  paid_at: string | null;
  payment_reference: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const A_KEY = 'erp_gig_aggregator_registrations';
const W_KEY = 'erp_gig_workers';
const C_KEY = 'erp_gig_welfare_contributions';

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

export function registerAggregator(input: Omit<AggregatorRegistration, 'id' | 'recorded_at'>): AggregatorRegistration {
  const r: AggregatorRegistration = { ...input, id: uid('agg'), recorded_at: new Date().toISOString() };
  const all = readJson<AggregatorRegistration[]>(A_KEY, []);
  all.push(r); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('gig_aggregator_registration'),
    recordId: r.id, recordLabel: `Aggregator · ${input.aggregator_name} · ${input.platform_category}`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-gig-workers-engine',
  });
  return r;
}

export function listAggregators(opts: { platform_category?: PlatformCategory } = {}): AggregatorRegistration[] {
  return readJson<AggregatorRegistration[]>(A_KEY, []).filter((a) => !opts.platform_category || a.platform_category === opts.platform_category);
}

export function getAggregator(id: string): AggregatorRegistration | null {
  return readJson<AggregatorRegistration[]>(A_KEY, []).find((a) => a.id === id) ?? null;
}

export function enrolGigWorker(input: Omit<GigWorker, 'id' | 'recorded_at' | 'is_active'>): GigWorker {
  const w: GigWorker = { ...input, id: uid('gwk'), is_active: true, recorded_at: new Date().toISOString() };
  const all = readJson<GigWorker[]>(W_KEY, []);
  all.push(w); writeJson(W_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('gig_worker'),
    recordId: w.id, recordLabel: `Gig worker · ${input.worker_name} · ${input.category}`,
    beforeState: null, afterState: w as unknown as Record<string, unknown>,
    sourceModule: 'comply360-gig-workers-engine',
  });
  return w;
}

export function deactivateGigWorker(worker_id: string, by_bap: BAPAccountId): GigWorker {
  const all = readJson<GigWorker[]>(W_KEY, []);
  const idx = all.findIndex((w) => w.id === worker_id);
  if (idx < 0) throw new Error(`Gig worker not found: ${worker_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], is_active: false };
  writeJson(W_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('gig_worker'),
    recordId: worker_id, recordLabel: `Deactivate worker · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-gig-workers-engine',
  });
  return all[idx];
}

export function listGigWorkers(opts: { aggregator_id?: string; is_active?: boolean; category?: PlatformCategory } = {}): GigWorker[] {
  return readJson<GigWorker[]>(W_KEY, []).filter((w) => {
    if (opts.aggregator_id && w.aggregator_id !== opts.aggregator_id) return false;
    if (opts.is_active !== undefined && w.is_active !== opts.is_active) return false;
    if (opts.category && w.category !== opts.category) return false;
    return true;
  });
}

export function computeWelfareContribution(turnover_inr: number, contribution_pct: number = 1): number {
  return Math.round((turnover_inr * contribution_pct) / 100);
}

export function recordWelfareContribution(
  input: Omit<WelfareContribution, 'id' | 'recorded_at' | 'paid_at' | 'contribution_amount_inr' | 'payment_reference'>,
): WelfareContribution {
  const amount = computeWelfareContribution(input.turnover_inr, input.contribution_pct);
  const c: WelfareContribution = {
    ...input,
    id: uid('gwc'),
    contribution_amount_inr: amount,
    paid_at: null,
    payment_reference: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<WelfareContribution[]>(C_KEY, []);
  all.push(c); writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('gig_welfare_contribution'),
    recordId: c.id, recordLabel: `Welfare contribution · ${input.fy} ${input.quarter} · ₹${amount}`,
    beforeState: null, afterState: c as unknown as Record<string, unknown>,
    sourceModule: 'comply360-gig-workers-engine',
  });
  return c;
}

export function markContributionPaid(contribution_id: string, payment_reference: string, by_bap: BAPAccountId): WelfareContribution {
  const all = readJson<WelfareContribution[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === contribution_id);
  if (idx < 0) throw new Error(`Welfare contribution not found: ${contribution_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], payment_reference, paid_at: new Date().toISOString() };
  writeJson(C_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update', entityType: AUD('gig_welfare_contribution'),
    recordId: contribution_id, recordLabel: `Mark paid · ${payment_reference} · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-gig-workers-engine',
  });
  return all[idx];
}

export function listWelfareContributions(opts: { fy?: string; aggregator_id?: string; quarter?: ContributionQuarter } = {}): WelfareContribution[] {
  return readJson<WelfareContribution[]>(C_KEY, []).filter((c) => {
    if (opts.fy && c.fy !== opts.fy) return false;
    if (opts.aggregator_id && c.aggregator_id !== opts.aggregator_id) return false;
    if (opts.quarter && c.quarter !== opts.quarter) return false;
    return true;
  });
}

export function getPlatformCategories(): Array<{ category: PlatformCategory; label: string }> {
  return [
    { category: 'transportation', label: 'Transportation (ride-hail)' },
    { category: 'food_delivery', label: 'Food Delivery' },
    { category: 'logistics', label: 'Logistics & Last-mile' },
    { category: 'professional_services', label: 'Professional Services' },
    { category: 'home_services', label: 'Home Services' },
    { category: 'e_commerce', label: 'E-commerce Fulfilment' },
    { category: 'other', label: 'Other Platforms' },
  ];
}

/** USE-SITE READ S80b · payroll-audit Layer E (Labour Codes 2026 prep) module codes for welfare cross-ref */
export function getWelfareAuditCrossRefs(): string[] {
  return PAYROLL_AUDIT_MODULES.filter((m) => m.layer === 'E_labour_codes_2026_prep').map((m) => m.code);
}

registerAuditEntityType({ id: 'gig_aggregator_registration', module: 'payroll', label: 'Gig · Aggregator Registration' });
registerAuditEntityType({ id: 'gig_worker', module: 'payroll', label: 'Gig · Worker Enrolment' });
registerAuditEntityType({ id: 'gig_welfare_contribution', module: 'payroll', label: 'Gig · Welfare Contribution' });
