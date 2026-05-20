/**
 * @file        src/lib/dual-rate-engine.ts
 * @purpose     Moat #16 Dual Exchange Rate Discipline · booking vs customs_valuation_rate resolution
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q3=b customs_valuation_rate on ForexRate
 * @disciplines FR-30 · FR-50 · FR-80
 */
import type { ForexRate } from '@/types/currency';
import type { VoucherStage } from '@/types/rate-ladder';

const forexRatesKey = (entityCode: string): string => `erp_${entityCode}_forex_rates`;

export interface StageRateResolution {
  rate: number | null;
  rate_type: string;
  reason: string;
}

export function resolveRateForStage(
  forexRate: ForexRate,
  stage: VoucherStage,
): StageRateResolution {
  switch (stage) {
    case 'po_booking':
    case 'po_revision':
      return {
        rate: forexRate.buying_rate,
        rate_type: 'buying_rate',
        reason: 'PO booking uses Purchase department rate (buying_rate)',
      };
    case 'boe_filing':
      return {
        rate: forexRate.customs_valuation_rate ?? forexRate.buying_rate,
        rate_type: forexRate.customs_valuation_rate != null ? 'customs_valuation_rate' : 'buying_rate-fallback',
        reason: forexRate.customs_valuation_rate != null
          ? 'BoE filing uses Import department customs_valuation_rate (Moat #16)'
          : 'customs_valuation_rate not set · falling back to buying_rate (institutional warning)',
      };
    case 'grn_actual':
    case 'tt_payment':
      return {
        rate: forexRate.last_voucher_rate ?? forexRate.buying_rate,
        rate_type: 'last_voucher_rate',
        reason: 'Actual TT rate at payment · falls back to buying_rate if not set',
      };
    case 'realisation':
      return {
        rate: forexRate.selling_rate,
        rate_type: 'selling_rate',
        reason: 'Export realisation uses selling_rate',
      };
    case 'month_end_reval':
    case 'fy_close':
      return {
        rate: forexRate.standard_rate,
        rate_type: 'standard_rate',
        reason: 'Period-end revaluation uses standard/RBI rate',
      };
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export interface RateVariance {
  variance_pct: number;
  variance_inr: number;
  verdict: 'gain' | 'loss' | 'neutral';
}

export function computeRateVariance(
  bookingRate: number,
  customsRate: number,
  basicValueForeign: number,
): RateVariance {
  if (bookingRate === 0) return { variance_pct: 0, variance_inr: 0, verdict: 'neutral' };
  const variance_pct = ((customsRate - bookingRate) / bookingRate) * 100;
  const variance_inr = (customsRate - bookingRate) * basicValueForeign;
  const verdict: RateVariance['verdict'] = variance_pct > 0.1 ? 'loss' : variance_pct < -0.1 ? 'gain' : 'neutral';
  return { variance_pct: Number(variance_pct.toFixed(3)), variance_inr: Number(variance_inr.toFixed(2)), verdict };
}

// [JWT] GET /api/eximx/forex-rates?entityCode=...
export function loadForexRates(entityCode: string): ForexRate[] {
  try {
    const raw = localStorage.getItem(forexRatesKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ForexRate[]) : [];
  } catch {
    return [];
  }
}
