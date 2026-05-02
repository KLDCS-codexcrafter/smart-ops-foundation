/**
 * MilestonePrint.tsx — Milestone print.
 * Sprint T-Phase-1.2.6d.
 */

import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  MILESTONE_STATUS_LABELS, type ProjectMilestone,
} from '@/types/projx/project-milestone';
import type { Project } from '@/types/projx/project';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props {
  milestone: ProjectMilestone;
  project: Project | null;
  onClose?: () => void;
}

export function MilestonePrint({ milestone, project, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Project Milestone"
      docNo={milestone.milestone_no}
      voucherDate={milestone.target_date}
      effectiveDate={milestone.effective_date}
      onClose={onClose}
      signatories={['Completed By', 'Verified By', 'Approved By']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Project:</span> {project?.project_no ?? '—'}</div>
          <div><span className="font-semibold">Project Name:</span> {project?.project_name ?? '—'}</div>
          <div><span className="font-semibold">Customer:</span> {project?.customer_name ?? '—'}</div>
          <div><span className="font-semibold">Status:</span> {MILESTONE_STATUS_LABELS[milestone.status]}</div>
        </div>
      }
      termsAndConditions={milestone.description || 'Milestone completion subject to acceptance criteria.'}
    >
      <div className="space-y-4 text-sm">
        <div>
          <div className="font-semibold mb-1">Metadata</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div><span className="text-muted-foreground">Milestone Name:</span> {milestone.milestone_name}</div>
            <div><span className="text-muted-foreground">Target Date:</span> <span className="font-mono">{milestone.target_date}</span></div>
            <div><span className="text-muted-foreground">Completed:</span> <span className="font-mono">{milestone.actual_completion_date ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Invoice %:</span> <span className="font-mono">{milestone.invoice_pct}%</span></div>
            <div><span className="text-muted-foreground">Invoice Amount:</span> <span className="font-mono">{fmtINR(milestone.invoice_amount)}</span></div>
            <div><span className="text-muted-foreground">Billed:</span> {milestone.is_billed ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">Dependencies</div>
          {milestone.blocks_milestone_ids.length === 0 ? (
            <div className="text-xs text-muted-foreground">No downstream blocks.</div>
          ) : (
            <ul className="text-xs list-disc pl-5">
              {milestone.blocks_milestone_ids.map(id => <li key={id} className="font-mono">{id}</li>)}
            </ul>
          )}
        </div>

        <div>
          <div className="font-semibold mb-1">Completion Criteria</div>
          <div className="text-xs">{milestone.description || '—'}</div>
        </div>

        <div>
          <div className="font-semibold mb-1">Invoice Trigger</div>
          <div className="text-xs">
            {milestone.is_billed
              ? `Billed via voucher ${milestone.invoice_voucher_no ?? milestone.invoice_voucher_id ?? '—'}`
              : 'Not yet billed.'}
          </div>
        </div>
      </div>
    </UniversalPrintFrame>
  );
}
