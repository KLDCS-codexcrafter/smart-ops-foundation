/**
 * @file     cross-sell-finder.ts
 * @purpose  Identify cross-sell candidates using rule-based heuristics.
 *           Heuristics (S4.5 MVP):
 *           1. Customer bought fewer products than peer-average in their sector.
 *           2. Customer dormant — no purchase recently but bought historically.
 *           3. (Reserved) Customer segment X doesn't have category Y but peers in X do.
 *           Deeper ML/recommendation is deferred to a later sprint.
 * @sprint   T-H1.5-C-S4.5
 * @finding  CC-058
 */

import type { CustomerKPI } from './customer-kpi-engine';

export type CandidateReason =
  | 'low_product_diversity'
  | 'dormant'
  | 'missing_top_category';

export interface CrossSellCandidate {
  partyId: string;
  partyName: string;
  sectorId: string;
  reason: CandidateReason;
  detail: string;
}

export interface CrossSellInputCustomer {
  id: string;
  partyName: string;
  natureOfBusiness: string;
  businessActivity: string;
}

export interface CrossSellInput {
  customers: CrossSellInputCustomer[];
  kpis: Map<string, CustomerKPI>;
}

export function findCrossSellCandidates({ customers, kpis }: CrossSellInput): CrossSellCandidate[] {
  const candidates: CrossSellCandidate[] = [];

  const bySector = new Map<string, CrossSellInputCustomer[]>();
  for (const c of customers) {
    const sector = c.natureOfBusiness || '__unassigned__';
    if (!bySector.has(sector)) bySector.set(sector, []);
    bySector.get(sector)!.push(c);
  }

  for (const [sectorId, sectorCustomers] of bySector.entries()) {
    if (sectorId === '__unassigned__') continue;
    const sectorKpis = sectorCustomers
      .map(c => kpis.get(c.id))
      .filter((k): k is CustomerKPI => !!k);
    if (sectorKpis.length < 3) continue;

    const avgProductCount =
      sectorKpis.reduce((s, k) => s + k.productsPurchasedCount, 0) / sectorKpis.length;

    for (const c of sectorCustomers) {
      const kpi = kpis.get(c.id);
      if (!kpi || kpi.healthStatus === 'new') continue;

      if (kpi.productsPurchasedCount < avgProductCount * 0.5 && kpi.productsPurchasedCount > 0) {
        candidates.push({
          partyId: c.id,
          partyName: c.partyName,
          sectorId,
          reason: 'low_product_diversity',
          detail: `${kpi.productsPurchasedCount} products vs sector avg ${Math.round(avgProductCount)}`,
        });
      }

      const last = kpi.lastTransactionDate;
      if (last) {
        const days = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
        if (days > 30 && days < 120 && kpi.lifetimeRevenue > 0) {
          candidates.push({
            partyId: c.id,
            partyName: c.partyName,
            sectorId,
            reason: 'dormant',
            detail: `No purchase in ${days} days; lifetime ₹${Math.round(kpi.lifetimeRevenue).toLocaleString('en-IN')}`,
          });
        }
      }
    }
  }

  return candidates;
}
