/**
 * @file qualicheck-kpis-and-sources.test.ts — RPT-5d registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const QC_KPI_IDS = [
  'qc-mtc',
  'qc-ncr',
  'qc-rejection',
  'qc-cfr-audit',
  'qc-godown',
  'qc-stk-transfer',
  'qc-fgr-insp',
  'qc-iqc-remarks',
  'qc-dashboard',
];

describe('RPT-5d · QualiCheck KPI seeds', () => {
  it('registers all 9 qc-* KPIs with explicit layers', () => {
    for (const id of QC_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });
  it('is idempotent — re-importing does not duplicate ids', async () => {
    const before = listKpis().filter((k) => k.id.startsWith('qc-')).length;
    await import('../kpi-registry');
    const after = listKpis().filter((k) => k.id.startsWith('qc-')).length;
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(9);
  });
});

describe('RPT-5d · QualiCheck DSC sources', () => {
  it('registers ≥2 qualicheck sources that return arrays from read()', () => {
    const ids = ['qualicheck.inspections', 'qualicheck.ncr'];
    for (const id of ids) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });
  it('qualicheck sources expose card + dimension fields', () => {
    const insp = getSource('qualicheck.inspections')!;
    const ncr = getSource('qualicheck.ncr')!;
    expect(insp.card).toBe('qualicheck');
    expect(ncr.card).toBe('qualicheck');
    expect(insp.fields.some((f) => f.kind === 'dimension')).toBe(true);
    expect(ncr.fields.some((f) => f.kind === 'dimension')).toBe(true);
  });
});
