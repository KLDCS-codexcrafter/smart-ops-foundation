/**
 * ConsumptionSummaryReport.tsx — Consumption intelligence dashboard
 * Sprint T-Phase-1.2.2 · The MOAT sprint.
 *
 * Live (D-216): pulls from MIN + Consumption + Stock Balance localStorage,
 * runs the consumption-intelligence-engine, never persists alerts.
 *
 * Three views:
 *   1. Department × Item heat-grid (consumption value)
 *   2. Job-mode variance leaderboard (top variance projects)
 *   3. Active alerts (rate anomaly · ageing · unaccounted)
 *
 * [JWT] GET /api/inventory/consumption-summary
 */
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart3, AlertTriangle, TrendingUp, TrendingDown, Sparkles, Building2,
} from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useMaterialIssueNotes } from '@/hooks/useMaterialIssueNotes';
import { useConsumptionEntries } from '@/hooks/useConsumptionEntries';
import { useGodowns } from '@/hooks/useGodowns';
import { runConsumptionIntelligence } from '@/lib/consumption-intelligence-engine';
import {
  ALERT_SEVERITY_COLORS,
} from '@/types/consumption';
import {
  DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS, type GodownDepartmentCode,
} from '@/types/godown';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import { dAdd, round2 } from '@/lib/decimal-helpers';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function loadJson<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

export function ConsumptionSummaryReportPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { mins } = useMaterialIssueNotes(safeEntity);
  const { entries } = useConsumptionEntries(safeEntity);
  const { godowns } = useGodowns();

  const balances = useMemo<StockBalanceEntry[]>(
    () => loadJson<StockBalanceEntry>(stockBalanceKey(safeEntity)),
    [safeEntity, mins, entries]);

  const alerts = useMemo(
    () => runConsumptionIntelligence({ balances, mins, consumptions: entries }),
    [balances, mins, entries]);

  /** Department × Top Items value grid for the trailing month. */
  const deptGrid = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const valueByDept = new Map<string, number>();
    const valueByDeptItem = new Map<string, Map<string, number>>();
    for (const e of entries) {
      if (e.status !== 'posted') continue;
      if (e.consumption_date.slice(0, 7) !== month) continue;
      const dept = e.department_code ?? 'unassigned';
      valueByDept.set(dept, dAdd(valueByDept.get(dept) ?? 0, e.total_value));
      let bucket = valueByDeptItem.get(dept);
      if (!bucket) { bucket = new Map(); valueByDeptItem.set(dept, bucket); }
      for (const l of e.lines) {
        bucket.set(l.item_name, dAdd(bucket.get(l.item_name) ?? 0, l.value));
      }
    }
    return Array.from(valueByDept.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([dept, total]) => {
        const items = Array.from(valueByDeptItem.get(dept) ?? new Map())
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 3) as [string, number][];
        return { dept, total: round2(total), items };
      });
  }, [entries]);

  /** Job-mode variance leaderboard. */
  const jobLeaderboard = useMemo(() => {
    const buckets = new Map<string, { name: string; jobs: number; variance: number; value: number }>();
    for (const e of entries) {
      if (e.status !== 'posted' || e.mode !== 'job' || !e.project_centre_id) continue;
      const prev = buckets.get(e.project_centre_id) ?? {
        name: e.project_centre_id, jobs: 0, variance: 0, value: 0,
      };
      buckets.set(e.project_centre_id, {
        name: prev.name,
        jobs: prev.jobs + 1,
        variance: dAdd(prev.variance, e.total_variance_value),
        value: dAdd(prev.value, e.total_value),
      });
    }
    return Array.from(buckets.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 8);
  }, [entries]);

  const monthKpis = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const monthCEs = entries.filter(e => e.status === 'posted' && e.consumption_date.slice(0, 7) === month);
    return {
      totalValue: monthCEs.reduce((s, e) => dAdd(s, e.total_value), 0),
      totalVariance: monthCEs.reduce((s, e) => dAdd(s, e.total_variance_value), 0),
      ceCount: monthCEs.length,
      alertCount: alerts.length,
    };
  }, [entries, alerts]);

  const godownNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of godowns) m.set(g.id, g.name);
    return m;
  }, [godowns]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-cyan-500" />
          Consumption Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Department × item heat-grid · job variance leaderboard · live alerts
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Posted (Mo)</CardDescription>
          <CardTitle className="text-2xl font-mono text-cyan-600">{monthKpis.ceCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Consumption Value</CardDescription>
          <CardTitle className="text-xl font-mono">{fmtINR(monthKpis.totalValue)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Variance Value</CardDescription>
          <CardTitle className={`text-xl font-mono ${monthKpis.totalVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmtINR(monthKpis.totalVariance)}
          </CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active Alerts</CardDescription>
          <CardTitle className="text-2xl font-mono text-amber-600">{monthKpis.alertCount}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-500" />
            Department Consumption (this month)
          </CardTitle>
          <CardDescription>Where is material going · top 3 items per department</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              {['Department', 'Total', 'Top items'].map(h =>
                <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {deptGrid.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-xs">
                  No consumption posted this month yet
                </TableCell></TableRow>
              ) : deptGrid.map(d => (
                <TableRow key={d.dept}>
                  <TableCell>
                    {d.dept === 'unassigned' ? (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    ) : (
                      <Badge className={`text-[10px] ${DEPARTMENT_BADGE_COLORS[d.dept as GodownDepartmentCode] ?? ''}`}>
                        {DEPARTMENT_LABELS[d.dept as GodownDepartmentCode] ?? d.dept}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-semibold">{fmtINR(d.total)}</TableCell>
                  <TableCell className="text-xs">
                    {d.items.map(([name, val]) => (
                      <span key={name} className="inline-block mr-3">
                        {name} <span className="text-muted-foreground font-mono">({fmtINR(val)})</span>
                      </span>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Job Variance Leaderboard
          </CardTitle>
          <CardDescription>Projects with the largest |variance| · positive = overrun</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              {['Project', 'Entries', 'Value', 'Variance', 'Direction'].map(h =>
                <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {jobLeaderboard.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                  No job-mode consumption posted yet
                </TableCell></TableRow>
              ) : jobLeaderboard.map(j => (
                <TableRow key={j.id}>
                  <TableCell className="text-xs"><code className="font-mono">{j.id.slice(0, 12)}</code></TableCell>
                  <TableCell className="text-xs font-mono">{j.jobs}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtINR(j.value)}</TableCell>
                  <TableCell className={`text-xs font-mono font-semibold ${j.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {fmtINR(j.variance)}
                  </TableCell>
                  <TableCell>
                    {j.variance > 0
                      ? <span className="inline-flex items-center gap-1 text-rose-600 text-xs">
                          <TrendingUp className="h-3 w-3" /> Overrun
                        </span>
                      : <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <TrendingDown className="h-3 w-3" /> Saving
                        </span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Active Alerts ({alerts.length})
          </CardTitle>
          <CardDescription>Rate anomaly · material ageing · unaccounted consumption (live)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No alerts · all consumption looks accounted-for and on-rate</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30">
              <Badge className={`${ALERT_SEVERITY_COLORS[a.severity]} shrink-0 mt-0.5`}>
                {a.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {a.ref_godown_id && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Godown: {godownNameById.get(a.ref_godown_id) ?? a.ref_godown_id}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-semibold">{fmtINR(a.magnitude)}</p>
                <p className="text-[10px] text-muted-foreground">{a.kind.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
