/**
 * @file        CategoryWiseSpendEstimate.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { groupByCategory, inrFmt } from '@/lib/requestx-report-engine';

const PRETTY: Record<string, string> = {
  raw_material: 'Raw Material',
  packaging_material: 'Packaging Material',
  printing_stationary: 'Printing & Stationary',
  housekeeping: 'Housekeeping',
  electrical: 'Electrical',
  import_purchase: 'Import Purchase',
  samples_purchase: 'Samples Purchase',
};

export function CategoryWiseSpendEstimatePanel(): JSX.Element {
  const mi = useMaterialIndents();
  const rows = useMemo(() => {
    return groupByCategory(mi).map(r => ({
      ...r,
      label: PRETTY[r.category] ?? r.category,
    }));
  }, [mi]);

  const total = rows.reduce((a, r) => a + r.total_value, 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Category-wise Spend Estimate</h1>
        <p className="text-sm text-muted-foreground">Material indents grouped by category · estimated value</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Total estimate: {inrFmt(total)}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => inrFmt(v)} />
                <Bar dataKey="total_value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Indents</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground">No material indents.</TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.category}>
                  <TableCell className="text-xs">{r.label}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{r.count}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
