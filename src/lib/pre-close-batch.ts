/**
 * @file        pre-close-batch.ts
 * @purpose     Batch wrapper · enumerate active RFQs and return those that
 *              SHOULD be pre-closed per existing rfq-engine logic.
 * @who         Lovable · Procurement / RFQ desk
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @iso         25010 · Functional Suitability
 * @decisions   D-NEW-AO (Pre-Close batch wrapper · consume rfq-engine)
 * @disciplines FR-19 (consume engines · zero rewrite) · FR-30
 * @reuses      rfq-engine (listRfqs · computePreCloseRecommendation · PreCloseRecommendation)
 * @[JWT]       n/a · pure compute
 */

import {
  listRfqs,
  computePreCloseRecommendation,
  type PreCloseRecommendation,
} from './rfq-engine';

/**
 * Returns all RFQs that meet at least one pre-close trigger.
 * Sorted by `pct_elapsed` descending (most urgent first).
 */
export function listPreCloseCandidates(entityCode: string): PreCloseRecommendation[] {
  const rfqs = listRfqs(entityCode);
  const out: PreCloseRecommendation[] = [];
  for (const rfq of rfqs) {
    const rec = computePreCloseRecommendation(rfq.id, entityCode);
    if (rec && rec.should_pre_close) out.push(rec);
  }
  out.sort((a, b) => b.pct_elapsed - a.pct_elapsed);
  return out;
}
