/**
 * depreciationEngine.ts — Pure computation library for Fixed Asset depreciation
 * NO localStorage calls, NO side effects. All reads passed in or via params.
 * 6 exported functions: computeWDV, computeSLM, is180DayRule,
 * computeDepreciationForUnits, computeITActReport, computeCompaniesActReport
 */
import type {
  AssetUnitRecord, DepreciationEntry, ITActBlock,
  ITActReportRow, CompaniesActRow,
} from '@/types/fixed-asset';
import { IT_ACT_RATES } from '@/types/fixed-asset';

// ── Single-period WDV depreciation ───────────────────────────────
export function computeWDV(openingWDV: number, rate: number, isHalfRate: boolean): number {
  const depr = openingWDV * (rate / 100);
  return Math.round((isHalfRate ? depr * 0.5 : depr) * 100) / 100;
}

// ── Single-period SLM depreciation ───────────────────────────────
export function computeSLM(cost: number, salvage: number, usefulLifeYears: number, isHalfRate: boolean): number {
  if (usefulLifeYears <= 0) return 0;
  const depr = (cost - salvage) / usefulLifeYears;
  return Math.round((isHalfRate ? depr * 0.5 : depr) * 100) / 100;
}

// ── 180-day rule ─────────────────────────────────────────────────
export function is180DayRule(putToUseDate: string | undefined, fyStart: string): boolean {
  if (!putToUseDate) return false;
  const oct1 = `${fyStart.slice(0, 4)}-10-01`;
  return putToUseDate > oct1;
}

// ── Compute depreciation for all units in an FY ──────────────────
export function computeDepreciationForUnits(
  units: AssetUnitRecord[],
  fy: string,
  entityCode: string,
  ledgerDefs: Array<{ id: string; depreciationMethod: string; depreciationRate: number; usefulLifeYears: number; name: string }>,
): DepreciationEntry[] {
  const fyParts = fy.split('-');
  const fyStartYear = fyParts[0].length === 2 ? `20${fyParts[0]}` : fyParts[0];
  const fyStart = `${fyStartYear}-04-01`;
  const fyEnd = `${parseInt(fyStartYear) + 1}-03-31`;
  const now = new Date().toISOString();
  const entries: DepreciationEntry[] = [];

  for (const unit of units) {
    if (unit.status !== 'active') continue;
    if (!unit.put_to_use_date) continue;

    const ldef = ledgerDefs.find(l => l.id === unit.ledger_definition_id);
    const method = (ldef?.depreciationMethod ?? 'wdv') as 'slm' | 'wdv';
    const rate = unit.it_act_depr_rate || ldef?.depreciationRate || IT_ACT_RATES[unit.it_act_block];
    const halfRate = is180DayRule(unit.put_to_use_date, fyStart);

    let deprAmount: number;
    if (method === 'wdv') {
      deprAmount = computeWDV(unit.opening_wdv, rate, halfRate);
    } else {
      const usefulLife = ldef?.usefulLifeYears || 10;
      deprAmount = computeSLM(unit.gross_block_cost, unit.salvage_value, usefulLife, halfRate);
    }

    // Cap depreciation at opening WDV minus salvage
    const maxDepr = Math.max(0, unit.opening_wdv - unit.salvage_value);
    deprAmount = Math.min(deprAmount, maxDepr);

    entries.push({
      id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      asset_unit_id: unit.id,
      asset_id: unit.asset_id,
      ledger_definition_id: unit.ledger_definition_id,
      fy,
      period_from: fyStart,
      period_to: fyEnd,
      method,
      opening_wdv: unit.opening_wdv,
      rate_applied: halfRate ? rate * 0.5 : rate,
      is_half_rate: halfRate,
      depreciation_amount: deprAmount,
      closing_wdv: Math.round((unit.opening_wdv - deprAmount) * 100) / 100,
      status: 'computed',
      created_at: now,
    });
  }

  return entries;
}

// ── IT Act WDV Report — 12-column block-wise schedule ────────────
export function computeITActReport(units: AssetUnitRecord[], fy: string): ITActReportRow[] {
  const fyParts = fy.split('-');
  const fyStartYear = fyParts[0].length === 2 ? `20${fyParts[0]}` : fyParts[0];
  const fyStart = `${fyStartYear}-04-01`;
  const oct1 = `${fyStartYear}-10-01`;

  const blocks = Object.keys(IT_ACT_RATES) as ITActBlock[];
  const rows: ITActReportRow[] = [];

  for (const block of blocks) {
    const blockUnits = units.filter(u => u.it_act_block === block);
    if (blockUnits.length === 0) continue;

    const rate = IT_ACT_RATES[block];

    // Opening WDV = sum of opening_wdv for units active at FY start
    const openingUnits = blockUnits.filter(u => u.status === 'active' && u.purchase_date < fyStart);
    const openingWDV = openingUnits.reduce((s, u) => s + u.opening_wdv, 0);

    // Additions in FY
    const addedUnits = blockUnits.filter(u => u.purchase_date >= fyStart);
    const gt180 = addedUnits.filter(u => u.put_to_use_date && u.put_to_use_date <= oct1);
    const lt180 = addedUnits.filter(u => u.put_to_use_date && u.put_to_use_date > oct1);
    const additionsGt180 = gt180.reduce((s, u) => s + u.gross_block_cost, 0);
    const additionsLt180 = lt180.reduce((s, u) => s + u.gross_block_cost, 0);

    const wdvPlusGt180 = openingWDV + additionsGt180;
    const total = wdvPlusGt180 + additionsLt180;
    const deprFull = Math.round(wdvPlusGt180 * rate / 100 * 100) / 100;
    const deprHalf = Math.round(additionsLt180 * rate / 100 * 0.5 * 100) / 100;
    const totalDepr = deprFull + deprHalf;

    rows.push({
      block, rate, opening_wdv: openingWDV,
      additions_gt_180: additionsGt180, additions_lt_180: additionsLt180,
      wdv_plus_gt180: wdvPlusGt180, total,
      depr_full_rate: deprFull, depr_half_rate: deprHalf,
      total_depreciation: totalDepr,
      closing_wdv: Math.round((total - totalDepr) * 100) / 100,
    });
  }

  return rows;
}

// ── Companies Act Report — 8-column class-wise SLM schedule ──────
export function computeCompaniesActReport(units: AssetUnitRecord[], fy: string): CompaniesActRow[] {
  const fyParts = fy.split('-');
  const fyStartYear = fyParts[0].length === 2 ? `20${fyParts[0]}` : fyParts[0];
  const fyStart = `${fyStartYear}-04-01`;

  const ledgerMap = new Map<string, AssetUnitRecord[]>();
  for (const u of units) {
    const key = u.ledger_name || u.ledger_definition_id;
    if (!ledgerMap.has(key)) ledgerMap.set(key, []);
    ledgerMap.get(key)!.push(u);
  }

  const rows: CompaniesActRow[] = [];
  for (const [ledgerName, groupUnits] of ledgerMap) {
    const grossOpening = groupUnits
      .filter(u => u.purchase_date < fyStart)
      .reduce((s, u) => s + u.gross_block_cost, 0);
    const additions = groupUnits
      .filter(u => u.purchase_date >= fyStart)
      .reduce((s, u) => s + u.gross_block_cost, 0);
    const disposals = groupUnits
      .filter(u => (u.status === 'disposed' || u.status === 'written_off'))
      .reduce((s, u) => s + u.gross_block_cost, 0);
    const grossClosing = grossOpening + additions - disposals;
    const accumOpening = groupUnits
      .filter(u => u.purchase_date < fyStart)
      .reduce((s, u) => s + u.accumulated_depreciation, 0);
    const currentDepr = groupUnits
      .filter(u => u.status === 'active')
      .reduce((s, u) => {
        const rate = u.it_act_depr_rate || 10;
        return s + Math.round(u.opening_wdv * rate / 100 * 100) / 100;
      }, 0);
    const accumClosing = accumOpening + currentDepr;
    const netBlock = grossClosing - accumClosing;

    rows.push({
      ledger_name: ledgerName,
      gross_opening: grossOpening, additions, disposals, gross_closing: grossClosing,
      accum_opening: accumOpening, current_depr: currentDepr,
      accum_closing: accumClosing, net_block: netBlock,
    });
  }

  return rows;
}
