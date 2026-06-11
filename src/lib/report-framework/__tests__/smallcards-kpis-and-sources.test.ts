/**
 * @file smallcards-kpis-and-sources.test.ts — RPT-6c registry + DSC + rename rider
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const RPT6C_KPI_IDS = [
  'eng-drawings', 'eng-versions', 'eng-handoff', 'eng-reports',
  'site-dpr', 'site-snags', 'site-lookahead',
  'mnt-breakdown', 'mnt-fire-expiry', 'mnt-top-reporters', 'mnt-open-tickets',
  'vp-msme-43bh', 'log-shipments',
];

const RPT6C_SOURCE_IDS = [
  'engineeringx.drawings', 'sitex.dpr', 'maintainpro.tickets',
  'vendorportal.msme', 'logistic.shipments',
];

describe('RPT-6c · small-cards KPI seeds', () => {
  it('registers all 13 KPIs with explicit layers', () => {
    for (const id of RPT6C_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('is idempotent — re-import does not duplicate ids', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });

  it('RIDER: rq-service-request EXISTS and rq-extra has been REMOVED', () => {
    expect(getKpi('rq-service-request')).toBeDefined();
    expect(getKpi('rq-extra')).toBeUndefined();
  });
});

describe('RPT-6c · small-cards DSC sources', () => {
  it('registers 5 sources that return arrays from read()', () => {
    for (const id of RPT6C_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('each source exposes a card + at least one dimension field', () => {
    for (const id of RPT6C_SOURCE_IDS) {
      const s = getSource(id)!;
      expect(typeof s.card).toBe('string');
      expect(s.fields.some((f) => f.kind === 'dimension')).toBe(true);
    }
  });
});
