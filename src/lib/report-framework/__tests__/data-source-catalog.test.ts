/**
 * @sprint RPT-3b · Data Source Catalog tests (register/get/list + read-only-lock)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  registerSource,
  getSource,
  listSources,
  listSourcesByCard,
  __resetDataSourceCatalogForTests,
  type DataSource,
} from '../data-source-catalog';

const make = (id: string, card = 'c1'): DataSource => ({
  id, label: id, card, kind: 'register',
  fields: [{ key: 'k', label: 'K', kind: 'dimension' }],
  read: () => [],
});

describe('data-source-catalog · register/get/list', () => {
  beforeEach(() => __resetDataSourceCatalogForTests());

  it('register/get/list works', () => {
    registerSource(make('s1'));
    registerSource(make('s2', 'c2'));
    expect(listSources()).toHaveLength(2);
    expect(getSource('s1')?.id).toBe('s1');
  });

  it('is idempotent by id (re-register replaces in place)', () => {
    registerSource(make('s1'));
    registerSource({ ...make('s1'), label: 'updated' });
    expect(listSources()).toHaveLength(1);
    expect(getSource('s1')?.label).toBe('updated');
  });

  it('listSourcesByCard filters by card', () => {
    registerSource(make('a', 'fincore'));
    registerSource(make('b', 'fincore'));
    registerSource(make('c', 'eximx'));
    expect(listSourcesByCard('fincore').map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect(listSourcesByCard('eximx').map((s) => s.id)).toEqual(['c']);
  });

  it('listSources returns a copy (caller mutation does not leak)', () => {
    registerSource(make('s1'));
    listSources().pop();
    expect(listSources()).toHaveLength(1);
  });
});

describe('data-source-catalog · read-only-lock (grep-assert)', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/lib/report-framework/data-source-catalog.ts'),
    'utf8',
  );

  it('has no react import', () => {
    expect(src).not.toMatch(/from\s+['"]react['"]/);
  });

  it('has no localStorage.setItem call', () => {
    expect(src).not.toMatch(/localStorage\.setItem/);
  });

  it('has no post*/save*/write* helper names', () => {
    expect(src).not.toMatch(/\bpost[A-Z]\w*/);
    expect(src).not.toMatch(/\bsave[A-Z]\w*/);
    expect(src).not.toMatch(/\bwrite[A-Z]\w*/);
  });
});
