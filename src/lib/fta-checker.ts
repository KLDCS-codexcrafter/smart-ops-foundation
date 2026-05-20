/**
 * @file        src/lib/fta-checker.ts
 * @purpose     CAROTAR Rule 6 FTA preference checker · Moat #11 anchor
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q4=b separate FTA table · CAROTAR self-certification check
 * @disciplines FR-30 · FR-50
 */
import type { FTAPreferenceRecord, CAROTARCheckResult } from '@/types/fta-preference';
import { FTA_SEED } from '@/data/customs-tariff-head-seed-data';

const ftaKey = (entityCode: string): string => `erp_fta_preferences_${entityCode}`;

// [JWT] GET /api/eximx/fta-preferences?entityCode=...
export function loadFTAPreferences(entityCode: string): FTAPreferenceRecord[] {
  try {
    const raw = localStorage.getItem(ftaKey(entityCode));
    if (!raw) {
      localStorage.setItem(ftaKey(entityCode), JSON.stringify(FTA_SEED));
      return FTA_SEED;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FTAPreferenceRecord[]) : FTA_SEED;
  } catch {
    return FTA_SEED;
  }
}

// [JWT] PUT /api/eximx/fta-preferences?entityCode=...
export function saveFTAPreferences(entityCode: string, prefs: FTAPreferenceRecord[]): void {
  try {
    localStorage.setItem(ftaKey(entityCode), JSON.stringify(prefs));
  } catch {
    /* localStorage unavailable */
  }
}

export function checkCAROTARPreference(
  entityCode: string,
  cthCode: string,
  countryCode: string,
  boeDate: string,
  standardBCDRate: number,
): CAROTARCheckResult {
  const prefs = loadFTAPreferences(entityCode);
  const match = prefs.find(
    (p) =>
      p.cth_code === cthCode &&
      p.country_code === countryCode &&
      p.effective_from <= boeDate &&
      (p.effective_until === null || boeDate < p.effective_until),
  );
  if (!match) {
    return {
      is_eligible: false,
      preferential_rate: null,
      standard_rate: standardBCDRate,
      savings_percent: 0,
      coo_required: false,
      coo_self_certification_allowed: false,
      reason: 'No FTA preference found for this CTH x Country x Date',
    };
  }
  const savings = standardBCDRate > 0 ? ((standardBCDRate - match.preferential_bcd_rate) / standardBCDRate) * 100 : 0;
  return {
    is_eligible: true,
    preferential_rate: match.preferential_bcd_rate,
    standard_rate: standardBCDRate,
    savings_percent: Number(savings.toFixed(2)),
    coo_required: match.coo_required,
    coo_self_certification_allowed: match.coo_self_certification_allowed,
    reason: `${match.agreement} preference applicable`,
  };
}
