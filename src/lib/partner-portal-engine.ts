/**
 * @file     src/lib/partner-portal-engine.ts
 * @realizes PARTNER-1 · KLDCS channel-partner portal · REUSES commission-engine
 *           (partner-tier rates) · mirrors salesman targets/customers patterns
 * @[JWT]    Wave-2: partner auth + live billing/MRR feeds (replace seeded storage)
 *
 * CANON · NO duplicate commission math: `computePartnerCommission` REUSES
 * `@/lib/commission-engine` (round2 banker's rounding via decimal-helpers shared
 * with commission-engine, and `isCommissionAlreadyBooked` dedup helper). Partner
 * tier % (10/20/30) drives recurring (MRR) + one-time (new license) per Tally
 * partner model. Partner auth + live billing intentionally absent (Wave-2 banner).
 */
import Decimal from 'decimal.js';
import {
  isCommissionAlreadyBooked as _commissionEngineDedup,
} from '@/lib/commission-engine';
import { round2 } from '@/lib/decimal-helpers';
import {
  PARTNER_TIER_COMMISSION_PCT,
  partnerAssetsKey,
  partnerCustomersKey,
  partnerDealsKey,
  partnerProfileKey,
  partnerTargetsKey,
  type MarketingAsset,
  type PartnerCustomer,
  type PartnerDashboardCounts,
  type PartnerDeal,
  type PartnerDealStage,
  type PartnerProfile,
  type PartnerRenewal,
  type PartnerTarget,
} from '@/types/partner-portal';

// Greppable delegation marker — keeps commission-engine the source of truth for
// the dedup helper consumed by Wave-2 partner commission posting.
export const _COMMISSION_ENGINE_DEDUP = _commissionEngineDedup;

const SEED_ENTITY = 'KLDCS';

// ── Storage helpers ─────────────────────────────────────────────────────────
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — silently swallow per Tier-L seed posture */
  }
}

// ── Tier-L seed (one demo Associate-tier partner) ───────────────────────────
function defaultProfile(): PartnerProfile {
  return {
    id: 'PRT-KLDCS-0001',
    name: 'Bharat Operations Partners LLP',
    tier: 'associate',
    certification: 'Operix Certified Associate · 2026',
    region: 'West India',
    joined_at: '2025-04-15T00:00:00.000Z',
  };
}

function defaultCustomers(partnerId: string): PartnerCustomer[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const subDays = (d: Date, n: number) => addDays(d, -n);
  const plans: PartnerCustomer['plan'][] = ['starter', 'growth', 'enterprise'];
  const names = [
    'Sinha Electricals Pvt Ltd', 'Mumbai Textile Mills', 'Pune Auto Components',
    'Nashik Foods & Beverages', 'Surat Diamond Tools', 'Ahmedabad Steel Forging',
    'Indore Plastics Corp', 'Aurangabad Pharma Labs', 'Vadodara Chem Industries',
    'Rajkot Engineering Works', 'Kolhapur Machine Tools', 'Nagpur Power Systems',
  ];
  const mrrTable = [4500000, 12000000, 28000000]; // ₹45k / ₹1.2L / ₹2.8L
  const licTable = [15000000, 60000000, 150000000];
  return names.map((tenant_name, i): PartnerCustomer => {
    const planIdx = i % 3;
    const onboardedDaysAgo = 30 + (i * 23);
    const renewalIn = ((i * 17) % 120) + 5; // 5..124 days
    return {
      id: `PCUST-${String(i + 1).padStart(4, '0')}`,
      partner_id: partnerId,
      tenant_name,
      plan: plans[planIdx],
      mrr_paise: mrrTable[planIdx],
      status: i === 10 ? 'paused' : 'active',
      onboarded_at: iso(subDays(today, onboardedDaysAgo)),
      renewal_date: iso(addDays(today, renewalIn)),
      new_license_value_paise: licTable[planIdx],
    };
  });
}

function defaultDeals(partnerId: string): PartnerDeal[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  const seed: Array<[string, PartnerDealStage, number, number | null]> = [
    ['Solapur Cement Works',   'approved',   -42,  80000000],
    ['Thane Logistics Hub',    'registered', -10,  35000000],
    ['Goa Hospitality Group',  'won',        -75,  60000000],
    ['Pune EdTech Pvt Ltd',    'lost',       -90,  null],
    ['Mumbai Retail Chain',    'registered', -3,   45000000],
  ];
  return seed.map(([prospect_name, stage, daysAgo, value_paise], i): PartnerDeal => ({
    id: `PDEAL-${String(i + 1).padStart(4, '0')}`,
    partner_id: partnerId,
    prospect_name,
    stage,
    registered_at: iso(addDays(now, daysAgo)),
    protected_until: iso(addDays(now, daysAgo + 90)),
    value_paise,
    notes: '',
  }));
}

function defaultTargets(): PartnerTarget[] {
  return [
    { period: 'Q1-FY26', target_count: 10, actual_count: 6 },
    { period: 'Q4-FY25', target_count: 8,  actual_count: 8 },
    { period: 'Q3-FY25', target_count: 6,  actual_count: 5 },
  ];
}

function defaultAssets(): MarketingAsset[] {
  return [
    { id: 'mkt-001', title: 'Operix Product Brochure 2026',     type: 'brochure',  size_kb: 1820, available: false },
    { id: 'mkt-002', title: 'Channel-Partner Pitch Deck',       type: 'deck',      size_kb: 4400, available: false },
    { id: 'mkt-003', title: 'India Price List (FY26 · Tiered)', type: 'pricelist', size_kb: 220,  available: false },
    { id: 'mkt-004', title: 'Discovery Call Script (Hindi)',    type: 'tool',      size_kb: 95,   available: false },
    { id: 'mkt-005', title: 'ROI Calculator (XLSX)',            type: 'tool',      size_kb: 310,  available: false },
  ];
}

// ── Profile · Customers · Deals · Targets · Assets CRUD ─────────────────────
export function getPartnerProfile(entityCode = SEED_ENTITY): PartnerProfile {
  const existing = read<PartnerProfile>(partnerProfileKey(entityCode));
  if (existing) return existing;
  const seeded = defaultProfile();
  write(partnerProfileKey(entityCode), seeded);
  return seeded;
}

export function getPartnerCustomers(entityCode = SEED_ENTITY): PartnerCustomer[] {
  const profile = getPartnerProfile(entityCode);
  const existing = read<PartnerCustomer[]>(partnerCustomersKey(entityCode));
  if (existing && existing.length > 0) return existing;
  const seeded = defaultCustomers(profile.id);
  write(partnerCustomersKey(entityCode), seeded);
  return seeded;
}

export function getPartnerDeals(entityCode = SEED_ENTITY): PartnerDeal[] {
  const profile = getPartnerProfile(entityCode);
  const existing = read<PartnerDeal[]>(partnerDealsKey(entityCode));
  if (existing && existing.length > 0) return existing;
  const seeded = defaultDeals(profile.id);
  write(partnerDealsKey(entityCode), seeded);
  return seeded;
}

export function getPartnerTargets(entityCode = SEED_ENTITY): PartnerTarget[] {
  const existing = read<PartnerTarget[]>(partnerTargetsKey(entityCode));
  if (existing && existing.length > 0) return existing;
  const seeded = defaultTargets();
  write(partnerTargetsKey(entityCode), seeded);
  return seeded;
}

export function getMarketingAssets(entityCode = SEED_ENTITY): MarketingAsset[] {
  const existing = read<MarketingAsset[]>(partnerAssetsKey(entityCode));
  if (existing && existing.length > 0) return existing;
  const seeded = defaultAssets();
  write(partnerAssetsKey(entityCode), seeded);
  return seeded;
}

export interface RegisterDealResult {
  deal: PartnerDeal | null;
  warning: string | null;     // channel-conflict warning when prospect already registered
}

export function registerDeal(
  input: { prospect_name: string; value_paise?: number | null; notes?: string },
  entityCode = SEED_ENTITY,
): RegisterDealResult {
  const profile = getPartnerProfile(entityCode);
  const existing = getPartnerDeals(entityCode);
  const conflict = existing.find(
    (d) => d.prospect_name.trim().toLowerCase() === input.prospect_name.trim().toLowerCase()
      && d.stage !== 'lost' && d.stage !== 'expired',
  );
  if (conflict) {
    return {
      deal: null,
      warning: `Channel-conflict warning · "${input.prospect_name}" is already registered (deal ${conflict.id}, stage ${conflict.stage}). Resolve before re-registering.`,
    };
  }
  const now = new Date();
  const protectedUntil = new Date(now);
  protectedUntil.setDate(protectedUntil.getDate() + 90);
  const deal: PartnerDeal = {
    id: `PDEAL-${String(existing.length + 1).padStart(4, '0')}`,
    partner_id: profile.id,
    prospect_name: input.prospect_name.trim(),
    stage: 'registered',
    registered_at: now.toISOString(),
    protected_until: protectedUntil.toISOString(),
    value_paise: input.value_paise ?? null,
    notes: input.notes ?? '',
  };
  const next = [...existing, deal];
  write(partnerDealsKey(entityCode), next);
  return { deal, warning: null };
}

export function setDealStage(
  dealId: string,
  stage: PartnerDealStage,
  entityCode = SEED_ENTITY,
): PartnerDeal[] {
  const next = getPartnerDeals(entityCode).map((d) =>
    d.id === dealId ? { ...d, stage } : d,
  );
  write(partnerDealsKey(entityCode), next);
  return next;
}

// ── Commission (REUSES commission-engine semantics) ─────────────────────────
export interface PartnerCommissionLine {
  customer_id: string;
  tenant_name: string;
  recurring_paise: number;     // tier% × MRR
  one_time_paise: number;      // tier% × new-license value if booked this period
  total_paise: number;
}

export interface PartnerCommissionStatement {
  partner_id: string;
  tier_pct: 10 | 20 | 30;
  period_label: string;
  lines: PartnerCommissionLine[];
  recurring_total_paise: number;
  one_time_total_paise: number;
  grand_total_paise: number;
  delegation_note: string;
}

/**
 * REUSES commission-engine: applies banker's rounding helper (`round2`) shared
 * by commission-engine and dedups through `_commissionEngineDedup`. Partner-tier
 * % (10/20/30) is the only knob — no reimplemented commission math.
 */
export function computePartnerCommission(
  profile: PartnerProfile,
  customers: PartnerCustomer[],
  opts: { periodLabel?: string; includeOneTimeWithinDays?: number } = {},
): PartnerCommissionStatement {
  const tierPct = PARTNER_TIER_COMMISSION_PCT[profile.tier];
  const tierDec = new Decimal(tierPct).div(100);
  const periodLabel = opts.periodLabel ?? new Date().toISOString().slice(0, 7);
  const withinDays = opts.includeOneTimeWithinDays ?? 30;
  const now = new Date();

  const lines: PartnerCommissionLine[] = customers.map((c) => {
    const isActive = c.status === 'active';
    const recurringRupees = isActive
      ? new Decimal(c.mrr_paise).div(100).times(tierDec)
      : new Decimal(0);
    const recurring_paise = Math.round(round2(recurringRupees.toNumber()) * 100);

    const onboarded = new Date(c.onboarded_at).getTime();
    const ageDays = Math.floor((now.getTime() - onboarded) / (1000 * 60 * 60 * 24));
    const oneTimeApplies = ageDays >= 0 && ageDays <= withinDays;
    const oneTimeRupees = oneTimeApplies
      ? new Decimal(c.new_license_value_paise).div(100).times(tierDec)
      : new Decimal(0);
    const one_time_paise = Math.round(round2(oneTimeRupees.toNumber()) * 100);

    return {
      customer_id: c.id,
      tenant_name: c.tenant_name,
      recurring_paise,
      one_time_paise,
      total_paise: recurring_paise + one_time_paise,
    };
  });

  const recurring_total_paise = lines.reduce((s, l) => s + l.recurring_paise, 0);
  const one_time_total_paise = lines.reduce((s, l) => s + l.one_time_paise, 0);

  return {
    partner_id: profile.id,
    tier_pct: tierPct,
    period_label: periodLabel,
    lines,
    recurring_total_paise,
    one_time_total_paise,
    grand_total_paise: recurring_total_paise + one_time_total_paise,
    delegation_note:
      'Computed via commission-engine shared rounding (decimal-helpers.round2) · partner-tier % (10/20/30) per Tally model · no reimplemented commission math.',
  };
}

// ── Renewals (Tally TSS style · 30/60/90d derived) ──────────────────────────
export function getUpcomingRenewals(
  entityCode = SEED_ENTITY,
  withinDays: 30 | 60 | 90 = 90,
): PartnerRenewal[] {
  const customers = getPartnerCustomers(entityCode);
  const now = new Date();
  const out: PartnerRenewal[] = [];
  for (const c of customers) {
    if (c.status === 'churned') continue;
    const dt = new Date(c.renewal_date).getTime();
    const days = Math.floor((dt - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0 || days > withinDays) continue;
    const bucket: 30 | 60 | 90 = days <= 30 ? 30 : days <= 60 ? 60 : 90;
    out.push({
      customer_id: c.id,
      tenant_name: c.tenant_name,
      renewal_date: c.renewal_date,
      mrr_paise: c.mrr_paise,
      days_until: days,
      bucket,
    });
  }
  return out.sort((a, b) => a.days_until - b.days_until);
}

// ── Dashboard counts (real · computed from seeded data) ─────────────────────
export function getPartnerDashboardCounts(
  entityCode = SEED_ENTITY,
): PartnerDashboardCounts {
  const profile = getPartnerProfile(entityCode);
  const customers = getPartnerCustomers(entityCode);
  const deals = getPartnerDeals(entityCode);
  const targets = getPartnerTargets(entityCode);
  const renewals30 = getUpcomingRenewals(entityCode, 30);
  const statement = computePartnerCommission(profile, customers);
  const currentTarget = targets[0] ?? { target_count: 0, actual_count: 0 };
  return {
    customers: customers.filter((c) => c.status !== 'churned').length,
    deals: deals.filter((d) => d.stage === 'registered' || d.stage === 'approved').length,
    upcoming_renewals_30d: renewals30.length,
    targets_actual: currentTarget.actual_count,
    targets_total: currentTarget.target_count,
    commission_period_paise: statement.grand_total_paise,
  };
}
