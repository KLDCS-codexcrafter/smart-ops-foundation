/**
 * @file        src/lib/hedge-contract-engine.ts
 * @purpose     Hedge contract CRUD + maturity tracking + settlement variance computation
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q3=a sibling · currency.ts 0-diff
 */
import type { HedgeContract, HedgeStatus, HedgeDirection } from '@/types/hedge-contract';
import { hedgeContractKey, HEDGE_VALID_TRANSITIONS } from '@/types/hedge-contract';
import { SINHA_HEDGE_CONTRACTS } from '@/data/sinha-tt-hedge-seed-data';

export function loadHedges(entityCode: string): HedgeContract[] {
  try {
    const raw = localStorage.getItem(hedgeContractKey(entityCode));
    if (!raw) {
      localStorage.setItem(hedgeContractKey(entityCode), JSON.stringify(SINHA_HEDGE_CONTRACTS));
      return SINHA_HEDGE_CONTRACTS;
    }
    return JSON.parse(raw) as HedgeContract[];
  } catch { return SINHA_HEDGE_CONTRACTS; }
}

export function saveHedges(entityCode: string, list: HedgeContract[]): void {
  localStorage.setItem(hedgeContractKey(entityCode), JSON.stringify(list));
}

/** Compute settlement variance · pure · sign depends on direction */
export function computeSettlementVariance(
  direction: HedgeDirection,
  forwardRate: number,
  spotRate: number,
  notional: number,
): number {
  const diff = direction === 'forward_sell' ? forwardRate - spotRate : spotRate - forwardRate;
  return Math.round(diff * notional);
}

export function transitionHedge(entityCode: string, id: string, next: HedgeStatus): HedgeContract {
  const list = loadHedges(entityCode);
  const h = list.find((x) => x.id === id);
  if (!h) throw new Error(`Hedge not found: ${id}`);
  if (!HEDGE_VALID_TRANSITIONS[h.status].includes(next)) {
    throw new Error(`Invalid hedge transition: ${h.status} → ${next}`);
  }
  const updated: HedgeContract = { ...h, status: next, updated_at: new Date().toISOString() };
  if (next === 'matured_settled' && updated.spot_rate_at_maturity !== null) {
    updated.settlement_variance_inr = computeSettlementVariance(updated.direction, updated.forward_rate_locked, updated.spot_rate_at_maturity, updated.notional_amount_foreign);
    updated.settlement_date = new Date().toISOString();
  }
  saveHedges(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}
