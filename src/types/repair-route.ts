/**
 * @file        src/types/repair-route.ts
 * @purpose     RepairRoute canonical · TallyWARM Workflow 1 · 4 routes · Q-LOCK-3
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1c · Block A.2
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30
 * @reuses      AuditEntry from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */
import type { AuditEntry } from '@/types/servicedesk';

export type RepairRouteType = 'in_house' | 'manufacturer' | 'third_party' | 'service_centre';

export type RepairRouteStatus = 'routed' | 'in_repair' | 'returned' | 'rejected';

export interface RepairRoute {
  id: string;
  entity_id: string;
  ticket_id: string;
  route_type: RepairRouteType;
  route_partner_id: string;
  partner_name: string;
  repair_out_at: string;
  expected_return_at: string | null;
  repair_in_at: string | null;
  cost_paise: number;
  status: RepairRouteStatus;
  turnaround_days: number | null;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const repairRouteKey = (e: string): string => `servicedesk_v1_repair_route_${e}`;
