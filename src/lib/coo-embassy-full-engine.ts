/**
 * @file        src/lib/coo-embassy-full-engine.ts
 * @purpose     CoO Embassy FULL · Moat #10 PRIMARY · 5-state legalization · SIBLING
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q3=a SIBLING · coo-legalization-engine.ts STAYS 0-DIFF
 *
 * IMPORTANT: SIBLING extension of EX-7b coo-legalization-engine.ts. STAYS 0-DIFF.
 */
import type { EmbassyLegalization, EmbassyLegalizationState } from '@/types/coo-embassy-full';
import { embassyLegalizationKey, EMBASSY_VALID_TRANSITIONS } from '@/types/coo-embassy-full';

const HAGUE_APOSTILLE_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI'];

const EMBASSY_FEE_INR: Record<string, number> = {
  uae_legalized: 8500, qatar_legalized: 12000, saudi_legalized: 15000, oman_legalized: 9000,
  kuwait_legalized: 10000, bahrain_legalized: 8000, default_embassy: 10000, apostille: 3500,
};

const SEED_EMBASSY_LEGALIZATIONS: EmbassyLegalization[] = [
  { id: 'el-001', legalization_ref: 'EL-SINHA-2026-001', entity_id: 'sinha-trading', state: 'embassy_legalized', related_shipping_bill_id: 'sb-sinha-002', destination_country_code: 'AE', is_hague_apostille_country: false, chamber_name: 'IMC Chamber of Commerce Mumbai', chamber_endorsed_at: '2026-05-05T00:00:00.000Z', mea_attested_at: '2026-05-08T00:00:00.000Z', embassy_name: 'UAE Embassy New Delhi', embassy_legalized_at: '2026-05-12T00:00:00.000Z', apostille_authority: null, apostille_completed_at: null, total_fee_inr: 8500, total_tat_days: 7, notes: 'UAE non-Hague · MEA + Embassy chain · CEPA preference attachments included', created_at: '2026-05-04T00:00:00.000Z', updated_at: '2026-05-12T00:00:00.000Z' },
];

export function loadEmbassyLegalizations(entityCode: string): EmbassyLegalization[] {
  try {
    const raw = localStorage.getItem(embassyLegalizationKey(entityCode));
    if (!raw) {
      localStorage.setItem(embassyLegalizationKey(entityCode), JSON.stringify(SEED_EMBASSY_LEGALIZATIONS));
      return SEED_EMBASSY_LEGALIZATIONS;
    }
    return JSON.parse(raw) as EmbassyLegalization[];
  } catch { return SEED_EMBASSY_LEGALIZATIONS; }
}

export function saveEmbassyLegalizations(entityCode: string, list: EmbassyLegalization[]): void {
  localStorage.setItem(embassyLegalizationKey(entityCode), JSON.stringify(list));
}

export function isHagueApostilleCountry(countryCode: string): boolean {
  return HAGUE_APOSTILLE_COUNTRIES.includes(countryCode);
}

export function getEmbassyFee(destinationCountryCode: string, isApostille: boolean): number {
  if (isApostille) return EMBASSY_FEE_INR.apostille;
  const key = `${destinationCountryCode.toLowerCase()}_legalized`;
  return EMBASSY_FEE_INR[key] ?? EMBASSY_FEE_INR.default_embassy;
}

export function transitionEmbassy(entityCode: string, id: string, next: EmbassyLegalizationState): EmbassyLegalization {
  const list = loadEmbassyLegalizations(entityCode);
  const el = list.find((x) => x.id === id);
  if (!el) throw new Error(`EmbassyLegalization not found: ${id}`);
  if (!EMBASSY_VALID_TRANSITIONS[el.state].includes(next)) {
    throw new Error(`Invalid embassy transition: ${el.state} → ${next}`);
  }
  const now = new Date().toISOString();
  const updated: EmbassyLegalization = { ...el, state: next, updated_at: now };
  if (next === 'chamber_endorsed') updated.chamber_endorsed_at = now;
  if (next === 'mea_attested') updated.mea_attested_at = now;
  if (next === 'embassy_legalized') updated.embassy_legalized_at = now;
  if (next === 'apostille_complete') updated.apostille_completed_at = now;
  saveEmbassyLegalizations(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}
