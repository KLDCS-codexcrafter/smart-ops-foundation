/**
 * time-entry.ts — Project-tagged work log
 * Sprint T-Phase-1.1.2-b · ProjX Transactions
 *
 * Per D-222: approval workflow uses ExpenseClaim status pattern.
 */

export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export const TIME_ENTRY_STATUS_LABELS: Record<TimeEntryStatus, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  approved:  'Approved',
  rejected:  'Rejected',
};

export const TIME_ENTRY_STATUS_COLORS: Record<TimeEntryStatus, string> = {
  draft:     'bg-slate-500/10 text-slate-700 border-slate-500/30',
  submitted: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  approved:  'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  rejected:  'bg-red-500/10 text-red-700 border-red-500/30',
};

export interface TimeEntry {
  id: string;
  entity_id: string;

  project_id: string;
  project_no: string;
  project_centre_id: string;

  milestone_id: string | null;
  person_id: string;
  person_name: string;

  entry_date: string;                       // YYYY-MM-DD
  hours: number;                            // 0.25 step

  task_description: string;
  is_billable: boolean;
  hourly_rate: number;

  status: TimeEntryStatus;
  approved_by_id: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

export const timeEntriesKey = (entityCode: string): string =>
  `erp_time_entries_${entityCode}`;
