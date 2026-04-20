/**
 * freight-calc-engine.ts — Apply TransporterRateCard to an LR -> expected freight
 * Pure. Builds on Sprint 15a logistic-rate-utils helpers.
 *
 * Formula (OM Logistics pattern):
 *   1. Resolve active rate card for date
 *   2. Zone lookup (destination state -> zone code)
 *   3. Rate per kg per zone per mode
 *   4. Volumetric vs actual + minimum -> chargeable weight
 *   5. Fuel-adjusted rate
 *   6. Base freight + fuel% + collection + delivery + statistical + FOV +
 *      COD + demurrage + ODA -> subtotal
 *   7. GST 18% on top
 */

import type {
  TransporterRateCard, TransportMode, ZoneCode,
} from '@/types/transporter-rate';
import {
  resolveActiveRateCard, stateToZone, fuelAdjustedRate,
  chargeableWeightKg, rateForZoneMode,
} from './logistic-rate-utils';

export interface FreightCalcInput {
  logistic_id: string;
  dln_date: string;
  mode: TransportMode;
  origin_state: string;
  destination_state: string;
  actual_weight_kg: number;
  volumetric_weight_kg?: number;
  invoice_value_paise: number;
  distance_km?: number;
  is_cod: boolean;
  demurrage_days?: number;
  all_rate_cards: TransporterRateCard[];
}

export interface FreightCalcBreakdown {
  zone: ZoneCode | null;
  chargeable_weight_kg: number;
  rate_per_kg: number;
  base_freight: number;
  fuel_surcharge: number;
  collection_charge: number;
  delivery_charge: number;
  statistical_charge: number;
  fov: number;
  cod_charge: number;
  demurrage_charge: number;
  oda_charge: number;
  subtotal_before_gst: number;
  gst_amount: number;
  grand_total: number;
  formula_notes: string[];
}

export type FreightCalcResult =
  | { ok: true; breakdown: FreightCalcBreakdown }
  | { ok: false; reason: 'no_rate_card' | 'zone_not_found' | 'rate_not_found' | 'invalid_weight' };

export function computeExpectedFreight(input: FreightCalcInput): FreightCalcResult {
  // Filter to this transporter's cards then pick the active one for the date
  const ownCards = input.all_rate_cards.filter(c => c.logistic_id === input.logistic_id);
  const card = resolveActiveRateCard(ownCards, input.dln_date);
  if (!card) return { ok: false, reason: 'no_rate_card' };

  const destZone = stateToZone(input.destination_state, card.zone_definitions);
  if (!destZone) return { ok: false, reason: 'zone_not_found' };

  const zoneRate = rateForZoneMode(card, destZone, input.mode);
  if (zoneRate === null) return { ok: false, reason: 'rate_not_found' };

  const actual = input.actual_weight_kg;
  const volumetric = input.volumetric_weight_kg ?? 0;
  if (!Number.isFinite(actual) || actual <= 0) return { ok: false, reason: 'invalid_weight' };

  const minChargeable =
    input.mode === 'surface' ? card.minimum_chargeable.surface :
    input.mode === 'train'   ? card.minimum_chargeable.train :
    card.minimum_chargeable.air;
  const chargeable = chargeableWeightKg(actual, volumetric, minChargeable);

  const fe = card.fuel_escalation;
  const adjustedRate = fuelAdjustedRate(
    zoneRate, fe.base_fuel_price, fe.current_fuel_price,
    fe.ratio_numerator, fe.ratio_denominator,
  );

  const baseFreight = adjustedRate * chargeable;
  const fuelSurcharge = baseFreight * (card.surcharges.fuel_pct_of_basic / 100);

  const cdSlab = card.collection_delivery.find(cd =>
    chargeable >= cd.min_weight_kg && chargeable <= cd.max_weight_kg,
  );
  const collectionCharge = cdSlab?.collection_charge ?? 0;
  const deliveryCharge = cdSlab?.delivery_charge ?? 0;

  const statistical = card.surcharges.statistical_flat;

  const fovBase = input.invoice_value_paise / 100;
  const fov = fovBase * (card.surcharges.fov_pct_of_invoice / 100);

  const codCharge = input.is_cod ? card.surcharges.cod_flat_if_applicable : 0;

  const demurrageDays = Math.max(
    0, (input.demurrage_days ?? 0) - card.surcharges.demurrage_free_days,
  );
  const demurrageCharge = demurrageDays * chargeable * card.surcharges.demurrage_per_kg_per_day;

  let odaCharge = 0;
  const km = input.distance_km ?? 0;
  if (km > 0) {
    const odaSlab = card.oda_grid.find(o =>
      chargeable >= o.min_weight_kg && chargeable <= o.max_weight_kg,
    );
    if (odaSlab) {
      odaCharge =
        km <= 50  ? odaSlab.distance_20_50_km :
        km <= 100 ? odaSlab.distance_51_100_km :
        km <= 150 ? odaSlab.distance_101_150_km :
        odaSlab.distance_gt_150_km;
    }
  }

  const subtotal = baseFreight + fuelSurcharge + collectionCharge + deliveryCharge +
    statistical + fov + codCharge + demurrageCharge + odaCharge;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  return {
    ok: true,
    breakdown: {
      zone: destZone,
      chargeable_weight_kg: chargeable,
      rate_per_kg: adjustedRate,
      base_freight: baseFreight,
      fuel_surcharge: fuelSurcharge,
      collection_charge: collectionCharge,
      delivery_charge: deliveryCharge,
      statistical_charge: statistical,
      fov,
      cod_charge: codCharge,
      demurrage_charge: demurrageCharge,
      oda_charge: odaCharge,
      subtotal_before_gst: subtotal,
      gst_amount: gst,
      grand_total: grandTotal,
      formula_notes: [
        `Zone: ${destZone}, Mode: ${input.mode}`,
        `Chargeable weight: ${chargeable.toFixed(2)}kg (actual ${actual}, vol ${volumetric}, min ${minChargeable})`,
        `Adjusted rate: ₹${adjustedRate.toFixed(2)}/kg`,
        `Origin: ${input.origin_state} → Destination: ${input.destination_state}`,
      ],
    },
  };
}
