/**
 * @file        src/types/vendor-risk-score.ts
 * @purpose     Vendor risk score · umbrella aggregate · references financial-health + compliance records
 * @who         Admin · Risk Officer · Procurement HOD · MD
 * @when        2026-05-18 (Sprint A.2)
 * @sprint      T-Phase-1.A.2-VendorPortal-Architecture-Seeds
 * @iso         ISO 25010 Functional Suitability
 * @whom        Audit Owner
 * @decisions   D-NEW-DP (craft_canvas hybrid port) · D-NEW-DN (Vendor Portal canonical) ·
 *              A-Q14=A (plant all 3 vendor-risk types in A.2)
 * @disciplines FR-30
 * @reuses      VendorFinancialHealth · VendorComplianceRecord (sibling types)
 * @[JWT]       N/A (type file)
 *
 * Umbrella aggregate combining financial health + compliance + operational performance.
 * Per FR-79 · Sprint A-b's risk engine will stamp `last_calculated_at` and `score_components` based on
 * sibling records.
 */

import type { RiskLevel } from './vendor-financial-health';
import type { ComplianceStatus } from './vendor-compliance-record';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Score component contributions · transparent breakdown for admin review.
 */
export interface VendorRiskScoreComponents {
  financial_health_score?: number;       // 0-100
  compliance_score?: number;             // 0-100
  performance_score?: number;            // 0-100 · from operational data (delivery · quality · response)
  msme_43bh_score?: number;              // 0-100 · MSME-43BH compliance bonus
  esg_score?: number;                    // 0-100 · sustainability + diversity (Phase 2)
}

/**
 * Per-vendor aggregate risk score · one record per vendor per entity.
 */
export interface VendorRiskScore {
  // Identity (3)
  id: string;
  party_id: string;
  entity_code: string;

  // Aggregate (4)
  overall_score?: number;                // 0-100 · weighted average of components
  risk_grade?: RiskGrade;
  risk_level?: RiskLevel;
  compliance_status?: ComplianceStatus;

  // Component breakdown (1)
  score_components?: VendorRiskScoreComponents;

  // Calculation metadata (3)
  last_calculated_at?: string;           // ISO datetime · FR-79 stamped
  calculation_engine_version?: string;   // for traceability
  notes?: string;

  // Metadata (2)
  created_at: string;
  updated_at: string;
}

/** localStorage key generator · entity-scoped per FR-50 */
export function vendorRiskScoreKey(entityCode: string): string {
  return `erp_vendor_risk_scores_${entityCode}`;
}
