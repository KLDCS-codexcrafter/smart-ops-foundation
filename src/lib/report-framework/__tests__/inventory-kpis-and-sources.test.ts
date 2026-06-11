/**
 * @file inventory-kpis-and-sources.test.ts — RPT-5b registry + DSC
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources'; // side-effect register

const INVENTORY_KPI_IDS = [
  'inv-consumption',
  'inv-consumption-summary',
  'inv-item-movement',
  'inv-slow-moving',
  'inv-grn',
  'inv-rtv',
  'inv-min',
  'inv-stock-ledger',
  'inv-abc',
];

describe('RPT-5b · Inventory KPI seeds', () => {
  it('registers all 9 inv-* KPIs with explicit layers', () => {
    for (const id of INVENTORY_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });
  it('is idempotent — re-importing does not duplicate ids', () => {
    const before = listKpis().filter(k => k.id.startsWith('inv-')).length;
    return import('../kpi-registry').then(() => {
      const after = listKpis().filter(k => k.id.startsWith('inv-')).length;
      expect(after).toBe(before);
      expect(after).toBeGreaterThanOrEqual(9);
    });
  });
});

describe('RPT-5b · Inventory DSC sources', () => {
  it('registers ≥2 inventory sources that return arrays from read()', () => {
    const ids = ['inventory.stock-ledger', 'inventory.consumption'];
    for (const id of ids) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });
});
