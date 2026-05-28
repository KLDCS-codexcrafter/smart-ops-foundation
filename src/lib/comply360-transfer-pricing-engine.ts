/**
 * @file        src/lib/comply360-transfer-pricing-engine.ts
 * @sibling     NEW @ Sprint 77a · Comply360 Main Arc 1.9 · Pass A
 * @realizes    Transfer Pricing comprehensive pack ·
 *              consolidates Form 3CEB + Form 15CA/CB + Master File (3CEAA) +
 *              CbCR (3CEAD) + Equalisation Levy (Form 1).
 * @approach    Pure computation · reads form-3ceb-engine + form-15ca-15cb-engine
 *              (both 0-DIFF · §H boundaries). Greenfield localStorage for Master File,
 *              CbCR and Equalisation Levy filings.
 * @reads-from  form-3ceb-engine.ts (loadForm3CEBSnapshots · 0-DIFF · §H)
 *              form-15ca-15cb-engine.ts (loadForm15CAs · 0-DIFF · §H)
 * [JWT] Phase 5: GET /api/comply360/tp/:entity/:fy · POST /api/comply360/tp/master-file
 */
import { loadForm3CEBSnapshots } from './form-3ceb-engine';
import { loadForm15CAs } from './form-15ca-15cb-engine';

export type TPFilingType = 'master_file_3ceaa' | 'cbcr_3cead' | 'equalisation_levy_form1';

export interface TPMasterFileFiling {
  id: string;
  entity_code: string;
  financial_year: string;
  consolidated_group_revenue_inr: number;
  filing_required: boolean;
  filed_at: string | null;
  acknowledgment_no: string | null;
  created_at: string;
}

export interface TPCbCRFiling {
  id: string;
  entity_code: string;
  financial_year: string;
  parent_consolidated_revenue_inr: number;
  filing_required: boolean;
  filed_at: string | null;
  acknowledgment_no: string | null;
  created_at: string;
}

export interface TPEqualisationLevyFiling {
  id: string;
  entity_code: string;
  financial_year: string;
  taxable_consideration_inr: number;
  levy_rate_pct: number;
  levy_amount_inr: number;
  filed_at: string | null;
  acknowledgment_no: string | null;
  created_at: string;
}

export interface TPComprehensiveReport {
  entity_code: string;
  financial_year: string;
  form_3ceb_snapshots: number;
  form_3ceb_above_threshold: boolean;
  form_15ca_filings: number;
  form_15ca_tds_total_inr: number;
  master_file_required: boolean;
  master_file_filed: boolean;
  cbcr_required: boolean;
  cbcr_filed: boolean;
  equalisation_levy_total_inr: number;
  overall_filings_ready: boolean;
  generated_at: string;
}

// Thresholds per Indian Income-tax Act / Rules
export const MASTER_FILE_REVENUE_THRESHOLD_INR = 5_000_000_000; // ₹500 crore
export const MASTER_FILE_INTL_TXN_THRESHOLD_INR = 500_000_000;  // ₹50 crore
export const CBCR_PARENT_REVENUE_THRESHOLD_INR = 64_000_000_000; // ₹6,400 crore
export const EQUALISATION_LEVY_RATE_PCT = 6;

export const tpMasterFileKey = (entityCode: string): string =>
  `erp_tp_master_file_${entityCode}`;
export const tpCbCRKey = (entityCode: string): string =>
  `erp_tp_cbcr_${entityCode}`;
export const tpEqLevyKey = (entityCode: string): string =>
  `erp_tp_eq_levy_${entityCode}`;

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function loadMasterFileFilings(entityCode: string): TPMasterFileFiling[] {
  return loadList<TPMasterFileFiling>(tpMasterFileKey(entityCode));
}
export function loadCbCRFilings(entityCode: string): TPCbCRFiling[] {
  return loadList<TPCbCRFiling>(tpCbCRKey(entityCode));
}
export function loadEqualisationLevyFilings(entityCode: string): TPEqualisationLevyFiling[] {
  return loadList<TPEqualisationLevyFiling>(tpEqLevyKey(entityCode));
}

export function recordMasterFileFiling(
  entityCode: string,
  rec: Omit<TPMasterFileFiling, 'id' | 'entity_code' | 'created_at'>,
): TPMasterFileFiling {
  const list = loadMasterFileFilings(entityCode);
  const next: TPMasterFileFiling = {
    id: `TPMF-${entityCode}-${Date.now()}`,
    entity_code: entityCode,
    created_at: new Date().toISOString(),
    ...rec,
  };
  localStorage.setItem(tpMasterFileKey(entityCode), JSON.stringify([...list, next]));
  return next;
}

export function recordCbCRFiling(
  entityCode: string,
  rec: Omit<TPCbCRFiling, 'id' | 'entity_code' | 'created_at'>,
): TPCbCRFiling {
  const list = loadCbCRFilings(entityCode);
  const next: TPCbCRFiling = {
    id: `TPCBCR-${entityCode}-${Date.now()}`,
    entity_code: entityCode,
    created_at: new Date().toISOString(),
    ...rec,
  };
  localStorage.setItem(tpCbCRKey(entityCode), JSON.stringify([...list, next]));
  return next;
}

export function computeEqualisationLevy(
  entityCode: string,
  financialYear: string,
  taxableConsiderationInr: number,
): TPEqualisationLevyFiling {
  const levyAmount = Math.round((taxableConsiderationInr * EQUALISATION_LEVY_RATE_PCT) / 100);
  const list = loadEqualisationLevyFilings(entityCode);
  const next: TPEqualisationLevyFiling = {
    id: `TPEL-${entityCode}-${financialYear}-${Date.now()}`,
    entity_code: entityCode,
    financial_year: financialYear,
    taxable_consideration_inr: taxableConsiderationInr,
    levy_rate_pct: EQUALISATION_LEVY_RATE_PCT,
    levy_amount_inr: levyAmount,
    filed_at: null,
    acknowledgment_no: null,
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(tpEqLevyKey(entityCode), JSON.stringify([...list, next]));
  return next;
}

export function buildTransferPricingReport(
  entityCode: string,
  financialYear: string,
): TPComprehensiveReport {
  // §H read-only pulls
  const snapshots = loadForm3CEBSnapshots(entityCode).filter(
    (s) => s.financial_year === financialYear,
  );
  const form15CAs = loadForm15CAs(entityCode);

  const aboveThreshold = snapshots.some((s) => s.is_above_threshold);
  const intlTxnTotal = snapshots.reduce(
    (s, snap) => s + snap.total_international_transactions_inr, 0,
  );

  const masterFiles = loadMasterFileFilings(entityCode).filter(
    (m) => m.financial_year === financialYear,
  );
  const cbcrs = loadCbCRFilings(entityCode).filter(
    (c) => c.financial_year === financialYear,
  );
  const eqLevies = loadEqualisationLevyFilings(entityCode).filter(
    (e) => e.financial_year === financialYear,
  );

  const masterFileRequired = intlTxnTotal >= MASTER_FILE_INTL_TXN_THRESHOLD_INR;
  const cbcrRequired = masterFiles.some(
    (m) => m.consolidated_group_revenue_inr >= CBCR_PARENT_REVENUE_THRESHOLD_INR,
  );

  const tdsTotal = form15CAs.reduce((s, f) => s + f.tds_amount_inr, 0);
  const eqLevyTotal = eqLevies.reduce((s, e) => s + e.levy_amount_inr, 0);

  const ready =
    (!aboveThreshold || snapshots.some((s) => s.status === 'filed_with_dgit'))
    && (!masterFileRequired || masterFiles.some((m) => m.filed_at !== null))
    && (!cbcrRequired || cbcrs.some((c) => c.filed_at !== null));

  return {
    entity_code: entityCode,
    financial_year: financialYear,
    form_3ceb_snapshots: snapshots.length,
    form_3ceb_above_threshold: aboveThreshold,
    form_15ca_filings: form15CAs.length,
    form_15ca_tds_total_inr: tdsTotal,
    master_file_required: masterFileRequired,
    master_file_filed: masterFiles.some((m) => m.filed_at !== null),
    cbcr_required: cbcrRequired,
    cbcr_filed: cbcrs.some((c) => c.filed_at !== null),
    equalisation_levy_total_inr: eqLevyTotal,
    overall_filings_ready: ready,
    generated_at: new Date().toISOString(),
  };
}
