/**
 * CashFlowProjectionReport.tsx — Month-wise billing schedule pivot
 * Sprint T-Phase-1.1.2-b2 · Tier 1 Card #1 · Sub-sprint 4/5
 * D-194: localStorage only · D-216: live computation · no persistence.
 * [JWT] Reads from /api/projx/invoice-schedules + /api/projx/projects (via hooks)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Wallet, Calendar, RotateCcw, Table as TableIcon, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useProjectInvoiceSchedule } from '@/hooks/useProjectInvoiceSchedule';
import {
  computeScheduleStatus,
  type InvoiceScheduleStatus,
  type ProjectInvoiceSchedule,
  INVOICE_SCHEDULE_STATUS_LABELS,
} from '@/types/projx/project-invoice-schedule';
import type { Project } from '@/types/projx/project';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type MonthKey = string;

interface MonthlyProjectCell {
  projectId: string;
  projectNo: string;
  projectName: string;
  monthKey: MonthKey;
  totalAmount: number;
  invoicedAmount: number;
  pendingAmount: number;
  scheduleIds: string[];
  dominantStatus: InvoiceScheduleStatus;
}

interface MonthColumn {
  monthKey: MonthKey;
  label: string;
  totalAmount: number;
  invoicedAmount: number;
  pendingAmount: number;
}

const STATUS_RANK: Record<InvoiceScheduleStatus, number> = {
  invoiced: 0, future: 1, due: 2, overdue: 3,
};

const STATUS_ICON: Record<InvoiceScheduleStatus, string> = {
  invoiced: '✅', overdue: '🔴', due: '⏳', future: '⬜',
};

const STATUS_TEXT_CLASS: Record<InvoiceScheduleStatus, string> = {
  invoiced: 'text-emerald-600',
  overdue: 'text-red-600',
  due: 'text-amber-600',
  future: 'text-muted-foreground',
};

const STATUS_BADGE_CLASS: Record<InvoiceScheduleStatus, string> = {
  invoiced: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  overdue: 'bg-red-500/10 text-red-700 border-red-500/30',
  due: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  future: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
};

const CHART_COLORS = ['#6366f1', '#f97316', '#10b981', '#f59e0b', '#3b82f6'];

const MONTH_LABEL = (ymKey: string): string => {
  const [y, m] = ymKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

const fmtINRCompact = (n: number): string => {
  if (n === 0) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const todayMonthKey = (): string => new Date().toISOString().slice(0, 7);
const addMonths = (ymKey: string, n: number): string => {
  const [y, m] = ymKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface DrillDown {
  project: Project;
  monthKey: MonthKey;
  schedules: ProjectInvoiceSchedule[];
}

export function CashFlowProjectionReportPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects } = useProjects(entityCode);
  const { schedules, markInvoiced } = useProjectInvoiceSchedule(entityCode);

  const activeProjects = useMemo(() => projects.filter(p => p.is_active), [projects]);

  const defaultFrom = todayMonthKey();
  const defaultTo = addMonths(defaultFrom, 11);

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth, setToMonth] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceScheduleStatus>('all');
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [drill, setDrill] = useState<DrillDown | null>(null);

  const resetFilters = () => {
    setSelectedProjectIds([]);
    setFromMonth(defaultFrom);
    setToMonth(defaultTo);
    setStatusFilter('all');
  };

  // Filter pipeline
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (selectedProjectIds.length > 0 && !selectedProjectIds.includes(s.project_id)) return false;
      const ym = s.scheduled_date.slice(0, 7);
      if (ym < fromMonth || ym > toMonth) return false;
      if (statusFilter !== 'all' && computeScheduleStatus(s) !== statusFilter) return false;
      return true;
    });
  }, [schedules, selectedProjectIds, fromMonth, toMonth, statusFilter]);

  const projectIndex = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  // Pivot: projectId × monthKey → cell
  const pivot = useMemo(() => {
    const byProjectMonth = new Map<string, MonthlyProjectCell>();
    const monthSet = new Set<string>();

    for (const s of filteredSchedules) {
      const monthKey = s.scheduled_date.slice(0, 7);
      monthSet.add(monthKey);
      const proj = projectIndex.get(s.project_id);
      if (!proj) continue;
      const cellKey = `${s.project_id}__${monthKey}`;
      const status = computeScheduleStatus(s);
      const existing = byProjectMonth.get(cellKey);
      if (existing) {
        existing.totalAmount = round2(dAdd(existing.totalAmount, s.amount));
        if (s.is_invoiced) existing.invoicedAmount = round2(dAdd(existing.invoicedAmount, s.amount));
        existing.pendingAmount = round2(existing.totalAmount - existing.invoicedAmount);
        existing.scheduleIds.push(s.id);
        if (STATUS_RANK[status] > STATUS_RANK[existing.dominantStatus]) {
          existing.dominantStatus = status;
        }
      } else {
        byProjectMonth.set(cellKey, {
          projectId: s.project_id,
          projectNo: proj.project_no,
          projectName: proj.project_name,
          monthKey,
          totalAmount: round2(s.amount),
          invoicedAmount: s.is_invoiced ? round2(s.amount) : 0,
          pendingAmount: s.is_invoiced ? 0 : round2(s.amount),
          scheduleIds: [s.id],
          dominantStatus: status,
        });
      }
    }

    const months = Array.from(monthSet).sort();
    const monthColumns: MonthColumn[] = months.map(monthKey => {
      let total = 0, invoiced = 0;
      for (const cell of byProjectMonth.values()) {
        if (cell.monthKey === monthKey) {
          total = dAdd(total, cell.totalAmount);
          invoiced = dAdd(invoiced, cell.invoicedAmount);
        }
      }
      return {
        monthKey,
        label: MONTH_LABEL(monthKey),
        totalAmount: round2(total),
        invoicedAmount: round2(invoiced),
        pendingAmount: round2(total - invoiced),
      };
    });

    // Project rows present in pivot
    const projectIds = Array.from(new Set(filteredSchedules.map(s => s.project_id)))
      .filter(id => projectIndex.has(id));
    const rows = projectIds
      .map(id => projectIndex.get(id))
      .filter((p): p is Project => Boolean(p))
      .sort((a, b) => a.project_no.localeCompare(b.project_no));

    return { byProjectMonth, monthColumns, rows };
  }, [filteredSchedules, projectIndex]);

  // KPIs (Decimal-safe)
  const kpis = useMemo(() => {
    let scheduled = 0, invoiced = 0, overdue = 0;
    for (const s of filteredSchedules) {
      scheduled = dAdd(scheduled, s.amount);
      if (s.is_invoiced) invoiced = dAdd(invoiced, s.amount);
      if (computeScheduleStatus(s) === 'overdue') overdue = dAdd(overdue, s.amount);
    }
    return {
      scheduled: round2(scheduled),
      invoiced: round2(invoiced),
      outstanding: round2(scheduled - invoiced),
      overdue: round2(overdue),
    };
  }, [filteredSchedules]);

  // Per-row totals
  const rowTotal = (projectId: string): number => {
    let t = 0;
    for (const cell of pivot.byProjectMonth.values()) {
      if (cell.projectId === projectId) t = dAdd(t, cell.totalAmount);
    }
    return round2(t);
  };

  const grandTotal = round2(pivot.monthColumns.reduce((a, c) => dAdd(a, c.totalAmount), 0));

  // Chart data
  const chartData = useMemo(() => {
    return pivot.monthColumns.map(month => {
      const row: Record<string, string | number> = { month: month.label };
      pivot.rows.forEach(p => {
        const cell = pivot.byProjectMonth.get(`${p.id}__${month.monthKey}`);
        row[p.project_no] = cell?.totalAmount ?? 0;
      });
      return row;
    });
  }, [pivot]);

  const handleCellClick = (project: Project, monthKey: MonthKey) => {
    const cellSchedules = filteredSchedules
      .filter(s => s.project_id === project.id && s.scheduled_date.slice(0, 7) === monthKey)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    if (cellSchedules.length === 0) return;
    setDrill({ project, monthKey, schedules: cellSchedules });
  };

  const handleMarkInvoiced = (id: string) => {
    markInvoiced(id, { voucher_id: null, voucher_no: null });
    toast.success('Marked as invoiced · update voucher reference in Invoice Scheduling when SI is posted');
    if (drill) {
      // Refresh dialog content from latest schedules
      const refreshed = (JSON.parse(localStorage.getItem(`erp_project_invoice_schedule_${entityCode}`) || '[]') as ProjectInvoiceSchedule[])
        .filter(s => s.project_id === drill.project.id && s.scheduled_date.slice(0, 7) === drill.monthKey);
      setDrill({ ...drill, schedules: refreshed.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)) });
    }
  };

  const totalSchedulesAll = schedules.length;

  // Empty state — no schedules at all in storage
  if (totalSchedulesAll === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-500" /> Cash Flow Projection
          </h1>
          <p className="text-sm text-muted-foreground">Plan your billing milestones · month-wise across all projects</p>
        </div>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-base font-semibold">No billing schedules found</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Add milestones with billing percentages to auto-populate this report.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const noDataAfterFilter = pivot.monthColumns.length === 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-500" /> Cash Flow Projection
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan your billing milestones · month-wise across all projects
          </p>
        </div>
        <div className="flex items-center gap-1.5 border rounded-lg p-0.5">
          <Button
            size="sm"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            onClick={() => setView('table')}
            className="h-7 gap-1.5 text-xs"
          >
            <TableIcon className="h-3.5 w-3.5" /> Table
          </Button>
          <Button
            size="sm"
            variant={view === 'chart' ? 'secondary' : 'ghost'}
            onClick={() => setView('chart')}
            className="h-7 gap-1.5 text-xs"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Chart
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Projects</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start min-w-[180px]">
                  {selectedProjectIds.length === 0
                    ? 'All Projects'
                    : `${selectedProjectIds.length} selected`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">
                {activeProjects.map(p => (
                  <DropdownMenuCheckboxItem
                    key={p.id}
                    checked={selectedProjectIds.includes(p.id)}
                    onCheckedChange={(checked) => {
                      setSelectedProjectIds(prev =>
                        checked ? [...prev, p.id] : prev.filter(id => id !== p.id),
                      );
                    }}
                  >
                    <span className="font-mono text-[10px] mr-2">{p.project_no}</span>
                    <span className="truncate max-w-[200px]">{p.project_name}</span>
                  </DropdownMenuCheckboxItem>
                ))}
                {activeProjects.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No active projects</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</label>
            <input
              type="month"
              value={fromMonth}
              onChange={e => setFromMonth(e.target.value)}
              className="h-8 px-2 text-xs border rounded-md bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
            <input
              type="month"
              value={toMonth}
              onChange={e => setToMonth(e.target.value)}
              className="h-8 px-2 text-xs border rounded-md bg-background"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | InvoiceScheduleStatus)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Object.keys(INVOICE_SCHEDULE_STATUS_LABELS) as InvoiceScheduleStatus[]).map(k => (
                  <SelectItem key={k} value={k}>{INVOICE_SCHEDULE_STATUS_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" variant="ghost" onClick={resetFilters} className="h-8 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scheduled</CardDescription>
            <CardTitle className="text-xl font-mono">{fmtINR(kpis.scheduled)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-xl font-mono text-emerald-600">{fmtINR(kpis.invoiced)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-xl font-mono text-amber-600">{fmtINR(kpis.outstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className={`text-xl font-mono ${kpis.overdue > 0 ? 'text-red-600' : ''}`}>
              {fmtINR(kpis.overdue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table or Chart */}
      {noDataAfterFilter ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No billing schedule entries for the selected filters.
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-muted/30 min-w-[200px]">Project</th>
                  {pivot.monthColumns.map(m => (
                    <th key={m.monthKey} className="text-right p-2 min-w-[110px]">{m.label}</th>
                  ))}
                  <th className="text-right p-2 min-w-[110px] border-l">Total</th>
                </tr>
              </thead>
              <tbody>
                {pivot.rows.map(p => (
                  <tr key={p.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 sticky left-0 bg-background">
                      <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{p.project_no}</code>
                      <div className="mt-0.5 truncate max-w-[200px]">{p.project_name}</div>
                    </td>
                    {pivot.monthColumns.map(m => {
                      const cell = pivot.byProjectMonth.get(`${p.id}__${m.monthKey}`);
                      if (!cell) {
                        return <td key={m.monthKey} className="p-2 text-right text-muted-foreground">—</td>;
                      }
                      const isOverdue = cell.dominantStatus === 'overdue';
                      return (
                        <td
                          key={m.monthKey}
                          onClick={() => handleCellClick(p, m.monthKey)}
                          className={`p-2 text-right font-mono cursor-pointer hover:bg-indigo-500/10 transition-colors ${STATUS_TEXT_CLASS[cell.dominantStatus]} ${isOverdue ? 'bg-red-500/5' : ''}`}
                        >
                          <span>{fmtINRCompact(cell.totalAmount)}</span>
                          <span className="ml-1">{STATUS_ICON[cell.dominantStatus]}</span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-mono font-semibold border-l">
                      {fmtINRCompact(rowTotal(p.id))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td className="p-2 sticky left-0 bg-muted/30">Monthly Total</td>
                  {pivot.monthColumns.map(m => (
                    <td key={m.monthKey} className="p-2 text-right font-mono">{fmtINRCompact(m.totalAmount)}</td>
                  ))}
                  <td className="p-2 text-right font-mono border-l">{fmtINRCompact(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {pivot.rows.map((p, idx) => (
                  <Bar
                    key={p.id}
                    dataKey={p.project_no}
                    stackId="a"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Drill-down dialog */}
      <Dialog open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {drill && (
                <>
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded mr-2">
                    {drill.project.project_no}
                  </code>
                  {drill.project.project_name} · {MONTH_LABEL(drill.monthKey)}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {drill && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-2">Milestone</th>
                    <th className="text-left p-2">Scheduled Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drill.schedules.map(s => {
                    const status = computeScheduleStatus(s);
                    return (
                      <tr key={s.id} className="border-b">
                        <td className="p-2 font-mono text-[10px]">
                          {s.milestone_id ? s.milestone_id.slice(-6) : '—'}
                        </td>
                        <td className="p-2">{fmtDate(s.scheduled_date)}</td>
                        <td className="p-2 truncate max-w-[200px]">{s.description}</td>
                        <td className="p-2 text-right font-mono">{fmtINR(s.amount)}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE_CLASS[status]}`}>
                            {STATUS_ICON[status]} {INVOICE_SCHEDULE_STATUS_LABELS[status]}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          {!s.is_invoiced ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              onClick={() => handleMarkInvoiced(s.id)}
                            >
                              Mark Invoiced
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">view only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
