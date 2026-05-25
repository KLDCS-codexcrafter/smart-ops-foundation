/**
 * @file        src/pages/erp/production/reports/CarbonAwareProductionPlanner.tsx
 * @sprint      T-Phase-3.PROD-5 · Theme B Block 7 · CAP-27 · MOAT-38 primary surface
 * @purpose     Carbon-aware production planner · order ranking + low-carbon slot recommendations.
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  rankAlternativesByCarbonIntensity,
  optimizeShiftForLowCarbonGridSlot,
  getGridIntensityForHour,
} from '@/lib/carbon-planning-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Leaf, Clock, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_ORDERS = ['PO-1001', 'PO-1002', 'PO-1003', 'PO-1004', 'PO-1005'];
const SHIFT_SLOTS = ['02:00-06:00', '06:00-10:00', '10:00-14:00', '14:00-18:00', '18:00-22:00', '22:00-02:00'];

export function CarbonAwareProductionPlannerPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const ranked = useMemo(
    () => (entityCode ? rankAlternativesByCarbonIntensity(entityCode, MOCK_ORDERS) : []),
    [entityCode],
  );
  const recommendation = useMemo(() => {
    if (!entityCode || !selectedOrder) return null;
    return optimizeShiftForLowCarbonGridSlot(entityCode, selectedOrder, SHIFT_SLOTS);
  }, [entityCode, selectedOrder]);

  const intensity24h = useMemo(() => {
    if (!entityCode) return [];
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      intensity: getGridIntensityForHour(entityCode, h, 'weekday'),
    }));
  }, [entityCode]);

  if (!entityCode) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to use the carbon-aware planner.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Leaf className="h-6 w-6 text-success" /> Carbon-Aware Production Planner
        </h1>
        <p className="text-sm text-muted-foreground">
          World-first carbon-aware scheduling at SMB price · MOAT-38
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Pending production orders · ranked by carbon intensity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead className="text-right">Carbon Footprint</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r) => (
                <TableRow key={r.orderId} className={selectedOrder === r.orderId ? 'bg-muted/40' : ''}>
                  <TableCell><Badge variant={r.rank === 1 ? 'default' : 'outline'}>{r.rank}</Badge></TableCell>
                  <TableCell className="font-mono">{r.orderId}</TableCell>
                  <TableCell className="text-right font-mono">{r.intensityKg.toLocaleString('en-IN')} kg CO₂</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedOrder(r.orderId)}>
                      Recommend slot
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {recommendation && selectedOrder && (
        <Card className="glass-card border-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Recommendation for {selectedOrder}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg">
              Schedule into <span className="font-mono font-semibold">{recommendation.recommendedSlot}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Slot carbon: <span className="font-mono">{recommendation.intensityKg.toLocaleString('en-IN')} kg CO₂</span>
            </div>
            <div className="text-sm flex items-center gap-2 text-success">
              <TrendingDown className="h-4 w-4" />
              Savings vs worst slot: <span className="font-mono">{recommendation.savingsVsWorst.toLocaleString('en-IN')} kg CO₂</span>
            </div>
            <Button
              size="sm"
              onClick={() => toast.success(`Recommendation accepted for ${selectedOrder}`)}
            >
              Accept recommendation
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>24-hour India grid intensity (mock · CEA 2024 baseline)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={intensity24h}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="hour" fontSize={10} />
              <YAxis domain={[0.6, 1.0]} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="intensity" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default CarbonAwareProductionPlannerPanel;
