/**
 * @file        src/lib/dgft-scheme-engine.ts
 * @purpose     DGFT 5-scheme rate resolver + eligibility checker · Moat #20 PRIMARY
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q2=a FOUNDATION
 */
import type { DGFTScheme, DGFTSchemeKind, EPCGLicense } from '@/types/dgft-scheme';
import { dgftSchemeKey, epcgLicenseKey } from '@/types/dgft-scheme';

const SEED_DGFT_SCHEMES: DGFTScheme[] = [
  { id: 'sch-rodtep-7208', scheme_kind: 'RoDTEP', cth_code: '7208', destination_country_code: null, rate_percentage: 2.5, rate_unit: 'pct_of_fob', effective_from: '2025-04-01', effective_to: null, notification_no: 'Notif 06/2025 Customs', notes: 'Hot rolled steel · global RoDTEP rate' },
  { id: 'sch-rodtep-8517', scheme_kind: 'RoDTEP', cth_code: '8517', destination_country_code: null, rate_percentage: 1.8, rate_unit: 'pct_of_fob', effective_from: '2025-04-01', effective_to: null, notification_no: 'Notif 06/2025 Customs', notes: 'Electronics · routers · global' },
  { id: 'sch-drawback-7208', scheme_kind: 'Drawback', cth_code: '7208', destination_country_code: null, rate_percentage: 3.0, rate_unit: 'pct_of_fob', effective_from: '2025-01-01', effective_to: null, notification_no: 'Drawback Schedule 2025', notes: 'Hot rolled steel AIR' },
  { id: 'sch-seis-99831', scheme_kind: 'SEIS', cth_code: '99831', destination_country_code: null, rate_percentage: 5.0, rate_unit: 'pct_of_fob', effective_from: '2025-04-01', effective_to: '2026-03-31', notification_no: 'FTP 2023', notes: 'IT services category · 5% reward' },
  { id: 'sch-meis-7208', scheme_kind: 'MEIS', cth_code: '7208', destination_country_code: null, rate_percentage: 0, rate_unit: 'pct_of_fob', effective_from: '2020-01-01', effective_to: '2021-01-01', notification_no: 'MEIS Phase Out', notes: 'MEIS phased out for this CTH from 2021' },
];

const SEED_EPCG_LICENSES: EPCGLicense[] = [
  { id: 'epcg-001', license_no: 'EPCG/MUM/2025/0042', entity_id: 'sinha-steel', status: 'active', import_value_inr: 50000000, bcd_saved_inr: 5000000, export_obligation_inr: 30000000, export_obligation_period_years: 6, export_obligation_start_date: '2025-04-01', export_obligation_end_date: '2031-03-31', exports_fulfilled_inr: 5000000, exports_remaining_inr: 25000000, fulfillment_pct: 17, notes: 'Steel rolling mill capital import · 6× obligation · year 1 progress 17%', created_at: '2025-04-01T00:00:00.000Z', updated_at: '2026-05-20T00:00:00.000Z' },
];

// [JWT] GET /api/eximx/dgft-schemes?entityCode=...
export function loadDGFTSchemes(entityCode: string): DGFTScheme[] {
  try {
    const raw = localStorage.getItem(dgftSchemeKey(entityCode));
    if (!raw) { localStorage.setItem(dgftSchemeKey(entityCode), JSON.stringify(SEED_DGFT_SCHEMES)); return SEED_DGFT_SCHEMES; }
    return JSON.parse(raw) as DGFTScheme[];
  } catch { return SEED_DGFT_SCHEMES; }
}

// [JWT] GET /api/eximx/epcg-licenses?entityCode=...
export function loadEPCGLicenses(entityCode: string): EPCGLicense[] {
  try {
    const raw = localStorage.getItem(epcgLicenseKey(entityCode));
    if (!raw) { localStorage.setItem(epcgLicenseKey(entityCode), JSON.stringify(SEED_EPCG_LICENSES)); return SEED_EPCG_LICENSES; }
    return JSON.parse(raw) as EPCGLicense[];
  } catch { return SEED_EPCG_LICENSES; }
}

export function saveDGFTSchemes(entityCode: string, list: DGFTScheme[]): void {
  localStorage.setItem(dgftSchemeKey(entityCode), JSON.stringify(list));
}

export function saveEPCGLicenses(entityCode: string, list: EPCGLicense[]): void {
  localStorage.setItem(epcgLicenseKey(entityCode), JSON.stringify(list));
}

export function resolveSchemeRate(
  entityCode: string,
  schemeKind: DGFTSchemeKind,
  cthCode: string,
  destinationCountryCode: string,
  asOfDate: string,
): DGFTScheme | null {
  const all = loadDGFTSchemes(entityCode).filter(
    (s) =>
      s.scheme_kind === schemeKind &&
      s.cth_code === cthCode &&
      s.effective_from <= asOfDate &&
      (s.effective_to === null || s.effective_to >= asOfDate) &&
      (s.destination_country_code === null || s.destination_country_code === destinationCountryCode),
  );
  return all.find((s) => s.destination_country_code === destinationCountryCode) ?? all[0] ?? null;
}

export function computeScripValue(fobValueInr: number, ratePct: number): number {
  return Math.round(fobValueInr * (ratePct / 100));
}

export function checkEPCGFulfillmentStatus(license: EPCGLicense): {
  is_on_track: boolean;
  required_pct_by_now: number;
  actual_pct: number;
  shortfall_inr: number;
} {
  const totalDays = (new Date(license.export_obligation_end_date).getTime() - new Date(license.export_obligation_start_date).getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (Date.now() - new Date(license.export_obligation_start_date).getTime()) / (1000 * 60 * 60 * 24);
  const required_pct_by_now = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const actual_pct = license.fulfillment_pct;
  const expected_inr = (required_pct_by_now / 100) * license.export_obligation_inr;
  const shortfall_inr = Math.max(0, expected_inr - license.exports_fulfilled_inr);
  return { is_on_track: actual_pct >= required_pct_by_now, required_pct_by_now, actual_pct, shortfall_inr };
}
