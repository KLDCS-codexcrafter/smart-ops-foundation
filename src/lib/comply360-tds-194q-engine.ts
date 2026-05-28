/**
 * @file        src/lib/comply360-tds-194q-engine.ts
 * @purpose     TDS 194Q (purchase of goods > ₹50L) + 194-O (e-commerce operator)
 *              return builder · result shape mirrors gstr-builder for UI reuse
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 4 · DP-S72-3
 * @decisions   DP-S72-3 (194Q + 194-O packaged in one engine)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-tds-aggregator-engine.ts
 * @lesson-23   Result shape mirrors GSTRBuilderResult (warnings + errors + valid + payload).
 */
import {
  aggregateTDSDeductions,
  type TDSDeduction,
  type TDSAggregationFilter,
} from './comply360-tds-aggregator-engine';
import { dAdd, dSum, round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export type TDSReturnType = '194Q' | '194-O';

export interface TDSReturnWarning {
  code: string;
  message: string;
  deduction_refs: string[];
}

export interface TDSReturnError {
  code: string;
  message: string;
  deduction_refs: string[];
}

export interface TDS194QDeducteeRow {
  party_id: string;
  party_name: string;
  pan?: string;
  total_purchase: number;
  threshold_excess: number;       // amount over ₹50L
  tds_amount: number;
  rate: number;
  deduction_count: number;
}

export interface TDS194OPayeeRow {
  party_id: string;
  party_name: string;
  pan?: string;
  gross_sale: number;
  tds_amount: number;
  rate: number;
  deduction_count: number;
}

export interface TDSReturnPayload {
  return_type: TDSReturnType;
  entity_code: string;
  fy: string;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  totals: {
    deduction_count: number;
    gross_amount: number;
    tds_amount: number;
  };
  rows: TDS194QDeducteeRow[] | TDS194OPayeeRow[];
}

export interface TDSReturnResult {
  builder: TDSReturnType;
  payload: TDSReturnPayload;
  valid: boolean;
  warnings: TDSReturnWarning[];
  errors: TDSReturnError[];
}

// ── Constants ────────────────────────────────────────────────────────

export const THRESHOLD_194Q = 5000000;        // ₹50 lakh per FY per seller
export const RATE_194Q = 0.1;                 // 0.10%
export const RATE_194Q_NO_PAN = 5;            // 5% if no PAN
export const RATE_194O = 1;                   // 1% on gross sale value

// ── Internal helpers ─────────────────────────────────────────────────

function rollupByParty(deductions: TDSDeduction[]): Map<string, { name: string; pan?: string; gross: number; tds: number; count: number; rates: Set<number> }> {
  const m = new Map<string, { name: string; pan?: string; gross: number; tds: number; count: number; rates: Set<number> }>();
  for (const d of deductions) {
    const cur = m.get(d.party_id) ?? {
      name: d.party_name, pan: d.pan, gross: 0, tds: 0, count: 0, rates: new Set<number>(),
    };
    cur.gross = dAdd(cur.gross, d.gross_amount);
    cur.tds = dAdd(cur.tds, d.tds_amount);
    cur.count += 1;
    if (d.rate) cur.rates.add(d.rate);
    m.set(d.party_id, cur);
  }
  return m;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Build a 194Q return — buyers deduct 0.10% on purchases over ₹50L per seller per FY.
 * Reads the aggregator for `section: '194Q'` deductions for the given filter.
 */
export function build194QReturn(filter: TDSAggregationFilter): TDSReturnResult {
  const warnings: TDSReturnWarning[] = [];
  const errors: TDSReturnError[] = [];
  const deductions = aggregateTDSDeductions({ ...filter, section: '194Q' });

  const byParty = rollupByParty(deductions);
  const rows: TDS194QDeducteeRow[] = [];

  for (const [partyId, v] of byParty) {
    const excess = round2(Math.max(0, v.gross - THRESHOLD_194Q));
    const rate = v.rates.size === 1 ? Array.from(v.rates)[0] : RATE_194Q;
    if (!v.pan) {
      warnings.push({
        code: '194Q-NO-PAN',
        message: `Party ${v.name} has no PAN — rate jumps to 5%`,
        deduction_refs: deductions.filter((d) => d.party_id === partyId).map((d) => d.voucher_id),
      });
    }
    if (v.gross < THRESHOLD_194Q) {
      warnings.push({
        code: '194Q-BELOW-THRESHOLD',
        message: `Party ${v.name} YTD gross ₹${round2(v.gross)} below ₹50L threshold — verify`,
        deduction_refs: deductions.filter((d) => d.party_id === partyId).map((d) => d.voucher_id),
      });
    }
    rows.push({
      party_id: partyId,
      party_name: v.name,
      pan: v.pan,
      total_purchase: round2(v.gross),
      threshold_excess: excess,
      tds_amount: round2(v.tds),
      rate,
      deduction_count: v.count,
    });
  }

  const totals = {
    deduction_count: deductions.length,
    gross_amount: round2(dSum(deductions, (d) => d.gross_amount)),
    tds_amount: round2(dSum(deductions, (d) => d.tds_amount)),
  };

  const payload: TDSReturnPayload = {
    return_type: '194Q',
    entity_code: filter.entity_code,
    fy: filter.fy,
    quarter: filter.quarter,
    totals,
    rows,
  };

  return {
    builder: '194Q',
    payload,
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Build a 194-O return — e-commerce operators deduct 1% on gross sale value
 * credited/paid to e-commerce participants.
 */
export function build194OReturn(filter: TDSAggregationFilter): TDSReturnResult {
  const warnings: TDSReturnWarning[] = [];
  const errors: TDSReturnError[] = [];
  const deductions = aggregateTDSDeductions({ ...filter, section: '194-O' });

  const byParty = rollupByParty(deductions);
  const rows: TDS194OPayeeRow[] = [];

  for (const [partyId, v] of byParty) {
    const rate = v.rates.size === 1 ? Array.from(v.rates)[0] : RATE_194O;
    if (!v.pan) {
      warnings.push({
        code: '194O-NO-PAN',
        message: `Participant ${v.name} has no PAN — rate jumps to 5%`,
        deduction_refs: deductions.filter((d) => d.party_id === partyId).map((d) => d.voucher_id),
      });
    }
    rows.push({
      party_id: partyId,
      party_name: v.name,
      pan: v.pan,
      gross_sale: round2(v.gross),
      tds_amount: round2(v.tds),
      rate,
      deduction_count: v.count,
    });
  }

  const totals = {
    deduction_count: deductions.length,
    gross_amount: round2(dSum(deductions, (d) => d.gross_amount)),
    tds_amount: round2(dSum(deductions, (d) => d.tds_amount)),
  };

  const payload: TDSReturnPayload = {
    return_type: '194-O',
    entity_code: filter.entity_code,
    fy: filter.fy,
    quarter: filter.quarter,
    totals,
    rows,
  };

  return {
    builder: '194-O',
    payload,
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/** Quick threshold check for 194Q: returns true if total purchase from this party exceeds ₹50L. */
export function check194QThreshold(totalPurchaseYTD: number): boolean {
  return totalPurchaseYTD > THRESHOLD_194Q;
}

/** Quick rate resolver for 194-O. Default 1%; 5% if no PAN. */
export function resolve194ORate(hasPAN: boolean): number {
  return hasPAN ? RATE_194O : 5;
}
