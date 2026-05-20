/**
 * @file        src/types/fta-preference.ts
 * @purpose     Free Trade Agreement preference table · CAROTAR Rule 6 self-certification (Moat #11)
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q4=b separate FTAPreferenceTable
 * @disciplines FR-30 · FR-50
 */

export type FTAAgreement =
  | 'ASEAN'
  | 'SAFTA'
  | 'APTA'
  | 'INDIA_UAE_CEPA'
  | 'INDIA_JAPAN_CECA'
  | 'INDIA_KOREA_CEPA'
  | 'INDIA_MERCOSUR_PTA'
  | 'INDIA_AUSTRALIA_ECTA'
  | 'OTHER';

export interface FTAPreferenceRecord {
  id: string;
  cth_code: string;
  country_code: string;
  agreement: FTAAgreement;
  preferential_bcd_rate: number;
  preferential_bcd_label: string;
  coo_required: boolean;
  coo_self_certification_allowed: boolean;
  effective_from: string;
  effective_until: string | null;
  notification_ref: string;
  created_at: string;
  updated_at: string;
}

export interface CAROTARCheckResult {
  is_eligible: boolean;
  preferential_rate: number | null;
  standard_rate: number;
  savings_percent: number;
  coo_required: boolean;
  coo_self_certification_allowed: boolean;
  reason: string;
}
