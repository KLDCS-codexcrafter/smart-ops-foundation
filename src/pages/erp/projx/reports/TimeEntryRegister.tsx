/**
 * TimeEntryRegister.tsx — Project-tagged time entries · UTS voucher treatment.
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
  timeEntriesKey, TIME_ENTRY_STATUS_LABELS, TIME_ENTRY_STATUS_COLORS,
  type TimeEntry, type TimeEntryStatus,
} from '@/types/projx/time-entry';
import { projectsKey, type Project } from '@/types/projx/project';
import { dSum } from '@/lib/decimal-helpers';
import { TimeEntryDetailPanel } from './detail/TimeEntryDetailPanel';
import { TimeEntryPrint } from './print/TimeEntryPrint';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface TimeEntryRegisterPanelProps {
  initialFilter?: { sourceLabel?: string; status?: TimeEntryStatus; projectId?: string };
}

export function TimeEntryRegisterPanel({ initialFilter }: TimeEntryRegisterPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const drill = useDrillDown();
  const [printT, setPrintT] = useState<TimeEntry | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const allEntries = useMemo<TimeEntry[]>(() => {
    try {
      // [JWT] GET /api/projx/time-entries/:entityCode
      return JSON.parse(localStorage.getItem(timeEntriesKey(safeEntity)) || '[]') as TimeEntry[];
    } catch { return []; }
  }, [safeEntity]);

  const projectMap = useMemo<Record<string, Project>>(() => {
    try {
      const ps = JSON.parse(localStorage.getItem(projectsKey(safeEntity)) || '[]') as Project[];
      return Object.fromEntries(ps.map(p => [p.id, p]));
    } catch { return {}; }
  }, [safeEntity]);

  const entries = useMemo<TimeEntry[]>(() => {
    let list = allEntries;
    if (filter?.status) list = list.filter(e => e.status === filter.status);
    if (filter?.projectId) list = list.filter(e => e.project_id === filter.projectId);
    return list;
  }, [allEntries, filter]);

  const meta: RegisterMeta<TimeEntry> = {
    registerCode: 'time_entry_register',
    title: 'Time Entry Register',
    description: 'All time entries · billable summary · approval status',
    dateAccessor: r => r.effective_date ?? r.entry_date,
  };

  const columns: RegisterColumn<TimeEntry>[] = [
    { key: 'date', label: 'Date', clickable: true, render: r => r.entry_date, exportKey: 'entry_date' },
    { key: 'eff', label: 'Effective', render: r => r.effective_date ?? r.entry_date, exportKey: r => r.effective_date ?? r.entry_date },
    { key: 'project', label: 'Project', render: r => projectMap[r.project_id]?.project_no ?? r.project_no, exportKey: 'project_no' },
    { key: 'person', label: 'Person', render: r => r.person_name, exportKey: 'person_name' },
    { key: 'task', label: 'Task', render: r => r.task_description.length > 40 ? `${r.task_description.slice(0, 40)}…` : r.task_description, exportKey: 'task_description' },
    { key: 'hours', label: 'Hours', align: 'right', render: r => r.hours, exportKey: 'hours' },
    { key: 'rate', label: 'Rate ₹', align: 'right', render: r => fmtINR(r.hourly_rate), exportKey: 'hourly_rate' },
    { key: 'amt', label: 'Value ₹', align: 'right', render: r => fmtINR(r.hourly_rate * r.hours), exportKey: r => r.hourly_rate * r.hours },
    { key: 'bill', label: 'Billable', render: r => r.is_billable
        ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">Yes</Badge>
        : <Badge variant="outline" className="text-[10px]">No</Badge>,
      exportKey: r => r.is_billable ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className={`text-[10px] capitalize ${TIME_ENTRY_STATUS_COLORS[r.status]}`}>
        {TIME_ENTRY_STATUS_LABELS[r.status]}
      </Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(TIME_ENTRY_STATUS_LABELS) as TimeEntryStatus[])
    .map(s => ({ value: s, label: TIME_ENTRY_STATUS_LABELS[s] }));

  const summaryBuilder = (f: TimeEntry[]): SummaryCard[] => {
    const billable = f.filter(e => e.is_billable);
    return [
      { label: 'Total Entries', value: String(f.length) },
      { label: 'Billable Entries', value: String(billable.length), tone: 'positive' },
      { label: 'Billable Hours', value: dSum(billable, e => e.hours).toFixed(2) },
      { label: 'Total Hours', value: dSum(f, e => e.hours).toFixed(2) },
      { label: 'Billable Value', value: fmtINR(dSum(billable, e => e.hours * e.hourly_rate)), tone: 'positive' },
    ];
  };

  const currentT = drill.current?.payload as TimeEntry | undefined;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DrillSourceBanner sourceLabel={filter?.sourceLabel} onClear={() => setFilter(undefined)} />
      <DrillBreadcrumb rootLabel="Time Entry Register" trail={drill.trail} onGoTo={drill.goTo} onReset={drill.reset} />
      {!currentT ? (
        <UniversalRegisterGrid<TimeEntry>
          entityCode={safeEntity}
          meta={meta}
          rows={entries}
          columns={columns}
          summaryBuilder={summaryBuilder}
          onNavigateToRecord={(t) => drill.push({
            id: `time-entry:${t.id}`, label: `${t.entry_date} · ${t.person_name}`, level: 1,
            module: 'time_entry_register', payload: t,
          })}
          statusOptions={statusOptions}
          statusKey="status"
        />
      ) : (
        <TimeEntryDetailPanel
          entry={currentT}
          project={projectMap[currentT.project_id] ?? null}
          onPrint={() => setPrintT(currentT)}
        />
      )}
      <Dialog open={!!printT} onOpenChange={o => { if (!o) setPrintT(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printT && (
            <TimeEntryPrint
              entry={printT}
              project={projectMap[printT.project_id] ?? null}
              onClose={() => setPrintT(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TimeEntryRegisterPanel;
