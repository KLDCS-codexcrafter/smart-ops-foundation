/**
 * @file        src/types/customer-reminder.ts
 * @purpose     CustomerReminder canonical · Birthday/Anniversary CRM · OOB-11
 * @sprint      T-Phase-1.C.1e · Block A.2
 * @iso         Usability + Functional Suitability
 */
import type { AuditEntry } from '@/types/servicedesk';

export type ReminderType = 'birthday' | 'amc_anniversary' | 'service_anniversary' | 'custom';
export type ReminderStatus = 'pending' | 'fired' | 'snoozed' | 'dismissed';
export type ReminderChannel = 'email' | 'sms' | 'tellicaller' | 'in_app';

export interface CustomerReminder {
  id: string;
  entity_id: string;
  customer_id: string;
  reminder_type: ReminderType;
  trigger_date: string;
  advance_days: number;
  status: ReminderStatus;
  fired_at: string | null;
  fired_via_channel: ReminderChannel | null;
  snoozed_until: string | null;
  template_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  audit_trail: AuditEntry[];
}

export const customerReminderKey = (e: string): string =>
  `servicedesk_v1_customer_reminder_${e}`;
