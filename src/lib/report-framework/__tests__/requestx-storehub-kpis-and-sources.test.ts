/**
 * @file requestx-storehub-kpis-and-sources.test.ts — RPT-6b registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const RPT6B_KPI_IDS = [
  'rq-indent', 'rq-ageing', 'rq-dept-summary', 'rq-po-against',
  'rq-closed', 'rq-pending', 'rq-service-request',
  'st-issue', 'st-dept-consumption', 'st-receipt-ack',
  'st-cycle-count', 'st-movement',
];

describe('RPT-6b · RequestX + Store-hub KPI seeds', () => {
  it('registers all 12 rq-* + st-* KPIs with explicit layers', () => {
    for (const id of RPT6B_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });
  it('is idempotent — re-importing does not duplicate ids', async () => {
    const before = listKpis().filter((k) => k.id.startsWith('rq-') || k.id.startsWith('st-')).length;
    await import('../kpi-registry');
    const after = listKpis().filter((k) => k.id.startsWith('rq-') || k.id.startsWith('st-')).length;
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(12);
  });
});

describe('RPT-6b · RequestX + Store-hub DSC sources', () => {
  it('registers 4 sources that return arrays from read()', () => {
    for (const id of ['requestx.indents', 'requestx.po-conversion', 'storehub.issues', 'storehub.movement']) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });
  it('sources expose card + dimension fields', () => {
    const rq = getSource('requestx.indents')!;
    const st = getSource('storehub.issues')!;
    expect(rq.card).toBe('requestx');
    expect(st.card).toBe('store-hub');
    expect(rq.fields.some((f) => f.kind === 'dimension')).toBe(true);
    expect(st.fields.some((f) => f.kind === 'dimension')).toBe(true);
  });
});
