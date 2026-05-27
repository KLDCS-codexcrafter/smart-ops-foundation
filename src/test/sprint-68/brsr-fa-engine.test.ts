/**
 * Sprint 68 FAR-4 · Block 16 · brsr-fa-engine smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeAssetCarbonFootprint,
  computeBRSRFADisclosurePack,
  setAssetBRSRMetadata,
} from '@/lib/brsr-fa-engine';

const ENTITY = 'TST68B';

describe('brsr-fa-engine · ESG disclosure pack', () => {
  beforeEach(() => localStorage.clear());

  it('computeAssetCarbonFootprint with meter signals returns kg CO2', () => {
    const rec = { asset_unit_record_id: 'a', brsr_esg_metadata: { carbon_footprint_kgco2_per_year: 0 } } as never;
    const co2 = computeAssetCarbonFootprint(rec, [
      { signal_id: 's1', asset_unit_record_id: 'a', sensor_type: 'meter', value: 100, unit: 'kWh', timestamp: new Date().toISOString() } as never,
    ]);
    expect(co2).toBeGreaterThan(0);
  });

  it('computeAssetCarbonFootprint falls back to metadata when no signals', () => {
    const rec = { asset_unit_record_id: 'a', brsr_esg_metadata: { carbon_footprint_kgco2_per_year: 555 } } as never;
    expect(computeAssetCarbonFootprint(rec)).toBe(555);
  });

  it('computeBRSRFADisclosurePack returns 7-section pack', () => {
    const pack = computeBRSRFADisclosurePack(ENTITY, '2025-26');
    expect(pack.sections.length).toBe(7);
    expect(pack.entityCode).toBe(ENTITY);
    expect(pack.financial_year).toBe('2025-26');
  });

  it('setAssetBRSRMetadata returns updated record patch', () => {
    const patch = setAssetBRSRMetadata('a1', {
      disclosure_section: 'A',
      esg_category: 'environment',
      carbon_footprint_kgco2_per_year: 100,
      resource_intensity_score: 5,
    } as never);
    expect(patch.brsr_esg_metadata).toBeDefined();
  });
});
