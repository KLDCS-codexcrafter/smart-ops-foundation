/**
 * @file        src/pages/erp/production/reports/ProductionCarbonDashboard.tsx
 * @sprint      T-Phase-3.PROD-5 · Theme B Block 8
 * @purpose     Per-order/line/shift production carbon footprint historical view.
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCarbonTrendByMonth, listCarbonFootprints } from '@/lib/carbon-planning-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity } from 'lucide-react';

export function ProductionCarbonDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const trend = useMemo(
    () => (entityCode ? getCarbonTrendByMonth(entityCode, 12) : []),
    [entityCode],
  );
  const footprints = useMemo(
    () => (entityCode ? listCarbonFootprints(entityCode) : []),
    [entityCode],
  );

  if (!entityCode) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view production carbon dashboard.</p>
      </div>
    );
  }

  const total12mo = trend.reduce((s, t) => s + t.totalKg, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Production Carbon Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Last 12 months · {(total12mo / 1000).toFixed(2)} tCO₂e total
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>12-month carbon trend</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="totalKg" name="kg CO₂" stroke="hsl(var(--success))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recorded footprints</CardTitle>
        </CardHeader>
        <CardContent>
          {footprints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No footprints recorded yet. Use the Carbon-Aware Planner to compute and seed entries.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Source ID</TableHead>
                  <TableHead className="text-right">Energy kWh</TableHead>
                  <TableHead className="text-right">Total kg CO₂</TableHead>
                  <TableHead>FY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footprints.slice(0, 50).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.source_type}</TableCell>
                    <TableCell className="font-mono">{f.source_id}</TableCell>
                    <TableCell className="text-right font-mono">{f.energy_kwh.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right font-mono">{f.total_kg_co2.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{f.fy}</TableCell>
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

export default ProductionCarbonDashboardPanel;
