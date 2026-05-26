/**
 * src/lib/component-depreciation-engine.ts
 *
 * Sprint 67 FAR-3 · Block 4 · MOAT-47 candidate · NEW SIBLING
 * Component depreciation per Ind AS 16 paragraph 43-47.
 */

import type { AssetUnitRecord, ComponentDef, DepreciationMethod } from '@/types/fixed-asset';
import type {
  ComponentDepreciationRow,
  ComponentDepreciationResult,
} from '@/types/depreciation-extended';
import { computeSLM, computeWDV } from '@/lib/depreciation-engine';

function computeForComponent(
  parentUnit: AssetUnitRecord,
  component: ComponentDef,
  _fy: string,
): ComponentDepreciationRow {
  const method: DepreciationMethod = component.depreciation_method
    ?? parentUnit.depreciation_method
    ?? 'SLM';

  let currentDepr = 0;

  if (method === 'SLM') {
    currentDepr = computeSLM(
      component.cost_allocation,
      component.salvage_value,
      component.useful_life_years,
      false,
    );
  } else if (method === 'WDV') {
    const ratio = component.salvage_value > 0
      ? component.salvage_value / component.cost_allocation
      : 0.05;
    const rate = (1 - Math.pow(ratio, 1 / component.useful_life_years)) * 100;
    currentDepr = computeWDV(component.cost_allocation, rate, false);
  } else {
    currentDepr = computeSLM(
      component.cost_allocation,
      component.salvage_value,
      component.useful_life_years,
      false,
    );
  }

  const parentAccumOpening = parentUnit.accumulated_depreciation;
  const componentCostRatio = component.cost_allocation / Math.max(1, parentUnit.gross_block_cost);
  const componentAccumOpening = parentAccumOpening * componentCostRatio;
  const netCarryingAmount = Math.max(0, component.cost_allocation - componentAccumOpening - currentDepr);

  return {
    asset_unit_id: parentUnit.id,
    asset_id: parentUnit.asset_id,
    component_id: component.component_id,
    component_name: component.component_name,
    cost_allocation: component.cost_allocation,
    useful_life_years: component.useful_life_years,
    salvage_value: component.salvage_value,
    depreciation_method: method,
    current_depr: Math.round(currentDepr),
    net_carrying_amount: Math.round(netCarryingAmount),
  };
}

export function computeComponentDepreciation(
  units: AssetUnitRecord[],
  fy: string,
): ComponentDepreciationResult {
  const rows: ComponentDepreciationRow[] = [];
  const perAssetTotals: ComponentDepreciationResult['perAssetTotals'] = [];

  for (const unit of units) {
    if (!Array.isArray(unit.component_breakdown) || unit.component_breakdown.length === 0) continue;
    if (unit.status !== 'active' && unit.status !== 'cwip') continue;

    let totalDepr = 0;
    let totalNCA = 0;

    for (const comp of unit.component_breakdown) {
      const row = computeForComponent(unit, comp, fy);
      rows.push(row);
      totalDepr += row.current_depr;
      totalNCA += row.net_carrying_amount;
    }

    perAssetTotals.push({
      asset_unit_id: unit.id,
      asset_id: unit.asset_id,
      componentCount: unit.component_breakdown.length,
      totalDepr: Math.round(totalDepr),
      totalNetCarryingAmount: Math.round(totalNCA),
    });
  }

  const totalDeprForFY = rows.reduce((s, r) => s + r.current_depr, 0);

  return {
    rows,
    perAssetTotals,
    totalDeprForFY: Math.round(totalDeprForFY),
    financialYear: fy,
    unitCount: perAssetTotals.length,
  };
}

export function validateComponentBreakdown(unit: AssetUnitRecord): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!Array.isArray(unit.component_breakdown) || unit.component_breakdown.length === 0) {
    return { isValid: true, errors: [] };
  }

  const totalAllocation = unit.component_breakdown.reduce((s, c) => s + c.cost_allocation, 0);
  if (totalAllocation > unit.gross_block_cost + 1) {
    errors.push(`Component cost allocations sum (${totalAllocation}) exceeds gross_block_cost (${unit.gross_block_cost})`);
  }

  const componentIds = new Set<string>();
  for (const comp of unit.component_breakdown) {
    if (componentIds.has(comp.component_id)) {
      errors.push(`Duplicate component_id: ${comp.component_id}`);
    }
    componentIds.add(comp.component_id);

    if (comp.useful_life_years <= 0) {
      errors.push(`Component ${comp.component_id} has invalid useful_life_years: ${comp.useful_life_years}`);
    }
    if (comp.cost_allocation <= 0) {
      errors.push(`Component ${comp.component_id} has invalid cost_allocation: ${comp.cost_allocation}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
