/**
 * @file        ForecastVsActual.tsx
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · Block 7.3
 * @purpose     Forecast accuracy view · enter actuals · compute MAPE/MAE/bias
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listForecasts, computeForecastAccuracy, persistForecastAccuracy, listForecastAccuracy,
} from '@/lib/demand-forecast-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function ForecastVsActual(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [selectedForecastId, setSelectedForecastId] = useState<string>('');
  const [actualsInput, setActualsInput] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const forecasts = useMemo(() => {
    if (!entityCode) return [];
    return listForecasts(entityCode).sort((a, b) =>
      b.generated_at.localeCompare(a.generated_at),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshKey]);

  const selectedForecast = useMemo(
    () => forecasts.find(f => f.id === selectedForecastId) ?? null,
    [forecasts, selectedForecastId],
  );

  const accuracyHistory = useMemo(() => {
    if (!entityCode) return [];
    return listForecastAccuracy(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshKey]);

  const handleComputeAccuracy = (): void => {
    if (!selectedForecast || !entityCode) {
      toast.error('Select a forecast first');
      return;
    }
    const actuals = selectedForecast.data_points
      .map(p => ({
        period_start: p.period_start,
        actual_qty: parseFloat(actualsInput[p.period_start] ?? ''),
      }))
      .filter(a => !isNaN(a.actual_qty));

    if (actuals.length === 0) {
      toast.error('Enter at least one actual value');
      return;
    }

    const records = computeForecastAccuracy(entityCode, selectedForecast.id, actuals);
    records.forEach(persistForecastAccuracy);
    toast.success(`Recorded ${records.length} accuracy entries`);
    setActualsInput({});
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Forecast vs Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Forecast</Label>
            <Select value={selectedForecastId} onValueChange={setSelectedForecastId}>
              <SelectTrigger><SelectValue placeholder="Pick a forecast" /></SelectTrigger>
              <SelectContent>
                {forecasts.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.item_name} · {f.horizon} · {f.algorithm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedForecast && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right font-mono">Forecast</TableHead>
                    <TableHead>Actual (enter)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedForecast.data_points.map(p => (
                    <TableRow key={p.period_start}>
                      <TableCell className="font-mono text-xs">{p.period_start}</TableCell>
                      <TableCell className="text-right font-mono">{p.forecast_qty}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={actualsInput[p.period_start] ?? ''}
                          onChange={e =>
                            setActualsInput({ ...actualsInput, [p.period_start]: e.target.value })
                          }
                          placeholder="actual qty"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={handleComputeAccuracy}>Compute Accuracy</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historical Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          {accuracyHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accuracy records yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right font-mono">Forecast</TableHead>
                  <TableHead className="text-right font-mono">Actual</TableHead>
                  <TableHead className="text-right font-mono">MAPE %</TableHead>
                  <TableHead className="text-right font-mono">MAE</TableHead>
                  <TableHead className="text-right font-mono">Bias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accuracyHistory.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.item_id}</TableCell>
                    <TableCell className="font-mono text-xs">{a.period_start}</TableCell>
                    <TableCell className="text-right font-mono">{a.forecasted_qty}</TableCell>
                    <TableCell className="text-right font-mono">{a.actual_qty}</TableCell>
                    <TableCell className="text-right font-mono">{a.mape_pct.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{a.mae}</TableCell>
                    <TableCell className="text-right font-mono">{a.bias}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
