/**
 * MilestoneRegister.tsx — All milestones across projects · UTS-compliant.
 * Sprint T-Phase-1.2.6d.
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { DrillSourceBanner } from '@/components/registers/DrillSourceBanner';
import { useDrillDown } from '@/hooks/useDrillDown';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  projectMilestonesKey, MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS,
  type ProjectMilestone, type MilestoneStatus,
} from '@/types/projx/project-milestone';
import { projectsKey, type Project } from '@/types/projx/project';
import { dSum } from '@/lib/decimal-helpers';
import { MilestoneDetailPanel } from './detail/MilestoneDetailPanel';
import { MilestonePrint } from './print/MilestonePrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface MilestoneRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: MilestoneStatus; billed?: boolean };
}

export function MilestoneRegisterPanel({ initialFilter }: MilestoneRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printM, setPrintM] = useState<ProjectMilestone | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  const [billedOnly, setBilledOnly] = useState<'all' | 'billed' | 'unbilled'>(
    initialFilter?.billed === true ? 'billed' : initialFilter?.billed === false ? 'unbilled' : 'all',
  );
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allMs = useMemo<ProjectMilestone[]>(() => {
    try {
      // [JWT] GET /api/projx/milestones/:entityCode
      return JSON.parse(localStorage.getItem(projectMilestonesKey(safeEntity)) || '[]') as ProjectMilestone[];
    } catch { return []; }
  }, [safeEntity]);

  const projectMap = useMemo<Record<string, Project>>(() => {
    try {
      const ps = JSON.parse(localStorage.getItem(projectsKey(safeEntity)) || '[]') as Project[];
      return Object.fromEntries(ps.map(p => [p.id, p]));
    } catch { return {}; }
  }, [safeEntity]);

  const milestones = useMemo<ProjectMilestone[]>(() => {
    let list = allMs;
    if (filter?.status) list = list.filter(m => m.status === filter.status);
    if (billedOnly === 'billed') list = list.filter(m => m.is_billed);
    if (billedOnly === 'unbilled') list = list.filter(m => !m.is_billed);
    return list;
  }, [allMs, filter, billedOnly]);

  const meta: RegisterMeta<ProjectMilestone> = {
    registerCode: 'milestone_register',
    title: 'Milestone Register',
    description: 'All project milestones · status · billed/unbilled · drill into details',
    dateAccessor: r => r.effective_date ?? r.target_date,
  };

  const columns: RegisterColumn<ProjectMilestone>[] = [
    { key: 'no', label: 'Milestone', clickable: true, render: r => r.milestone_no, exportKey: 'milestone_no' },
    { key: 'name', label: 'Name', render: r => r.milestone_name, exportKey: 'milestone_name' },
    { key: 'project', label: 'Project', render: r => projectMap[r.project_id]?.project_no ?? '—', exportKey: r => projectMap[r.project_id]?.project_no ?? '' },
    { key: 'target', label: 'Target Date', render: r => r.target_date, exportKey: 'target_date' },
    { key: 'actual', label: 'Completed', render: r => r.actual_completion_date ?? '—', exportKey: r => r.actual_completion_date ?? '' },
    { key: 'pct', label: 'Inv %', align: 'right', render: r => r.invoice_pct, exportKey: 'invoice_pct' },
    { key: 'amt', label: 'Invoice ₹', align: 'right', render: r => fmtINR(r.invoice_amount), exportKey: 'invoice_amount' },
    { key: 'billed', label: 'Billed', render: r => r.is_billed
        ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Yes</Badge>
        : <Badge variant="outline" className="text-[10px]">No</Badge>,
      exportKey: r => r.is_billed ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] capitalize ${MILESTONE_STATUS_COLORS[r.status]}`}>
        {MILESTONE_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(MILESTONE_STATUS_LABELS) as MilestoneStatus[])
    .map(s => ({ value: s, label: MILESTONE_STATUS_LABELS[s] }));

  const summaryBuilder = (f: ProjectMilestone[]): SummaryCard[] => {
    const completed = f.filter(m => m.status === 'completed');
    const billed = f.filter(m => m.is_billed);
    return [
      { label: 'Total Milestones', value: String(f.length) },
      { label: 'Completed', value: String(completed.length), tone: 'positive' },
      { label: 'Billed', value: String(billed.length), tone: 'positive' },
      { label: 'Total Value', value: fmtINR(dSum(f, m => m.invoice_amount)) },
      { label: 'Unbilled Value', value: fmtINR(dSum(f.filter(m => !m.is_billed), m => m.invoice_amount)), tone: 'warning' },
    ];
  };

  const customFilters = (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">Billing</label>
      <select
        value={billedOnly}
        onChange={e => setBilledOnly(e.target.value as 'all' | 'billed' | 'unbilled')}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        <option value="all">All</option>
        <option value="billed">Billed</option>
        <option value="unbilled">Unbilled</option>
      </select>
    </div>
  );

  const currentM = drill.current?.payload as ProjectMilestone | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Milestone Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentM ? (
        <UniversalRegisterGrid<ProjectMilestone>
          entityCode={safeEntity}
          meta={meta}
          rows={milestones}
          columns={columns}
          summaryBuilder={summaryBuilder}
          customFilters={customFilters}
          onNavigateToRecord={(m) => drill.push({
            id: `milestone:${m.id}`, label: m.milestone_no, level: 1,
            module: 'milestone_register', payload: m,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <MilestoneDetailPanel milestone={currentM} project={projectMap[currentM.project_id] ?? null} onPrint={() => setPrintM(currentM)} />
      )}
      <Dialog open={!!printM} onOpenChange={o => { if (!o) setPrintM(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printM && (
            <MilestonePrint
              milestone={printM}
              project={projectMap[printM.project_id] ?? null}
              onClose={() => setPrintM(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MilestoneRegisterPanel;
