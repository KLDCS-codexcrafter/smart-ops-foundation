/**
 * driver-expiry-alerts.ts — Sprint 4-pre-3 · Block B · D-314 (Q4=A)
 * THIN WRAPPER · delegates to driver-master-engine.listDrivers.
 * Checks license_expiry · NO new storage (Q7=A).
 * Mirrors contract-expiry-alerts (D-291 OOB-54) thin-wrapper precedent.
 *
 * Pattern note: pure function · no useMemo · no [tick, setTick] anti-pattern.
 */
import { listDrivers } from '@/lib/driver-master-engine';

export interface DriverExpiryAlert {
  driver_id: string;
  driver_name: string;
  driver_license_no: string;
  expires_on: string;
  days_remaining: number;
}

export const DEFAULT_EXPIRY_WINDOW_DAYS = 30;

export function getExpiringDriverLicenses(
  entityCode: string,
  withinDays: number = DEFAULT_EXPIRY_WINDOW_DAYS,
): DriverExpiryAlert[] {
  // [JWT] GET /api/drivers/expiring-licenses
  const today = Date.now();
  const cutoff = today + withinDays * 86400000;
  const out: DriverExpiryAlert[] = [];

  for (const d of listDrivers(entityCode)) {
    if (d.status !== 'active') continue;
    if (!d.license_expiry) continue;
    const ts = new Date(d.license_expiry).getTime();
    if (Number.isNaN(ts)) continue;
    if (ts > cutoff) continue;
    out.push({
      driver_id: d.id,
      driver_name: d.driver_name,
      driver_license_no: d.driver_license_no,
      expires_on: d.license_expiry,
      days_remaining: Math.floor((ts - today) / 86400000),
    });
  }
  return out.sort((a, b) => a.days_remaining - b.days_remaining);
}
