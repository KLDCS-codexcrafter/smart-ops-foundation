/**
 * @file     OEEDashboard.tsx
 * @sprint   T-Phase-1.3-3-PlantOps-pre-3a · Block I · D-600 · Q35=ALL
 * @purpose  Polymorphic OEE Dashboard · classic A×P×Q · simplified A×Q · template-weighted
 */
import { useState, useMemo } from 'react';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Gauge, TrendingUp, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useFactories } from '@/hooks/useFactories';
import { useMachines } from '@/hooks/useMachines';
import { useJobCards } from '@/hooks/useJobCards';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { buildOEESourceData, computeOEE } from '@/lib/oee-engine';
import { MANUFACTURING_TEMPLATES } from '@/config/manufacturing-templates';
import type { OEEFormulaMode, OEEClassification } from '@/types/oee-snapshot';

const CLASS_COLOR: Record<OEEClassification, string> = {
  world_class: 'bg-success/10 text-success border-success/30',
  good: 'bg-primary/10 text-primary border-primary/30',
  fair: 'bg-warning/10 text-warning border-warning/30',
  poor: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function OEEDashboardPanel(): JSX.Element {
  const { factories } = useFactories();
  const { machines } = useMachines();
  const { allJobCards } = useJobCards();
  const { entries: dwrEntries } = useDailyWorkRegister();

  const [formulaMode, setFormulaMode] = useState<OEEFormulaMode>('classic_apq');
  const [factoryId, setFactoryId] = useState<string>(factories[0]?.id ?? '');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Phase 1: pick first manufacturing template as default · Phase 2 reads Factory.template_id
  const template = MANUFACTURING_TEMPLATES[0];

  const factoryMachines = useMemo(
    () => machines.filter(m => m.factory_id === factoryId),
    [machines, factoryId],
  );

  const oeeRows = useMemo(() => {
    return factoryMachines.map(m => {
      const source = buildOEESourceData({
        entity_id: m.entity_id,
        factory_id: factoryId,
        machine: m,
        date,
        shift_id: null,
        job_cards: allJobCards,
        dwr_entries: dwrEntries,
        template,
      });
      const result = computeOEE(source, formulaMode, template);
      return { machine: m, source, result };
    });
  }, [factoryMachines, factoryId, date, allJobCards, dwrEntries, formulaMode, template]);

  const avgOEE = oeeRows.length > 0
    ? round2(dSum(oeeRows, r => r.result.oee_pct) / oeeRows.length)
    : 0;
  const worldClassCount = oeeRows.filter(r => r.result.classification === 'world_class').length;
  const poorCount = oeeRows.filter(r => r.result.classification === 'poor').length;

  const chartData = oeeRows.slice(0, 10).map(r => ({
    machine: r.machine.name,
    A: r.result.availability_pct ?? 0,
    P: r.result.performance_pct ?? 0,
    Q: r.result.quality_pct ?? 0,
    OEE: r.result.oee_pct,
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          OEE Dashboard · Polymorphic
        </h1>
        <ViewModeSelector
          value={formulaMode}
          onChange={setFormulaMode}
          storageKey="oee_view_mode"
          label="Formula:"
          options={[
            { id: 'classic_apq', label: 'Classic A×P×Q', tooltip: 'SEMI E10 industry standard · Availability × Performance × Quality', icon: Gauge },
            { id: 'simplified_aq', label: 'Simplified A×Q', tooltip: 'Skip Performance · faster compute · A × Q only', icon: TrendingUp },
            { id: 'template_weighted', label: 'Template-Weighted', tooltip: 'Per ManufacturingTemplate primary_kpis with [0.5, 0.3, 0.2] weights', icon: Sparkles },
          ]}
        />
      </div>

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
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-sm p-2 border rounded-md bg-background"
            />
          </div>
          <div className="flex items-end">
            <div className="text-xs text-muted-foreground">
              Formula: <span className="font-medium text-foreground">{oeeRows[0]?.result.formula_label ?? '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Average OEE</div>
          <div className="text-2xl font-bold font-mono">{avgOEE.toFixed(1)}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">World-Class (≥85%)</div>
          <div className="text-2xl font-bold font-mono text-success">{worldClassCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Poor (&lt;40%)</div>
          <div className="text-2xl font-bold font-mono text-destructive">{poorCount}</div>
        </CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {formulaMode === 'classic_apq'
                ? 'A · P · Q Breakdown'
                : formulaMode === 'simplified_aq'
                  ? 'A · Q Breakdown'
                  : 'OEE per Machine'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="machine" />
                <YAxis />
                <Tooltip />
                <Legend />
                {formulaMode === 'classic_apq' && <>
                  <Bar dataKey="A" name="Availability %" fill="hsl(var(--primary))" />
                  <Bar dataKey="P" name="Performance %" fill="hsl(var(--warning))" />
                  <Bar dataKey="Q" name="Quality %" fill="hsl(var(--success))" />
                </>}
                {formulaMode === 'simplified_aq' && <>
                  <Bar dataKey="A" name="Availability %" fill="hsl(var(--primary))" />
                  <Bar dataKey="Q" name="Quality %" fill="hsl(var(--success))" />
                </>}
                <Bar dataKey="OEE" name="OEE %" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                {formulaMode === 'classic_apq' && <>
                  <TableHead className="text-right">A %</TableHead>
                  <TableHead className="text-right">P %</TableHead>
                  <TableHead className="text-right">Q %</TableHead>
                </>}
                {formulaMode === 'simplified_aq' && <>
                  <TableHead className="text-right">A %</TableHead>
                  <TableHead className="text-right">Q %</TableHead>
                </>}
                {formulaMode === 'template_weighted' && (
                  <TableHead>KPI Breakdown</TableHead>
                )}
                <TableHead className="text-right">OEE %</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oeeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Select a factory and date to view OEE.
                  </TableCell>
                </TableRow>
              ) : oeeRows.map(r => (
                <TableRow key={r.machine.id}>
                  <TableCell className="font-medium">{r.machine.name}</TableCell>
                  {formulaMode === 'classic_apq' && <>
                    <TableCell className="text-right font-mono">{(r.result.availability_pct ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{(r.result.performance_pct ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{(r.result.quality_pct ?? 0).toFixed(1)}</TableCell>
                  </>}
                  {formulaMode === 'simplified_aq' && <>
                    <TableCell className="text-right font-mono">{(r.result.availability_pct ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{(r.result.quality_pct ?? 0).toFixed(1)}</TableCell>
                  </>}
                  {formulaMode === 'template_weighted' && (
                    <TableCell className="text-xs font-mono">
                      {r.result.kpi_breakdown
                        ? Object.entries(r.result.kpi_breakdown).map(([k, v]) => `${k}:${v}%`).join(' · ')
                        : '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono font-bold">{r.result.oee_pct.toFixed(1)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CLASS_COLOR[r.result.classification]}>
                      {r.result.classification.replace('_', ' ')}
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

export default OEEDashboardPanel;
