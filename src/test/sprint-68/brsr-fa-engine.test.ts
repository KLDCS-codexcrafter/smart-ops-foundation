/**
 * Sprint 68 FAR-4 · Block 16 · brsr-fa-engine smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeAssetCarbonFootprint,
  computeBRSRFADisclosurePack,
  setAssetBRSRMetadata,
} from '@/lib/brsr-fa-engine';
import type { AssetUnitRecord, BRSRMetadata, IoTSignal } from '@/types/fixed-asset';

const ENTITY = 'TST68B';

function mkRec(overrides: Partial<AssetUnitRecord> = {}): AssetUnitRecord {
  return { asset_id: 'a', ...overrides } as unknown as AssetUnitRecord;
}

describe('brsr-fa-engine · ESG disclosure pack', () => {
  beforeEach(() => localStorage.clear());

  it('computeAssetCarbonFootprint with meter signals returns kg CO2', () => {
    const co2 = computeAssetCarbonFootprint(
      mkRec({ brsr_esg_metadata: { carbon_footprint_kgco2_per_year: 0 } as BRSRMetadata }),
      [{ sensor_type: 'meter', value: 100, timestamp: new Date().toISOString() } as unknown as IoTSignal],
    );
    expect(co2).toBeGreaterThan(0);
  });

  it('computeAssetCarbonFootprint falls back to metadata when no signals', () => {
    expect(computeAssetCarbonFootprint(
      mkRec({ brsr_esg_metadata: { carbon_footprint_kgco2_per_year: 555 } as BRSRMetadata }),
    )).toBe(555);
  });

  it('computeBRSRFADisclosurePack returns 7-section pack', () => {
    const pack = computeBRSRFADisclosurePack(ENTITY, '2025-26');
    expect(pack.sections.length).toBe(7);
    expect(pack.entityCode).toBe(ENTITY);
  });

  it('setAssetBRSRMetadata returns updated record', () => {
    const r = setAssetBRSRMetadata(mkRec(), {
      disclosure_section: 'A',
      esg_category: 'environment',
      carbon_footprint_kgco2_per_year: 100,
      resource_intensity_score: 5,
    } as unknown as BRSRMetadata);
    expect(r.brsr_esg_metadata).toBeDefined();
  });
});
