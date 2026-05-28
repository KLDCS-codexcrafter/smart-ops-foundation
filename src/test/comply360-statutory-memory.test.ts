/**
 * @file        src/test/comply360-statutory-memory.test.ts
 * @purpose     Unit tests · Comply360 Statutory Memory · OOB-5
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 3 · Block 3
 * @disciplines FR-43 · FR-58
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadObligations,
  recordFiling,
  COMPLY360_STATUTORY_STORAGE_KEY,
} from '@/lib/comply360-statutory-memory';

describe('comply360-statutory-memory · FR-43 + FR-58 (Sprint 69 Cycle-3)', () => {
  beforeEach(() => {
    localStorage.removeItem(COMPLY360_STATUTORY_STORAGE_KEY);
  });

  it('loadObligations returns 15-element seed array on first run (no localStorage)', () => {
    const list = loadObligations();
    expect(list.length).toBeGreaterThanOrEqual(15);
  });

  it('seed contains canonical Indian SME compliance ids', () => {
    const ids = loadObligations().map((o) => o.id);
    ['gstr-1-apr', 'gstr-3b-apr', 'tds-q4', 'epf-apr', 'esi-apr',
     'mca-aoc4', 'mca-mgt7', 'brsr-q4'].forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  it('seed includes at least one of each canonical module', () => {
    const modules = new Set(loadObligations().map((o) => o.module));
    ['tax-gst', 'payroll', 'roc', 'licenses', 'esg'].forEach((m) => {
      expect(modules.has(m)).toBe(true);
    });
  });

  it('recordFiling updates status + arn + filed_at on matching id', () => {
    const updated = recordFiling('gstr-1-apr', 'AA0426TEST123456');
    const target = updated.find((o) => o.id === 'gstr-1-apr');
    expect(target?.status).toBe('filed');
    expect(target?.arn).toBe('AA0426TEST123456');
    expect(target?.filed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('recordFiling for non-existent id returns list unchanged (no-op)', () => {
    const before = loadObligations();
    const after = recordFiling('nonexistent-id', 'ARN-ZERO');
    expect(after).toHaveLength(before.length);
    expect(after.find((o) => o.id === 'nonexistent-id')).toBeUndefined();
  });

  it('persisted state survives reload', () => {
    recordFiling('epf-apr', 'EPF-CHALLAN-99999');
    const reloaded = loadObligations();
    const target = reloaded.find((o) => o.id === 'epf-apr');
    expect(target?.status).toBe('filed');
    expect(target?.arn).toBe('EPF-CHALLAN-99999');
  });

  it('corrupt localStorage falls back to seed (zod schema rejection)', () => {
    localStorage.setItem(COMPLY360_STATUTORY_STORAGE_KEY, '{"not": "an array"}');
    expect(loadObligations()).toHaveLength(15);
  });
});
