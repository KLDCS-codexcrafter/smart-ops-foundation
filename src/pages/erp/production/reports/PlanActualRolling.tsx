/**
 * @file     PlanActualRolling.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block F · D-561
 * @purpose  Plan vs Actual rolling 30-day dashboard.
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
} from 'recharts';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import type { ProductionPlan } from '@/types/production-plan';

type Window = '7d' | '30d' | '90d';
type GroupBy = 'plan_type' | 'department' | 'item';

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
    for (const p of recentPlans) {
      let key: string;
      if (groupBy === 'plan_type') key = p.plan_type;
      else if (groupBy === 'department') key = p.originating_department_id || 'unassigned';
      else key = p.lines[0]?.item_code || 'mixed';
      const planned = p.lines.reduce((s, l) => s + l.planned_qty, 0);
      const existing = map.get(key) ?? { label: key, planned: 0, ordered: 0, produced: 0 };
      existing.planned += planned;
      map.set(key, existing);
    }
    const recentPOs = orders.filter(o => withinWindow(o.created_at, days));
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
