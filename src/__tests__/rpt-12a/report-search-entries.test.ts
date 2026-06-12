/**
 * @file        report-search-entries.test.ts
 * @sprint      RPT-12a · Block 3 · palette entries registered
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { BASE_COMMANDS } from '@/lib/command-palette-registry';
import { listSources, registerSource, __resetDataSourceCatalogForTests } from '@/lib/report-framework/data-source-catalog';
import { listKpis } from '@/lib/report-framework/kpi-registry';
import {
  buildReportSearchEntries,
  registerReportSearchEntries,
  __resetReportSearchRegistrationForTests,
} from '@/lib/report-framework/report-search-entries';
import '@/lib/report-framework/data-sources';

beforeEach(() => {
  __resetReportSearchRegistrationForTests();
});

describe('RPT-12a · report-search-entries', () => {
  it('registers ≥ (sources + KPIs) entries', () => {
    const entries = registerReportSearchEntries();
    const minimum = listSources().length + listKpis().length;
    expect(entries.length).toBeGreaterThanOrEqual(minimum);
  });

  it('pushes owned entries into BASE_COMMANDS via the registry API (CommandEntry type)', () => {
    registerReportSearchEntries();
    const owned = BASE_COMMANDS.filter((c) => c.id.startsWith('rpt12a-'));
    expect(owned.length).toBeGreaterThan(0);
    // every owned entry has the CommandEntry shape
    for (const e of owned) {
      expect(typeof e.id).toBe('string');
      expect(typeof e.label).toBe('string');
      expect(typeof e.keywords).toBe('string');
      expect(['navigate_card', 'navigate_module', 'open_master', 'open_recent']).toContain(e.action);
    }
  });

  it('is idempotent — no duplicate ids after repeat registration', () => {
    registerReportSearchEntries();
    registerReportSearchEntries();
    const owned = BASE_COMMANDS.filter((c) => c.id.startsWith('rpt12a-')).map((c) => c.id);
    expect(new Set(owned).size).toBe(owned.length);
  });

  it('includes one entry per registered source', () => {
    __resetDataSourceCatalogForTests();
    registerSource({
      id: 'test.demo', label: 'Demo', card: 'fincore', kind: 'register',
      fields: [{ key: 'a', label: 'A', kind: 'dimension' }], read: () => [],
    });
    const built = buildReportSearchEntries();
    expect(built.find((e) => e.id === 'rpt12a-src-test.demo')).toBeTruthy();
  });
});
