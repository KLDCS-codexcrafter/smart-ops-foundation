/**
 * @file        daybook-sources.test.ts
 * @sprint      RPT-3a · DayBook Generalize + Source Registry · Block 3
 * Asserts all 7 card DayBook sources are registered on app init (side-effect import).
 */
import { describe, it, expect } from 'vitest';
import '@/lib/report-framework/daybook-sources';
import { listDayBookSources, getDayBookSource } from '@/lib/report-framework/daybook-source-registry';

const EXPECTED: Array<{ cardId: string; domain: string }> = [
  { cardId: 'fc-fincore-daybook',   domain: 'finance' },
  { cardId: 'ph-payhub-daybook',    domain: 'people' },
  { cardId: 'sd-service-daybook',   domain: 'service' },
  { cardId: 'p360-goods-inward',    domain: 'procure' },
  { cardId: 'mp-maintenance-entry', domain: 'maintenance-entry' },
  { cardId: 'mp-spares-issue',      domain: 'maintenance-spares' },
  { cardId: 'ex-custom',            domain: 'eximx' },
];

describe('daybook-sources · all card sources registered', () => {
  it('registers at least 7 card sources', () => {
    expect(listDayBookSources().length).toBeGreaterThanOrEqual(7);
  });

  for (const { cardId, domain } of EXPECTED) {
    it(`has ${cardId} / ${domain}`, () => {
      const src = getDayBookSource(cardId, domain);
      expect(src).toBeDefined();
      expect(typeof src?.read).toBe('function');
      // read() must be defensive — returns an array even when storage is empty.
      const out = src!.read('TEST_ENTITY');
      expect(Array.isArray(out)).toBe(true);
    });
  }
});
