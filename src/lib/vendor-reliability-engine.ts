/**
 * @file        src/lib/vendor-reliability-engine.ts
 * @purpose     Vendor Reliability Scorecard · Moat #21 PRIMARY · MIRROR of EX-7a buyer-reliability-engine
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q4=a MIRROR · buyer-reliability-engine.ts STAYS 0-DIFF
 */
import type { VendorReliabilityScore, VendorReliabilityClass, VendorReliabilityComponents } from '@/types/vendor-reliability-score';
import { vendorReliabilityKey } from '@/types/vendor-reliability-score';

const SEED_VENDOR_SCORES: VendorReliabilityScore[] = [
  { id: 'vrs-001', entity_id: 'sinha-trading', related_foreign_vendor_id: 'fv-sinha-001', vendor_name: 'Shanghai Steel Trade Co.', country_code: 'CN', components: { on_time_delivery_score: 88, quality_acceptance_score: 92, price_stability_score: 78, carotar_compliance_score: 95, dgtr_exposure_score: 70, sanctions_clearance_score: 100, payment_terms_adherence_score: 85, composite_score: 87, classification: 'preferred', computed_at: '2026-05-20T00:00:00.000Z' }, prior_classification: 'strategic', classification_changed_at: '2026-05-15T00:00:00.000Z', active_dgtr_case_count: 1, active_sanctions_hit_count: 0, open_carotar_queries: 0, notes: 'Steel CTH 7208 vendor · 1 active DGTR (anti-dumping) · CAROTAR sd-001 accepted', created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-05-20T00:00:00.000Z' },
];

// [JWT] GET /api/eximx/vendor-reliability?entityCode=...
export function loadVendorScores(entityCode: string): VendorReliabilityScore[] {
  try {
    const raw = localStorage.getItem(vendorReliabilityKey(entityCode));
    if (!raw) { localStorage.setItem(vendorReliabilityKey(entityCode), JSON.stringify(SEED_VENDOR_SCORES)); return SEED_VENDOR_SCORES; }
    return JSON.parse(raw) as VendorReliabilityScore[];
  } catch { return SEED_VENDOR_SCORES; }
}

export function saveVendorScores(entityCode: string, list: VendorReliabilityScore[]): void {
  localStorage.setItem(vendorReliabilityKey(entityCode), JSON.stringify(list));
}

export function classifyVendorReliability(score: number): VendorReliabilityClass {
  if (score >= 85) return 'preferred';
  if (score >= 70) return 'strategic';
  if (score >= 50) return 'standard';
  if (score >= 30) return 'probationary';
  return 'blocked';
}

export function computeCompositeVendorScore(c: Omit<VendorReliabilityComponents, 'composite_score' | 'classification' | 'computed_at'>): { score: number; classification: VendorReliabilityClass } {
  const W = { otd: 0.20, quality: 0.20, price: 0.10, carotar: 0.15, dgtr: 0.10, sanctions: 0.15, payment: 0.10 };
  const score = Math.round(
    c.on_time_delivery_score * W.otd +
    c.quality_acceptance_score * W.quality +
    c.price_stability_score * W.price +
    c.carotar_compliance_score * W.carotar +
    c.dgtr_exposure_score * W.dgtr +
    c.sanctions_clearance_score * W.sanctions +
    c.payment_terms_adherence_score * W.payment,
  );
  return { score, classification: classifyVendorReliability(score) };
}

export function summarizeVendorScores(list: VendorReliabilityScore[]): {
  total: number;
  by_class: Record<VendorReliabilityClass, number>;
  avg_composite_score: number;
} {
  const by_class: Record<VendorReliabilityClass, number> = { preferred: 0, strategic: 0, standard: 0, probationary: 0, blocked: 0 };
  let totalScore = 0;
  for (const v of list) {
    by_class[v.components.classification] += 1;
    totalScore += v.components.composite_score;
  }
  return { total: list.length, by_class, avg_composite_score: list.length > 0 ? Math.round(totalScore / list.length) : 0 };
}
