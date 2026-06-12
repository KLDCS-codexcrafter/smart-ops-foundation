/**
 * @file rpt-7b-kpis-and-sources.test.ts — RPT-7b registry + DSC verification
 * Asserts: 13 layer-tagged KPI seeds idempotent, sx-target-ach + px-margin
 * carry thresholds (higher-good), and the 2 new ProjX DSC sources expose
 * read() returning arrays. SalesX sources NOT duplicated (still 2 total).
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource, listSources } from '../data-source-catalog';
import '../data-sources';

const RPT7B_KPI_IDS = [
  'sx-target-ach', 'sx-pipeline', 'sx-coverage', 'sx-beat',
  'sx-secondary-rpt', 'sx-handoff',
  'px-projects', 'px-pnl', 'px-margin', 'px-cashflow',
  'px-milestones', 'px-utilization', 'px-documents',
];

const RPT7B_PROJX_SOURCE_IDS = ['projx.projects', 'projx.financials'];

describe('RPT-7b · KPI seeds', () => {
  it('registers all 13 KPIs with explicit layers', () => {
    for (const id of RPT7B_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('sx-target-ach + px-margin carry higher-good thresholds', () => {
    const ach = getKpi('sx-target-ach')!;
    expect(ach.thresholds).toBeDefined();
    expect(ach.thresholds!.direction).toBe('higher-good');
    const margin = getKpi('px-margin')!;
    expect(margin.thresholds).toBeDefined();
    expect(margin.thresholds!.direction).toBe('higher-good');
  });

  it('is idempotent — re-import does not duplicate', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });
});

describe('RPT-7b · ProjX DSC sources', () => {
  it('registers the 2 new projx sources with read() returning arrays', () => {
    for (const id of RPT7B_PROJX_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      expect(s!.card).toBe('projx');
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('exposes ≥1 dimension field per source', () => {
    for (const id of RPT7B_PROJX_SOURCE_IDS) {
      const s = getSource(id)!;
      expect(s.fields.some((f) => f.kind === 'dimension')).toBe(true);
    }
  });

  it('does NOT duplicate salesx sources (still exactly salesx.orders + salesx.pipeline)', () => {
    const salesx = listSources().filter((s) => s.card === 'salesx');
    const ids = salesx.map((s) => s.id).sort();
    expect(ids).toEqual(['salesx.orders', 'salesx.pipeline']);
  });
});
