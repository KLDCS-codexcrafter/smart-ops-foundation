/**
 * project-invoice-schedule.ts — Planned billing schedule per project
 * Sprint T-Phase-1.1.2-b · auto-generated when milestone created
 */

export type InvoiceScheduleStatus = 'future' | 'due' | 'overdue' | 'invoiced';

export const INVOICE_SCHEDULE_STATUS_LABELS: Record<InvoiceScheduleStatus, string> = {
  future:   'Future',
  due:      'Due',
  overdue:  'Overdue',
  invoiced: 'Invoiced',
};

export const INVOICE_SCHEDULE_STATUS_COLORS: Record<InvoiceScheduleStatus, string> = {
  future:   'bg-slate-500/10 text-slate-700 border-slate-500/30',
  due:      'bg-amber-500/10 text-amber-700 border-amber-500/30',
  overdue:  'bg-red-500/10 text-red-700 border-red-500/30',
  invoiced: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
};

export interface ProjectInvoiceSchedule {
  id: string;
  entity_id: string;
  project_id: string;
  project_centre_id: string;
  milestone_id: string | null;

  scheduled_date: string;                   // YYYY-MM-DD
  amount: number;
  description: string;

  is_invoiced: boolean;
  invoiced_voucher_id: string | null;
  invoiced_voucher_no: string | null;
  invoiced_at: string | null;

  created_at: string;
  updated_at: string;
}

export const projectInvoiceScheduleKey = (entityCode: string): string =>
  `erp_project_invoice_schedule_${entityCode}`;

export function computeScheduleStatus(
  schedule: ProjectInvoiceSchedule,
  today: string = new Date().toISOString().slice(0, 10),
): InvoiceScheduleStatus {
  if (schedule.is_invoiced) return 'invoiced';
  const overdueThreshold = new Date(today);
  overdueThreshold.setDate(overdueThreshold.getDate() - 7);
  const overdueISO = overdueThreshold.toISOString().slice(0, 10);
  if (schedule.scheduled_date < overdueISO) return 'overdue';
  if (schedule.scheduled_date <= today) return 'due';
  return 'future';
}
