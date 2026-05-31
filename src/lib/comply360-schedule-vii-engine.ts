/**
 * @file        src/lib/comply360-schedule-vii-engine.ts
 * @sibling     NEW @ Sprint 84 · Comply360 Floor 3 ROC-Suite Arc 3.2 · DP-S84-5
 * @realizes    Companies Act Schedule VII · CSR activities (11 thematic areas) +
 *              Section 135 applicability + 2% spend computation. Feeds S85 CSR framework.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 84 · T-Phase-5.C.3.2
 * [JWT] Phase 8: POST /api/comply360/schedule-vii/{activity,allocation}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine'],
  storage_keys: ['erp_csr_activities', 'erp_csr_spend_allocations'],
} as const;

export type CSRThematicArea =
  | 'eradicating_hunger_poverty'
  | 'education'
  | 'gender_equality_women_empowerment'
  | 'reducing_inequalities'
  | 'environmental_sustainability'
  | 'protection_national_heritage'
  | 'armed_forces_veterans'
  | 'rural_sports'
  | 'pm_relief_fund'
  | 'incubators_research'
  | 'rural_development_slum';

export interface CSRActivity {
  id: string;
  activity_name: string;
  thematic_area: CSRThematicArea;
  description: string;
  location: string;
  fy: string;
  budget_allocated_inr: number;
  amount_spent_inr: number;
  implementation_partner: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface CSRSpendAllocation {
  id: string;
  fy: string;
  three_year_avg_net_profit_inr: number;
  required_csr_spend_inr: number;
  actual_spend_inr: number;
  shortfall_inr: number;
  unspent_carry_forward_inr: number;
  is_section_135_applicable: boolean;
  recorded_at: string;
}

const ACT_KEY = 'erp_csr_activities';
const ALLOC_KEY = 'erp_csr_spend_allocations';
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

const THEMATIC_AREAS: Array<{ thematic_area: CSRThematicArea; label: string; section_135_schedule_vii_ref: string }> = [
  { thematic_area: 'eradicating_hunger_poverty', label: 'Eradicating Hunger, Poverty & Malnutrition', section_135_schedule_vii_ref: 'Sch VII (i)' },
  { thematic_area: 'education', label: 'Promoting Education', section_135_schedule_vii_ref: 'Sch VII (ii)' },
  { thematic_area: 'gender_equality_women_empowerment', label: 'Gender Equality & Women Empowerment', section_135_schedule_vii_ref: 'Sch VII (iii)' },
  { thematic_area: 'reducing_inequalities', label: 'Reducing Inequalities', section_135_schedule_vii_ref: 'Sch VII (iii)' },
  { thematic_area: 'environmental_sustainability', label: 'Environmental Sustainability', section_135_schedule_vii_ref: 'Sch VII (iv)' },
  { thematic_area: 'protection_national_heritage', label: 'Protection of National Heritage', section_135_schedule_vii_ref: 'Sch VII (v)' },
  { thematic_area: 'armed_forces_veterans', label: 'Benefit of Armed Forces Veterans', section_135_schedule_vii_ref: 'Sch VII (vi)' },
  { thematic_area: 'rural_sports', label: 'Training to Promote Rural/Nationally Recognised Sports', section_135_schedule_vii_ref: 'Sch VII (vii)' },
  { thematic_area: 'pm_relief_fund', label: 'PM National Relief Fund', section_135_schedule_vii_ref: 'Sch VII (viii)' },
  { thematic_area: 'incubators_research', label: 'Contributions to Incubators / Research', section_135_schedule_vii_ref: 'Sch VII (ix)' },
  { thematic_area: 'rural_development_slum', label: 'Rural Development & Slum Area Development', section_135_schedule_vii_ref: 'Sch VII (x)' },
];

export function getCSRThematicAreas(): Array<{ thematic_area: CSRThematicArea; label: string; section_135_schedule_vii_ref: string }> {
  return THEMATIC_AREAS;
}

export function recordCSRActivity(input: Omit<CSRActivity, 'id' | 'recorded_at'>): CSRActivity {
  const a: CSRActivity = { ...input, id: uid('csr'), recorded_at: new Date().toISOString() };
  const all = readJson<CSRActivity[]>(ACT_KEY, []);
  all.push(a); writeJson(ACT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr_activity'),
    recordId: a.id, recordLabel: `CSR Activity · ${input.activity_name} · ${input.thematic_area}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-vii-engine',
  });
  return a;
}

export function listCSRActivities(opts: { fy?: string; thematic_area?: CSRThematicArea } = {}): CSRActivity[] {
  return readJson<CSRActivity[]>(ACT_KEY, []).filter((a) => {
    if (opts.fy && a.fy !== opts.fy) return false;
    if (opts.thematic_area && a.thematic_area !== opts.thematic_area) return false;
    return true;
  });
}

export function computeCSRSpendAllocation(opts: { fy: string; three_year_avg_net_profit_inr: number; actual_spend_inr: number }): CSRSpendAllocation {
  const required = Math.round(opts.three_year_avg_net_profit_inr * 0.02);
  const shortfall = Math.max(0, required - opts.actual_spend_inr);
  const carry = shortfall;
  const a: CSRSpendAllocation = {
    id: uid('alloc'), fy: opts.fy,
    three_year_avg_net_profit_inr: opts.three_year_avg_net_profit_inr,
    required_csr_spend_inr: required,
    actual_spend_inr: opts.actual_spend_inr,
    shortfall_inr: shortfall,
    unspent_carry_forward_inr: carry,
    is_section_135_applicable: opts.three_year_avg_net_profit_inr >= 50000000,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<CSRSpendAllocation[]>(ALLOC_KEY, []);
  all.push(a); writeJson(ALLOC_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('csr_spend_allocation'),
    recordId: a.id, recordLabel: `CSR Allocation · FY ${opts.fy} · required ₹${required}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-schedule-vii-engine',
  });
  return a;
}

export function checkSection135Applicability(opts: { networth_inr: number; turnover_inr: number; net_profit_inr: number }): { is_applicable: boolean; triggered_thresholds: string[] } {
  const triggered: string[] = [];
  if (opts.networth_inr >= 5000000000) triggered.push('networth_500cr');
  if (opts.turnover_inr >= 10000000000) triggered.push('turnover_1000cr');
  if (opts.net_profit_inr >= 50000000) triggered.push('net_profit_5cr');
  return { is_applicable: triggered.length > 0, triggered_thresholds: triggered };
}

registerAuditEntityType({ id: 'csr_activity', module: 'mca-roc', label: 'CSR Activity (Schedule VII)' });
registerAuditEntityType({ id: 'csr_spend_allocation', module: 'mca-roc', label: 'CSR Spend Allocation' });
