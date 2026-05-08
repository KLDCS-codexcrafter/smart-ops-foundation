/**
 * WastageDashboard.tsx — 3-PlantOps-pre-3b · D-609 · Q36=ALL polymorphic
 * Pareto chart + KPI cards + per-category table · 3 view modes via ViewModeSelector.
 */
import { useState, useMemo } from 'react';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Recycle, Layers, Sparkles, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, ReferenceLine,
} from 'recharts';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useFactoryContext } from '@/hooks/useFactoryContext';
import { useMachines } from '@/hooks/useMachines';
import { useJobCards } from '@/hooks/useJobCards';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildWastageSourceRows, aggregateWastage } from '@/lib/wastage-analysis-engine';
import type { WastageViewMode } from '@/types/wastage-snapshot';
import { getTemplateById } from '@/config/manufacturing-templates';

export function WastageDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { selectedFactoryId, factoryConfig } = useFactoryContext();
  const { machines } = useMachines();
  const { allJobCards } = useJobCards();
  const { allEntries: dwrEntries } = useDailyWorkRegister();

  const [viewMode, setViewMode] = useState<WastageViewMode>('6_reason');
  const [factoryId, setFactoryId] = useState<string>(selectedFactoryId ?? '');
  const [dateFrom, setDateFrom] = useState<string>(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const template = factoryConfig?.primary_template_id ? getTemplateById(factoryConfig.primary_template_id) : undefined;

  const sourceRows = useMemo(() => buildWastageSourceRows({
    entity_id: entityCode,
    factory_id: factoryId || null,
    job_cards: allJobCards.filter(jc => {
      const d = (jc.actual_start ?? jc.scheduled_start).slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    }),
    dwr_entries: dwrEntries,
    machines,
  }), [entityCode, factoryId, allJobCards, dwrEntries, machines, dateFrom, dateTo]);

  const aggregated = useMemo(
    () => aggregateWastage(sourceRows, viewMode, template),
    [sourceRows, viewMode, template],
  );

  const paretoData = aggregated.map(row => ({
    name: row.group_label,
    qty: row.total_qty,
    cumulative_pct: row.cumulative_pct,
  }));

  const totalQty = round2(dSum(aggregated, r => r.total_qty));
  const totalValue = round2(dSum(aggregated, r => r.total_value));
  const jcCount = new Set(sourceRows.map(r => r.source_jc_id)).size;
  const topCategory = aggregated[0]?.group_label ?? 'No data';

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Recycle className="h-4 w-4" /> Wastage Dashboard
            </CardTitle>
            <ViewModeSelector
              value={viewMode}
              onChange={setViewMode}
              storageKey="wastage_view_mode"
              label="Taxonomy:"
              options={[
                { id: '6_reason', label: '6-Reason', tooltip: 'Direct Job Card wastage_reason values', icon: Recycle },
                { id: '12_category', label: '12-Category', tooltip: 'Lean 6 Big Losses + TIM WOODS Wastes (auto-derived)', icon: Layers },
                { id: 'template_driven', label: 'Template', tooltip: 'Per factory ManufacturingTemplate.qc_parameters', icon: Sparkles },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Factory ID (blank = all)</Label>
              <Input value={factoryId} onChange={e => setFactoryId(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="Total Wastage Qty" value={totalQty.toFixed(2)} />
            <KpiCard label="Total Wastage Value" value={`₹${totalValue.toFixed(2)}`} />
            <KpiCard label="JCs with Wastage" value={String(jcCount)} />
            <KpiCard label="Top Category" value={topCategory} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Pareto · {viewMode.replace(/_/g, ' ')}</CardTitle></CardHeader>
        <CardContent>
          {paretoData.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground py-12">
              <AlertTriangle className="h-4 w-4 mr-2" /> No wastage data for selected filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="qty" fill="hsl(var(--destructive))" name="Wastage Qty" />
                <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="hsl(var(--foreground))" name="Cumulative %" />
                <ReferenceLine yAxisId="right" y={80} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="80%" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detail</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead className="text-right">Cumulative %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregated.map(row => (
                <TableRow key={row.group_key}>
                  <TableCell>{row.group_label}</TableCell>
                  <TableCell className="text-right font-mono">{row.total_qty.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">₹{row.total_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{row.occurrence_count}</TableCell>
                  <TableCell className="text-right font-mono">{row.pct_of_total.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono">
                    <Badge variant={row.cumulative_pct <= 80 ? 'default' : 'secondary'}>
                      {row.cumulative_pct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {aggregated.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No rows</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-mono mt-1">{value}</div>
    </div>
  );
}

export default WastageDashboardPanel;
