/**
 * @file        src/lib/ecomx-cockpit-engine.ts
 * @purpose     S155 · EcomX Cockpit · DP-EC-10 · pure read-layer aggregation across
 *              ecomx-engine + ecomx-recon-engine. Recomputes nothing — only sums
 *              what the source engines already classified. Deterministic
 *              (caller supplies period · no Date.now() defaults inside the math).
 * @sprint      Sprint 155 · EcomX Cockpit + Packing Evidence · ARC CLOSE
 * @reads-from  ecomx-engine (CALL ONLY: listMarketplaces · listEcOrders ·
 *              listUnmappedSkus · listPackingEvidence) · ecomx-recon-engine
 *              (CALL ONLY: listReconRuns · getTaxCreditSummary · getClaimsStats ·
 *              listReturns).
 * @walls       §H 0-DIFF on every engine it reads. No writes. No new deps.
 * @JWT         P2BB seams enumerated in S155 close summary.
 */
import {
  listMarketplaces, listEcOrders, listUnmappedSkus, listPackingEvidence,
} from '@/lib/ecomx-engine';
import {
  listReconRuns, getTaxCreditSummary, getClaimsStats,
} from '@/lib/ecomx-recon-engine';
import type {
  EcCockpit, EcCockpitChannelRow, EcOrder, EcMarketplace,
} from '@/types/ecomx';
import { dAdd, round2 } from '@/lib/decimal-helpers';

/** Pure helper · current-month ISO bounds from supplied now (no module-level Date). */
export function defaultCockpitPeriod(nowISO: string): { periodFrom: string; periodTo: string } {
  const now = new Date(nowISO);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const toDate = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { periodFrom: from, periodTo: toDate };
}

function inPeriod(iso: string | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= from && d <= to;
}

export function buildEcomxCockpit(
  entityCode: string,
  periodFrom: string,
  periodTo: string,
): EcCockpit {
  const marketplaces: EcMarketplace[] = listMarketplaces(entityCode);
  const allOrders: EcOrder[] = listEcOrders(entityCode).filter((o) =>
    inPeriod(o.bookedAt ?? o.marketplaceOrderDate, periodFrom, periodTo),
  );

  const channels: EcCockpitChannelRow[] = marketplaces.map((mp) => {
    const rows = allOrders.filter((o) => o.marketplaceId === mp.id);
    const ordersBooked = rows.filter((o) => o.status === 'booked').length;
    const parkedB2B = rows.filter((o) => o.status === 'parked_unmatched').length;
    const returned = rows.filter((o) => o.status === 'returned').length;
    const grossBooked = round2(rows.reduce((a, o) => dAdd(a, o.grossAmount ?? 0), 0));
    const returnsPct = ordersBooked > 0
      ? round2((returned / ordersBooked) * 100)
      : 0;
    const runs = listReconRuns(entityCode, mp.id);
    const lastRun = runs.length > 0
      ? runs.reduce((latest, r) => (r.runAt > latest.runAt ? r : latest), runs[0])
      : null;
    const lastReconVariance = lastRun ? round2(lastRun.totalVariance ?? 0) : null;
    const claims = getClaimsStats(entityCode, mp.id);
    return {
      marketplaceId: mp.id,
      marketplaceName: mp.name,
      ordersBooked, grossBooked, parkedB2B, returned, returnsPct,
      lastReconVariance,
      openClaimsAmount: claims.openAmount,
      recoveredAmount: claims.recoveredAmount,
    };
  });

  const tax = getTaxCreditSummary(entityCode, undefined, periodFrom, periodTo);
  const unmapped = listUnmappedSkus(entityCode).filter((u) => !u.resolvedListingId).length;
  const evidence = listPackingEvidence(entityCode).length;
  const claimsTotal = getClaimsStats(entityCode);

  const totals = {
    ordersBooked: channels.reduce((a, c) => a + c.ordersBooked, 0),
    grossBooked: round2(channels.reduce((a, c) => dAdd(a, c.grossBooked), 0)),
    returned: channels.reduce((a, c) => a + c.returned, 0),
    unmappedSkus: unmapped,
    parkedB2B: channels.reduce((a, c) => a + c.parkedB2B, 0),
    tds194oCredit: tax.tds194oTotal,
    gstTcsCredit: tax.gstTcsTotal,
    openClaimsAmount: claimsTotal.openAmount,
    recoveredAmount: claimsTotal.recoveredAmount,
    evidenceCount: evidence,
  };

  return { periodFrom, periodTo, channels, totals };
}
