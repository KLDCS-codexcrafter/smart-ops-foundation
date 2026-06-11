/**
 * @sprint RPT-3b · DSC seed asserts ≥11 sources registered on app init
 */
import { describe, it, expect } from 'vitest';
import '../daybook-sources';
import '../data-sources';
import { listSources, listSourcesByCard } from '../data-source-catalog';

describe('data-sources init', () => {
  it('registers ≥ 11 sources (7 daybook + 4 register)', () => {
    expect(listSources().length).toBeGreaterThanOrEqual(11);
  });

  it('registers daybook kind sources', () => {
    const daybooks = listSources().filter((s) => s.kind === 'daybook');
    expect(daybooks.length).toBeGreaterThanOrEqual(7);
  });

  it('registers register kind sources', () => {
    const registers = listSources().filter((s) => s.kind === 'register');
    expect(registers.length).toBeGreaterThanOrEqual(4);
  });

  it('listSourcesByCard returns fincore reference sources', () => {
    expect(listSourcesByCard('fincore').length).toBeGreaterThanOrEqual(3);
  });

  it('re-importing the seed module is idempotent', async () => {
    const before = listSources().length;
    await import('../data-sources');
    expect(listSources().length).toBe(before);
  });
});
