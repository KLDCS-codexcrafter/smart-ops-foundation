/**
 * ProjectStatusPrint.tsx — Project Status Report print (Q1-b pragmatic hybrid).
 * Sprint T-Phase-1.2.6d.
 */

import { useMemo } from 'react';
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, type Project,
} from '@/types/projx/project';
import {
  MILESTONE_STATUS_LABELS, type ProjectMilestone,
} from '@/types/projx/project-milestone';
import {
  projectResourcesKey, type ProjectResource,
} from '@/types/projx/project-resource';
import {
  projectInvoiceScheduleKey, type ProjectInvoiceSchedule,
} from '@/types/projx/project-invoice-schedule';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props {
  project: Project;
  milestones: ProjectMilestone[];
  onClose?: () => void;
}

export function ProjectStatusPrint({ project, milestones, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const company: PrintCompany = { name: safeEntity || 'Operix', gstin: '—', pan: '—' };

  const resources = useMemo<ProjectResource[]>(() => {
    try {
      // [JWT] GET /api/projx/resources/:entityCode
      const all = JSON.parse(localStorage.getItem(projectResourcesKey(safeEntity)) || '[]') as ProjectResource[];
      return all.filter(r => r.project_id === project.id);
    } catch { return []; }
  }, [safeEntity, project.id]);

  const schedule = useMemo<ProjectInvoiceSchedule[]>(() => {
    try {
      // [JWT] GET /api/projx/invoice-schedule/:entityCode
      const all = JSON.parse(localStorage.getItem(projectInvoiceScheduleKey(safeEntity)) || '[]') as ProjectInvoiceSchedule[];
      return all.filter(s => s.project_id === project.id);
    } catch { return []; }
  }, [safeEntity, project.id]);

  return (
    <UniversalPrintFrame
      company={company}
      title="Project Status Report"
      docNo={project.project_no}
      voucherDate={project.start_date}
      effectiveDate={project.effective_date}
      onClose={onClose}
      signatories={['Project Manager', 'Approved By', 'Customer Acknowledgement']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Project:</span> {project.project_name}</div>
          <div><span className="font-semibold">Type:</span> {PROJECT_TYPE_LABELS[project.project_type]}</div>
          <div><span className="font-semibold">Customer:</span> {project.customer_name ?? '—'}</div>
          <div><span className="font-semibold">PM:</span> {project.project_manager_name ?? '—'}</div>
          <div><span className="font-semibold">Status:</span> {PROJECT_STATUS_LABELS[project.status]}</div>
          <div><span className="font-semibold">Target End:</span> {project.target_end_date}</div>
          <div><span className="font-semibold">Contract Value:</span> {fmtINR(project.current_contract_value)}</div>
          <div><span className="font-semibold">Billed To Date:</span> {fmtINR(project.billed_to_date)}</div>
        </div>
      }
      termsAndConditions={project.description || 'Confidential · prepared for client review.'}
    >
      <div className="space-y-4">
        <div>
          <div className="font-semibold text-sm mb-1">Milestone Progress</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Inv ₹</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground">No milestones.</TableCell></TableRow>
              ) : milestones.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-mono">{m.milestone_no}</TableCell>
                  <TableCell className="text-xs">{m.milestone_name}</TableCell>
                  <TableCell className="text-xs font-mono">{m.target_date}</TableCell>
                  <TableCell className="text-xs font-mono">{m.actual_completion_date ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(m.invoice_amount)}</TableCell>
                  <TableCell className="text-xs">{MILESTONE_STATUS_LABELS[m.status]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <div className="font-semibold text-sm mb-1">Resource Allocation</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Allocation %</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No resources allocated.</TableCell></TableRow>
              ) : resources.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.person_name}</TableCell>
                  <TableCell className="text-xs">{r.role_on_project}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{r.allocation_pct}</TableCell>
                  <TableCell className="text-xs font-mono">{r.allocated_from}</TableCell>
                  <TableCell className="text-xs font-mono">{r.allocated_until ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <div className="font-semibold text-sm mb-1">Invoice Schedule</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount ₹</TableHead>
                <TableHead>Invoiced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">No invoice schedule.</TableCell></TableRow>
              ) : schedule.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-mono">{s.scheduled_date}</TableCell>
                  <TableCell className="text-xs">{s.description}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtINR(s.amount)}</TableCell>
                  <TableCell className="text-xs">{s.is_invoiced ? (s.invoiced_voucher_no ?? 'Yes') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </UniversalPrintFrame>
  );
}
