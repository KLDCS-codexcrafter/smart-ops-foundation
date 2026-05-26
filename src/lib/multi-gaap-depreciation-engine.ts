/**
 * src/lib/multi-gaap-depreciation-engine.ts
 *
 * Sprint 67 FAR-3 · Block 2 · MOAT-45 candidate · NEW SIBLING
 *
 * Multi-GAAP parallel depreciation engine · IT Act + Companies Act + Ind AS 16/116
 * in a single pass. Does NOT modify depreciation-engine.ts (FR-86 v1.16 §Y).
 */

import type {
  AssetUnitRecord,
  ITActBlock,
} from '@/types/fixed-asset';
import {
  computeSLM,
  computeITActReport,
  computeCompaniesActReport,
} from '@/lib/depreciation-engine';
import type {
  IndASRow,
  MultiGAAPDepreciationResult,
} from '@/types/depreciation-extended';

export const IND_AS_USEFUL_LIFE_DEFAULTS: Record<ITActBlock, number> = {
  'Building': 60,
  'Plant & Machinery': 15,
  'Computers & Software': 3,
  'Vehicles': 8,
  'Furniture & Fixtures': 10,
  'Intangibles': 5,
  'Others': 5,
};

function getIndASUsefulLife(unit: AssetUnitRecord): number {
  return IND_AS_USEFUL_LIFE_DEFAULTS[unit.it_act_block] ?? 5;
}

function getDepreciationMethodLabel(unit: AssetUnitRecord): string {
  if (unit.depreciation_method) return unit.depreciation_method;
  return 'SLM';
}

function computeIndASForUnit(unit: AssetUnitRecord, fy: string): IndASRow {
  const usefulLife = getIndASUsefulLife(unit);
  const method = getDepreciationMethodLabel(unit);
  const isComponentMode = Array.isArray(unit.component_breakdown) && unit.component_breakdown.length > 0;

  let currentDepr = 0;

  if (isComponentMode && unit.component_breakdown) {
    for (const comp of unit.component_breakdown) {
      currentDepr += computeSLM(
        comp.cost_allocation,
        comp.salvage_value,
        comp.useful_life_years,
        false,
      );
    }
  } else {
    currentDepr = computeSLM(
      unit.gross_block_cost,
      unit.salvage_value,
      usefulLife,
      false,
    );
  }

  const accumOpening = unit.accumulated_depreciation;
  const accumClosing = accumOpening + currentDepr;
  const netCarryingAmount = Math.max(0, unit.gross_block_cost - accumClosing);

  const fyStart = `20${fy.split('-')[0]}-04-01`;
  const fyEnd = `20${fy.split('-')[1]}-03-31`;
  const putToUseInFY =
    unit.put_to_use_date >= fyStart && unit.put_to_use_date <= fyEnd;
  const additions = putToUseInFY ? unit.gross_block_cost : 0;
  const grossOpening = putToUseInFY ? 0 : unit.gross_block_cost;
  const disposals = unit.status === 'disposed' ? unit.gross_block_cost : 0;
  const grossClosing = grossOpening + additions - disposals;

  return {
    asset_unit_id: unit.id,
    asset_id: unit.asset_id,
    ledger_name: unit.ledger_name,
    gross_opening: grossOpening,
    additions,
    disposals,
    gross_closing: grossClosing,
    accum_opening: accumOpening,
    current_depr: Math.round(currentDepr),
    accum_closing: Math.round(accumClosing),
    net_carrying_amount: Math.round(netCarryingAmount),
    useful_life_years: usefulLife,
    depreciation_method: method,
    is_component_depreciated: isComponentMode,
  };
}

export function computeMultiGAAPDepreciation(
  units: AssetUnitRecord[],
  fy: string,
): MultiGAAPDepreciationResult {
  const itAct = computeITActReport(units, fy);
  const companiesAct = computeCompaniesActReport(units, fy);
  const indAS = units
    .filter((u) => u.status === 'active' || u.status === 'cwip')
    .map((u) => computeIndASForUnit(u, fy));

  const itActTotalDepr = itAct.reduce((s, r) => s + r.depr_full_rate + r.depr_half_rate, 0);
  const companiesActTotalDepr = companiesAct.reduce((s, r) => s + r.current_depr, 0);
  const indASTotalDepr = indAS.reduce((s, r) => s + r.current_depr, 0);

  const maxAbsoluteDifferential = Math.max(
    Math.abs(itActTotalDepr - companiesActTotalDepr),
    Math.abs(itActTotalDepr - indASTotalDepr),
    Math.abs(companiesActTotalDepr - indASTotalDepr),
  );

  return {
    itAct,
    companiesAct,
    indAS,
    totals: {
      itActTotalDepr: Math.round(itActTotalDepr),
      companiesActTotalDepr: Math.round(companiesActTotalDepr),
      indASTotalDepr: Math.round(indASTotalDepr),
      maxAbsoluteDifferential: Math.round(maxAbsoluteDifferential),
    },
    financialYear: fy,
    unitCount: units.length,
  };
}

export function compareMultiGAAPBooks(
  result: MultiGAAPDepreciationResult,
): Array<{
  ledger_name: string;
  itActDepr: number;
  companiesActDepr: number;
  indASDepr: number;
  maxAbsoluteDifferential: number;
}> {
  const byLedger = new Map<string, { itActDepr: number; companiesActDepr: number; indASDepr: number }>();

  for (const row of result.companiesAct) {
    if (!byLedger.has(row.ledger_name)) {
      byLedger.set(row.ledger_name, { itActDepr: 0, companiesActDepr: 0, indASDepr: 0 });
    }
    byLedger.get(row.ledger_name)!.companiesActDepr += row.current_depr;
  }

  for (const row of result.indAS) {
    if (!byLedger.has(row.ledger_name)) {
      byLedger.set(row.ledger_name, { itActDepr: 0, companiesActDepr: 0, indASDepr: 0 });
    }
    byLedger.get(row.ledger_name)!.indASDepr += row.current_depr;
  }

  const itActTotalForDistribution = result.totals.itActTotalDepr;
  const companiesActTotalForRatio = result.totals.companiesActTotalDepr || 1;
  for (const [, totals] of byLedger.entries()) {
    totals.itActDepr = Math.round(
      (totals.companiesActDepr / companiesActTotalForRatio) * itActTotalForDistribution,
    );
  }

  return Array.from(byLedger.entries()).map(([ledger_name, totals]) => ({
    ledger_name,
    itActDepr: totals.itActDepr,
    companiesActDepr: totals.companiesActDepr,
    indASDepr: totals.indASDepr,
    maxAbsoluteDifferential: Math.max(
      Math.abs(totals.itActDepr - totals.companiesActDepr),
      Math.abs(totals.itActDepr - totals.indASDepr),
      Math.abs(totals.companiesActDepr - totals.indASDepr),
    ),
  }));
}

export function isMultiGAAPReconciledWithinTolerance(
  result: MultiGAAPDepreciationResult,
  tolerancePercent = 10,
): boolean {
  const largest = Math.max(
    result.totals.itActTotalDepr,
    result.totals.companiesActTotalDepr,
    result.totals.indASTotalDepr,
  );
  if (largest === 0) return true;
  const toleranceAmount = (largest * tolerancePercent) / 100;
  return result.totals.maxAbsoluteDifferential <= toleranceAmount;
}
