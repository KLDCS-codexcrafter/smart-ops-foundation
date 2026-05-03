/**
 * alternate-vendor-suggest.ts — OOB-53
 * Sprint T-Phase-1.2.6f-a
 */
import { getTopVendorsByScore, type VendorScore } from '../vendor-scoring-engine';
import { getBenchmarkHint } from './price-benchmark-stub';

export interface AlternateSuggestion {
  reason: string;
  alternates: VendorScore[];
}

export function suggestAlternates(
  itemId: string,
  quotedRate: number,
  currentVendorId: string,
  entityCode: string,
): AlternateSuggestion | null {
  const hint = getBenchmarkHint(itemId, quotedRate, entityCode);
  if (!hint || (hint.signal !== 'high' && hint.signal !== 'very_high')) return null;
  const top = getTopVendorsByScore(entityCode, 5).filter((v) => v.vendor_id !== currentVendorId);
  return {
    reason: `Quoted rate is ${hint.delta_percent}% above industry avg ₹${hint.industry_avg}`,
    alternates: top.slice(0, 2),
  };
}
