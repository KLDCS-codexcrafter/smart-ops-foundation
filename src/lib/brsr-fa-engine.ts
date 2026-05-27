/**
 * @file        src/lib/brsr-fa-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 52nd SIBLING
 * @realizes    MOAT-52 · BRSR FA-Specific ESG Disclosure Pack
 * @approach    Q-LOCK-8 C · FA-specific BRSR Section A-G metrics (carbon
 *              footprint per asset · resource intensity · ESG categorization) ·
 *              pulls live data from FA register + IoT meter signals (Prompt A)
 * @reads-from  iot-asset-bridge.ts (Prompt A · subscribeToAssetStream)
 * [JWT] Phase 5: GET /api/brsr/fa/disclosures · POST /api/brsr/fa/export.pdf
 */
import type { AssetUnitRecord, BRSRMetadata, IoTSignal } from '@/types/fixed-asset';
import { subscribeToAssetStream } from './iot-asset-bridge';

type ESGCategory = 'environment' | 'social' | 'governance' | 'mixed';
type Section = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface BRSRSectionDisclosure {
  section: Section;
  total_carbon_footprint_kgco2_per_year: number;
  total_resource_intensity_score: number;
  asset_count: number;
  by_esg_category: Record<ESGCategory, number>;
  high_intensity_asset_ids: string[];
  computed_at: string;
}

export interface BRSRDisclosurePack {
  entityCode: string;
  financial_year: string;
  sections: BRSRSectionDisclosure[];
  summary: {
    total_assets_disclosed: number;
    total_co2_kg_per_year: number;
    total_assets_with_brsr_metadata: number;
    coverage_pct: number;
  };
}

const SECTIONS: Section[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// kg CO2 per kWh — India grid emission factor (approximate baseline)
const GRID_EMISSION_FACTOR = 0.82;

function loadAssetRecords(entityCode: string): AssetUnitRecord[] {
  try {
    const raw = localStorage.getItem(`erp_asset_units_${entityCode}`);
    return raw ? (JSON.parse(raw) as AssetUnitRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Compute carbon footprint for a single asset · pulls from IoT meter signals
 * when available · falls back to BRSR metadata.
 */
export function computeAssetCarbonFootprint(
  record: AssetUnitRecord,
  signals?: IoTSignal[],
): number {
  const meterTotal = (signals ?? [])
    .filter(s => s.sensor_type === 'meter')
    .reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);
  if (meterTotal > 0) return meterTotal * GRID_EMISSION_FACTOR;
  return record.brsr_esg_metadata?.carbon_footprint_kgco2_per_year ?? 0;
}

/**
 * Compute FA-specific BRSR disclosure pack for an entity + FY.
 */
export function computeBRSRFADisclosurePack(
  entityCode: string,
  financial_year: string,
): BRSRDisclosurePack {
  const records = loadAssetRecords(entityCode);
  const recordsWithMeta = records.filter(r => r.brsr_esg_metadata);

  const sections: BRSRSectionDisclosure[] = SECTIONS.map(section => {
    const scoped = recordsWithMeta.filter(r => r.brsr_esg_metadata?.disclosure_section === section);
    const by_esg_category: Record<ESGCategory, number> = {
      environment: 0, social: 0, governance: 0, mixed: 0,
    };
    let total_carbon = 0;
    let total_intensity = 0;
    const intensityRanking: { id: string; intensity: number }[] = [];

    for (const r of scoped) {
      const meta = r.brsr_esg_metadata as BRSRMetadata;
      by_esg_category[meta.esg_category] += 1;
      const signals = subscribeToAssetStream(entityCode, r.id);
      const co2 = computeAssetCarbonFootprint(r, signals);
      total_carbon += co2;
      total_intensity += meta.resource_intensity_score;
      intensityRanking.push({ id: r.id, intensity: meta.resource_intensity_score });
    }

    intensityRanking.sort((a, b) => b.intensity - a.intensity);

    return {
      section,
      total_carbon_footprint_kgco2_per_year: Math.round(total_carbon),
      total_resource_intensity_score: Math.round(total_intensity),
      asset_count: scoped.length,
      by_esg_category,
      high_intensity_asset_ids: intensityRanking.slice(0, 10).map(x => x.id),
      computed_at: new Date().toISOString(),
    };
  });

  const total_co2_kg_per_year = sections.reduce((s, sec) => s + sec.total_carbon_footprint_kgco2_per_year, 0);
  const total_assets_disclosed = records.length;
  const coverage_pct = total_assets_disclosed > 0
    ? Math.round((recordsWithMeta.length / total_assets_disclosed) * 100)
    : 0;

  return {
    entityCode,
    financial_year,
    sections,
    summary: {
      total_assets_disclosed,
      total_co2_kg_per_year,
      total_assets_with_brsr_metadata: recordsWithMeta.length,
      coverage_pct,
    },
  };
}

/**
 * Update an asset's BRSR metadata (pure · returns updated record).
 */
export function setAssetBRSRMetadata(
  record: AssetUnitRecord,
  metadata: BRSRMetadata,
): AssetUnitRecord {
  return {
    ...record,
    brsr_esg_metadata: metadata,
    updated_at: new Date().toISOString(),
  };
}
