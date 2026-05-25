/**
 * @file        src/lib/carbon-planning-engine.ts
 * @sprint      T-Phase-3.PROD-5 · Theme B · 39th SIBLING
 * @purpose     Single source of truth for carbon-aware production planning.
 *              Per Q-LOCK-1 A · Q-LOCK-6 simple weighted formula · Q-LOCK-3 India-grid hourly variation.
 * @moat        MOAT-38 · World-first carbon-aware production planning at SMB price.
 * @disciplines FR-19 SIBLING · FR-26 entity-scoped storage
 * @[JWT]       Phase 2 wires real grid emission factor feeds from CEA / regional DISCOMs
 */

import type {
  CarbonFootprint,
  GridEmissionFactor,
} from '@/types/carbon-planning';
import {
  carbonFootprintsKey,
  gridEmissionFactorKey,
  INDIA_GRID_BASELINE_KG_PER_KWH,
} from '@/types/carbon-planning';

const nowIso = (): string => new Date().toISOString();

const currentFy = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const fyStartYear = d.getMonth() >= 3 ? y : y - 1;
  return `FY${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`;
};

const safeRead = <T>(key: string): T[] => {
  try {
    // [JWT] GET /api/carbon/<key>
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

/**
 * Mock realistic India-grid hourly intensity variation (0.65-0.95 kg CO2/kWh).
 * Peak hours 18-22 highest (coal ramp) · off-peak 02-05 lowest (renewables).
 */
export function getGridIntensityForHour(
  _entityCode: string,
  hourOfDay: number,
  dayType: 'weekday' | 'weekend',
): number {
  const h = ((hourOfDay % 24) + 24) % 24;
  // Sinusoidal base around 0.82 with ±0.13 swing
  // Peak around h=20, trough around h=4
  const phase = ((h - 4) / 24) * 2 * Math.PI;
  const swing = 0.13 * Math.sin(phase);
  let intensity = INDIA_GRID_BASELINE_KG_PER_KWH + swing;
  if (dayType === 'weekend') intensity -= 0.03; // slightly lower industrial load
  // clamp 0.65..0.95
  if (intensity < 0.65) intensity = 0.65;
  if (intensity > 0.95) intensity = 0.95;
  return Math.round(intensity * 1000) / 1000;
}

/**
 * Simple weighted carbon formula (Q-LOCK-6):
 *   total = energy_kwh * grid_factor + machine_baseline + material_scope3
 * Uses mock energy + baselines · production order id seeds deterministic mock values.
 */
export function computeCarbonFootprintForOrder(
  entityCode: string,
  productionOrderId: string,
): CarbonFootprint {
  // Deterministic mock seed from id
  let h = 0;
  for (let i = 0; i < productionOrderId.length; i++) {
    h = (h * 31 + productionOrderId.charCodeAt(i)) >>> 0;
  }
  const energy_kwh = 200 + (h % 800); // 200-1000 kWh
  const machine_baseline_kg = 50 + ((h >>> 5) % 150); // 50-200 kg
  const material_scope3_kg = 100 + ((h >>> 10) % 400); // 100-500 kg
  const hour = (h >>> 15) % 24;
  const grid_emission_factor = getGridIntensityForHour(entityCode, hour, 'weekday');
  const energyCo2 = energy_kwh * grid_emission_factor;
  const total_kg_co2 = Math.round((energyCo2 + machine_baseline_kg + material_scope3_kg) * 100) / 100;

  return {
    id: `cf_${productionOrderId}`,
    entity_id: entityCode,
    source_type: 'production_order',
    source_id: productionOrderId,
    energy_kwh,
    grid_emission_factor,
    machine_baseline_kg,
    material_scope3_kg,
    total_kg_co2,
    computed_at: nowIso(),
    fy: currentFy(),
  };
}

export function rankAlternativesByCarbonIntensity(
  entityCode: string,
  productionOrderIds: string[],
): Array<{ orderId: string; intensityKg: number; rank: number }> {
  const scored = productionOrderIds.map((id) => ({
    orderId: id,
    intensityKg: computeCarbonFootprintForOrder(entityCode, id).total_kg_co2,
  }));
  scored.sort((a, b) => a.intensityKg - b.intensityKg);
  return scored.map((s, idx) => ({ ...s, rank: idx + 1 }));
}

export function forecastCarbonForSchedule(
  entityCode: string,
  scheduleDateFrom: string,
  scheduleDateTo: string,
): { totalKg: number; perDay: Array<{ date: string; kg: number }> } {
  const start = new Date(scheduleDateFrom);
  const end = new Date(scheduleDateTo);
  const perDay: Array<{ date: string; kg: number }> = [];
  let totalKg = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = d.toISOString().slice(0, 10);
    // Mock daily forecast as 12-hour mid weekday intensity × 800 kWh baseline
    const dayType: 'weekday' | 'weekend' =
      d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : 'weekday';
    const kg = Math.round(getGridIntensityForHour(entityCode, 12, dayType) * 800 * 100) / 100;
    perDay.push({ date: dayKey, kg });
    totalKg += kg;
  }
  return { totalKg: Math.round(totalKg * 100) / 100, perDay };
}

export function optimizeShiftForLowCarbonGridSlot(
  entityCode: string,
  productionOrderId: string,
  availableShiftSlots: string[],
): { recommendedSlot: string; intensityKg: number; savingsVsWorst: number } {
  if (availableShiftSlots.length === 0) {
    return { recommendedSlot: '', intensityKg: 0, savingsVsWorst: 0 };
  }
  const fp = computeCarbonFootprintForOrder(entityCode, productionOrderId);
  const scored = availableShiftSlots.map((slot) => {
    // Parse hour from slot like "06:00-14:00" or "14"
    const hourMatch = /(\d{1,2})/.exec(slot);
    const hour = hourMatch ? parseInt(hourMatch[1], 10) : 12;
    const factor = getGridIntensityForHour(entityCode, hour, 'weekday');
    const intensityKg = Math.round((fp.energy_kwh * factor) * 100) / 100;
    return { slot, intensityKg };
  });
  scored.sort((a, b) => a.intensityKg - b.intensityKg);
  const best = scored[0];
  const worst = scored[scored.length - 1];
  return {
    recommendedSlot: best.slot,
    intensityKg: best.intensityKg,
    savingsVsWorst: Math.round((worst.intensityKg - best.intensityKg) * 100) / 100,
  };
}

export function seedGridEmissionFactor(
  entityCode: string,
  region: string,
): GridEmissionFactor {
  const factor: GridEmissionFactor = {
    region,
    baseline_kg_per_kwh: INDIA_GRID_BASELINE_KG_PER_KWH,
    hourly_variation_pct: 15,
    source: 'CEA-2024',
    last_updated: nowIso(),
  };
  try {
    // [JWT] POST /api/carbon/grid-emission-factor
    localStorage.setItem(gridEmissionFactorKey(entityCode), JSON.stringify(factor));
  } catch {
    // non-fatal
  }
  return factor;
}

export function listCarbonFootprints(
  entityCode: string,
  filters?: { sourceType?: string; fy?: string },
): CarbonFootprint[] {
  const all = safeRead<CarbonFootprint>(carbonFootprintsKey(entityCode));
  return all.filter((cf) => {
    if (filters?.sourceType && cf.source_type !== filters.sourceType) return false;
    if (filters?.fy && cf.fy !== filters.fy) return false;
    return true;
  });
}

export function getCarbonTrendByMonth(
  entityCode: string,
  monthsBack: number,
): Array<{ month: string; totalKg: number }> {
  const now = new Date();
  const trend: Array<{ month: string; totalKg: number }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // Mock deterministic monthly value based on entityCode hash + offset
    let h = 0;
    for (let k = 0; k < entityCode.length; k++) h = (h * 31 + entityCode.charCodeAt(k)) >>> 0;
    h = (h + i * 7919) >>> 0;
    const totalKg = 8000 + (h % 5000); // 8-13 t/mo per facility
    trend.push({ month, totalKg });
  }
  return trend;
}
