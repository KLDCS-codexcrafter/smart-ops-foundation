/**
 * src/types/depreciation-extended.ts
 *
 * Sprint 67 FAR-3 · Compute Engine Best-in-Class · NEW output type module.
 * Shapes for Multi-GAAP / UOP / Component depreciation reports.
 */

import type { ITActReportRow, CompaniesActRow } from './fixed-asset';

export interface IndASRow {
  asset_unit_id: string;
  asset_id: string;
  ledger_name: string;
  gross_opening: number;
  additions: number;
  disposals: number;
  gross_closing: number;
  accum_opening: number;
  current_depr: number;
  accum_closing: number;
  net_carrying_amount: number;
  useful_life_years: number;
  depreciation_method: string;
  is_component_depreciated: boolean;
}

export interface MultiGAAPDepreciationResult {
  itAct: ITActReportRow[];
  companiesAct: CompaniesActRow[];
  indAS: IndASRow[];
  totals: {
    itActTotalDepr: number;
    companiesActTotalDepr: number;
    indASTotalDepr: number;
    maxAbsoluteDifferential: number;
  };
  financialYear: string;
  unitCount: number;
}

export interface UOPDepreciationRow {
  asset_unit_id: string;
  asset_id: string;
  ledger_name: string;
  uop_total_units: number;
  uop_units_consumed_opening: number;
  uop_units_consumed_during_fy: number;
  uop_units_consumed_closing: number;
  depreciable_amount: number;
  per_unit_rate: number;
  current_depr: number;
  accum_opening: number;
  accum_closing: number;
  net_book_value: number;
  production_order_refs: string[];
}

export interface UOPDepreciationResult {
  rows: UOPDepreciationRow[];
  totalDeprForFY: number;
  financialYear: string;
  unitCount: number;
}

export interface ComponentDepreciationRow {
  asset_unit_id: string;
  asset_id: string;
  component_id: string;
  component_name: string;
  cost_allocation: number;
  useful_life_years: number;
  salvage_value: number;
  depreciation_method: string;
  current_depr: number;
  net_carrying_amount: number;
}

export interface ComponentDepreciationResult {
  rows: ComponentDepreciationRow[];
  perAssetTotals: Array<{
    asset_unit_id: string;
    asset_id: string;
    componentCount: number;
    totalDepr: number;
    totalNetCarryingAmount: number;
  }>;
  totalDeprForFY: number;
  financialYear: string;
  unitCount: number;
}
