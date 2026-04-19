/**
 * stock-out.ts — Stock-out early warning + cross-distributor transfer
 * [JWT] GET /api/distributor/stock-levels  POST /api/stock/transfer-suggest
 */

export interface StockLevelSnapshot {
  entity_id: string;
  distributor_id: string;
  distributor_name: string;
  territory_id: string | null;
  item_id: string;
  item_name: string;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_level: number;
  avg_daily_demand: number;
  snapshot_at: string;
}

export type StockOutSeverity = 'critical' | 'warning' | 'info';

export interface TransferSuggestion {
  from_distributor_id: string;
  from_distributor_name: string;
  surplus_qty: number;
  distance_score: number;
  feasible: boolean;
  note: string;
}

export interface StockOutAlert {
  id: string;
  entity_id: string;
  distributor_id: string;
  distributor_name: string;
  item_id: string;
  item_name: string;
  available_qty: number;
  days_of_cover: number;
  severity: StockOutSeverity;
  suggested_transfers: TransferSuggestion[];
  created_at: string;
  dismissed_at: string | null;
}

export const stockLevelsKey    = (e: string) => `erp_stock_levels_${e}`;
export const stockOutAlertsKey = (e: string) => `erp_stock_out_alerts_${e}`;

export const CRITICAL_DAYS = 3;
export const WARNING_DAYS  = 7;
