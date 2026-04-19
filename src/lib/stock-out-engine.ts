/**
 * stock-out-engine.ts — Pure engine: derive alerts from snapshots
 */

import type {
  StockLevelSnapshot, StockOutAlert, TransferSuggestion, StockOutSeverity,
} from '@/types/stock-out';
import { CRITICAL_DAYS, WARNING_DAYS } from '@/types/stock-out';

function computeSeverity(daysOfCover: number): StockOutSeverity {
  if (daysOfCover < CRITICAL_DAYS) return 'critical';
  if (daysOfCover < WARNING_DAYS)  return 'warning';
  return 'info';
}

/** For a given distributor+item with low stock, find up to 3 transfer candidates. */
export function suggestTransfers(
  shortfall: StockLevelSnapshot, allSnapshots: StockLevelSnapshot[],
): TransferSuggestion[] {
  return allSnapshots
    .filter(s =>
      s.item_id === shortfall.item_id &&
      s.distributor_id !== shortfall.distributor_id &&
      s.available_qty >= shortfall.avg_daily_demand * 7,
    )
    .map<TransferSuggestion>(s => {
      const sameTerritory = s.territory_id === shortfall.territory_id && s.territory_id !== null;
      const distanceScore = sameTerritory ? 90 : 50;
      const surplusQty = Math.max(0, s.available_qty - s.avg_daily_demand * 7);
      return {
        from_distributor_id: s.distributor_id,
        from_distributor_name: s.distributor_name,
        surplus_qty: surplusQty,
        distance_score: distanceScore,
        feasible: surplusQty > 0,
        note: sameTerritory ? 'Same territory — fastest transfer' : 'Cross-territory — coordination required',
      };
    })
    .filter(t => t.feasible)
    .sort((a, b) => b.distance_score - a.distance_score)
    .slice(0, 3);
}

/** Build all alerts from all snapshots. */
export function computeStockOutAlerts(snapshots: StockLevelSnapshot[]): StockOutAlert[] {
  const alerts: StockOutAlert[] = [];
  for (const s of snapshots) {
    if (s.avg_daily_demand <= 0) continue;
    const daysOfCover = s.available_qty / s.avg_daily_demand;
    if (daysOfCover >= WARNING_DAYS) continue;
    alerts.push({
      id: `alert-${Date.now()}-${s.distributor_id}-${s.item_id}`,
      entity_id: s.entity_id,
      distributor_id: s.distributor_id,
      distributor_name: s.distributor_name,
      item_id: s.item_id,
      item_name: s.item_name,
      available_qty: s.available_qty,
      days_of_cover: Math.round(daysOfCover * 10) / 10,
      severity: computeSeverity(daysOfCover),
      suggested_transfers: suggestTransfers(s, snapshots),
      created_at: new Date().toISOString(),
      dismissed_at: null,
    });
  }
  return alerts.sort((a, b) => a.days_of_cover - b.days_of_cover);
}

/** Seed demo snapshots for first-run (so UI has something to render). */
export function seedDemoStockLevels(entityCode: string): StockLevelSnapshot[] {
  const now = new Date().toISOString();
  const mk = (
    d_id: string, d_name: string, terr: string,
    i_id: string, i_name: string,
    avail: number, demand: number,
  ): StockLevelSnapshot => ({
    entity_id: entityCode, distributor_id: d_id, distributor_name: d_name,
    territory_id: terr, item_id: i_id, item_name: i_name,
    on_hand_qty: avail + 20, reserved_qty: 20, available_qty: avail,
    reorder_level: 10, avg_daily_demand: demand, snapshot_at: now,
  });
  return [
    mk('d-sharma',   'Sharma Traders', 'kol-n', 'item-rice', 'Basmati Rice 25kg', 8,   5),
    mk('d-kolkata2', 'Kolkata North',  'kol-n', 'item-rice', 'Basmati Rice 25kg', 200, 4),
    mk('d-howrah',   'Howrah Depot',   'how',   'item-rice', 'Basmati Rice 25kg', 150, 6),
    mk('d-sharma',   'Sharma Traders', 'kol-n', 'item-atta', 'Atta 10kg',         25,  4),
    mk('d-kolkata2', 'Kolkata North',  'kol-n', 'item-atta', 'Atta 10kg',         180, 3),
  ];
}
