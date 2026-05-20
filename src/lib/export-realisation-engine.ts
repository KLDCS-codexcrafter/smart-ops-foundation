/**
 * @file        src/lib/export-realisation-engine.ts
 * @purpose     Realisation CRUD + FEMA 270-day auto-classifier + Forex Triangulation
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q3=a Moat #19 PRIMARY · Q6=a Forex 3-way · FR-80 exhaustive
 */
import type { ExportRealisation, FEMAState, RealisationStatus, ForexTriangulation } from '@/types/export-realisation';
import { exportRealisationKey, FEMA_DAY_BANDS, REALISATION_VALID_TRANSITIONS } from '@/types/export-realisation';
import { SINHA_EXPORT_REALISATIONS } from '@/data/sinha-export-realisation-seed-data';

export function loadRealisations(entityCode: string): ExportRealisation[] {
  try {
    const raw = localStorage.getItem(exportRealisationKey(entityCode));
    if (!raw) {
      localStorage.setItem(exportRealisationKey(entityCode), JSON.stringify(SINHA_EXPORT_REALISATIONS));
      return SINHA_EXPORT_REALISATIONS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ExportRealisation[]) : SINHA_EXPORT_REALISATIONS;
  } catch { return SINHA_EXPORT_REALISATIONS; }
}

export function saveRealisations(entityCode: string, rs: ExportRealisation[]): void {
  localStorage.setItem(exportRealisationKey(entityCode), JSON.stringify(rs));
}

export function getRealisation(entityCode: string, id: string): ExportRealisation | null {
  return loadRealisations(entityCode).find((r) => r.id === id) ?? null;
}

export function classifyFEMAState(daysSinceDispatch: number): FEMAState {
  if (daysSinceDispatch < FEMA_DAY_BANDS.attention.min) return 'safe';
  if (daysSinceDispatch < FEMA_DAY_BANDS.warning.min) return 'attention';
  if (daysSinceDispatch < FEMA_DAY_BANDS.critical.min) return 'warning';
  if (daysSinceDispatch < FEMA_DAY_BANDS.overdue.min) return 'critical';
  return 'overdue';
}

export function computeDaysSinceDispatch(goodsDispatchedDate: string, asOf: Date = new Date()): number {
  const dispatched = new Date(goodsDispatchedDate);
  const diff = asOf.getTime() - dispatched.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function computeFEMADeadline(goodsDispatchedDate: string): string {
  const d = new Date(goodsDispatchedDate);
  d.setDate(d.getDate() + 270);
  return d.toISOString().slice(0, 10);
}

export function computeForexTriangulation(
  bookingRate: number,
  sellingRateAtPOL: number,
  realisedRate: number | null,
  fobValueForeign: number,
): Pick<ForexTriangulation, 'variance_booking_to_pol_inr' | 'variance_pol_to_realised_inr' | 'variance_total_inr'> {
  const variance_booking_to_pol_inr = (sellingRateAtPOL - bookingRate) * fobValueForeign;
  const variance_pol_to_realised_inr = realisedRate !== null ? (realisedRate - sellingRateAtPOL) * fobValueForeign : 0;
  const variance_total_inr = variance_booking_to_pol_inr + variance_pol_to_realised_inr;
  return { variance_booking_to_pol_inr, variance_pol_to_realised_inr, variance_total_inr };
}

export function transitionRealisation(entityCode: string, id: string, newStatus: RealisationStatus): ExportRealisation {
  const rs = loadRealisations(entityCode);
  const r = rs.find((x) => x.id === id);
  if (!r) throw new Error(`Realisation not found: ${id}`);
  if (!REALISATION_VALID_TRANSITIONS[r.status].includes(newStatus)) {
    throw new Error(`Invalid realisation transition: ${r.status} → ${newStatus}`);
  }
  const updated = { ...r, status: newStatus, updated_at: new Date().toISOString() };
  saveRealisations(entityCode, rs.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function summarizeRealisations(rs: ExportRealisation[]): {
  total: number;
  by_status: Record<string, number>;
  by_fema_state: Record<FEMAState, number>;
  total_invoice_inr: number;
  total_realised_inr: number;
  total_outstanding_inr: number;
  total_forex_variance_inr: number;
  stpi_count: number;
} {
  const s = {
    total: rs.length, by_status: {} as Record<string, number>,
    by_fema_state: { safe: 0, attention: 0, warning: 0, critical: 0, overdue: 0 } as Record<FEMAState, number>,
    total_invoice_inr: 0, total_realised_inr: 0, total_outstanding_inr: 0, total_forex_variance_inr: 0, stpi_count: 0,
  };
  for (const r of rs) {
    s.by_status[r.status] = (s.by_status[r.status] ?? 0) + 1;
    s.by_fema_state[r.fema_state] += 1;
    s.total_invoice_inr += r.invoice_value_inr_at_dispatch;
    s.total_realised_inr += r.total_realised_inr;
    s.total_outstanding_inr += r.outstanding_inr;
    s.total_forex_variance_inr += r.forex_triangulation.variance_total_inr;
    if (r.is_stpi_export) s.stpi_count += 1;
  }
  return s;
}
