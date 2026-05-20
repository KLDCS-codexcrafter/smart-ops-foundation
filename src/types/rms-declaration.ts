/**
 * @file        src/types/rms-declaration.ts
 * @purpose     RMS (Risk Management System) Declaration · seed · 3-state lane
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q7=b seed only · workflow EX-6
 * @disciplines FR-30 · FR-50
 */

export type RMSLane = 'green' | 'yellow' | 'red';

export const RMS_LANE_DESCRIPTIONS: Record<RMSLane, string> = {
  green: 'Auto-cleared · no examination · facilitation lane',
  yellow: 'Document scrutiny · papers checked · no physical exam',
  red: 'Physical examination · 100% inspection · highest risk',
};

export interface RMSDeclaration {
  id: string;
  entity_id: string;
  related_po_id: string | null;
  related_boe_id: string | null;
  declared_lane: RMSLane;
  actual_lane: RMSLane | null;
  risk_factors: string[];
  examination_notes: string;
  declared_at: string;
  resolved_at: string | null;
}

export const rmsDeclarationsKey = (entityCode: string): string =>
  `erp_${entityCode}_rms_declarations`;
