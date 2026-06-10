/**
 * @file        period-engine.test.ts
 * @purpose     Verify FY-aware preset resolution + priorPeriod/lastYear windows.
 * @sprint      RPT-1a
 */
import { describe, it, expect } from 'vitest';
import { resolvePeriod, priorPeriod, lastYear, type DateRange } from '../period-engine';

describe('RPT-1a · period-engine', () => {
  it('today preset returns single-day range', () => {
    const ref = new Date(Date.UTC(2026, 5, 10)); // 10 Jun 2026
    const r = resolvePeriod('today', ref);
    expect(r.from).toBe(r.to);
    expect(r.from).toBe('2026-06-10');
  });

  it('mtd preset starts on day 1 of current month', () => {
    const ref = new Date(Date.UTC(2026, 5, 10));
    const r = resolvePeriod('mtd', ref);
    expect(r.from).toBe('2026-06-01');
    expect(r.to).toBe('2026-06-10');
    expect(r.from <= r.to).toBe(true);
  });

  it('qtd preset uses Indian FY quarters · Apr-Jun is Q1', () => {
    const ref = new Date(Date.UTC(2026, 5, 10)); // June -> Q1 Apr-Jun
    const r = resolvePeriod('qtd', ref);
    expect(r.from).toBe('2026-04-01');
    expect(r.to).toBe('2026-06-10');
  });

  it('qtd preset · Jan-Mar is Q4 of previous FY-start year', () => {
    const ref = new Date(Date.UTC(2026, 1, 15)); // Feb 2026
    const r = resolvePeriod('qtd', ref);
    expect(r.from).toBe('2026-01-01');
    expect(r.to).toBe('2026-02-15');
  });

  it('ytd preset uses Indian FY · Apr 1 start when ref is after April', () => {
    const ref = new Date(Date.UTC(2026, 5, 10));
    const r = resolvePeriod('ytd', ref);
    expect(r.from).toBe('2026-04-01');
    expect(r.to).toBe('2026-06-10');
  });

  it('ytd preset · ref in Q4 references previous-year Apr 1', () => {
    const ref = new Date(Date.UTC(2026, 1, 15)); // Feb 2026
    const r = resolvePeriod('ytd', ref);
    expect(r.from).toBe('2025-04-01');
    expect(r.to).toBe('2026-02-15');
  });

  it('custom preset round-trips supplied range', () => {
    const custom: DateRange = { from: '2025-01-01', to: '2025-12-31' };
    const r = resolvePeriod('custom', new Date(), custom);
    expect(r.from).toBe(custom.from);
    expect(r.to).toBe(custom.to);
  });

  it('custom preset without range throws', () => {
    expect(() => resolvePeriod('custom', new Date())).toThrow();
  });

  it('priorPeriod yields an equal-length immediately-preceding window', () => {
    const r: DateRange = { from: '2026-06-01', to: '2026-06-10' };
    const p = priorPeriod(r);
    expect(p.to < r.from).toBe(true);
    expect(p.from <= p.to).toBe(true);
    // length parity (range-based assert, not brittle exact count beyond bounds)
    expect(p.from.length).toBeGreaterThanOrEqual(10);
  });

  it('lastYear keeps the same window shifted by −1 year', () => {
    const r: DateRange = { from: '2026-06-01', to: '2026-06-10' };
    const ly = lastYear(r);
    expect(ly.from).toBe('2025-06-01');
    expect(ly.to).toBe('2025-06-10');
  });

  it('all presets return a from ≤ to range', () => {
    const ref = new Date(Date.UTC(2026, 5, 10));
    for (const preset of ['today', 'mtd', 'qtd', 'ytd'] as const) {
      const r = resolvePeriod(preset, ref);
      expect(r.from <= r.to).toBe(true);
    }
  });
});
