/**
 * vendor-scoring-engine.ts — Multi-factor vendor scoring
 * Sprint T-Phase-1.2.6f-a · per D-244 (6 factors) · D-249 zero-touch sibling
 * [JWT] GET /api/vendors/:id/score
 */
import { listQuotations } from './vendor-quotation-engine';
import { listRfqs } from './rfq-engine';

export type ScoreFactorName =
  | 'price' | 'quality' | 'delivery'
  | 'responsiveness' | 'payment_terms' | 'compliance';

export interface VendorScoreFactor {
  name: ScoreFactorName;
  weight: number;
  raw_score: number;
  weighted_score: number;
  factors_used: string[];
}

export interface VendorScore {
  vendor_id: string;
  vendor_name: string;
  entity_id: string;
  total_score: number;
  factor_breakdown: VendorScoreFactor[];
  rfq_count: number;
  quote_count: number;
  award_count: number;
  on_time_delivery_rate: number;
  rejection_rate: number;
  computed_at: string;
}

export const DEFAULT_WEIGHTS: Record<ScoreFactorName, number> = {
  price: 30,
  quality: 25,
  delivery: 20,
  responsiveness: 10,
  payment_terms: 10,
  compliance: 5,
};

export function computeVendorScore(vendorId: string, entityCode: string): VendorScore {
  const quotations = listQuotations(entityCode).filter((q) => q.vendor_id === vendorId);
  const rfqs = listRfqs(entityCode).filter((r) => r.vendor_id === vendorId);

  const quoteCount = quotations.length;
  const rfqCount = rfqs.length;
  const awardCount = quotations.filter((q) => q.is_awarded).length;
  const respondedCount = rfqs.filter((r) => r.status === 'quoted' || r.status === 'awarded').length;

  const responsiveness = rfqCount > 0 ? Math.round((respondedCount / rfqCount) * 100) : 50;
  const compliance = quotations.length > 0
    ? Math.round(
        (quotations.filter((q) => q.vendor_gstin).length / quotations.length) * 100,
      )
    : 50;
  const price = 70;       // placeholder · Phase 1.4 computes vs benchmark
  const quality = 75;     // placeholder · Phase 1.4 from QC rejection rate
  const delivery = 80;    // placeholder · Phase 1.4 from GRN actual vs promised
  const paymentTerms = 70;

  const raw: Record<ScoreFactorName, number> = {
    price,
    quality,
    delivery,
    responsiveness,
    payment_terms: paymentTerms,
    compliance,
  };

  const factorBreakdown: VendorScoreFactor[] = (Object.keys(DEFAULT_WEIGHTS) as ScoreFactorName[])
    .map((name) => ({
      name,
      weight: DEFAULT_WEIGHTS[name],
      raw_score: raw[name],
      weighted_score: Math.round((raw[name] * DEFAULT_WEIGHTS[name]) / 100 * 100) / 100,
      factors_used: [],
    }));

  const totalScore = Math.round(
    factorBreakdown.reduce((s, f) => s + f.weighted_score, 0) * 100,
  ) / 100;

  return {
    vendor_id: vendorId,
    vendor_name: rfqs[0]?.vendor_name ?? quotations[0]?.vendor_name ?? vendorId,
    entity_id: entityCode,
    total_score: totalScore,
    factor_breakdown: factorBreakdown,
    rfq_count: rfqCount,
    quote_count: quoteCount,
    award_count: awardCount,
    on_time_delivery_rate: delivery,
    rejection_rate: 100 - quality,
    computed_at: new Date().toISOString(),
  };
}

export function getTopVendorsByScore(entityCode: string, n: number): VendorScore[] {
  const ids = new Set<string>();
  listRfqs(entityCode).forEach((r) => ids.add(r.vendor_id));
  listQuotations(entityCode).forEach((q) => ids.add(q.vendor_id));
  const scores = Array.from(ids).map((id) => computeVendorScore(id, entityCode));
  return scores.sort((a, b) => b.total_score - a.total_score).slice(0, n);
}

export function getVendorsForItemByScore(
  _itemId: string,
  entityCode: string,
  n: number,
): VendorScore[] {
  // Sprint 3-a: item-scoped scoring uses global ranking; Phase 1.4 wires item-vendor SSOT history.
  return getTopVendorsByScore(entityCode, n);
}
