/**
 * TimeEntryPrint.tsx — Time entry voucher print.
 * Sprint T-Phase-1.2.6d.
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  TIME_ENTRY_STATUS_LABELS, type TimeEntry,
} from '@/types/projx/time-entry';
import type { Project } from '@/types/projx/project';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props {
  entry: TimeEntry;
  project: Project | null;
  onClose?: () => void;
}

export function TimeEntryPrint({ entry, project, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Time Entry Voucher"
      docNo={`TE-${entry.id.slice(0, 8)}`}
      voucherDate={entry.entry_date}
      effectiveDate={entry.effective_date}
      onClose={onClose}
      signatories={['Logged By', 'Approved By', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Project:</span> {project?.project_no ?? entry.project_no}</div>
          <div><span className="font-semibold">Project Name:</span> {project?.project_name ?? '—'}</div>
          <div><span className="font-semibold">Person:</span> {entry.person_name}</div>
          <div><span className="font-semibold">Status:</span> {TIME_ENTRY_STATUS_LABELS[entry.status]}</div>
        </div>
      }
      termsAndConditions="Time entries are subject to approval and may be rejected if not supported by deliverables."
    >
      <div className="space-y-4 text-sm">
        <div>
          <div className="font-semibold mb-1">Entry Metadata</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div><span className="text-muted-foreground">Entry Date:</span> <span className="font-mono">{entry.entry_date}</span></div>
            <div><span className="text-muted-foreground">Hours:</span> <span className="font-mono">{entry.hours}</span></div>
            <div><span className="text-muted-foreground">Rate:</span> <span className="font-mono">{fmtINR(entry.hourly_rate)}</span></div>
            <div><span className="text-muted-foreground">Total Value:</span> <span className="font-mono">{fmtINR(entry.hours * entry.hourly_rate)}</span></div>
            <div><span className="text-muted-foreground">Billable:</span> {entry.is_billable ? 'Yes' : 'No'}</div>
            <div><span className="text-muted-foreground">Milestone:</span> <span className="font-mono">{entry.milestone_id ? 'Linked' : '—'}</span></div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">Task Description</div>
          <div className="text-xs">{entry.task_description}</div>
        </div>

        <div>
          <div className="font-semibold mb-1">Approval Audit</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Approved By:</span> {entry.approved_by_name ?? '—'}</div>
            <div><span className="text-muted-foreground">Approved At:</span> <span className="font-mono">{entry.approved_at ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Rejection:</span> {entry.rejection_reason ?? '—'}</div>
          </div>
        </div>
      </div>
    </UniversalPrintFrame>
  );
}
