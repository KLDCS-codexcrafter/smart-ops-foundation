/**
 * @file        src/lib/landed-cost-replay-engine.ts
 * @purpose     Landed Cost Replay · point-in-time snapshot of MLGIT events + CI allocations · Moat #1 FULL CONSUMER
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q8=a replay engine · EX-5-Q15=a respects inventory-item.default_costing_method READ-ONLY
 */
import { loadMultiLegGITs } from '@/lib/multi-leg-git-engine';
import { loadCIs } from '@/lib/commercial-invoice-engine';

export interface LandedCostReplaySnapshot {
  as_of_timestamp: string;
  mlgit_id: string;
  mlgit_no: string;
  ci_id: string | null;
  ci_no: string | null;
  booked_total_inr: number;
  custom_revalued_total_inr: number;
  actual_landed_total_inr: number;
  events_replayed: number;
  ci_allocations_replayed: number;
  applicable_costing_method_summary: string;
}

export function replayLandedCost(
  entityCode: string,
  mlgitId: string,
  asOf: string = new Date().toISOString(),
): LandedCostReplaySnapshot {
  const all_mlgits = loadMultiLegGITs(entityCode);
  const mlgit = all_mlgits.find((m) => m.id === mlgitId);
  if (!mlgit) throw new Error(`MLGIT not found: ${mlgitId}`);

  const eventsUpTo = mlgit.reconciliation_events.filter((e) => e.timestamp <= asOf);
  const booked = eventsUpTo.filter((e) => e.bucket === 'booked').reduce((s, e) => Math.max(s, e.amount_after_inr), 0);
  const custom = eventsUpTo.filter((e) => e.bucket === 'custom_revalued').reduce((s, e) => Math.max(s, e.amount_after_inr), 0);
  const actual = eventsUpTo.filter((e) => e.bucket === 'actual_landed').reduce((s, e) => Math.max(s, e.amount_after_inr), 0);

  const all_cis = loadCIs(entityCode);
  const linked_ci = all_cis.find((c) => c.related_mlgit_id === mlgitId) ?? null;

  const methods = linked_ci
    ? linked_ci.lines.map((l) => l.allocation.part_f.applicable_costing_method).filter((m): m is 'FIFO' | 'FEFO' | 'Weighted' => Boolean(m))
    : [];
  const uniqueMethods = Array.from(new Set<string>(methods));
  const method_summary = uniqueMethods.length > 0 ? uniqueMethods.join(', ') : 'not-set';

  return {
    as_of_timestamp: asOf,
    mlgit_id: mlgit.id, mlgit_no: mlgit.mlgit_no,
    ci_id: linked_ci?.id ?? null, ci_no: linked_ci?.ci_number ?? null,
    booked_total_inr: booked, custom_revalued_total_inr: custom, actual_landed_total_inr: actual,
    events_replayed: eventsUpTo.length,
    ci_allocations_replayed: linked_ci ? linked_ci.lines.length : 0,
    applicable_costing_method_summary: method_summary,
  };
}

export function replayAllLandedCosts(
  entityCode: string,
  asOf: string = new Date().toISOString(),
): LandedCostReplaySnapshot[] {
  return loadMultiLegGITs(entityCode).map((m) => replayLandedCost(entityCode, m.id, asOf));
}
