/**
 * @file        DemandForecastEntry.tsx
 * @sprint      T-Phase-3.PROD-4 · PASS 1 · Block 7.1
 * @purpose     Operator-facing form to generate a new demand forecast (37th SIBLING UI)
 * @[JWT]       N/A (calls engine which calls localStorage)
 */
import { useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { generateForecast, persistForecast } from '@/lib/demand-forecast-engine';
import type { ForecastHorizon, ForecastAlgorithm } from '@/types/forecast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function DemandForecastEntry(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [godownId, setGodownId] = useState('');
  const [horizon, setHorizon] = useState<ForecastHorizon>('3m');
  const [algorithm, setAlgorithm] = useState<ForecastAlgorithm>('exponential_smoothing');
  const [salesHistory, setSalesHistory] = useState('100,110,120,115,130,140,150,145,160,170,165,180');
  const [distributorHistory, setDistributorHistory] = useState('50,55,60,58,65,70,75,72,80,85,82,90');
  const [productionHistory, setProductionHistory] = useState('80,85,90,88,95,100,105,103,110,115,113,120');

  const handleGenerate = (): void => {
    if (!itemId || !itemName) {
      toast.error('Item ID and name are required');
      return;
    }
    if (!entityCode) {
      toast.error('Select an entity first');
      return;
    }
    try {
      const parseArr = (s: string): number[] =>
        s.split(',').map(v => parseFloat(v.trim())).filter(n => !isNaN(n));
      const record = generateForecast({
        entity_id: entityCode,
        item_id: itemId,
        item_name: itemName,
        godown_id: godownId || undefined,
        horizon,
        algorithm,
        sales_history_monthly: parseArr(salesHistory),
        distributor_history_monthly: parseArr(distributorHistory),
        production_history_monthly: parseArr(productionHistory),
        user: { id: 'current-user', name: 'Current User' },
      });
      persistForecast(record);
      toast.success(
        `Forecast generated · ${record.data_points.length} periods · ${record.metadata.holiday_adjustments_applied} holiday adjustments`,
      );
      setItemId('');
      setItemName('');
      setGodownId('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate forecast');
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecast Entry · 37th SIBLING</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Item ID</Label>
              <Input value={itemId} onChange={e => setItemId(e.target.value)} placeholder="ITM-001" />
            </div>
            <div>
              <Label>Item Name</Label>
              <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Steel Coil 5mm" />
            </div>
            <div>
              <Label>Godown ID (optional)</Label>
              <Input value={godownId} onChange={e => setGodownId(e.target.value)} placeholder="gd-main" />
            </div>
            <div>
              <Label>Horizon</Label>
              <Select value={horizon} onValueChange={(v) => setHorizon(v as ForecastHorizon)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 month</SelectItem>
                  <SelectItem value="3m">3 months</SelectItem>
                  <SelectItem value="6m">6 months</SelectItem>
                  <SelectItem value="12m">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as ForecastAlgorithm)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_moving_average">Simple Moving Average</SelectItem>
                  <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                  <SelectItem value="holt_linear_trend">Holt Linear Trend</SelectItem>
                  <SelectItem value="linear_regression">Linear Regression</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Sales History (comma-separated monthly · oldest first)</Label>
              <Input value={salesHistory} onChange={e => setSalesHistory(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Distributor History (comma-separated monthly)</Label>
              <Input value={distributorHistory} onChange={e => setDistributorHistory(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Production History (comma-separated monthly)</Label>
              <Input value={productionHistory} onChange={e => setProductionHistory(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleGenerate} className="w-full">Generate Forecast</Button>
        </CardContent>
      </Card>
    </div>
  );
}
