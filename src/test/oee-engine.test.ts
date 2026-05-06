/**
 * oee-engine.test.ts — Sprint T-Phase-1.3-3-PlantOps-pre-3a · Block L
 */
import { describe, it, expect } from 'vitest';
import { computeOEE } from '@/lib/oee-engine';
import type { OEESourceData } from '@/types/oee-snapshot';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';

const mkSrc = (over: Partial<OEESourceData> = {}): OEESourceData => ({
  entity_id: 'E1', factory_id: 'F1', machine_id: 'M1',
  date: '2026-05-04', shift_id: null,
  source_dwr_entry_ids: [], source_job_card_ids: [],
  planned_production_time: 8, actual_run_time: 7.2,
  theoretical_max_qty: 100, actual_qty: 95, good_qty: 90,
  primary_kpis: [],
  computed_at: new Date().toISOString(),
  ...over,
});

describe('oee-engine · 3-PlantOps-pre-3a', () => {
  it('Test 4 · computeOEE classic_apq · A × P × Q · classifies world_class >= 85', () => {
    const r = computeOEE(mkSrc({ planned_production_time: 8, actual_run_time: 8, theoretical_max_qty: 100, actual_qty: 100, good_qty: 100 }), 'classic_apq');
    expect(r.mode).toBe('classic_apq');
    expect(r.oee_pct).toBeGreaterThanOrEqual(85);
    expect(r.classification).toBe('world_class');
    expect(r.availability_pct).toBe(100);
  });

  it('Test 5 · computeOEE simplified_aq · skips Performance · A × Q only', () => {
    const r = computeOEE(mkSrc(), 'simplified_aq');
    expect(r.mode).toBe('simplified_aq');
    expect(r.performance_pct).toBeNull();
    expect(r.availability_pct).not.toBeNull();
    expect(r.quality_pct).not.toBeNull();
  });

  it('Test 6 · computeOEE template_weighted · uses primary_kpis · falls back to classic if no template', () => {
    const fallback = computeOEE(mkSrc(), 'template_weighted');
    expect(fallback.mode).toBe('template_weighted');
    expect(fallback.formula_label).toContain('fallback');

    const tpl = {
      id: 't-test', name: 'Test', primary_kpis: ['availability', 'quality', 'throughput'],
      secondary_kpis: [],
    } as unknown as ManufacturingTemplate;
    const r = computeOEE(mkSrc({ primary_kpis: tpl.primary_kpis }), 'template_weighted', tpl);
    expect(r.kpi_breakdown).not.toBeNull();
    expect(Object.keys(r.kpi_breakdown!)).toHaveLength(3);
    expect(r.template_id).toBe('t-test');
  });
});
