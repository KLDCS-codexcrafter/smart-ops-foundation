/**
 * vehicle-expiry-alerts.ts — Sprint 4-pre-3 · Block B · D-314 (Q4=A)
 * THIN WRAPPER · delegates to vehicle-master-engine.listVehicles.
 * Checks RC + insurance + permit expiry · NO new storage (Q7=A).
 * Mirrors contract-expiry-alerts (D-291 OOB-54) thin-wrapper precedent.
 *
 * Pattern note: pure function · no useMemo · no [tick, setTick] anti-pattern.
 * Callers should use [list, setList] + refresh() pattern in panels.
 */
import { listVehicles } from '@/lib/vehicle-master-engine';

export type VehicleExpiryDocType = 'rc' | 'insurance' | 'permit';

export interface VehicleExpiryAlert {
  vehicle_id: string;
  vehicle_no: string;
  doc_type: VehicleExpiryDocType;
  doc_no?: string;
  expires_on: string;
  days_remaining: number;
}

export const DEFAULT_EXPIRY_WINDOW_DAYS = 30;

export function getExpiringVehicleDocs(
  entityCode: string,
  withinDays: number = DEFAULT_EXPIRY_WINDOW_DAYS,
): VehicleExpiryAlert[] {
  // [JWT] GET /api/vehicles/expiring-docs
  const today = Date.now();
  const cutoff = today + withinDays * 86400000;
  const out: VehicleExpiryAlert[] = [];

  for (const v of listVehicles(entityCode)) {
    if (v.status !== 'active') continue;
    const checks: Array<{ type: VehicleExpiryDocType; no?: string; date?: string }> = [
      { type: 'rc', no: v.rc_no, date: v.rc_expiry },
      { type: 'insurance', no: v.insurance_no, date: v.insurance_expiry },
      { type: 'permit', no: v.permit_no, date: v.permit_expiry },
    ];
    for (const c of checks) {
      if (!c.date) continue;
      const ts = new Date(c.date).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts > cutoff) continue;
      out.push({
        vehicle_id: v.id,
        vehicle_no: v.vehicle_no,
        doc_type: c.type,
        doc_no: c.no,
        expires_on: c.date,
        days_remaining: Math.floor((ts - today) / 86400000),
      });
    }
  }
  return out.sort((a, b) => a.days_remaining - b.days_remaining);
}
