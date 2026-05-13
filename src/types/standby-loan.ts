/**
 * @file        src/types/standby-loan.ts
 * @purpose     StandbyLoan canonical · OOB-18 revenue-leak protection · Q-LOCK-4
 * @who         ServiceDesk module
 * @when        2026-05-14
 * @sprint      T-Phase-1.C.1c · Block A.3
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30
 * @reuses      AuditEntry from @/types/servicedesk
 * @[JWT]       Phase 2 wires real backend
 */
import type { AuditEntry } from '@/types/servicedesk';

export type StandbyLoanStatus = 'out' | 'returned' | 'overdue' | 'written_off';

export interface StandbyLoan {
  id: string;
  entity_id: string;
  ticket_id: string;
  customer_id: string;
  loaner_serial: string;
  loaner_model: string;
  loaned_out_at: string;
  expected_return_date: string;
  returned_at: string | null;
  status: StandbyLoanStatus;
  daily_cost_paise: number;
  total_cost_paise: number;
  damage_on_return: boolean;
  damage_charge_paise: number;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const standbyLoanKey = (e: string): string => `servicedesk_v1_standby_loan_${e}`;
