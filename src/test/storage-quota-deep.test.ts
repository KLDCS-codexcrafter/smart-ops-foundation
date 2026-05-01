/**
 * storage-quota-deep.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getStorageUsage, checkWriteAllowed, archiveKey, formatBytes } from '@/lib/storage-quota-engine';

describe('storage-quota-engine · deep', () => {
  beforeEach(() => localStorage.clear());

  it('SQ1 · empty storage reports green tier and 0% usage', () => {
    const u = getStorageUsage();
    expect(u.tier).toBe('green');
    expect(u.pct).toBeCloseTo(0, 1);
  });
  it('SQ2 · top_keys lists at most 10 keys descending by bytes', () => {
    for (let i = 0; i < 12; i++) localStorage.setItem(`k${i}`, 'x'.repeat(i * 10));
    const u = getStorageUsage();
    expect(u.top_keys.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < u.top_keys.length; i++) {
      expect(u.top_keys[i - 1].bytes).toBeGreaterThanOrEqual(u.top_keys[i].bytes);
    }
  });
  it('SQ3 · audit_trail intent ALWAYS allowed (MCA priority)', () => {
    const r = checkWriteAllowed('audit_trail');
    expect(r.allowed).toBe(true);
  });
  it('SQ4 · normal intents allowed when tier=green', () => {
    expect(checkWriteAllowed('voucher_create').allowed).toBe(true);
    expect(checkWriteAllowed('edit').allowed).toBe(true);
    expect(checkWriteAllowed('master_crud').allowed).toBe(true);
  });
  it('SQ5 · archiveKey on missing key is a no-op', () => {
    const r = archiveKey('missing-key');
    expect(r.freedBytes).toBe(0);
    expect(r.archivedItems).toBe(0);
  });
  it('SQ6 · archiveKey trims an array key beyond keepLastN', () => {
    const arr = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    localStorage.setItem('big_arr', JSON.stringify(arr));
    const r = archiveKey('big_arr', 100);
    expect(r.archivedItems).toBe(150);
    const remaining = JSON.parse(localStorage.getItem('big_arr')!);
    expect(remaining).toHaveLength(100);
    // Kept items are the most recent (last 100) per slice(-keepLastN)
    expect(remaining[0].id).toBe(150);
  });
  it('SQ7 · formatBytes produces human-friendly labels', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1572864)).toBe('1.50 MB');
  });
});
