/**
 * @file        ShiftwiseProductionReport.tsx
 * @purpose     Shift-wise production aggregation · DWR-grouped · TDL ShiftWIPReport parity
 * @who         Production planners · Shop floor supervisors · Shift managers
 * @when        Phase 1.A.2.b · Production Reports sprint
 * @sprint      T-Phase-1.A.2.b-Production-Reports
 * @iso         Maintainability · Usability · Reliability
 * @decisions   D-NEW-P (Shift-wise Report · TDL parity · DWR-aggregated)
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
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { useFactories } from '@/hooks/useFactories';
import { dAdd, round2 } from '@/lib/decimal-helpers';

interface ShiftAggregation {
  shift_id: string;
  shift_name: string;
  dwr_count: number;
  produced: number;
  rejected: number;
  wastage: number;
  yield_sum: number;
  efficiency_sum: number;
  cost: number;
}

interface ShiftAggregationView extends ShiftAggregation {
  avg_yield: number;
  avg_efficiency: number;
}

export function ShiftwiseProductionReportPanel(): JSX.Element {
  const { factories } = useFactories();
  const [factoryId, setFactoryId] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { entries } = useDailyWorkRegister({
    factoryId: factoryId === '__all__' ? undefined : factoryId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const aggregations = useMemo<ShiftAggregationView[]>(() => {
    const byShift = new Map<string, ShiftAggregation>();
    for (const entry of entries) {
      const key = entry.shift_id;
      const existing = byShift.get(key) ?? {
        shift_id: key, shift_name: entry.shift_name,
        dwr_count: 0, produced: 0, rejected: 0, wastage: 0,
        yield_sum: 0, efficiency_sum: 0, cost: 0,
      };
      existing.dwr_count += 1;
      existing.produced = round2(dAdd(existing.produced, entry.total_produced_qty));
      existing.rejected = round2(dAdd(existing.rejected, entry.total_rejected_qty));
      existing.wastage = round2(dAdd(existing.wastage, entry.total_wastage_qty));
      existing.yield_sum += entry.yield_pct;
      existing.efficiency_sum += entry.efficiency_pct;
      existing.cost = round2(dAdd(existing.cost, entry.total_cost));
      byShift.set(key, existing);
    }
    return Array.from(byShift.values()).map(a => ({
      ...a,
      avg_yield: a.dwr_count > 0 ? round2(a.yield_sum / a.dwr_count) : 0,
      avg_efficiency: a.dwr_count > 0 ? round2(a.efficiency_sum / a.dwr_count) : 0,
    })).sort((a, b) => b.produced - a.produced);
  }, [entries]);

  const summary = useMemo(() => {
    const totShifts = aggregations.length;
    const totProduced = aggregations.reduce((s, a) => round2(dAdd(s, a.produced)), 0);
    const totRejected = aggregations.reduce((s, a) => round2(dAdd(s, a.rejected)), 0);
    const avgYield = aggregations.length > 0
      ? round2(aggregations.reduce((s, a) => s + a.avg_yield, 0) / aggregations.length)
      : 0;
    return { totShifts, totProduced, totRejected, avgYield };
  }, [aggregations]);

  const chartData = aggregations.map(a => ({
    name: a.shift_name,
    Produced: a.produced,
    Rejected: a.rejected,
    Wastage: a.wastage,
  }));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" /> Shift-wise Production Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Production aggregation by shift across date range · DWR-sourced
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
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active Shifts</div><div className="text-2xl font-mono font-bold">{summary.totShifts}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Produced</div><div className="text-2xl font-mono font-bold">{summary.totProduced.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Rejected</div><div className="text-2xl font-mono font-bold text-warning">{summary.totRejected.toLocaleString('en-IN')}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Avg Yield %</div><div className="text-2xl font-mono font-bold text-success">{summary.avgYield}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Production by Shift</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Produced" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Rejected" stackId="a" fill="hsl(var(--destructive))" />
              <Bar dataKey="Wastage" stackId="a" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Shift Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead className="text-right">DWR Records</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Wastage</TableHead>
                <TableHead className="text-right">Yield %</TableHead>
                <TableHead className="text-right">Efficiency %</TableHead>
                <TableHead className="text-right">Cost (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregations.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-4 w-4 inline mr-2" /> No DWR data for selected filters
                </TableCell></TableRow>
              ) : aggregations.map(a => (
                <TableRow key={a.shift_id}>
                  <TableCell className="font-medium">{a.shift_name}</TableCell>
                  <TableCell className="text-right font-mono">{a.dwr_count}</TableCell>
                  <TableCell className="text-right font-mono">{a.produced.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono text-warning">{a.rejected.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{a.wastage.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono">
                    <Badge variant={a.avg_yield >= 95 ? 'default' : a.avg_yield >= 85 ? 'secondary' : 'destructive'}>
                      {a.avg_yield}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{a.avg_efficiency}%</TableCell>
                  <TableCell className="text-right font-mono">₹{a.cost.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ShiftwiseProductionReportPanel;
