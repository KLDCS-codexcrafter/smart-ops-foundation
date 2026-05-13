/**
 * @file        src/types/customer-service-tier.ts
 * @purpose     CustomerServiceTier canonical · 4-tier (Bronze/Silver/Gold/Platinum) · OOB-10
 * @sprint      T-Phase-1.C.1e · Block A.1
 * @iso         Functional Suitability + Maintainability + Reliability
 * @disciplines FR-30 · FR-39 audit · FR-50 entity-scoped
 */
import type { AuditEntry } from '@/types/servicedesk';

export type ServiceTierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CustomerServiceTier {
  id: string;
  entity_id: string;
  customer_id: string;
  tier: ServiceTierLevel;
  assigned_at: string;
  assigned_by: string;
  sla_override_id: string | null;
  cascade_override_id: string | null;
  reminder_frequency_override: 'standard' | 'priority' | 'vip' | null;
  notes: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export const customerServiceTierKey = (e: string): string =>
  `servicedesk_v1_customer_service_tier_${e}`;

export const TIER_BENEFITS: Record<ServiceTierLevel, {
  label: string;
  sla_multiplier: number;
  cascade_advance_days: number;
  priority_routing: boolean;
}> = {
  bronze: { label: 'Bronze', sla_multiplier: 1.0, cascade_advance_days: 0, priority_routing: false },
  silver: { label: 'Silver', sla_multiplier: 0.85, cascade_advance_days: 3, priority_routing: false },
  gold: { label: 'Gold', sla_multiplier: 0.70, cascade_advance_days: 7, priority_routing: true },
  platinum: { label: 'Platinum', sla_multiplier: 0.50, cascade_advance_days: 14, priority_routing: true },
};
