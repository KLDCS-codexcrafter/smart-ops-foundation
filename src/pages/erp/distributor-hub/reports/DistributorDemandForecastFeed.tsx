/**
 * @file        src/pages/erp/distributor-hub/reports/DistributorDemandForecastFeed.tsx
 * @purpose     Sprint 61 PROD-4 PASS 2 · OOB-PROD-1 · MOAT 35
 *              Cross-card visibility · distributor → production demand sensing
 * @sprint      T-Phase-3.PROD-4 · PASS 2
 */
import { useState, useMemo, useEffect } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listForecasts } from '@/lib/demand-forecast-engine';
import type { DemandForecastRecord } from '@/types/forecast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { LineChart, Sparkles } from 'lucide-react';

export function DistributorDemandForecastFeedPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [forecasts, setForecasts] = useState<DemandForecastRecord[]>([]);

  useEffect(() => {
    if (!entityCode) return;
    setForecasts(listForecasts(entityCode));
  }, [entityCode]);

  const latestPerItem = useMemo(() => {
    const byItem = new Map<string, DemandForecastRecord>();
    for (const f of forecasts) {
      const existing = byItem.get(f.item_id);
      if (!existing || f.generated_at > existing.generated_at) {
        byItem.set(f.item_id, f);
      }
    }
    return Array.from(byItem.values()).sort((a, b) =>
      b.generated_at.localeCompare(a.generated_at),
    );
  }, [forecasts]);

  const totalForecastQty = latestPerItem.reduce(
    (s, f) => s + f.data_points.reduce((ds, p) => ds + p.forecast_qty, 0),
    0,
  );
  const distributorWeightedTotal = latestPerItem.reduce(
    (s, f) =>
      s +
      f.data_points.reduce((ds, p) => ds + p.forecast_qty * f.input_weights.distributor, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Distributor Demand Forecast Feed · OOB-PROD-1 · MOAT 35
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Distributor-side demand signals feed into the central demand-forecast-engine via the
            3-source ensemble (default 60% sales · 30% distributor · 10% production history).
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Items with active forecast</p>
              <p className="text-2xl font-mono">{latestPerItem.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Total forecast qty (all items · all periods)
              </p>
              <p className="text-2xl font-mono">
                {totalForecastQty.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Distributor-weighted contribution</p>
              <p className="text-2xl font-mono">
                {Math.round(distributorWeightedTotal).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Per-Item Forecast Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestPerItem.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No forecasts generated yet. Production users can generate forecasts via
              <span className="font-mono mx-1">
                Production → AI &amp; Predictive → Demand Forecast Entry
              </span>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Horizon</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead className="text-right">Distributor Weight</TableHead>
                  <TableHead className="text-right">Forecast Total</TableHead>
                  <TableHead className="text-right">Distributor Contrib.</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestPerItem.map((f) => {
                  const total = f.data_points.reduce((s, p) => s + p.forecast_qty, 0);
                  const distContrib = Math.round(total * f.input_weights.distributor);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">
                        {f.item_name || f.item_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{f.horizon}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.algorithm.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {(f.input_weights.distributor * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {total.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {distContrib.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(f.generated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DistributorDemandForecastFeedPanel;
