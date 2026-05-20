/**
 * @file        src/lib/aeo-tier-engine.ts
 * @purpose     AEO tier resolution · Entity × Port AEO check + fast-track + RMS pre-bias · Moat #4 ANCHORED
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q4=b master with Entity × Port resolution
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */
import type { AEOTier, PortEXIMExtension } from '@/types/port-extension';
import type { EntityAEOCertification, AEOResolutionResult } from '@/types/aeo-tier-mapping';
import { AEO_TIER_RANK, entityAEOCertificationsKey } from '@/types/aeo-tier-mapping';

export function loadEntityAEOCerts(entityCode: string): EntityAEOCertification[] {
  try {
    const raw = localStorage.getItem(entityAEOCertificationsKey(entityCode));
    return raw ? (JSON.parse(raw) as EntityAEOCertification[]) : [];
  } catch { return []; }
}

export function saveEntityAEOCerts(entityCode: string, certs: EntityAEOCertification[]): void {
  localStorage.setItem(entityAEOCertificationsKey(entityCode), JSON.stringify(certs));
}

export function getEntityAEOTier(entityCode: string, targetEntityId: string, asOfDate: string): AEOTier {
  const certs = loadEntityAEOCerts(entityCode);
  const valid = certs.filter((c) =>
    c.entity_id === targetEntityId &&
    c.validity_from <= asOfDate &&
    c.validity_to >= asOfDate,
  );
  if (valid.length === 0) return 'not_aeo';
  return valid.reduce<AEOTier>(
    (max, c) => (AEO_TIER_RANK[c.aeo_tier] > AEO_TIER_RANK[max] ? c.aeo_tier : max),
    'not_aeo',
  );
}

export function resolveAEO(
  importerTier: AEOTier,
  portExtension: Pick<PortEXIMExtension, 'aeo_tier_supported' | 'has_aeo_lane'>,
): AEOResolutionResult {
  const port_tier_supported = portExtension.aeo_tier_supported;
  const fast_track_eligible =
    portExtension.has_aeo_lane &&
    AEO_TIER_RANK[importerTier] >= AEO_TIER_RANK[port_tier_supported] &&
    importerTier !== 'not_aeo';

  let rms_pre_bias: 'auto_green' | 'green_preferred' | 'none';
  if (importerTier === 'tier_3') {
    rms_pre_bias = 'auto_green';
  } else if (importerTier === 'tier_2') {
    rms_pre_bias = 'green_preferred';
  } else {
    rms_pre_bias = 'none';
  }

  const free_demurrage_days_applied = importerTier === 'tier_3' ? 5 : importerTier === 'tier_2' ? 2 : 0;

  return {
    importer_tier: importerTier,
    port_tier_supported,
    fast_track_eligible,
    rms_pre_bias_applied: rms_pre_bias,
    free_demurrage_days_applied,
    reason: fast_track_eligible
      ? `AEO ${importerTier} importer at ${port_tier_supported}-supported port · fast-track lane + ${free_demurrage_days_applied} bonus free days`
      : importerTier === 'not_aeo'
        ? 'Non-AEO importer · standard RMS workflow · no bonus'
        : 'AEO tier insufficient for this port · standard workflow',
  };
}
