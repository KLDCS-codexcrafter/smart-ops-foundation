/**
 * @file        src/lib/multi-leg-git-engine.ts
 * @purpose     Multi-Leg GIT CRUD + state transitions · two-layer state machine (per-leg + overall)
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q1=b sibling · EX-4-Q6=a two-layer state
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped · FR-80 exhaustive switch
 */
import type { MultiLegGoodsInTransit, MultiLegGITState, LegState } from '@/types/multi-leg-git';
import { multiLegGITKey, getAllLegs } from '@/types/multi-leg-git';
import { SINHA_MULTI_LEG_GITS } from '@/data/sinha-multi-leg-git-seed-data';

export const LEG_VALID_TRANSITIONS: Record<LegState, LegState[]> = {
  pending: ['in_transit'],
  in_transit: ['arrived'],
  arrived: ['handed_over'],
  handed_over: [],
};

export const MLGIT_VALID_TRANSITIONS: Record<MultiLegGITState, MultiLegGITState[]> = {
  originating: ['mid_journey'],
  mid_journey: ['final_leg'],
  final_leg: ['reconciled'],
  reconciled: ['closed'],
  closed: [],
};

export function loadMultiLegGITs(entityCode: string): MultiLegGoodsInTransit[] {
  try {
    const raw = localStorage.getItem(multiLegGITKey(entityCode));
    if (!raw) {
      localStorage.setItem(multiLegGITKey(entityCode), JSON.stringify(SINHA_MULTI_LEG_GITS));
      return SINHA_MULTI_LEG_GITS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MultiLegGoodsInTransit[]) : SINHA_MULTI_LEG_GITS;
  } catch {
    return SINHA_MULTI_LEG_GITS;
  }
}

export function saveMultiLegGITs(entityCode: string, mlgits: MultiLegGoodsInTransit[]): void {
  localStorage.setItem(multiLegGITKey(entityCode), JSON.stringify(mlgits));
}

export function getMultiLegGIT(entityCode: string, id: string): MultiLegGoodsInTransit | null {
  return loadMultiLegGITs(entityCode).find((m) => m.id === id) ?? null;
}

export function deriveOverallState(mlgit: MultiLegGoodsInTransit): MultiLegGITState {
  const activeLegs = getAllLegs(mlgit).filter((l) => !l.skip_flag);
  if (activeLegs.length === 0) return 'closed';
  const allHandedOver = activeLegs.every((l) => l.state === 'handed_over');
  if (allHandedOver) {
    return mlgit.actual_landed_total_inr > 0 ? 'closed' : 'reconciled';
  }
  const lastActive = activeLegs[activeLegs.length - 1];
  if (lastActive.state === 'in_transit' || lastActive.state === 'arrived') return 'final_leg';
  const anyInProgress = activeLegs.some((l) => l.state !== 'pending');
  return anyInProgress ? 'mid_journey' : 'originating';
}

export function filterByState(
  mlgits: MultiLegGoodsInTransit[],
  state: MultiLegGITState,
): MultiLegGoodsInTransit[] {
  return mlgits.filter((m) => m.overall_state === state);
}

export function averageDwellTime(mlgits: MultiLegGoodsInTransit[]): number {
  const dwells = mlgits.map((m) => m.leg4.dwell_time_days).filter((d) => d > 0);
  if (dwells.length === 0) return 0;
  return Number((dwells.reduce((a, b) => a + b, 0) / dwells.length).toFixed(2));
}

// Re-export for convenience
export { countActiveLegs } from '@/types/multi-leg-git';
