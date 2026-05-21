/**
 * @file        src/lib/hedge-accrual-engine.ts
 * @purpose     D-NEW-FB · Forex Hedge accrual entries at quarter-end · 7th D-NEW-FG consumer
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block B
 * @decisions   Q-LOCK-4(a) · 7th D-NEW-FG consumer · hedge-contract + voucher-runtime STAY 0-DIFF
 * @disciplines FR-30 · FR-50 · Ind AS 109 hedge accounting · returns NEW objects via spread
 */
import type { HedgeContract } from '@/types/hedge-contract';
import { loadHedges } from '@/lib/hedge-contract-engine';

export type AccrualPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'monthly';

export interface HedgeAccrualEntry {
  id: string;
  hedge_contract_id: string;
  hedge_contract_no: string;
  entity_id: string;
  accrual_period: AccrualPeriod;
  period_start: string;
  period_end: string;
  notional_inr_at_lock: number;
  market_mark_inr: number;
  unrealised_gain_loss_inr: number;
  is_effective_hedge: boolean;
  effective_portion_inr: number;
  ineffective_portion_inr: number;
  voucher_routing_target: 'voucher_runtime_oci' | 'voucher_runtime_pnl';
  notes: string;
  computed_at: string;
}

export interface HedgeAccrualReport {
  entity_id: string;
  period: AccrualPeriod;
  period_start: string;
  period_end: string;
  hedges_evaluated: number;
  total_unrealised_gain_loss_inr: number;
  total_effective_oci_inr: number;
  total_ineffective_pnl_inr: number;
  entries: HedgeAccrualEntry[];
}

const EFFECTIVENESS_THRESHOLD = 0.80;
const PERFECT_EFFECTIVENESS = 1.25;

function determineEffectiveness(hedge: HedgeContract, spotAtPeriodEnd: number): {
  isEffective: boolean;
  effectiveRatio: number;
} {
  if (hedge.is_speculative) return { isEffective: false, effectiveRatio: 0 };
  const lockedRate = hedge.forward_rate_locked;
  if (lockedRate === 0) return { isEffective: false, effectiveRatio: 0 };
  const ratio = spotAtPeriodEnd / lockedRate;
  const isEffective = ratio >= EFFECTIVENESS_THRESHOLD && ratio <= PERFECT_EFFECTIVENESS;
  return { isEffective, effectiveRatio: ratio };
}

function buildAccrualForHedge(
  hedge: HedgeContract,
  period: AccrualPeriod,
  periodStart: string,
  periodEnd: string,
  spotAtPeriodEnd: number,
): HedgeAccrualEntry {
  const marketMarkInr = hedge.notional_amount_foreign * spotAtPeriodEnd;
  const unrealised = marketMarkInr - hedge.notional_amount_inr_at_lock;
  const { isEffective } = determineEffectiveness(hedge, spotAtPeriodEnd);
  const effectivePortion = isEffective ? unrealised : 0;
  const ineffectivePortion = isEffective ? 0 : unrealised;

  return {
    id: `acc-${hedge.id}-${period}`,
    hedge_contract_id: hedge.id,
    hedge_contract_no: hedge.hedge_contract_no,
    entity_id: hedge.entity_id,
    accrual_period: period,
    period_start: periodStart,
    period_end: periodEnd,
    notional_inr_at_lock: hedge.notional_amount_inr_at_lock,
    market_mark_inr: Math.round(marketMarkInr),
    unrealised_gain_loss_inr: Math.round(unrealised),
    is_effective_hedge: isEffective,
    effective_portion_inr: Math.round(effectivePortion),
    ineffective_portion_inr: Math.round(ineffectivePortion),
    voucher_routing_target: isEffective ? 'voucher_runtime_oci' : 'voucher_runtime_pnl',
    notes: isEffective
      ? 'Effective hedge · effective portion → Hedge Reserve OCI · ineffective → 0'
      : hedge.is_speculative
        ? 'Speculative hedge · all MTM to P&L'
        : 'Ineffective hedge (Ind AS 109 80-125% band) · all MTM to P&L',
    computed_at: new Date().toISOString(),
  };
}

export function computeQuarterEndHedgeAccruals(
  entityCode: string,
  period: AccrualPeriod,
  periodStart: string,
  periodEnd: string,
  spotRateAtPeriodEnd: number,
): HedgeAccrualReport {
  const hedges = loadHedges(entityCode);
  const openHedges = hedges.filter(
    (h) => h.status === 'open' && h.booking_date <= periodEnd && h.maturity_date > periodEnd,
  );

  const entries = openHedges.map((h) =>
    buildAccrualForHedge(h, period, periodStart, periodEnd, spotRateAtPeriodEnd),
  );

  const totalUnrealised = entries.reduce((s, e) => s + e.unrealised_gain_loss_inr, 0);
  const totalOCI = entries.reduce((s, e) => s + e.effective_portion_inr, 0);
  const totalPNL = entries.reduce((s, e) => s + e.ineffective_portion_inr, 0);

  return {
    entity_id: entityCode,
    period,
    period_start: periodStart,
    period_end: periodEnd,
    hedges_evaluated: entries.length,
    total_unrealised_gain_loss_inr: totalUnrealised,
    total_effective_oci_inr: totalOCI,
    total_ineffective_pnl_inr: totalPNL,
    entries,
  };
}

export function summarizeAccrualReport(report: HedgeAccrualReport): {
  hedges: number;
  oci_inr: number;
  pnl_inr: number;
  net_unrealised_inr: number;
} {
  return {
    hedges: report.hedges_evaluated,
    oci_inr: report.total_effective_oci_inr,
    pnl_inr: report.total_ineffective_pnl_inr,
    net_unrealised_inr: report.total_unrealised_gain_loss_inr,
  };
}
