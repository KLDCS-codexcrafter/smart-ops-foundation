/**
 * @file     CapacityPlanningDashboard.tsx
 * @sprint   T-Phase-1.3-3-PlantOps-pre-3a · Block H · D-599 · Q34=ALL
 * @purpose  Polymorphic Capacity Planning Dashboard · per-day · per-shift · per-week
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calendar, Clock, BarChart3, Activity, Wrench } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell,
} from 'recharts';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useFactories } from '@/hooks/useFactories';
import { useMachines } from '@/hooks/useMachines';
import { useShifts } from '@/hooks/usePayHubMasters3';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useJobCards } from '@/hooks/useJobCards';
import { useEmployees } from '@/hooks/useEmployees';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { buildCapacitySnapshots, aggregateCapacity } from '@/lib/capacity-planning-engine';
import type { CapacityViewMode, CapacityRowStatus } from '@/types/capacity-snapshot';

const STATUS_COLOR: Record<CapacityRowStatus, string> = {
  available: 'bg-success/10 text-success border-success/30',
  tight: 'bg-warning/10 text-warning border-warning/30',
  overbooked: 'bg-destructive/10 text-destructive border-destructive/30',
};

const STATUS_FILL: Record<CapacityRowStatus, string> = {
  available: 'hsl(var(--success))',
  tight: 'hsl(var(--warning))',
  overbooked: 'hsl(var(--destructive))',
};

export function CapacityPlanningDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { factories } = useFactories();
  const { machines } = useMachines();
  const { shifts } = useShifts();
  const { plans } = useProductionPlans();
  const { orders } = useProductionOrders();
  const { allJobCards } = useJobCards();
  const { employees } = useEmployees();
  const config = useProductionConfig();

  const operators = useMemo(
    () => employees.filter(e => e.is_production_operator),
    [employees],
  );

  const [viewMode, setViewMode] = useState<CapacityViewMode>('per_day');
  const [factoryId, setFactoryId] = useState<string>(factories[0]?.id ?? '');
  const [dateFrom, setDateFrom] = useState<string>(
    () => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState<string>(
    () => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );

  const atomics = useMemo(() => {
    if (!factoryId) return [];
    return buildCapacitySnapshots({
      entity_id: entityCode,
      factory_id: factoryId,
      date_from: dateFrom,
      date_to: dateTo,
      shifts,
      machines,
      plans,
      pos: orders,
      job_cards: allJobCards,
      operators,
    });
  }, [entityCode, factoryId, dateFrom, dateTo, shifts, machines, plans, orders, allJobCards, operators]);

  const rows = useMemo(() => {
    return aggregateCapacity(
      atomics,
      viewMode,
      config.capacityThresholdMode ?? 'config_pct',
      {
        passPct: config.capacityCheckPassThreshold ?? 90,
        warnPct: config.capacityCheckWarnThreshold ?? 75,
      },
    );
  }, [atomics, viewMode, config]);

  const enrichedRows = useMemo(
    () => rows.map(r => ({
      ...r,
      machine_name: machines.find(m => m.id === r.machine_id)?.name ?? r.machine_id,
      shift_name: shifts.find(s => s.id === r.shift_id)?.name ?? r.shift_id,
    })),
    [rows, machines, shifts],
  );

  const top10 = useMemo(
    () => [...enrichedRows].sort((a, b) => b.utilization_pct - a.utilization_pct).slice(0, 10),
    [enrichedRows],
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Capacity Planning · Polymorphic
        </h1>
        <ViewModeSelector
          value={viewMode}
          onChange={setViewMode}
          storageKey="capacity_view_mode"
          label="Granularity:"
          options={[
            { id: 'per_day', label: 'Per Day', tooltip: 'Daily aggregation per machine', icon: Calendar },
            { id: 'per_shift', label: 'Per Shift', tooltip: '3 rows per machine per day · 24/7 plants', icon: Clock },
            { id: 'per_week', label: 'Per Week', tooltip: 'Weekly rollup · simpler view', icon: BarChart3 },
          ]}
        />
      </div>

      {/* D-NEW-N · MaintainPro integration prep */}
      <Card className="border-dashed border-muted-foreground/30 mb-4">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 text-xs">
            <div className="font-medium text-muted-foreground">MaintainPro Integration · Pending</div>
            <div className="text-muted-foreground/70 mt-1 leading-relaxed">
              Machine breakdown impact on capacity will be visible here when MaintainPro card ships in
              Phase 1.A.14. Pending breakdowns reduce available hours · Preventive Maintenance schedules
              block reservation slots · MTBF/MTTR surfaces as machine-row badges.
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">Phase 1.A.14</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Factory</label>
            <Select value={factoryId} onValueChange={setFactoryId}>
              <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
              <SelectContent>
                {factories.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date From</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full text-sm p-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date To</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full text-sm p-2 border rounded-md bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Available</div>
          <div className="text-2xl font-bold font-mono">{enrichedRows.reduce((s, r) => s + r.available_hours, 0).toFixed(0)} h</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Committed</div>
          <div className="text-2xl font-bold font-mono">{enrichedRows.reduce((s, r) => s + r.committed_hours, 0).toFixed(0)} h</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Overbooked</div>
          <div className="text-2xl font-bold font-mono text-destructive">
            {enrichedRows.filter(r => r.status === 'overbooked').length}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Tight</div>
          <div className="text-2xl font-bold font-mono text-warning">
            {enrichedRows.filter(r => r.status === 'tight').length}
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 10 Most-Utilized · {viewMode.replace('_', ' ')}</CardTitle>
        </CardHeader>
        <CardContent>
          {top10.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No capacity data in window.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={top10}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="machine_name" />
                <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization_pct" name="Utilization %">
                  {top10.map((row, i) => (
                    <Cell key={i} fill={STATUS_FILL[row.status]} />
                  ))}
                </Bar>
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
                <TableHead>Machine</TableHead>
                {viewMode === 'per_week'
                  ? <TableHead>Week</TableHead>
                  : <TableHead>Date</TableHead>}
                {viewMode === 'per_shift' && <TableHead>Shift</TableHead>}
                <TableHead className="text-right">Available (h)</TableHead>
                <TableHead className="text-right">Committed (h)</TableHead>
                <TableHead className="text-right">Utilization %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manpower</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                    Select a factory and date range to view capacity.
                  </TableCell>
                </TableRow>
              ) : enrichedRows.map((r, idx) => (
                <TableRow key={`${r.machine_id}-${r.date ?? r.week_start}-${r.shift_id ?? ''}-${idx}`}>
                  <TableCell className="font-medium">{r.machine_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {viewMode === 'per_week' ? r.week_label : r.date}
                  </TableCell>
                  {viewMode === 'per_shift' && (
                    <TableCell className="font-mono text-xs">{r.shift_name}</TableCell>
                  )}
                  <TableCell className="text-right font-mono">{r.available_hours.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono">{r.committed_hours.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono">{r.utilization_pct.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLOR[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.manpower_status === 'short'
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : 'bg-success/10 text-success border-success/30'}>
                      {r.required_operators}/{r.available_operators}
                    </Badge>
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

export default CapacityPlanningDashboardPanel;
