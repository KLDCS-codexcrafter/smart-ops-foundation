/**
 * @file        src/lib/material-wastage-forecaster.ts
 * @purpose     Material Wastage Forecaster (OOB #5) · rule-based stub · kills Leak #1 Inventory
 * @sprint      T-Phase-1.A.15a SiteX Closeout · OOB #5 · Block E.4
 * @decisions   D-NEW-CR pattern · Phase 2 ML refinement candidate
 * @[JWT]       Phase 2 ML candidate
 */

export interface WastageForecast {
  item_id: string;
  category: string;
  issued_qty: number;
  consumed_qty: number;
  wastage_rate: number;
  industry_threshold: number;
  remaining_planned_qty: number;
  forecasted_wastage: number;
  alert: boolean;
  alert_message: string;
}

export const INDUSTRY_WASTAGE_THRESHOLDS: Record<string, number> = {
  cement: 0.03,
  steel: 0.02,
  electrical: 0.05,
  piping: 0.04,
  paint: 0.08,
  default: 0.05,
};

export function forecastWastage(input: {
  item_id: string;
  category: string;
  issued_qty: number;
  consumed_qty: number;
  remaining_planned_qty: number;
}): WastageForecast {
  const threshold = INDUSTRY_WASTAGE_THRESHOLDS[input.category] ?? INDUSTRY_WASTAGE_THRESHOLDS.default;
  const wastageRate = input.issued_qty > 0
    ? Math.max(0, (input.issued_qty - input.consumed_qty) / input.issued_qty)
    : 0;
  const forecastedWastage = wastageRate * input.remaining_planned_qty;
  const thresholdAbs = threshold * input.remaining_planned_qty;
  const alert = forecastedWastage > thresholdAbs;
  return {
    item_id: input.item_id,
    category: input.category,
    issued_qty: input.issued_qty,
    consumed_qty: input.consumed_qty,
    wastage_rate: wastageRate,
    industry_threshold: threshold,
    remaining_planned_qty: input.remaining_planned_qty,
    forecasted_wastage: forecastedWastage,
    alert,
    alert_message: alert
      ? `Wastage ${(wastageRate * 100).toFixed(1)}% exceeds ${input.category} threshold ${(threshold * 100).toFixed(1)}%`
      : '',
  };
}
