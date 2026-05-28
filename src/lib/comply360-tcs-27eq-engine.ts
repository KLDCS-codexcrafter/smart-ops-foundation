/**
 * @file        src/lib/comply360-tcs-27eq-engine.ts
 * @purpose     Comply360 TCS 27EQ engine · §206C Tax Collected at Source quarterly return
 *              (collection codes 6CE/6CL/6CM etc.) · reads voucher stream + reuses
 *              TDSAggregationFilter shape from the S72 tds-aggregator (0-DIFF read).
 * @sprint      Sprint 76a · T-Phase-5.A.1.8-PASS-A · Block 3 · DP-S76-3
 * @decisions   D-S69-1 (100% native) · DP-S76-3 (27EQ reads tds-aggregator)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23 contract
 * @reads-from  src/lib/comply360-tds-aggregator-engine.ts (TDSAggregationFilter shape · 0-DIFF) ·
 *              localStorage `erp_group_vouchers_<entityCode>` (cross-card voucher stream · same source)
 * @lesson-23   Block 8 tests MUST grep export signatures before asserting return shapes.
 */
import type { TDSAggregationFilter } from './comply360-tds-aggregator-engine';
import { dAdd, dSum, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

/** TCS collection codes under §206C (subset used by 27EQ filings). */
export type TCSCollectionCode =
  | '6CE'   // Scrap
  | '6CL'   // Tendu leaves
  | '6CM'   // Minerals
  | '6CO'   // Foreign remittance under LRS
  | '6CR'   // Sale of goods §206C(1H)
  | '6CP';  // Motor vehicle > ₹10L

export interface TCSCollection {
  voucher_id: string;
  voucher_date: string;          // ISO yyyy-mm-dd
  collectee_id: string;
  collectee_name: string;
  pan?: string;
  collection_code: TCSCollectionCode;
  collectee_type: 'individual' | 'company' | 'no_pan';
  gross_amount: number;
  tcs_amount: number;
  rate: number;
  challan_ref?: string;
}

export interface TCSCodeSummary {
  collection_code: TCSCollectionCode;
  collection_count: number;
  gross_amount: number;
  tcs_amount: number;
  collectee_count: number;
}

export interface TCS27EQReturn {
  builder: 'tcs-27eq';
  filter: TDSAggregationFilter;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  collections: TCSCollection[];
  by_code: TCSCodeSummary[];
  totals: { gross_amount: number; tcs_amount: number; collection_count: number };
  warnings: string[];
  errors: string[];
  valid: boolean;
}

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  tdsAggregator: 'src/lib/comply360-tds-aggregator-engine.ts',
  voucherStream: 'localStorage:erp_group_vouchers_<entityCode>',
} as const;

// ── Statutory rates (§206C · FY25-26) ────────────────────────────────

const TCS_RATES: Record<TCSCollectionCode, { individual: number; company: number; no_pan: number }> = {
  '6CE': { individual: 1.0, company: 1.0, no_pan: 5.0 },
  '6CL': { individual: 5.0, company: 5.0, no_pan: 10.0 },
  '6CM': { individual: 2.0, company: 2.0, no_pan: 5.0 },
  '6CO': { individual: 5.0, company: 5.0, no_pan: 10.0 },
  '6CR': { individual: 0.1, company: 0.1, no_pan: 1.0 },
  '6CP': { individual: 1.0, company: 1.0, no_pan: 5.0 },
};

const QUARTER_MONTHS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', [number, number, number]> = {
  Q1: [4, 5, 6], Q2: [7, 8, 9], Q3: [10, 11, 12], Q4: [1, 2, 3],
};

// ── Internal helpers ─────────────────────────────────────────────────

interface RawVoucher {
  id?: string;
  voucher_no?: string;
  date?: string;
  voucher_date?: string;
  party_id?: string;
  party_name?: string;
  pan?: string;
  tcs_section?: string;
  tcs_collection_code?: TCSCollectionCode;
  tcs_amount?: number;
  gross_amount?: number;
  rate?: number;
  status?: string;
  deductee_type?: TCSCollection['collectee_type'];
  challan_ref?: string;
}

function loadVouchers(entityCode: string): RawVoucher[] {
  // [JWT] GET /api/accounting/vouchers?entity=<entityCode>&with_tcs=1
  try {
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RawVoucher[]) : [];
  } catch {
    return [];
  }
}

function voucherMonth(voucherDate: string): number {
  if (!voucherDate || voucherDate.length < 7) return 0;
  return Number(voucherDate.slice(5, 7));
}

function voucherYear(voucherDate: string): number {
  if (!voucherDate || voucherDate.length < 4) return 0;
  return Number(voucherDate.slice(0, 4));
}

function isInQuarter(voucherDate: string, fy: string, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): boolean {
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy);
  if (!m) return false;
  const startYear = 2000 + Number(m[1]);
  const months = QUARTER_MONTHS[quarter];
  const vm = voucherMonth(voucherDate);
  const vy = voucherYear(voucherDate);
  if (!months.includes(vm)) return false;
  // Q1-Q3 land in startYear; Q4 (Jan-Mar) lands in startYear+1
  const expectedYear = quarter === 'Q4' ? startYear + 1 : startYear;
  return vy === expectedYear;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Aggregate TCS collections from the cross-card voucher stream.
 * Reuses the S72 TDSAggregationFilter shape (entity_code + fy + optional section/quarter)
 * to keep call-site ergonomics aligned with the TDS family.
 */
export function aggregateTCSCollections(filter: TDSAggregationFilter): TCSCollection[] {
  const vouchers = loadVouchers(filter.entity_code);
  const out: TCSCollection[] = [];

  for (const v of vouchers) {
    if (v.status && v.status !== 'posted') continue;
    if (!v.tcs_collection_code) continue;
    if (filter.section && v.tcs_section !== filter.section) continue;
    const vDate = (v.voucher_date ?? v.date ?? '').slice(0, 10);
    if (!vDate) continue;
    if (filter.quarter && !isInQuarter(vDate, filter.fy, filter.quarter)) continue;

    const gross = round2(v.gross_amount ?? 0);
    const code = v.tcs_collection_code;
    const collecteeType: TCSCollection['collectee_type'] = v.deductee_type ?? 'company';
    const rate = v.rate ?? TCS_RATES[code]?.[collecteeType] ?? 0;
    const tcsAmt = v.tcs_amount ?? round2((gross * rate) / 100);

    out.push({
      voucher_id: v.id ?? v.voucher_no ?? '',
      voucher_date: vDate,
      collectee_id: v.party_id ?? '',
      collectee_name: v.party_name ?? v.party_id ?? '',
      pan: v.pan,
      collection_code: code,
      collectee_type: collecteeType,
      gross_amount: gross,
      tcs_amount: round2(tcsAmt),
      rate,
      challan_ref: v.challan_ref,
    });
  }
  return out;
}

/** Compute TCS liability for a set of collections (gross sum + tcs sum). */
export function computeTCSLiability(collections: TCSCollection[]): {
  gross_amount: number; tcs_amount: number; collection_count: number;
} {
  return {
    gross_amount: round2(dSum(collections, (c) => c.gross_amount)),
    tcs_amount: round2(dSum(collections, (c) => c.tcs_amount)),
    collection_count: collections.length,
  };
}

/**
 * Build a 27EQ quarterly return payload.
 * Groups collections by §206C collection code, computes per-code summaries,
 * and surfaces warnings for missing PAN (higher-rate trigger) or zero collections.
 */
export function build27EQ(
  filter: TDSAggregationFilter,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
): TCS27EQReturn {
  const collections = aggregateTCSCollections({ ...filter, quarter });
  const warnings: string[] = [];
  const errors: string[] = [];

  if (collections.length === 0) {
    warnings.push(`No TCS collections found for ${filter.entity_code} · ${filter.fy} · ${quarter}`);
  }
  const missingPan = collections.filter((c) => !c.pan && c.collectee_type !== 'no_pan').length;
  if (missingPan > 0) {
    warnings.push(`${missingPan} collections missing PAN — verify collectee_type`);
  }

  const map = new Map<TCSCollectionCode, {
    gross: number; tcs: number; count: number; parties: Set<string>;
  }>();
  for (const c of collections) {
    const cur = map.get(c.collection_code) ?? { gross: 0, tcs: 0, count: 0, parties: new Set<string>() };
    cur.gross = dAdd(cur.gross, c.gross_amount);
    cur.tcs = dAdd(cur.tcs, c.tcs_amount);
    cur.count += 1;
    cur.parties.add(c.collectee_id);
    map.set(c.collection_code, cur);
  }
  const by_code: TCSCodeSummary[] = Array.from(map.entries())
    .map(([collection_code, v]) => ({
      collection_code,
      collection_count: v.count,
      gross_amount: round2(v.gross),
      tcs_amount: round2(v.tcs),
      collectee_count: v.parties.size,
    }))
    .sort((a, b) => a.collection_code.localeCompare(b.collection_code));

  return {
    builder: 'tcs-27eq',
    filter,
    quarter,
    collections,
    by_code,
    totals: computeTCSLiability(collections),
    warnings,
    errors,
    valid: errors.length === 0,
  };
}

/** Helper: list supported collection codes (UI dropdowns in Pass B). */
export function listCollectionCodes(): TCSCollectionCode[] {
  return Object.keys(TCS_RATES) as TCSCollectionCode[];
}
