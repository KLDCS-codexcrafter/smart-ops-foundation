/**
 * period-lock.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1 test floor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPeriodLock, setPeriodLock, isPeriodLocked, periodLockMessage, periodLockKey,
} from '@/lib/period-lock-engine';

describe('period-lock-engine · M-1', () => {
  const ENT = 'TST';
  beforeEach(() => localStorage.clear());

  it('PL1 · isPeriodLocked returns false when no config exists (graceful default)', () => {
    expect(isPeriodLocked('2025-04-15', ENT)).toBe(false);
  });
  it('PL2 · setPeriodLock writes config to entity-scoped key', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    const raw = localStorage.getItem(periodLockKey(ENT));
    expect(raw).toBeTruthy();
    const cfg = JSON.parse(raw!);
    expect(cfg.lockedThrough).toBe('2025-03-31');
    expect(cfg.lastModifiedBy).toBe('admin1');
  });
  it('PL3 · isPeriodLocked rejects dates on or before lock', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    expect(isPeriodLocked('2025-03-31', ENT)).toBe(true);
    expect(isPeriodLocked('2025-03-15', ENT)).toBe(true);
    expect(isPeriodLocked('2025-04-01', ENT)).toBe(false);
  });
  it('PL4 · setting null clears the lock', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    setPeriodLock(ENT, null, 'admin1');
    expect(isPeriodLocked('2025-03-15', ENT)).toBe(false);
  });
  it('PL5 · periodLockMessage returns null when not locked', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    expect(periodLockMessage('2025-04-01', ENT)).toBeNull();
  });
  it('PL6 · periodLockMessage gives user-facing rejection text', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    const msg = periodLockMessage('2025-03-15', ENT);
    expect(msg).toContain('locked through 2025-03-31');
  });
  it('PL7 · getPeriodLock is entity-scoped — other entity unaffected', () => {
    setPeriodLock(ENT, '2025-03-31', 'admin1');
    expect(getPeriodLock('OTHER')).toBeNull();
  });
});
