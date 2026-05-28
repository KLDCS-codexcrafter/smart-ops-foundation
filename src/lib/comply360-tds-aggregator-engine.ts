/**
 * @file        src/lib/comply360-tds-aggregator-engine.ts
 * @purpose     Comply360 TDS aggregator · cross-card TDS deduction consolidation for
 *              194Q/194-O return builders, SFT, and Form 26AS reconciliation
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 3 · DP-S72-2
 * @decisions   D-S69-1 (100% native) · DP-S72-2 (TDS aggregator engine)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  src/lib/tds-engine.ts (computeTDS · 0-DIFF FR-19 boundary) ·
 *              localStorage `erp_group_vouchers_<entityCode>` (cross-card voucher stream)
 * @lesson-23   Engine return shapes are grepped by Block 10a tests before assertion.
 */
import { computeTDS, type TDSComputeResult } from './tds-engine';
import { dAdd, dSum, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export interface TDSDeduction {
  voucher_id: string;
  voucher_date: string;        // ISO yyyy-mm-dd
  party_id: string;
  party_name: string;
  pan?: string;
  section: string;             // e.g. '194Q', '194-O', '194J'
  deductee_type: 'individual' | 'company' | 'no_pan';
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  rate: number;
  threshold_crossed: boolean;
  source_card: 'salesx' | 'procure360' | 'eximx' | 'fincore-other' | 'unknown';
  challan_ref?: string;
}

export interface TDSAggregationFilter {
  entity_code: string;
  fy: string;                  // 'FY25-26'
  return_period?: string;      // 'MM-YYYY' optional — month filter for quarterly returns
  section?: string;            // optional section filter
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

export interface TDSSectionSummary {
  section: string;
  deduction_count: number;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  party_count: number;
}

export interface TDSTotals {
  deduction_count: number;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  by_section: TDSSectionSummary[];
}

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  tdsEngine: 'src/lib/tds-engine.ts',
  voucherStream: 'localStorage:erp_group_vouchers_<entityCode>',
} as const;

// ── Internal helpers ─────────────────────────────────────────────────

interface RawVoucher {
  id?: string;
  voucher_no?: string;
  date?: string;
  voucher_date?: string;
  party_id?: string;
  party_name?: string;
  pan?: string;
  tds_section?: string;
  tds_amount?: number;
  gross_amount?: number;
  net_amount?: number;
  status?: string;
  source_card?: TDSDeduction['source_card'];
  deductee_type?: TDSDeduction['deductee_type'];
  rate?: number;
  challan_ref?: string;
}

function loadVouchers(entityCode: string): RawVoucher[] {
  // [JWT] GET /api/accounting/vouchers?entity=<entityCode>&with_tds=1
  try {
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RawVoucher[]) : [];
  } catch {
    return [];
  }
}

function fyMonthsInRange(fy: string, quarter?: TDSAggregationFilter['quarter']): string[] {
  // fy 'FY25-26' → Apr 2025 .. Mar 2026
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy);
  if (!m) return [];
  const startYear = 2000 + Number(m[1]);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;       // 3 = April (0-based)
    const year = monthIndex < 3 ? startYear + 1 : startYear;
    months.push(`${String(monthIndex + 1).padStart(2, '0')}-${year}`);
  }
  if (!quarter) return months;
  const qMap: Record<NonNullable<TDSAggregationFilter['quarter']>, [number, number, number]> = {
    Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11],
  };
  return qMap[quarter].map((i) => months[i]);
}

function voucherInPeriod(voucherDate: string, periods: string[] | null, exact?: string): boolean {
  if (!voucherDate) return false;
  const d = voucherDate.length >= 10 ? voucherDate.slice(0, 10) : voucherDate;
  const parts = d.split('-');
  if (parts.length < 3) return false;
  const mm = parts[1];
  const yyyy = parts[0];
  const key = `${mm}-${yyyy}`;
  if (exact) return key === exact;
  if (!periods) return true;
  return periods.includes(key);
}

function inferSourceCard(v: RawVoucher): TDSDeduction['source_card'] {
  if (v.source_card) return v.source_card;
  const id = (v.id ?? v.voucher_no ?? '').toLowerCase();
  if (id.startsWith('sal')) return 'salesx';
  if (id.startsWith('pur') || id.startsWith('proc')) return 'procure360';
  if (id.startsWith('exim') || id.startsWith('imp') || id.startsWith('exp')) return 'eximx';
  return 'unknown';
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Aggregate TDS deductions for a given entity + FY (+ optional quarter/period/section).
 * Reads posted vouchers from cross-card storage; recomputes tds via `computeTDS` when
 * the voucher already carries a `tds_section`, falling back to voucher-level fields.
 */
export function aggregateTDSDeductions(filter: TDSAggregationFilter): TDSDeduction[] {
  const vouchers = loadVouchers(filter.entity_code);
  const periods = filter.return_period ? null : fyMonthsInRange(filter.fy, filter.quarter);
  const out: TDSDeduction[] = [];

  for (const v of vouchers) {
    if (v.status && v.status !== 'posted') continue;
    if (!v.tds_section) continue;
    if (filter.section && v.tds_section !== filter.section) continue;
    const vDate = v.voucher_date ?? v.date ?? '';
    if (!voucherInPeriod(vDate, periods, filter.return_period)) continue;

    const partyId = v.party_id ?? '';
    const gross = round2(v.gross_amount ?? 0);
    let tdsAmt = v.tds_amount ?? 0;
    let rate = v.rate ?? 0;
    let netAmt = v.net_amount ?? gross - tdsAmt;
    const deducteeType: TDSDeduction['deductee_type'] = v.deductee_type ?? 'company';

    if (!v.tds_amount) {
      // Recompute via FR-19 engine — single source of truth
      const r: TDSComputeResult = computeTDS(
        gross,
        v.tds_section,
        deducteeType,
        partyId,
        filter.entity_code,
      );
      if (!r.applicable) continue;
      tdsAmt = r.tdsAmount;
      rate = r.rate;
      netAmt = r.netAmount;
    }

    out.push({
      voucher_id: v.id ?? v.voucher_no ?? '',
      voucher_date: vDate.slice(0, 10),
      party_id: partyId,
      party_name: v.party_name ?? partyId,
      pan: v.pan,
      section: v.tds_section,
      deductee_type: deducteeType,
      gross_amount: gross,
      tds_amount: round2(tdsAmt),
      net_amount: round2(netAmt),
      rate,
      threshold_crossed: true,
      source_card: inferSourceCard(v),
      challan_ref: v.challan_ref,
    });
  }

  return out;
}

/** Group deductions by section and roll up amounts + distinct-party count. */
export function aggregateBySection(filter: TDSAggregationFilter): TDSSectionSummary[] {
  const deductions = aggregateTDSDeductions(filter);
  const map = new Map<string, { gross: number; tds: number; net: number; parties: Set<string>; count: number }>();
  for (const d of deductions) {
    const cur = map.get(d.section) ?? { gross: 0, tds: 0, net: 0, parties: new Set<string>(), count: 0 };
    cur.gross = dAdd(cur.gross, d.gross_amount);
    cur.tds = dAdd(cur.tds, d.tds_amount);
    cur.net = dAdd(cur.net, d.net_amount);
    cur.parties.add(d.party_id);
    cur.count += 1;
    map.set(d.section, cur);
  }
  return Array.from(map.entries())
    .map(([section, v]) => ({
      section,
      deduction_count: v.count,
      gross_amount: round2(v.gross),
      tds_amount: round2(v.tds),
      net_amount: round2(v.net),
      party_count: v.parties.size,
    }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

/** Compute totals across a deduction set. */
export function computeTotalTDS(deductions: TDSDeduction[]): TDSTotals {
  const gross = round2(dSum(deductions, (d) => d.gross_amount));
  const tds = round2(dSum(deductions, (d) => d.tds_amount));
  const net = round2(dSum(deductions, (d) => d.net_amount));
  const map = new Map<string, TDSSectionSummary>();
  for (const d of deductions) {
    const cur = map.get(d.section) ?? {
      section: d.section, deduction_count: 0,
      gross_amount: 0, tds_amount: 0, net_amount: 0, party_count: 0,
    };
    cur.deduction_count += 1;
    cur.gross_amount = round2(dAdd(cur.gross_amount, d.gross_amount));
    cur.tds_amount = round2(dAdd(cur.tds_amount, d.tds_amount));
    cur.net_amount = round2(dAdd(cur.net_amount, d.net_amount));
    map.set(d.section, cur);
  }
  // Distinct party count per section (re-scan for accuracy)
  const partyBySection = new Map<string, Set<string>>();
  for (const d of deductions) {
    const set = partyBySection.get(d.section) ?? new Set<string>();
    set.add(d.party_id);
    partyBySection.set(d.section, set);
  }
  for (const [section, summary] of map) {
    summary.party_count = (partyBySection.get(section) ?? new Set()).size;
  }
  return {
    deduction_count: deductions.length,
    gross_amount: gross,
    tds_amount: tds,
    net_amount: net,
    by_section: Array.from(map.values()).sort((a, b) => a.section.localeCompare(b.section)),
  };
}

/** Sum gross purchases for a single party-section in the FY (for 194Q/194-O thresholds). */
export function partyYTDGross(
  filter: TDSAggregationFilter,
  partyId: string,
  section: string,
): number {
  const all = aggregateTDSDeductions({ ...filter, section, return_period: undefined });
  return round2(dSum(all.filter((d) => d.party_id === partyId), (d) => d.gross_amount));
}
