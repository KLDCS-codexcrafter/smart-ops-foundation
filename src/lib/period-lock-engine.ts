/**
 * @file     period-lock-engine.ts
 * @purpose  Period-lock storage + validation primitive. Used by finecore-engine
 *           validateVoucher() to reject voucher posting beyond locked accounting periods.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z3
 * @iso      Functional Suitability (HIGH+ year-end close firewall)
 *           Reliability (HIGH+ prevents fiscal-year drift)
 *           Compatibility (HIGH+ Phase 2 backend can swap localStorage for REST)
 * @whom     finecore-engine.ts validateVoucher · PeriodLockSettings.tsx admin UI · auditors
 * @depends  none (pure logic + localStorage)
 *
 * D-127 STORAGE-KEY CONVENTION:
 *   periodLockKey(entityCode) = `erp_period_lock_${entityCode}`
 *   Stored value: { lockedThrough: 'YYYY-MM-DD' | null, lastModifiedAt: ISO, lastModifiedBy: string }
 *
 * GRACEFUL DEGRADATION:
 *   If no period-lock config exists for an entity, isPeriodLocked() returns false (unlocked).
 *   This means existing vouchers/flows continue working until founder explicitly locks a period.
 */

export interface PeriodLockConfig {
  /** ISO date string YYYY-MM-DD · null means no lock */
  lockedThrough: string | null;
  lastModifiedAt: string;  // ISO timestamp
  lastModifiedBy: string;  // user ID who set the lock
}

export const periodLockKey = (entityCode: string): string =>
  `erp_period_lock_${entityCode}`;

/**
 * Read period-lock config for an entity. Returns null if no config set.
 */
export function getPeriodLock(entityCode: string): PeriodLockConfig | null {
  try {
    // [JWT] GET /api/accounting/period-lock/:entityCode
    const raw = localStorage.getItem(periodLockKey(entityCode));
    if (!raw) return null;
    return JSON.parse(raw) as PeriodLockConfig;
  } catch {
    return null;
  }
}

/**
 * Set period-lock config. lockedThrough = null clears the lock.
 */
export function setPeriodLock(
  entityCode: string,
  lockedThrough: string | null,
  actorId: string,
): void {
  const config: PeriodLockConfig = {
    lockedThrough,
    lastModifiedAt: new Date().toISOString(),
    lastModifiedBy: actorId,
  };
  // [JWT] PUT /api/accounting/period-lock/:entityCode
  localStorage.setItem(periodLockKey(entityCode), JSON.stringify(config));
}

/**
 * Check if a given date falls within a locked period for an entity.
 * Returns true if voucher with that date should be REJECTED.
 */
export function isPeriodLocked(date: string, entityCode: string): boolean {
  const config = getPeriodLock(entityCode);
  if (!config || !config.lockedThrough) return false;  // graceful: no lock = unlocked
  return date <= config.lockedThrough;  // ISO YYYY-MM-DD lexicographic == chronological
}

/**
 * Format a user-facing rejection message. Returns null when not locked for date.
 */
export function periodLockMessage(
  date: string,
  entityCode: string,
): string | null {
  const config = getPeriodLock(entityCode);
  if (!config || !config.lockedThrough) return null;
  if (date > config.lockedThrough) return null;
  return `Cannot post voucher dated ${date}: accounting period is locked through ${config.lockedThrough}.`;
}
