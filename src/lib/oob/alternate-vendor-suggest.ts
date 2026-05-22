/**
 * alternate-vendor-suggest.ts — OOB-53
 * Sprint T-Phase-1.2.6f-a · Sprint HK-5-2 Block E-completion · price-benchmark-stub inlined
 * (Strategy 2 graduation: stub deleted; minimal benchmark hint absorbed locally · panels-p2.tsx 0-DIFF)
 */
import { getTopVendorsByScore, type VendorScore } from '../vendor-scoring-engine';
import { computeBestPriceAnalysis } from '../procure360-report-engine';
import { roundTo, resolveMoneyPrecision } from '../decimal-helpers';

export interface AlternateSuggestion {
  reason: string;
  alternates: VendorScore[];
}

interface InlineBenchmarkHint {
  industry_avg: number;
  delta_percent: number;
  signal: 'fair' | 'high' | 'very_high' | 'low';
}

function getInlineBenchmarkHint(
  itemId: string,
  yourRate: number,
  entityCode: string,
): InlineBenchmarkHint | null {
  const trends = computeBestPriceAnalysis(itemId, entityCode);
  if (trends.length === 0) return null;
  const avg = trends.reduce((s, t) => s + t.rate, 0) / trends.length;
  const delta = ((yourRate - avg) / avg) * 100;
  let signal: InlineBenchmarkHint['signal'] = 'fair';
  if (delta > 20) signal = 'very_high';
  else if (delta > 10) signal = 'high';
  else if (delta < -10) signal = 'low';
  return {
    industry_avg: roundTo(avg, resolveMoneyPrecision(null, null)),
    delta_percent: Math.round(delta * 100) / 100,
    signal,
  };
}

export function suggestAlternates(
  itemId: string,
  quotedRate: number,
  currentVendorId: string,
  entityCode: string,
): AlternateSuggestion | null {
  const hint = getInlineBenchmarkHint(itemId, quotedRate, entityCode);
  if (!hint || (hint.signal !== 'high' && hint.signal !== 'very_high')) return null;
  const top = getTopVendorsByScore(entityCode, 5).filter((v) => v.vendor_id !== currentVendorId);
  return {
    reason: `Quoted rate is ${hint.delta_percent}% above industry avg ₹${hint.industry_avg}`,
    alternates: top.slice(0, 2),
  };
}
