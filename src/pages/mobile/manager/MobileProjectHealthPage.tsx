/**
 * MobileProjectHealthPage.tsx — Manager project KPI + time approval (D-222)
 * Sprint T-Phase-1.1.2-c
 * [JWT] /api/projx/projects · /api/projx/time-entries
 */
import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  ArrowLeft, ArrowRight, Zap, CheckCircle2, XCircle, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { computeProjectPnLStub } from '@/lib/projx-engine';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/types/projx/project';
import type { Project } from '@/types/projx/project';
import { cn } from '@/lib/utils';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type Tab = 'projects' | 'approvals';
type StatusFilter = 'active' | 'on_hold' | 'all';

function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function MobileProjectHealthPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const entityCode = session?.entity_code ?? '';

  const { projects } = useProjects(entityCode);
  const { milestones } = useProjectMilestones(entityCode);
  const { entries, approveTimeEntry, rejectTimeEntry } = useTimeEntries(entityCode);

  const [tab, setTab] = useState<Tab>('projects');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const visibleProjects = useMemo(() => {
    let list = projects.filter(p => p.is_active);
    if (statusFilter === 'active') list = list.filter(p => p.status === 'active' || p.status === 'planning');
    else if (statusFilter === 'on_hold') list = list.filter(p => p.status === 'on_hold');
    return [...list].sort((a, b) => {
      const ar = a.schedule_risk_index ?? -1;
      const br = b.schedule_risk_index ?? -1;
      if (ar !== br) return br - ar;
      return a.target_end_date.localeCompare(b.target_end_date);
    });
  }, [projects, statusFilter]);

  const submittedEntries = useMemo(
    () => entries
      .filter(e => e.status === 'submitted')
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date)),
    [entries],
  );

  const handleApprove = useCallback((id: string) => {
    if (!session) return;
    const result = approveTimeEntry(id, {
      id: session.user_id ?? '',
      name: session.display_name,
    });
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success('Approved');
  }, [session, approveTimeEntry]);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleConfirmReject = useCallback(() => {
    if (!session || !rejectingId) return;
    const result = rejectTimeEntry(
      rejectingId,
      { id: session.user_id ?? '', name: session.display_name },
      rejectionReason.trim(),
    );
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success('Rejected · Person will be notified');
    setRejectingId(null);
    setRejectionReason('');
  }, [session, rejectingId, rejectionReason, rejectTimeEntry]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Project Health</h1>
      </div>

      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
        <button
          onClick={() => setTab('projects')}
          className={cn(
            'flex-1 text-xs py-1.5 rounded-md',
            tab === 'projects' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground',
          )}
        >
          Projects ({visibleProjects.length})
        </button>
        <button
          onClick={() => setTab('approvals')}
          className={cn(
            'flex-1 text-xs py-1.5 rounded-md flex items-center justify-center gap-1.5',
            tab === 'approvals' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground',
          )}
        >
          Pending Approvals
          {submittedEntries.length > 0 && (
            <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 h-4 min-w-[16px]">
              {submittedEntries.length}
            </Badge>
          )}
        </button>
      </div>

      {tab === 'projects' ? (
        <ProjectsTab
          projects={visibleProjects}
          milestones={milestones}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onOpen={() => navigate('/erp/projx')}
        />
      ) : (
        <ApprovalsTab
          submittedEntries={submittedEntries}
          projects={projects}
          milestones={milestones}
          onApprove={handleApprove}
          onReject={(id) => { setRejectingId(id); setRejectionReason(''); }}
        />
      )}

      <Sheet open={!!rejectingId} onOpenChange={open => { if (!open) setRejectingId(null); }}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Reject Time Entry</SheetTitle>
            <SheetDescription>Provide a reason — required.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <Textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Hours don't match approved timesheet"
            />
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim()}
              onClick={handleConfirmReject}
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Confirm Reject
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface ProjectsTabProps {
  projects: Project[];
  milestones: ReturnType<typeof useProjectMilestones>['milestones'];
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  onOpen: () => void;
}

function ProjectsTab({ projects, milestones, statusFilter, setStatusFilter, onOpen }: ProjectsTabProps) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-xs">
        {(['active', 'on_hold', 'all'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-2 py-1 rounded border',
              statusFilter === s ? 'bg-purple-500/10 border-purple-500/30 text-purple-700' : 'border-border text-muted-foreground',
            )}
          >
            {s === 'on_hold' ? 'On Hold' : s === 'all' ? 'All' : 'Active'}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <Card className="p-6 text-center space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects in this filter</p>
          <Button size="sm" variant="outline" onClick={onOpen}>
            Go to ProjX
          </Button>
        </Card>
      ) : (
        projects.map(p => {
          const pnl = computeProjectPnLStub(p);
          const projectMilestones = milestones.filter(m => m.project_id === p.id);
          const completed = projectMilestones.filter(m => m.status === 'completed').length;
          const total = projectMilestones.length || p.milestone_count;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          const daysLeft = daysBetween(today, p.target_end_date);
          const risk = p.schedule_risk_index ?? 0;
          const isHighRisk = risk > 60;
          return (
            <Card key={p.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 bg-purple-500/10 text-purple-700">
                      {p.project_no}
                    </Badge>
                    {isHighRisk && (
                      <Badge variant="outline" className="text-[9px] gap-0.5 border-red-500/30 bg-red-500/10 text-red-700">
                        <Zap className="h-2.5 w-2.5" /> Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate mt-0.5">{p.project_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.customer_name ?? 'Internal'} · {p.start_date} → {p.target_end_date}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-[9px] shrink-0', PROJECT_STATUS_COLORS[p.status])}>
                  {PROJECT_STATUS_LABELS[p.status]}
                </Badge>
              </div>

              {total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-mono">{completed}/{total} milestones</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-muted/40 rounded p-1.5 text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Margin</p>
                  <p className="text-xs font-mono font-semibold">{pnl.margin_pct.toFixed(0)}%</p>
                </div>
                <div className="bg-muted/40 rounded p-1.5 text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Days Left</p>
                  <p className={cn('text-xs font-mono font-semibold', daysLeft < 0 && 'text-red-600')}>
                    {daysLeft}
                  </p>
                </div>
                <div className="bg-muted/40 rounded p-1.5 text-center">
                  <p className="text-[9px] uppercase text-muted-foreground">Billed</p>
                  <p className="text-xs font-mono font-semibold">{fmtINR(p.billed_to_date)}</p>
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full h-7 text-[11px]" onClick={onOpen}>
                View in ProjX <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Card>
          );
        })
      )}
    </div>
  );
}

interface ApprovalsTabProps {
  submittedEntries: ReturnType<typeof useTimeEntries>['entries'];
  projects: Project[];
  milestones: ReturnType<typeof useProjectMilestones>['milestones'];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ApprovalsTab({ submittedEntries, projects, milestones, onApprove, onReject }: ApprovalsTabProps) {
  if (submittedEntries.length === 0) {
    return (
      <Card className="p-6 text-center space-y-2">
        <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
        <p className="text-sm font-medium">All caught up</p>
        <p className="text-xs text-muted-foreground">No pending time entries.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {submittedEntries.map(e => {
        const project = projects.find(p => p.id === e.project_id);
        const milestone = e.milestone_id ? milestones.find(m => m.id === e.milestone_id) : null;
        return (
          <Card key={e.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{e.person_name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {e.entry_date} · {e.hours}h
                </p>
              </div>
              {e.is_billable && (
                <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                  {fmtINR(e.hourly_rate)}/h
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 bg-purple-500/10 text-purple-700">
                {project?.project_no ?? e.project_no}
              </Badge>
              {milestone && (
                <span className="text-[10px] text-muted-foreground">→ {milestone.milestone_name}</span>
              )}
            </div>

            <p className="text-xs">{e.task_description}</p>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(e.id)}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 border-red-500/40 text-red-700 hover:bg-red-500/10"
                onClick={() => onReject(e.id)}>
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
