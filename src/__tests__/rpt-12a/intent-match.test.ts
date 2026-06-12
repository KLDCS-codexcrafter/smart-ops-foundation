/**
 * @file        intent-match.test.ts
 * @sprint      RPT-12a · Block 4 · NL intent → builder prefill
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchIntent } from '@/lib/report-framework/intent-match';
import { __resetDataSourceCatalogForTests, registerSource } from '@/lib/report-framework/data-source-catalog';

beforeEach(() => {
  __resetDataSourceCatalogForTests();
  registerSource({
    id: 'receivx.ar', label: 'ReceivX A/R', card: 'receivx', kind: 'register',
    fields: [
      { key: 'party', label: 'Party', kind: 'dimension' },
      { key: 'age_bucket', label: 'Age bucket', kind: 'dimension' },
      { key: 'amount', label: 'Amount', kind: 'measure' },
    ],
    read: () => [],
  });
});

describe('RPT-12a · intent-match', () => {
  it('matches a known phrase to a registered source', () => {
    const m = matchIntent('sum amount by party for receivx');
    expect(m).not.toBeNull();
    expect(m!.sourceId).toBe('receivx.ar');
    expect(m!.spec.measures[0].agg).toBe('sum');
    expect(m!.spec.groupBy).toContain('party');
  });

  it('returns null honestly on garbage input', () => {
    expect(matchIntent('zzzzz qqqqq xxxx unrelated nonsense')).toBeNull();
  });

  it('returns null on empty / too-short input', () => {
    expect(matchIntent('')).toBeNull();
    expect(matchIntent('  ')).toBeNull();
    expect(matchIntent('a')).toBeNull();
  });

  it('detects count verb', () => {
    const m = matchIntent('count receivx by age bucket');
    expect(m).not.toBeNull();
    expect(m!.spec.measures[0].agg).toBe('count');
  });

  it('defaults to sum when no verb present but source matches', () => {
    const m = matchIntent('receivx by party amount');
    expect(m).not.toBeNull();
    expect(m!.spec.measures[0].agg).toBe('sum');
  });
});
