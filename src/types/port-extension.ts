/**
 * @file        src/types/port-extension.ts
 * @purpose     EXIM-specific extension overlay for existing PortRecord (no parallel master)
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q5=c extension via overlay · PortMaster.tsx 0-diff · localStorage entity-scoped
 * @disciplines FR-30 · FR-50 · FR-26
 */

export type AEOTier = 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo';

export interface PortEXIMExtension {
  portCode: string;
  icegate_code: string;
  aeo_tier_supported: AEOTier;
  vessel_handling_capacity: number;
  has_bonded_warehouse: boolean;
  has_aeo_lane: boolean;
  notes: string;
  updated_at: string;
}

export const portEXIMExtensionsKey = (entityCode: string): string =>
  `erp_port_exim_extensions_${entityCode}`;
