/**
 * @file        daybook-source-registry.test.ts
 * @sprint      RPT-3a · DayBook Generalize + Source Registry · Block 3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDayBookSource,
  listDayBookSources,
  getDayBookSource,
  getDayBookEntries,
  __resetDayBookSourcesForTests,
  type DayBookEntry,
} from '@/lib/report-framework/daybook-source-registry';

function mkEntry(over: Partial<DayBookEntry>): DayBookEntry {
  return {
    id: 'x', date: '2026-01-01', time: '00:00', type: 't',
    reference: 'r', party: 'p', amount: 0, status: 's', module: 'm',
    ...over,
  };
}

describe('daybook-source-registry · §N RPT-3a', () => {
  beforeEach(() => __resetDayBookSourcesForTests());

  it('registers and retrieves a source', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd1', label: 'A', read: () => [] });
    expect(getDayBookSource('a', 'd1')).toBeDefined();
    expect(listDayBookSources().length).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent: re-register replaces the same (cardId,domain) row', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd1', label: 'A', read: () => [] });
    registerDayBookSource({ cardId: 'a', domain: 'd1', label: 'A-v2', read: () => [] });
    expect(listDayBookSources().length).toBe(1);
    expect(getDayBookSource('a', 'd1')?.label).toBe('A-v2');
  });

  it('keeps distinct rows for the same cardId across different domains', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd1', label: 'A1', read: () => [] });
    registerDayBookSource({ cardId: 'a', domain: 'd2', label: 'A2', read: () => [] });
    expect(listDayBookSources().length).toBeGreaterThanOrEqual(2);
  });

  it('getDayBookEntries merges and sorts newest-first by date+time', () => {
    registerDayBookSource({
      cardId: 'a', domain: 'd', label: 'A',
      read: () => [mkEntry({ id: 'old', date: '2026-01-01', time: '09:00' })],
    });
    registerDayBookSource({
      cardId: 'b', domain: 'd', label: 'B',
      read: () => [mkEntry({ id: 'new', date: '2026-02-01', time: '12:00' })],
    });
    const merged = getDayBookEntries('E');
    expect(merged.length).toBe(2);
    expect(merged[0].id).toBe('new');
    expect(merged[1].id).toBe('old');
  });

  it('filters by cardId', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd', label: 'A', read: () => [mkEntry({ id: 'a1' })] });
    registerDayBookSource({ cardId: 'b', domain: 'd', label: 'B', read: () => [mkEntry({ id: 'b1' })] });
    const onlyA = getDayBookEntries('E', { cardId: 'a' });
    expect(onlyA.every((e) => e.id === 'a1')).toBe(true);
  });

  it('filters by domain', () => {
    registerDayBookSource({ cardId: 'a', domain: 'finance', label: 'A', read: () => [mkEntry({ id: 'f' })] });
    registerDayBookSource({ cardId: 'b', domain: 'people',  label: 'B', read: () => [mkEntry({ id: 'p' })] });
    expect(getDayBookEntries('E', { domain: 'finance' })[0].id).toBe('f');
    expect(getDayBookEntries('E', { domain: 'people'  })[0].id).toBe('p');
  });

  it('is defensive against read() throwing', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd', label: 'A', read: () => { throw new Error('boom'); } });
    registerDayBookSource({ cardId: 'b', domain: 'd', label: 'B', read: () => [mkEntry({ id: 'b1' })] });
    const merged = getDayBookEntries('E');
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('b1');
  });

  it('returns an empty array when no sources are registered', () => {
    expect(getDayBookEntries('E')).toEqual([]);
  });

  it('listDayBookSources returns a copy (mutation does not leak)', () => {
    registerDayBookSource({ cardId: 'a', domain: 'd', label: 'A', read: () => [] });
    const snap = listDayBookSources();
    snap.length = 0;
    expect(listDayBookSources().length).toBeGreaterThanOrEqual(1);
  });

  it('getDayBookSource returns undefined for unknown keys', () => {
    expect(getDayBookSource('nope', 'nope')).toBeUndefined();
  });

  it('passes entityCode through to source read()', () => {
    let seen = '';
    registerDayBookSource({
      cardId: 'a', domain: 'd', label: 'A',
      read: (e) => { seen = e; return [mkEntry({ id: e })]; },
    });
    getDayBookEntries('ENTITY-42');
    expect(seen).toBe('ENTITY-42');
  });
});
