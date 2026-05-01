/**
 * i18n.test.ts — Sprint T-Phase-1.2.5h-c2
 * 6 tests U1-U6 covering locale persistence + dictionary parity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getLocale, setLocale } from '@/lib/i18n-engine';

describe('i18n-engine', () => {
  beforeEach(() => localStorage.clear());

  it('U1 · default locale is en when nothing persisted', () => {
    expect(getLocale()).toBe('en');
  });

  it('U2 · setLocale persists per-entity (no bleed)', () => {
    setLocale('hi', 'TESTENT');
    expect(getLocale('TESTENT')).toBe('hi');
    expect(getLocale('OTHERENT')).toBe('en');
  });

  it('U3 · en dictionary has at least 200 keys', async () => {
    const { en } = await import('@/data/i18n/en');
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(200);
  });

  it('U4 · hi dictionary has same keys as en (parity)', async () => {
    const { en } = await import('@/data/i18n/en');
    const { hi } = await import('@/data/i18n/hi');
    const enKeys = new Set(Object.keys(en));
    const hiKeys = new Set(Object.keys(hi));
    const missingInHi = [...enKeys].filter(k => !hiKeys.has(k));
    const extraInHi = [...hiKeys].filter(k => !enKeys.has(k));
    expect(missingInHi).toEqual([]);
    expect(extraInHi).toEqual([]);
  });

  it('U5 · hi.common.save is in Devanagari script', async () => {
    const { hi } = await import('@/data/i18n/hi');
    expect(/[\u0900-\u097F]/.test(hi['common.save'])).toBe(true);
  });

  it('U6 · invalid locale falls back to en', () => {
    localStorage.setItem('erp_locale_TESTENT', 'fr');
    expect(getLocale('TESTENT')).toBe('en');
  });
});
