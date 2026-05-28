/**
 * @file        src/lib/comply360-form16-engine.ts
 * @purpose     Comply360 Form 16 / Form 16A bulk TDS certificate generation.
 *              Form 16  = salary certificate (section 192 deductees)
 *              Form 16A = non-salary certificate (194x deductees)
 *              Groups TDS deductions by party_id -> per-party certificate.
 * @sprint      Sprint 74b · T-Phase-5.A.1.6-PASS-B · Block 3 · DP-S74-4
 * @decisions   D-S69-1 (100% native) · DP-S74-4 (Form 16 reads S72 tds-aggregator) ·
 *              DP-S74-5 (TRACES = Phase-8 stub)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure ·
 *              FR-104 RECG · FR-106 nav-only-extends
 * @reads-from  src/lib/comply360-tds-aggregator-engine.ts (0-DIFF · §H frozen) ·
 *              localStorage `erp_group_vouchers_<entityCode>` (transitively · via aggregator)
 * @lesson-23   Aggregator exports grepped before consuming; shapes verified.
 */
import {
  aggregateTDSDeductions,
  aggregateBySection,
  partyYTDGross,
  type TDSDeduction,
  type TDSAggregationFilter,
} from './comply360-tds-aggregator-engine';
import { dAdd, dSum, round2 } from './decimal-helpers';

// ── READS_FROM contract (Lesson 23) ──────────────────────────────────

export const READS_FROM = {
  tdsAggregatorEngine: 'src/lib/comply360-tds-aggregator-engine.ts',
} as const;

// ── Public Types ─────────────────────────────────────────────────────

/**
 * Quarterly Part-A row (TDS deposited summary).
 * Mirrors TRACES Part-A challan/BIN structure (Phase-8 will reconcile with NSDL).
 */
export interface Form16PartARow {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  receipt_no: string;            // BIN/receipt placeholder
  gross_paid: number;
  tds_deducted: number;
  tds_deposited: number;
  challan_count: number;
}

/**
 * Form 16 Part-B (salary breakup · section 192).
 * Computed values are best-effort from voucher stream; gross/exemptions/perquisites
 * pre-populate from aggregator and may be overridden by payroll input downstream.
 */
export interface Form16PartB {
  gross_salary: number;
  exempt_allowances: number;
  perquisites: number;
  profits_in_lieu: number;
  standard_deduction: number;
  chapter_via_deductions: number;
  taxable_income: number;
  tax_on_income: number;
  rebate_87a: number;
  surcharge: number;
  health_education_cess: number;
  tax_payable: number;
  tds_total: number;
}

export interface Form16Certificate {
  certificate_type: 'FORM_16';
  certificate_no: string;
  fy: string;
  party_id: string;          // employee id (payroll)
  party_name: string;
  pan?: string;
  deductor_entity: string;
  part_a: Form16PartARow[];
  part_b: Form16PartB;
  total_tds: number;
  issued_on: string;         // ISO date
  generated_at: string;      // ISO timestamp
}

export interface Form16ASectionRow {
  section: string;           // 194J / 194C / 194Q etc
  gross_paid: number;
  tds_deducted: number;
  rate_applied: number;      // weighted-avg rate
  deduction_count: number;
}

export interface Form16ACertificate {
  certificate_type: 'FORM_16A';
  certificate_no: string;
  fy: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  party_id: string;          // vendor / non-salary deductee
  party_name: string;
  pan?: string;
  deductor_entity: string;
  part_a: Form16PartARow[];
  section_rows: Form16ASectionRow[];
  total_gross: number;
  total_tds: number;
  issued_on: string;
  generated_at: string;
}

// ── Internal helpers ─────────────────────────────────────────────────

const SALARY_SECTIONS = new Set(['192', '192A', '192B']);

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function quarterOf(isoDate: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  // India FY: Q1 = Apr-Jun · Q2 = Jul-Sep · Q3 = Oct-Dec · Q4 = Jan-Mar
  const m = Number(isoDate.slice(5, 7));
  if (m >= 4 && m <= 6) return 'Q1';
  if (m >= 7 && m <= 9) return 'Q2';
  if (m >= 10 && m <= 12) return 'Q3';
  return 'Q4';
}

function deductionsForParty(
  filter: TDSAggregationFilter,
  partyId: string,
  sectionPredicate: (s: string) => boolean,
): TDSDeduction[] {
  return aggregateTDSDeductions({ ...filter, return_period: undefined })
    .filter((d) => d.party_id === partyId && sectionPredicate(d.section));
}

function buildPartAFromDeductions(deductions: TDSDeduction[]): Form16PartARow[] {
  const byQuarter = new Map<'Q1' | 'Q2' | 'Q3' | 'Q4', TDSDeduction[]>();
  for (const d of deductions) {
    const q = quarterOf(d.voucher_date);
    const cur = byQuarter.get(q) ?? [];
    cur.push(d);
    byQuarter.set(q, cur);
  }
  const out: Form16PartARow[] = [];
  for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
    const rows = byQuarter.get(q) ?? [];
    if (rows.length === 0) continue;
    const gross = round2(dSum(rows, (r) => r.gross_amount));
    const tds = round2(dSum(rows, (r) => r.tds_amount));
    out.push({
      quarter: q,
      receipt_no: `BIN-${q}-${rows[0].voucher_date.slice(0, 7)}`,
      gross_paid: gross,
      tds_deducted: tds,
      tds_deposited: tds,                     // Phase-8 TRACES reco will adjust
      challan_count: rows.filter((r) => r.challan_ref).length,
    });
  }
  return out;
}

function emptyPartB(): Form16PartB {
  return {
    gross_salary: 0, exempt_allowances: 0, perquisites: 0, profits_in_lieu: 0,
    standard_deduction: 50000, chapter_via_deductions: 0, taxable_income: 0,
    tax_on_income: 0, rebate_87a: 0, surcharge: 0, health_education_cess: 0,
    tax_payable: 0, tds_total: 0,
  };
}

// ── Public API ───────────────────────────────────────────────────────

/** Build a Form 16 (salary · section 192 deductees) for a single employee. */
export function buildForm16(
  partyId: string,
  partyName: string,
  filter: TDSAggregationFilter,
  options: { pan?: string; deductorEntity?: string } = {},
): Form16Certificate {
  const salaryDeductions = deductionsForParty(filter, partyId, (s) =>
    SALARY_SECTIONS.has(s),
  );
  const part_a = buildPartAFromDeductions(salaryDeductions);
  const gross_salary = round2(dSum(salaryDeductions, (d) => d.gross_amount));
  const tds_total = round2(dSum(salaryDeductions, (d) => d.tds_amount));
  const part_b: Form16PartB = {
    ...emptyPartB(),
    gross_salary,
    taxable_income: round2(Math.max(0, dAdd(gross_salary, -50000))),
    tds_total,
    tax_payable: tds_total,
  };
  return {
    certificate_type: 'FORM_16',
    certificate_no: `F16-${filter.fy}-${partyId}`,
    fy: filter.fy,
    party_id: partyId,
    party_name: partyName,
    pan: options.pan ?? salaryDeductions[0]?.pan,
    deductor_entity: options.deductorEntity ?? filter.entity_code,
    part_a,
    part_b,
    total_tds: tds_total,
    issued_on: todayIso(),
    generated_at: nowIso(),
  };
}

/** Build a Form 16A (non-salary · 194x deductees) for a single vendor / quarter. */
export function buildForm16A(
  partyId: string,
  partyName: string,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  filter: TDSAggregationFilter,
  options: { pan?: string; deductorEntity?: string } = {},
): Form16ACertificate {
  const nonSalary = deductionsForParty({ ...filter, quarter }, partyId, (s) =>
    !SALARY_SECTIONS.has(s),
  ).filter((d) => quarterOf(d.voucher_date) === quarter);

  const part_a = buildPartAFromDeductions(nonSalary);
  const bySection = new Map<string, TDSDeduction[]>();
  for (const d of nonSalary) {
    const cur = bySection.get(d.section) ?? [];
    cur.push(d);
    bySection.set(d.section, cur);
  }
  const section_rows: Form16ASectionRow[] = Array.from(bySection.entries())
    .map(([section, rows]) => {
      const gross = round2(dSum(rows, (r) => r.gross_amount));
      const tds = round2(dSum(rows, (r) => r.tds_amount));
      const rate = gross > 0 ? round2((tds / gross) * 100) : 0;
      return {
        section,
        gross_paid: gross,
        tds_deducted: tds,
        rate_applied: rate,
        deduction_count: rows.length,
      };
    })
    .sort((a, b) => a.section.localeCompare(b.section));

  const total_gross = round2(dSum(section_rows, (r) => r.gross_paid));
  const total_tds = round2(dSum(section_rows, (r) => r.tds_deducted));

  return {
    certificate_type: 'FORM_16A',
    certificate_no: `F16A-${filter.fy}-${quarter}-${partyId}`,
    fy: filter.fy,
    quarter,
    party_id: partyId,
    party_name: partyName,
    pan: options.pan ?? nonSalary[0]?.pan,
    deductor_entity: options.deductorEntity ?? filter.entity_code,
    part_a,
    section_rows,
    total_gross,
    total_tds,
    issued_on: todayIso(),
    generated_at: nowIso(),
  };
}

/** Bulk-generate Form 16 for every salary deductee in the FY. */
export function bulkGenerateForm16(
  filter: TDSAggregationFilter,
  options: { deductorEntity?: string } = {},
): Form16Certificate[] {
  const all = aggregateTDSDeductions({ ...filter, return_period: undefined })
    .filter((d) => SALARY_SECTIONS.has(d.section));
  const parties = new Map<string, { name: string; pan?: string }>();
  for (const d of all) {
    if (!parties.has(d.party_id)) {
      parties.set(d.party_id, { name: d.party_name, pan: d.pan });
    }
  }
  return Array.from(parties.entries())
    .map(([partyId, p]) =>
      buildForm16(partyId, p.name, filter, { pan: p.pan, deductorEntity: options.deductorEntity }),
    )
    .sort((a, b) => a.party_name.localeCompare(b.party_name));
}

/** Bulk-generate Form 16A for every non-salary deductee in the given quarter. */
export function bulkGenerateForm16A(
  filter: TDSAggregationFilter,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  options: { deductorEntity?: string } = {},
): Form16ACertificate[] {
  const all = aggregateTDSDeductions({ ...filter, quarter })
    .filter((d) => !SALARY_SECTIONS.has(d.section) && quarterOf(d.voucher_date) === quarter);
  const parties = new Map<string, { name: string; pan?: string }>();
  for (const d of all) {
    if (!parties.has(d.party_id)) {
      parties.set(d.party_id, { name: d.party_name, pan: d.pan });
    }
  }
  return Array.from(parties.entries())
    .map(([partyId, p]) =>
      buildForm16A(partyId, p.name, quarter, filter, { pan: p.pan, deductorEntity: options.deductorEntity }),
    )
    .sort((a, b) => a.party_name.localeCompare(b.party_name));
}

/** Diagnostic: re-exports section roll-up + party YTD probe for surfaces. */
export function getCertificateContext(filter: TDSAggregationFilter) {
  return {
    sections: aggregateBySection(filter),
    probe: (partyId: string, section: string) => partyYTDGross(filter, partyId, section),
  };
}
