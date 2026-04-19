/**
 * logistic-rate-utils.ts — Pure helpers for transporter rate cards.
 * Sprint 15a ships date-effective resolver + zone lookup + simple computations.
 * Full reconciliation engine arrives in Sprint 15c.
 */

import type {
  TransporterRateCard, ZoneCode, TransportMode, ZoneDefinition,
} from '@/types/transporter-rate';

/** Returns the rate card whose effective window covers the given date. */
export function resolveActiveRateCard(
  cards: TransporterRateCard[], onDate: string,
): TransporterRateCard | null {
  const ts = new Date(onDate).getTime();
  if (Number.isNaN(ts)) return null;
  const matches = cards.filter(c => {
    const fromOk = new Date(c.effective_from).getTime() <= ts;
    const toOk = c.effective_to ? new Date(c.effective_to).getTime() >= ts : true;
    return fromOk && toOk;
  });
  // Most recently started card wins on overlap.
  matches.sort((a, b) =>
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
  return matches[0] ?? null;
}

/** Map an Indian state name to its zone (or null if unmapped). */
export function stateToZone(
  state: string, defs: ZoneDefinition[],
): ZoneCode | null {
  const needle = state.trim().toLowerCase();
  for (const d of defs) {
    if (d.states.some(s => s.toLowerCase() === needle)) return d.zone;
  }
  return null;
}

/** Volumetric weight in kg from cm dimensions and a divisor (typ. 4500 air, 5000 surface). */
export function volumetricWeightKg(
  lengthCm: number, widthCm: number, heightCm: number, divisor: number,
): number {
  if (divisor <= 0) return 0;
  return (lengthCm * widthCm * heightCm) / divisor;
}

/** Chargeable weight = max(actual, volumetric, minimum chargeable). */
export function chargeableWeightKg(
  actualKg: number, volKg: number, minChargeable: number,
): number {
  return Math.max(actualKg, volKg, minChargeable);
}

/**
 * Apply fuel escalation to a basic freight value.
 * pct = ((current - base) / base * 100) * (numer / denom)
 */
export function fuelAdjustedRate(
  basicFreight: number, base: number, current: number,
  ratioNumer: number, ratioDenom: number,
): number {
  if (base <= 0 || ratioDenom <= 0) return basicFreight;
  const pct = ((current - base) / base) * 100 * (ratioNumer / ratioDenom);
  return basicFreight * (1 + pct / 100);
}

/** Find the rate-per-kg for a given zone+mode in a card (returns null if missing). */
export function rateForZoneMode(
  card: TransporterRateCard, zone: ZoneCode, mode: TransportMode,
): number | null {
  const r = card.zone_rates.find(z => z.zone === zone && z.mode === mode);
  return r ? r.rate_per_kg : null;
}
