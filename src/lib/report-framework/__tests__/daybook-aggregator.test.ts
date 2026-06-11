/**
 * @sprint RPT-3b · Cross-Card DayBook Aggregator tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDayBookSource,
  __resetDayBookSourcesForTests,
  type DayBookEntry,
} from '../daybook-source-registry';
import { getCrossCardDayBook } from '../daybook-aggregator';

function mk(date: string, time: string, id: string, extra: Partial<DayBookEntry> = {}): DayBookEntry {
  return {
    id, date, time, type: 'X', reference: id, party: 'P',
    amount: 0, status: 'open', module: 'm',
    ...extra,
  };
}

describe('daybook-aggregator', () => {
  beforeEach(() => {
    __resetDayBookSourcesForTests();
    registerDayBookSource({
      cardId: 'card-a', domain: 'finance', label: 'A',
      read: () => [mk('2026-06-01', '10:00', 'a1'), mk('2026-06-10', '09:00', 'a2')],
    });
    registerDayBookSource({
      cardId: 'card-b', domain: 'people', label: 'B',
      read: () => [mk('2026-06-05', '12:00', 'b1')],
    });
    registerDayBookSource({
      cardId: 'card-c', domain: 'service', label: 'C',
      read: () => [mk('2026-05-30', '08:00', 'c1')],
    });
  });

  it('merges all sources and sorts newest-first', () => {
    const out = getCrossCardDayBook('E1');
    expect(out.map((e) => e.id)).toEqual(['a2', 'b1', 'a1', 'c1']);
  });

  it('filters by dateRange (inclusive)', () => {
    const out = getCrossCardDayBook('E1', { dateRange: { from: '2026-06-01', to: '2026-06-05' } });
    expect(out.map((e) => e.id).sort()).toEqual(['a1', 'b1']);
  });

  it('filters by domains', () => {
    const out = getCrossCardDayBook('E1', { domains: ['finance', 'service'] });
    expect(out.map((e) => e.id).sort()).toEqual(['a1', 'a2', 'c1']);
  });

  it('filters by cardIds', () => {
    const out = getCrossCardDayBook('E1', { cardIds: ['card-b'] });
    expect(out.map((e) => e.id)).toEqual(['b1']);
  });

  it('combines all filters', () => {
    const out = getCrossCardDayBook('E1', {
      dateRange: { from: '2026-06-01', to: '2026-06-30' },
      domains: ['finance'],
      cardIds: ['card-a'],
    });
    expect(out.map((e) => e.id)).toEqual(['a2', 'a1']);
  });

  it('is read-only (no mutation of source arrays)', () => {
    const before = getCrossCardDayBook('E1');
    before.push(mk('2099-01-01', '00:00', 'x'));
    const after = getCrossCardDayBook('E1');
    expect(after.length).toBe(4);
  });
});
