/**
 * @file        src/lib/comply360-itr6-engine.ts
 * @purpose     Comply360 ITR-6 engine · company income-tax return scaffold.
 *              Schedules BP (business income) · DPM/DOA (depreciation) · CG (capital gains)
 *              · tax computation. Greenfield · keeps computation scaffolded (not a full
 *              tax engine). Persists return drafts in entity-scoped localStorage for Pass B.
 * @sprint      Sprint 76a · T-Phase-5.A.1.8-PASS-A · Block 7 · DP-S76-4
 * @decisions   D-S69-1 (100% native) · DP-S76-4 (ITR-6 greenfield)
 * @iso         Reliability · Maintainability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure
 * @reads-from  localStorage `comply360.itr6.<entityCode>` (own scoped store)
 */
import { round2 } from './decimal-helpers';

// ── Public Types ─────────────────────────────────────────────────────

export type CompanyTaxRegime = 'standard' | 'section_115BAA' | 'section_115BAB';

export interface ScheduleBP {
  profit_before_tax_books: number;
  add_disallowed_expenses: number;
  less_allowable_deductions: number;
  business_income: number;          // derived
}

export interface ScheduleDPMRow {
  block_name: string;
  rate_percent: number;
  opening_wdv: number;
  additions: number;
  deletions: number;
  depreciation: number;             // derived
  closing_wdv: number;              // derived
}

export interface ScheduleDOARow {
  block_name: string;
  rate_percent: number;
  opening_wdv: number;
  additions: number;
  deletions: number;
  depreciation: number;             // derived
  closing_wdv: number;
}

export interface ScheduleCGRow {
  asset_description: string;
  gain_type: 'short_term' | 'long_term';
  sale_consideration: number;
  cost_of_acquisition: number;
  indexed_cost?: number;
  gain: number;                     // derived
}

export interface FinancialsInput {
  profit_before_tax_books: number;
  add_disallowed_expenses?: number;
  less_allowable_deductions?: number;
  depreciation_blocks_dpm: Omit<ScheduleDPMRow, 'depreciation' | 'closing_wdv'>[];
  depreciation_blocks_doa: Omit<ScheduleDOARow, 'depreciation' | 'closing_wdv'>[];
  capital_gains: Omit<ScheduleCGRow, 'gain'>[];
  regime: CompanyTaxRegime;
}

export interface TaxComputation {
  regime: CompanyTaxRegime;
  base_rate_percent: number;
  surcharge_percent: number;
  cess_percent: number;
  taxable_income: number;
  base_tax: number;
  surcharge: number;
  cess: number;
  total_tax: number;
}

export interface ITR6Return {
  return_id: string;
  entity_code: string;
  fy: string;                       // 'FY25-26'
  ay: string;                       // 'AY26-27' (derived)
  regime: CompanyTaxRegime;
  schedule_bp: ScheduleBP;
  schedule_dpm: ScheduleDPMRow[];
  schedule_doa: ScheduleDOARow[];
  schedule_cg: ScheduleCGRow[];
  total_depreciation: number;
  total_capital_gains: number;
  taxable_income: number;
  tax_computation: TaxComputation;
  warnings: string[];
  errors: string[];
  valid: boolean;
  generated_at: string;
}

// ── READS_FROM contract ──────────────────────────────────────────────

export const READS_FROM = {
  storage: 'localStorage:comply360.itr6.<entityCode>',
} as const;

// ── Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'comply360.itr6.';

function storageKey(entityCode: string): string {
  return `${STORAGE_KEY_PREFIX}${entityCode}`;
}

function loadReturns(entityCode: string): ITR6Return[] {
  // [JWT] GET /api/comply360/itr6?entity=<entityCode>
  try {
    const raw = localStorage.getItem(storageKey(entityCode));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ITR6Return[]) : [];
  } catch {
    return [];
  }
}

function saveReturns(entityCode: string, list: ITR6Return[]): void {
  // [JWT] PUT /api/comply360/itr6 batch
  try {
    localStorage.setItem(storageKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota */
  }
}

function fyToAy(fy: string): string {
  const m = /^FY(\d{2})-(\d{2})$/.exec(fy);
  if (!m) return '';
  const ayStart = Number(m[1]) + 1;
  const ayEnd = Number(m[2]) + 1;
  return `AY${String(ayStart).padStart(2, '0')}-${String(ayEnd).padStart(2, '0')}`;
}

// ── Regime rate table (FY25-26 · scaffold · keep tight) ──────────────

const REGIME_RATES: Record<CompanyTaxRegime, { base: number; surcharge: number; cess: number }> = {
  standard:         { base: 30.0, surcharge: 12.0, cess: 4.0 },
  section_115BAA:   { base: 22.0, surcharge: 10.0, cess: 4.0 },
  section_115BAB:   { base: 15.0, surcharge: 10.0, cess: 4.0 },
};

// ── Public API ───────────────────────────────────────────────────────

/** Compute company tax liability under a given regime (FY25-26 rates). */
export function computeTaxLiability(taxableIncome: number, regime: CompanyTaxRegime): TaxComputation {
  const rates = REGIME_RATES[regime];
  const safe = Math.max(0, taxableIncome);
  const base_tax = round2((safe * rates.base) / 100);
  const surcharge = round2((base_tax * rates.surcharge) / 100);
  const cess = round2(((base_tax + surcharge) * rates.cess) / 100);
  return {
    regime,
    base_rate_percent: rates.base,
    surcharge_percent: rates.surcharge,
    cess_percent: rates.cess,
    taxable_income: round2(safe),
    base_tax,
    surcharge,
    cess,
    total_tax: round2(base_tax + surcharge + cess),
  };
}

function buildBP(input: FinancialsInput): ScheduleBP {
  const add = input.add_disallowed_expenses ?? 0;
  const less = input.less_allowable_deductions ?? 0;
  return {
    profit_before_tax_books: input.profit_before_tax_books,
    add_disallowed_expenses: add,
    less_allowable_deductions: less,
    business_income: round2(input.profit_before_tax_books + add - less),
  };
}

function buildDPM(rows: FinancialsInput['depreciation_blocks_dpm']): ScheduleDPMRow[] {
  return rows.map((r) => {
    const depBase = r.opening_wdv + r.additions - r.deletions;
    const depreciation = round2((Math.max(0, depBase) * r.rate_percent) / 100);
    const closing_wdv = round2(depBase - depreciation);
    return { ...r, depreciation, closing_wdv };
  });
}

function buildDOA(rows: FinancialsInput['depreciation_blocks_doa']): ScheduleDOARow[] {
  return rows.map((r) => {
    const depBase = r.opening_wdv + r.additions - r.deletions;
    const depreciation = round2((Math.max(0, depBase) * r.rate_percent) / 100);
    const closing_wdv = round2(depBase - depreciation);
    return { ...r, depreciation, closing_wdv };
  });
}

function buildCG(rows: FinancialsInput['capital_gains']): ScheduleCGRow[] {
  return rows.map((r) => {
    const cost = r.indexed_cost ?? r.cost_of_acquisition;
    return { ...r, gain: round2(r.sale_consideration - cost) };
  });
}

/** Validate an ITR-6 return (basic schedule checks). */
export function validateITR6(ret: ITR6Return): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!ret.entity_code) errors.push('entity_code missing');
  if (!/^FY\d{2}-\d{2}$/.test(ret.fy)) errors.push(`FY ${ret.fy} not FYYY-YY`);
  if (ret.taxable_income < 0) errors.push('Taxable income negative — review schedule BP');
  if (ret.tax_computation.total_tax < 0) errors.push('Total tax negative');
  return { ok: errors.length === 0, errors };
}

/**
 * Build a complete ITR-6 return for a company entity.
 * Persists the return into entity-scoped localStorage and returns the built object.
 */
export function buildITR6(
  entityCode: string,
  fy: string,
  financials: FinancialsInput,
): ITR6Return {
  const warnings: string[] = [];
  const errors: string[] = [];

  const schedule_bp = buildBP(financials);
  const schedule_dpm = buildDPM(financials.depreciation_blocks_dpm);
  const schedule_doa = buildDOA(financials.depreciation_blocks_doa);
  const schedule_cg = buildCG(financials.capital_gains);

  const total_depreciation = round2(
    schedule_dpm.reduce((a, r) => a + r.depreciation, 0) +
    schedule_doa.reduce((a, r) => a + r.depreciation, 0),
  );
  const total_capital_gains = round2(schedule_cg.reduce((a, r) => a + r.gain, 0));
  const taxable_income = round2(
    schedule_bp.business_income - total_depreciation + total_capital_gains,
  );

  if (financials.profit_before_tax_books <= 0) {
    warnings.push('Profit before tax non-positive — verify MAT applicability');
  }
  if (taxable_income < 0) {
    warnings.push('Computed taxable income negative — loss carry-forward likely');
  }

  const tax_computation = computeTaxLiability(taxable_income, financials.regime);

  const ret: ITR6Return = {
    return_id: `ITR6/${fy}/${entityCode}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
    entity_code: entityCode,
    fy,
    ay: fyToAy(fy),
    regime: financials.regime,
    schedule_bp,
    schedule_dpm,
    schedule_doa,
    schedule_cg,
    total_depreciation,
    total_capital_gains,
    taxable_income,
    tax_computation,
    warnings,
    errors,
    valid: errors.length === 0,
    generated_at: new Date().toISOString(),
  };

  const list = loadReturns(entityCode);
  list.push(ret);
  saveReturns(entityCode, list);
  return ret;
}

/** List persisted ITR-6 returns for an entity (Pass B surfaces will consume). */
export function listITR6Returns(entityCode: string): ITR6Return[] {
  return loadReturns(entityCode);
}

export const ITR6_STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
