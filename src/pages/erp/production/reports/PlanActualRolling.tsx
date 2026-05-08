/**
 * @file     PlanActualRolling.tsx
 * @sprint   T-Phase-1.A.2.b-Production-Reports (was T-Phase-1.3-3a-pre-3 · Block F · D-561)
 * @purpose  Plan vs Actual rolling 30-day dashboard · adds groupBy=plan + cumulative trend chart.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import type { ProductionPlan } from '@/types/production-plan';
import { round2 } from '@/lib/decimal-helpers';

type Window = '7d' | '30d' | '90d';
type GroupBy = 'plan_type' | 'department' | 'item' | 'plan';

interface TrendPoint {
  date: string;
  planned_to_date: number;
  produced_to_date: number;
  achievement_pct: number;
  target_pct: number;
}

function withinWindow(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  const cutoff = Date.now() - days * 86400000;
  return t >= cutoff;
}

export function PlanActualRollingPanel(): JSX.Element {
  const { plans } = useProductionPlans();
  const { orders } = useProductionOrders();

  const [window, setWindow] = useState<Window>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('plan_type');

  const days = window === '7d' ? 7 : window === '30d' ? 30 : 90;

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; planned: number; ordered: number; produced: number }>();
    const recentPlans = plans.filter((p: ProductionPlan) => withinWindow(p.created_at, days));
    const recentPOs = orders.filter(o => withinWindow(o.created_at, days));

    if (groupBy === 'plan') {
      for (const p of recentPlans) {
        const key = p.id;
        const planned = p.lines.reduce((s, l) => s + l.planned_qty, 0);
        const existing = map.get(key) ?? { label: p.doc_no || `Plan-${p.id.slice(-6)}`, planned: 0, ordered: 0, produced: 0 };
        existing.planned += planned;
        map.set(key, existing);
      }
      for (const po of recentPOs) {
        if (!po.production_plan_id) continue;
        const key = po.production_plan_id;
        const ordered = po.planned_qty;
        const produced = po.outputs.reduce((s, o) => s + (o.actual_qty ?? 0), 0);
        const existing = map.get(key);
        if (existing) {
          existing.ordered += ordered;
          existing.produced += produced;
        }
      }
      return Array.from(map.values());
    }

    for (const p of recentPlans) {
      let key: string;
      if (groupBy === 'plan_type') key = p.plan_type;
      else if (groupBy === 'department') key = p.department_id || 'unassigned';
      else key = p.lines[0]?.item_code || 'mixed';
      const planned = p.lines.reduce((s, l) => s + l.planned_qty, 0);
      const existing = map.get(key) ?? { label: key, planned: 0, ordered: 0, produced: 0 };
      existing.planned += planned;
      map.set(key, existing);
    }
    for (const po of recentPOs) {
      let key: string;
      if (groupBy === 'plan_type') key = 'standalone';
      else if (groupBy === 'department') key = po.department_id || 'unassigned';
      else key = po.output_item_code || 'mixed';
      const ordered = po.planned_qty;
      const produced = po.outputs.reduce((s, o) => s + (o.actual_qty ?? 0), 0);
      const existing = map.get(key) ?? { label: key, planned: 0, ordered: 0, produced: 0 };
      existing.ordered += ordered;
      existing.produced += produced;
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [plans, orders, days, groupBy]);

  const trendData = useMemo<TrendPoint[]>(() => {
    const points: TrendPoint[] = [];
    let plannedSum = 0;
    let producedSum = 0;
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const plannedToday = orders
        .filter(o => o.created_at.slice(0, 10) === date)
        .reduce((s, o) => s + o.planned_qty, 0);
      const producedToday = orders
        .filter(o => o.created_at.slice(0, 10) <= date)
        .flatMap(o => o.outputs)
        .reduce((s, out) => {
          // Note: ProductionOrderOutput has no confirmed_at; approximate produced delta on day = actual_qty when available
          return s + 0;
        }, 0);
      // Best-effort cumulative produced — sum of all actual_qty across orders created up to this date
      const cumProduced = orders
        .filter(o => o.created_at.slice(0, 10) <= date)
        .flatMap(o => o.outputs)
        .reduce((s, out) => s + (out.actual_qty ?? 0), 0);
      plannedSum += plannedToday;
      producedSum = cumProduced;
      void producedToday;
      const achievement_pct = plannedSum > 0 ? round2((producedSum / plannedSum) * 100) : 0;
      points.push({ date, planned_to_date: plannedSum, produced_to_date: producedSum, achievement_pct, target_pct: 100 });
    }
    return points;
  }, [orders, days]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Plan vs Actual · Rolling
        </h1>
      </div>

      <div className="flex gap-2">
        <Select value={window} onValueChange={(v) => setWindow(v as Window)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="plan_type">Group by Plan Type</SelectItem>
            <SelectItem value="department">Group by Department</SelectItem>
            <SelectItem value="item">Group by Item</SelectItem>
            <SelectItem value="plan">By Plan ID</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Comparison</CardTitle></CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No data in window.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="ordered" fill="hsl(var(--primary))" />
                <Bar dataKey="produced" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Achievement Trend · Last {days} Days</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              />
              <YAxis domain={[0, 110]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="achievement_pct" stroke="hsl(var(--primary))" strokeWidth={2} name="Cumulative Achievement %" dot={false} />
              <Line type="monotone" dataKey="target_pct" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Target (100%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Produced</TableHead>
                <TableHead>Fulfilment %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.label}>
                  <TableCell className="font-mono text-xs">{g.label}</TableCell>
                  <TableCell className="font-mono">{g.planned}</TableCell>
                  <TableCell className="font-mono">{g.ordered}</TableCell>
                  <TableCell className="font-mono">{g.produced}</TableCell>
                  <TableCell className="font-mono">
                    {g.planned > 0 ? ((g.produced / g.planned) * 100).toFixed(1) : '—'}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlanActualRollingPanel;
