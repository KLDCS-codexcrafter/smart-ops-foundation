/**
 * src/lib/uop-depreciation-engine.ts
 *
 * Sprint 67 FAR-3 · Block 3 · MOAT-46 candidate · NEW SIBLING
 * UOP (Units of Production) depreciation engine · production-volume-fed.
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import type {
  UOPDepreciationRow,
  UOPDepreciationResult,
} from '@/types/depreciation-extended';

export function computeUOPPerUnitRate(unit: AssetUnitRecord): number {
  if (!unit.uop_total_units || unit.uop_total_units <= 0) return 0;
  const depreciableAmount = Math.max(0, unit.gross_block_cost - unit.salvage_value);
  return depreciableAmount / unit.uop_total_units;
}

export function computeUOPDepreciationForUnit(
  unit: AssetUnitRecord,
  unitsConsumedDuringFY: number,
  _fy: string,
  productionOrderRefs: string[] = [],
): UOPDepreciationRow | null {
  if (unit.depreciation_method !== 'UOP') return null;
  if (!unit.uop_total_units || unit.uop_total_units <= 0) return null;

  const perUnitRate = computeUOPPerUnitRate(unit);
  const uopConsumedOpening = unit.uop_units_consumed ?? 0;
  const uopConsumedClosing = uopConsumedOpening + unitsConsumedDuringFY;

  const cappedClosing = Math.min(uopConsumedClosing, unit.uop_total_units);
  const cappedDuring = cappedClosing - uopConsumedOpening;
  const cappedCurrentDepr = perUnitRate * cappedDuring;

  const depreciableAmount = Math.max(0, unit.gross_block_cost - unit.salvage_value);
  const accumOpening = unit.accumulated_depreciation;
  const accumClosing = accumOpening + cappedCurrentDepr;
  const netBookValue = Math.max(unit.salvage_value, unit.gross_block_cost - accumClosing);

  return {
    asset_unit_id: unit.id,
    asset_id: unit.asset_id,
    ledger_name: unit.ledger_name,
    uop_total_units: unit.uop_total_units,
    uop_units_consumed_opening: uopConsumedOpening,
    uop_units_consumed_during_fy: cappedDuring,
    uop_units_consumed_closing: cappedClosing,
    depreciable_amount: depreciableAmount,
    per_unit_rate: Math.round(perUnitRate * 10000) / 10000,
    current_depr: Math.round(cappedCurrentDepr),
    accum_opening: Math.round(accumOpening),
    accum_closing: Math.round(accumClosing),
    net_book_value: Math.round(netBookValue),
    production_order_refs: productionOrderRefs,
  };
}

export function computeUOPDepreciation(
  units: AssetUnitRecord[],
  unitsConsumedMap: Map<string, number>,
  fy: string,
  productionOrderRefsMap?: Map<string, string[]>,
): UOPDepreciationResult {
  const rows: UOPDepreciationRow[] = [];
  for (const unit of units) {
    const unitsConsumed = unitsConsumedMap.get(unit.id) ?? 0;
    const refs = productionOrderRefsMap?.get(unit.id) ?? [];
    const row = computeUOPDepreciationForUnit(unit, unitsConsumed, fy, refs);
    if (row) rows.push(row);
  }
  const totalDeprForFY = rows.reduce((s, r) => s + r.current_depr, 0);
  return {
    rows,
    totalDeprForFY: Math.round(totalDeprForFY),
    financialYear: fy,
    unitCount: rows.length,
  };
}

export function isAssetUOPEligible(unit: AssetUnitRecord): boolean {
  return (
    unit.depreciation_method === 'UOP' &&
    typeof unit.uop_total_units === 'number' &&
    unit.uop_total_units > 0
  );
}

export function estimateUOPRemainingLife(unit: AssetUnitRecord): {
  remainingUnits: number;
  remainingPercent: number;
} | null {
  if (!isAssetUOPEligible(unit) || !unit.uop_total_units) return null;
  const consumed = unit.uop_units_consumed ?? 0;
  const remaining = Math.max(0, unit.uop_total_units - consumed);
  const percent = (remaining / unit.uop_total_units) * 100;
  return {
    remainingUnits: remaining,
    remainingPercent: Math.round(percent * 100) / 100,
  };
}
