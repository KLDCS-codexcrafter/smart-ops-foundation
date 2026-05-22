/**
 * @file        procure360-welcome-kpi-extensions.test.ts
 * @purpose     HK-5-2 Block D · Welcome KPI surface stability (computeWelcomeKpis + extension KPIs)
 * @sprint      T-Phase-2.HK-5-2 · Block D
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { computeWelcomeKpis } from '@/lib/procure360-report-engine';

describe('HK-5-2 Block D · Procure360 Welcome KPI extensions', () => {
  beforeEach(() => { localStorage.clear(); });

  it('computeWelcomeKpis is a function', () => {
    expect(typeof computeWelcomeKpis).toBe('function');
  });
  it('returns object with 4 baseline KPI fields', () => {
    const k = computeWelcomeKpis('e1');
    expect(k).toHaveProperty('pendingEnquiries');
    expect(k).toHaveProperty('activeRfqs');
    expect(k).toHaveProperty('awaitingQuotations');
    expect(k).toHaveProperty('overdueFollowups');
  });
  it('pendingEnquiries numeric', () => {
    expect(typeof computeWelcomeKpis('e1').pendingEnquiries).toBe('number');
  });
  it('activeRfqs numeric', () => {
    expect(typeof computeWelcomeKpis('e1').activeRfqs).toBe('number');
  });
  it('awaitingQuotations numeric', () => {
    expect(typeof computeWelcomeKpis('e1').awaitingQuotations).toBe('number');
  });
  it('overdueFollowups numeric', () => {
    expect(typeof computeWelcomeKpis('e1').overdueFollowups).toBe('number');
  });
  it('empty entity returns zeros', () => {
    const k = computeWelcomeKpis('empty-entity');
    expect(k.pendingEnquiries).toBe(0);
    expect(k.activeRfqs).toBe(0);
    expect(k.awaitingQuotations).toBe(0);
    expect(k.overdueFollowups).toBe(0);
  });
  it('multiple invocations stable', () => {
    const a = computeWelcomeKpis('e1');
    const b = computeWelcomeKpis('e1');
    expect(a).toEqual(b);
  });
  it('entity scoping isolated', () => {
    expect(computeWelcomeKpis('eA')).toEqual(computeWelcomeKpis('eB'));
  });
  it('does not throw on unknown entity', () => {
    expect(() => computeWelcomeKpis('zzz')).not.toThrow();
  });
  it('does not throw on empty string entity', () => {
    expect(() => computeWelcomeKpis('')).not.toThrow();
  });
});
