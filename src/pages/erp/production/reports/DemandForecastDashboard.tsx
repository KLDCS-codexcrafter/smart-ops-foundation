/**
 * @file        DemandForecastDashboard.tsx
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · Block 7.2
 * @purpose     Lists all generated forecasts · filter by horizon + algorithm · 37th SIBLING report
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listForecasts } from '@/lib/demand-forecast-engine';
import type { DemandForecastRecord, ForecastHorizon, ForecastAlgorithm } from '@/types/forecast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

const HORIZON_OPTIONS: Array<ForecastHorizon | 'all'> = ['all', '1m', '3m', '6m', '12m'];
const ALGO_OPTIONS: Array<ForecastAlgorithm | 'all'> = [
  'all',
  'simple_moving_average',
  'exponential_smoothing',
  'holt_linear_trend',
  'holt_winters_seasonal',
  'linear_regression',
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function totalForecastQty(r: DemandForecastRecord): number {
  return r.data_points.reduce((s, p) => s + p.forecast_qty, 0);
}

export default function DemandForecastDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [searchTerm, setSearchTerm] = useState('');
  const [horizonFilter, setHorizonFilter] = useState<ForecastHorizon | 'all'>('all');
  const [algoFilter, setAlgoFilter] = useState<ForecastAlgorithm | 'all'>('all');

  const records = useMemo(() => {
    if (!entityCode) return [];
    return listForecasts(entityCode);
  }, [entityCode]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (horizonFilter !== 'all' && r.horizon !== horizonFilter) return false;
      if (algoFilter !== 'all' && r.algorithm !== algoFilter) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!r.item_id.toLowerCase().includes(t) && !r.item_name.toLowerCase().includes(t)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  }, [records, searchTerm, horizonFilter, algoFilter]);

  // RPT-6a · toggle recipe (additive)
  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) m.set(r.horizon, (m.get(r.horizon) ?? 0) + 1);
    return Array.from(m.entries()).map(([horizon, count]) => ({ horizon, count }));
  }, [filtered]);
  const chartConfig = getKpi('prod-demand-forecast')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'horizon',
    series: [{ key: 'count', label: 'Forecasts' }],
    title: 'Forecasts by horizon',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecast Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Search (item ID or name)</Label>
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
              />
            </div>
            <div>
              <Label>Horizon</Label>
              <Select value={horizonFilter} onValueChange={v => setHorizonFilter(v as ForecastHorizon | 'all')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Algorithm</Label>
              <Select value={algoFilter} onValueChange={v => setAlgoFilter(v as ForecastAlgorithm | 'all')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALGO_OPTIONS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No forecasts found. Use Demand Forecast Entry to generate one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generated</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Horizon</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead className="text-right">Periods</TableHead>
                  <TableHead className="text-right font-mono">Total Qty</TableHead>
                  <TableHead className="text-right">Holiday Adj</TableHead>
                  <TableHead>Seasonality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{formatDate(r.generated_at)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.item_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.item_id}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.horizon}</Badge></TableCell>
                    <TableCell className="text-xs">{r.algorithm}</TableCell>
                    <TableCell className="text-right font-mono">{r.data_points.length}</TableCell>
                    <TableCell className="text-right font-mono">{totalForecastQty(r).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-mono">
                      {r.metadata.holiday_adjustments_applied}
                    </TableCell>
                    <TableCell>
                      {r.metadata.seasonality_detected ? (
                        <Badge>detected</Badge>
                      ) : (
                        <Badge variant="outline">none</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="p-3 space-y-2" data-testid="prod-demand-forecast-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="prod-demand-forecast-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'horizon', label: 'Horizon' },
            { key: 'count', label: 'Forecasts', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No forecasts yet"
        />
      </Card>
    </div>
  );
}
