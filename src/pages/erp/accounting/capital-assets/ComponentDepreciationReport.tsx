/**
 * ComponentDepreciationReport.tsx
 * Sprint 67 FAR-3 · Block 11 · Q-LOCK-11 A · Ind AS 16 component-wise
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator } from 'lucide-react';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { computeComponentDepreciation } from '@/lib/component-depreciation-engine';

interface ComponentDepreciationReportPanelProps {
  entityCode: string;
}

export function ComponentDepreciationReportPanel({ entityCode }: ComponentDepreciationReportPanelProps) {
  const [fy] = useState('2025-26');

  const result = useMemo(() => {
    // [JWT] Replace with GET /api/fa/component-depreciation?fy=
    const units: AssetUnitRecord[] = JSON.parse(localStorage.getItem(faUnitsKey(entityCode)) ?? '[]');
    return computeComponentDepreciation(units, fy);
  }, [entityCode, fy]);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Component Depreciation Report (Ind AS 16) · FY {fy}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Total: ₹{result.totalDeprForFY.toLocaleString('en-IN')} across {result.unitCount} component-mode assets</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Component rows ({result.rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead><TableHead>Component</TableHead><TableHead>Cost</TableHead>
                <TableHead>Life</TableHead><TableHead>Method</TableHead>
                <TableHead>Depr FY</TableHead><TableHead>Net CV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={`${row.asset_unit_id}-${row.component_id}`}>
                  <TableCell className="font-mono">{row.asset_id}</TableCell>
                  <TableCell>{row.component_name}</TableCell>
                  <TableCell>₹{row.cost_allocation.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{row.useful_life_years}y</TableCell>
                  <TableCell>{row.depreciation_method}</TableCell>
                  <TableCell>₹{row.current_depr.toLocaleString('en-IN')}</TableCell>
                  <TableCell>₹{row.net_carrying_amount.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComponentDepreciationReportPanel;
