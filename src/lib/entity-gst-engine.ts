/**
 * @file        src/lib/entity-gst-engine.ts
 * @purpose     D-NEW-GM-V2 · Entity GST configuration engine · 24th SIBLING ⭐
 *              Provides clean PUBLIC API for NEW consumers (Block C V2 EWB + future Dispatch/Logistics).
 *              10 existing inline EntityGSTConfig consumers in print engines remain 0-DIFF (institutional
 *              precedent · migration is a future sprint).
 * @sprint      T-Phase-2.HK-5-2 · Block C V2
 * @decisions   Q-LOCK-4(a) FR-19 SIBLING · ewb-engine + po-management-engine + party-master-engine all 0-DIFF
 * @disciplines FR-19 (24th application · QUARTER+CENTURY scale) · FR-22 canonical · FR-26 entity-scoped · FR-54 CC SSOT
 * @reuses      entityGstKey (existing localStorage key pattern · 10 existing inline consumers preserved)
 * @[JWT]       erp_entity_gst_<entityCode>
 */
import type { EntityGSTConfig } from '@/types/entity-gst';
import { entityGstKey } from '@/types/entity-gst';

export function loadEntityGSTConfig(entityCode: string): EntityGSTConfig | null {
  try {
    const raw = localStorage.getItem(entityGstKey(entityCode));
    return raw ? (JSON.parse(raw) as EntityGSTConfig) : null;
  } catch {
    return null;
  }
}

export function getEntityStateCode(entityCode: string): string {
  return loadEntityGSTConfig(entityCode)?.state_code ?? '';
}

export function getEWBThreshold(entityCode: string): number {
  const cfg = loadEntityGSTConfig(entityCode);
  return cfg?.auto_generate_ewb_above && cfg.auto_generate_ewb_above > 0
    ? cfg.auto_generate_ewb_above
    : 50_000;
}

export function isEWBApiEnabled(entityCode: string): boolean {
  return loadEntityGSTConfig(entityCode)?.ewb_api_enabled === true;
}

export function getEntityGSTIN(entityCode: string): string {
  return loadEntityGSTConfig(entityCode)?.gstin ?? '';
}
