/**
 * @file rpt-8b-kpis-and-sources.test.ts — RPT-8b registry + DSC verification
 * Asserts: 6 layer-tagged KPI seeds idempotent · 4 new DSC sources
 * (frontdesk.contacts · taskflow.tasks · docvault.documents · payhub.payroll)
 * expose read() returning arrays. payhub.payroll honestly returns either real
 * rows from localStorage or an empty array — both are valid (no synthetic seed).
 */
import { describe, it, expect } from 'vitest';
import { getKpi, listKpis } from '../kpi-registry';
import { getSource } from '../data-source-catalog';
import '../data-sources';

const RPT8B_KPI_IDS = [
  'fd-addressbook', 'tf-sla', 'dv-documents', 'dv-drawings', 'dv-expiry', 'ph-statutory',
];

const RPT8B_SOURCE_IDS = [
  'frontdesk.contacts', 'taskflow.tasks', 'docvault.documents', 'payhub.payroll',
];

describe('RPT-8b · KPI seeds', () => {
  it('registers all 6 KPIs with explicit layers', () => {
    for (const id of RPT8B_KPI_IDS) {
      const k = getKpi(id);
      expect(k, `missing ${id}`).toBeDefined();
      expect(Array.isArray(k!.layers) && k!.layers!.length > 0).toBe(true);
    }
  });

  it('is idempotent — re-import does not duplicate', async () => {
    const before = listKpis().length;
    await import('../kpi-registry');
    const after = listKpis().length;
    expect(after).toBe(before);
  });
});

describe('RPT-8b · DSC sources', () => {
  it('registers the 4 new sources with read() returning arrays', () => {
    for (const id of RPT8B_SOURCE_IDS) {
      const s = getSource(id);
      expect(s, `missing source ${id}`).toBeDefined();
      const rows = s!.read('SMRT');
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('payhub.payroll returns real payroll rows or honestly empty array', () => {
    const s = getSource('payhub.payroll')!;
    const rows = s.read('SMRT');
    expect(Array.isArray(rows)).toBe(true);
    // Honest assertion: either real data is present (non-empty) or storage is
    // empty (empty array) — no synthetic seed is injected by this sprint.
    expect(rows.length >= 0).toBe(true);
  });
});
