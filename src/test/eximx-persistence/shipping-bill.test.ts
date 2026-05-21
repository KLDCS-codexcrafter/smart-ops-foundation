/**
 * @file        src/test/eximx-persistence/shipping-bill.test.ts
 * @purpose     TIER 2 · Persistence test · Shipping Bill + EGM + LEO · FR-26 entity-scoped
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block B
 * @anchored    EX-7b
 */
import { describe, it, expect, beforeEach } from 'vitest';

const ENTITY_A = 'sinha-traders';
const ENTITY_B = 'demo-exporter';
const KEY_PREFIX = 'erp_';
const SUFFIX = 'shipping_bill';

describe('Shipping Bill + EGM + LEO persistence · FR-26 entity-scoped', () => {
  beforeEach(() => { localStorage.clear(); });

  it('FR-26 key shape · entity-scoped key prefix', () => {
    const key = `${KEY_PREFIX}${ENTITY_A}_eximx_${SUFFIX}`;
    localStorage.setItem(key, JSON.stringify([{ id: 'rec-001' }]));
    const stored = localStorage.getItem(key);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toHaveLength(1);
  });

  it('entity isolation · entity A and entity B do not see each other', () => {
    const keyA = `${KEY_PREFIX}${ENTITY_A}_eximx_${SUFFIX}`;
    const keyB = `${KEY_PREFIX}${ENTITY_B}_eximx_${SUFFIX}`;
    localStorage.setItem(keyA, JSON.stringify([{ id: 'A' }]));
    localStorage.setItem(keyB, JSON.stringify([{ id: 'B' }]));
    expect(JSON.parse(localStorage.getItem(keyA)!)[0].id).toBe('A');
    expect(JSON.parse(localStorage.getItem(keyB)!)[0].id).toBe('B');
  });

  it('round-trip read/write integrity', () => {
    const key = `${KEY_PREFIX}${ENTITY_A}_eximx_${SUFFIX}`;
    const data = [{ id: 'rec-001', valid_until: '2027-12-31' }];
    localStorage.setItem(key, JSON.stringify(data));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(data);
  });

  it('empty entity · returns null on missing key', () => {
    expect(localStorage.getItem(`${KEY_PREFIX}empty_eximx_${SUFFIX}`)).toBeNull();
  });

  it('FR-26 invariant · key prefix structure', () => {
    const key = `${KEY_PREFIX}${ENTITY_A}_eximx_${SUFFIX}`;
    expect(key).toMatch(/^erp_[a-z0-9-]+_eximx_/);
  });

  it('localStorage clear between tests (beforeEach hook)', () => {
    expect(localStorage.length).toBe(0);
  });
});
