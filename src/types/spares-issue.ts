/**
 * @file        src/types/spares-issue.ts
 * @purpose     SparesIssueRecord canonical · OOB-20 · Q-LOCK-9
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1c · Block A.5
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30
 * @reuses      AuditEntry from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */
import type { AuditEntry } from '@/types/servicedesk';

export interface SparesIssueRecord {
  id: string;
  entity_id: string;
  ticket_id: string;
  spare_id: string;
  spare_name: string;
  qty: number;
  unit_cost_paise: number;
  total_cost_paise: number;
  engineer_id: string;
  van_stock_id: string | null;
  billable_to_customer: boolean;
  issued_at: string;
  audit_trail: AuditEntry[];
}

export const sparesIssueKey = (e: string): string => `servicedesk_v1_spares_issue_${e}`;
