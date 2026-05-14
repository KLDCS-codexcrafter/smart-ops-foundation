/**
 * @file        src/types/engineer-marketplace.ts
 * @purpose     EngineerMarketplaceProfile canonical · Sub-contractor + Freelance support · OOB-S27 Tier 2
 * @sprint      T-Phase-1.C.1f · Block A.1
 * @iso         Functional Suitability + Maintainability + Reliability
 * @disciplines FR-30 · FR-39 audit · FR-50 entity-scoped
 */
import type { AuditEntry } from '@/types/servicedesk';

export type EngagementType = 'employee' | 'subcontractor' | 'freelancer';

export interface EngineerMarketplaceProfile {
  id: string;
  entity_id: string;
  engineer_id: string;
  engineer_name: string;
  engagement_type: EngagementType;
  capacity_hours_per_week: number;
  skill_tags: string[];
  certification_links: string[];
  payment_terms: string;
  invoicing_method: 'gst_invoice' | 'tds_deducted' | 'gross';
  hourly_rate_paise: number;
  is_available: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export const engineerMarketplaceKey = (e: string): string =>
  `servicedesk_v1_engineer_marketplace_${e}`;
