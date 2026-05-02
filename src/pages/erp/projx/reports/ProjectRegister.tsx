/**
 * ProjectRegister.tsx — Tally-Prime style Project register on UTS foundation.
 * Sprint T-Phase-1.2.6d · Card #2.6 sub-sprint 5 of 7.
 *
 * Q4-a in-panel cascade drill: Project row → ProjectDetailPanel → milestone
 * row → MilestoneDetailPanel within the same panel via useDrillDown trail.
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  projectsKey, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  type Project, type ProjectStatus,
} from '@/types/projx/project';
import {
  projectMilestonesKey, type ProjectMilestone, MILESTONE_STATUS_LABELS,
} from '@/types/projx/project-milestone';
import { dSum } from '@/lib/decimal-helpers';
import { ProjectDetailPanel } from './detail/ProjectDetailPanel';
import { ProjectStatusPrint } from './print/ProjectStatusPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface ProjectRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: ProjectStatus };
}

export function ProjectRegisterPanel({ initialFilter }: ProjectRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printP, setPrintP] = useState<Project | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allProjects = useMemo<Project[]>(() => {
    try {
      // [JWT] GET /api/projx/projects/:entityCode
      return JSON.parse(localStorage.getItem(projectsKey(safeEntity)) || '[]') as Project[];
    } catch { return []; }
  }, [safeEntity]);

  const allMilestones = useMemo<ProjectMilestone[]>(() => {
    try {
      // [JWT] GET /api/projx/milestones/:entityCode
      return JSON.parse(localStorage.getItem(projectMilestonesKey(safeEntity)) || '[]') as ProjectMilestone[];
    } catch { return []; }
  }, [safeEntity]);

  const projects = useMemo<Project[]>(() => {
    if (!filter?.status) return allProjects;
    return allProjects.filter(p => p.status === filter.status);
  }, [allProjects, filter]);

  const meta: RegisterMeta<Project> = {
    registerCode: 'project_register',
    title: 'Project Register',
    description: 'All projects · drill into details for milestones, resources & invoice schedule',
    dateAccessor: r => r.effective_date ?? r.start_date,
  };

  const columns: RegisterColumn<Project>[] = [
    { key: 'no', label: 'Project No', clickable: true, render: r => r.project_no, exportKey: 'project_no' },
    { key: 'name', label: 'Project Name', render: r => r.project_name, exportKey: 'project_name' },
    { key: 'customer', label: 'Customer', render: r => r.customer_name ?? '—', exportKey: r => r.customer_name ?? '' },
    { key: 'pm', label: 'Project Manager', render: r => r.project_manager_name ?? '—', exportKey: r => r.project_manager_name ?? '' },
    { key: 'start', label: 'Start', render: r => r.start_date, exportKey: 'start_date' },
    { key: 'target', label: 'Target End', render: r => r.target_end_date, exportKey: 'target_end_date' },
    { key: 'value', label: 'Contract ₹', align: 'right', render: r => fmtINR(r.current_contract_value), exportKey: 'current_contract_value' },
    { key: 'billed', label: 'Billed ₹', align: 'right', render: r => fmtINR(r.billed_to_date), exportKey: 'billed_to_date' },
    { key: 'milestones', label: 'M Done/Total', align: 'right', render: r => `${r.milestones_completed}/${r.milestone_count}`, exportKey: r => `${r.milestones_completed}/${r.milestone_count}` },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] capitalize ${PROJECT_STATUS_COLORS[r.status]}`}>
        {PROJECT_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[])
    .map(s => ({ value: s, label: PROJECT_STATUS_LABELS[s] }));

  const summaryBuilder = (f: Project[]): SummaryCard[] => [
    { label: 'Total Projects', value: String(f.length) },
    { label: 'Active', value: String(f.filter(p => p.status === 'active').length), tone: 'positive' },
    { label: 'Completed', value: String(f.filter(p => p.status === 'completed').length), tone: 'positive' },
    { label: 'On Hold', value: String(f.filter(p => p.status === 'on_hold').length), tone: 'warning' },
    { label: 'Export Projects', value: String(f.filter(p => p.is_export_project).length) },
  ];

  const expandedRow = (p: Project) => {
    const ms = allMilestones.filter(m => m.project_id === p.id);
    if (ms.length === 0) {
      return <div className="text-xs text-muted-foreground px-2">No milestones for this project.</div>;
    }
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Invoice ₹</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ms.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-xs font-mono">{m.milestone_no}</TableCell>
                <TableCell className="text-xs">{m.milestone_name}</TableCell>
                <TableCell className="text-xs font-mono">{m.target_date}</TableCell>
                <TableCell className="text-right text-xs font-mono">{fmtINR(m.invoice_amount)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{MILESTONE_STATUS_LABELS[m.status]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Sum contract values for a quick footer summary in CSV (use dSum for parity)
  // (kept for reference — surfaced through summaryBuilder when needed)
  void dSum;

  const currentP = drill.trail[0]?.payload as Project | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Project Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentP ? (
        <UniversalRegisterGrid<Project>
          entityCode={safeEntity}
          meta={meta}
          rows={projects}
          columns={columns}
          summaryBuilder={summaryBuilder}
          getExpandedRows={expandedRow}
          onNavigateToRecord={(p) => drill.push({
            id: `project:${p.id}`, label: p.project_no, level: 1,
            module: 'project_register', payload: p,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <ProjectDetailPanel
          project={currentP}
          milestones={allMilestones.filter(m => m.project_id === currentP.id)}
          drill={drill}
          onPrint={() => setPrintP(currentP)}
        />
      )}
      <Dialog open={!!printP} onOpenChange={o => { if (!o) setPrintP(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printP && (
            <ProjectStatusPrint
              project={printP}
              milestones={allMilestones.filter(m => m.project_id === printP.id)}
              onClose={() => setPrintP(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectRegisterPanel;
