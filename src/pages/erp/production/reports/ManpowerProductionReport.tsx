/**
 * @file        ManpowerProductionReport.tsx
 * @purpose     Manpower-wise production aggregation · DWR-grouped · TDL ExeWIPReport parity
 * @who         Production planners · HR · Shop floor supervisors
 * @when        Phase 1.A.2.b · Production Reports sprint
 * @sprint      T-Phase-1.A.2.b-Production-Reports
 * @iso         Maintainability · Usability
 * @decisions   D-NEW-Q (Manpower-wise Report · TDL ExeWIPReport parity)
 * @reuses      useDailyWorkRegister · useFactories · decimal-helpers
 * @[JWT]       GET /api/plant-ops/daily-work-register?dateFrom&dateTo&factoryId
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { useFactories } from '@/hooks/useFactories';
import { dAdd, round2 } from '@/lib/decimal-helpers';

interface ManpowerAggregation {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  dwr_count: number;
  shifts_worked: Set<string>;
  machines_used: Set<string>;
  produced: number;
  rejected: number;
  wastage: number;
  yield_sum: number;
  efficiency_sum: number;
  cost: number;
}

interface ManpowerView {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  dwr_count: number;
  shifts_count: number;
  machines_count: number;
  produced: number;
  rejected: number;
  wastage: number;
  cost: number;
  avg_yield: number;
  avg_efficiency: number;
  perf_tier: 'top' | 'middle' | 'bottom';
}

export function ManpowerProductionReportPanel(): JSX.Element {
  const { factories } = useFactories();
  const [factoryId, setFactoryId] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { entries } = useDailyWorkRegister({
    factoryId: factoryId === '__all__' ? undefined : factoryId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const aggregations = useMemo<ManpowerView[]>(() => {
    const byEmp = new Map<string, ManpowerAggregation>();
    for (const entry of entries) {
      const key = entry.employee_id;
      const existing = byEmp.get(key) ?? {
        employee_id: key, employee_code: entry.employee_code, employee_name: entry.employee_name,
        dwr_count: 0, shifts_worked: new Set<string>(), machines_used: new Set<string>(),
        produced: 0, rejected: 0, wastage: 0, yield_sum: 0, efficiency_sum: 0, cost: 0,
      };
      existing.dwr_count += 1;
      existing.shifts_worked.add(entry.shift_id);
      existing.machines_used.add(entry.machine_id);
      existing.produced = round2(dAdd(existing.produced, entry.total_produced_qty));
      existing.rejected = round2(dAdd(existing.rejected, entry.total_rejected_qty));
      existing.wastage = round2(dAdd(existing.wastage, entry.total_wastage_qty));
      existing.yield_sum += entry.yield_pct;
      existing.efficiency_sum += entry.efficiency_pct;
      existing.cost = round2(dAdd(existing.cost, entry.total_cost));
      byEmp.set(key, existing);
    }
    const list = Array.from(byEmp.values()).map(a => ({
      employee_id: a.employee_id,
      employee_code: a.employee_code,
      employee_name: a.employee_name,
      dwr_count: a.dwr_count,
      shifts_count: a.shifts_worked.size,
      machines_count: a.machines_used.size,
      produced: a.produced,
      rejected: a.rejected,
      wastage: a.wastage,
      cost: a.cost,
      avg_yield: a.dwr_count > 0 ? round2(a.yield_sum / a.dwr_count) : 0,
      avg_efficiency: a.dwr_count > 0 ? round2(a.efficiency_sum / a.dwr_count) : 0,
    }));
    list.sort((a, b) => b.avg_yield - a.avg_yield || b.produced - a.produced);
    const top10 = Math.max(1, Math.ceil(list.length * 0.1));
    return list.map((a, idx): ManpowerView => ({
      ...a,
      perf_tier: idx < top10 ? 'top' : idx >= list.length - top10 ? 'bottom' : 'middle',
    }));
  }, [entries]);

  const summary = useMemo(() => {
    const totEmp = aggregations.length;
    const totProduced = aggregations.reduce((s, a) => round2(dAdd(s, a.produced)), 0);
    const topPerformer = aggregations[0]?.employee_name ?? '—';
    const avgYield = aggregations.length > 0
      ? round2(aggregations.reduce((s, a) => s + a.avg_yield, 0) / aggregations.length)
      : 0;
    return { totEmp, totProduced, topPerformer, avgYield };
  }, [aggregations]);

  const chartData = aggregations.slice(0, 10).map(a => ({
    name: a.employee_name,
    Produced: a.produced,
    Rejected: a.rejected,
  }));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Manpower Performance Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Production aggregation by operator across date range · DWR-sourced
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Factory</Label>
            <Select value={factoryId} onValueChange={setFactoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All factories</SelectItem>
                {factories.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active Operators</div><div className="text-2xl font-mono font-bold">{summary.totEmp}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Produced</div><div className="text-2xl font-mono font-bold">{summary.totProduced.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Top Performer</div><div className="text-base font-bold truncate">{summary.topPerformer}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Avg Yield %</div><div className="text-2xl font-mono font-bold text-success">{summary.avgYield}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top 10 Operators by Output</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Produced" fill="hsl(var(--primary))" />
              <Bar dataKey="Rejected" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Operator Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">DWR</TableHead>
                <TableHead className="text-right">Shifts</TableHead>
                <TableHead className="text-right">Machines</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Yield %</TableHead>
                <TableHead className="text-right">Efficiency %</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregations.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-4 w-4 inline mr-2" /> No DWR data for selected filters
                </TableCell></TableRow>
              ) : aggregations.map(a => (
                <TableRow key={a.employee_id}>
                  <TableCell className="font-mono text-xs">{a.employee_code}</TableCell>
                  <TableCell className="font-medium">{a.employee_name}</TableCell>
                  <TableCell className="text-right font-mono">{a.dwr_count}</TableCell>
                  <TableCell className="text-right font-mono">{a.shifts_count}</TableCell>
                  <TableCell className="text-right font-mono">{a.machines_count}</TableCell>
                  <TableCell className="text-right font-mono">{a.produced.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono text-warning">{a.rejected.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono">{a.avg_yield}%</TableCell>
                  <TableCell className="text-right font-mono">{a.avg_efficiency}%</TableCell>
                  <TableCell>
                    {a.perf_tier === 'top' ? (
                      <Badge className="bg-success/15 text-success border-success/30">Top</Badge>
                    ) : a.perf_tier === 'bottom' ? (
                      <Badge className="bg-warning/15 text-warning border-warning/30">Watch</Badge>
                    ) : (
                      <Badge variant="outline">Mid</Badge>
                    )}
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

export default ManpowerProductionReportPanel;
