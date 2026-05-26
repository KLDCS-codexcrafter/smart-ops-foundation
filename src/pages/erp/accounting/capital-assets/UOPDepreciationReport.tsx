/**
 * UOPDepreciationReport.tsx
 * Sprint 67 FAR-3 · Block 11 · Q-LOCK-11 A · UOP depreciation per asset
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator } from 'lucide-react';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { computeUOPDepreciation } from '@/lib/uop-depreciation-engine';

interface UOPDepreciationReportPanelProps {
  entityCode: string;
}

export function UOPDepreciationReportPanel({ entityCode }: UOPDepreciationReportPanelProps) {
  const [fy] = useState('2025-26');

  const result = useMemo(() => {
    // [JWT] Replace with GET /api/fa/uop-depreciation?fy=
    const units: AssetUnitRecord[] = JSON.parse(localStorage.getItem(faUnitsKey(entityCode)) ?? '[]');
    return computeUOPDepreciation(units, new Map(), fy);
  }, [entityCode, fy]);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />UOP Depreciation Report · FY {fy}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Total: ₹{result.totalDeprForFY.toLocaleString('en-IN')} across {result.unitCount} UOP-eligible assets</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>UOP rows ({result.rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead><TableHead>Ledger</TableHead><TableHead>Total Units</TableHead>
                <TableHead>Consumed FY</TableHead><TableHead>Rate / Unit</TableHead>
                <TableHead>Depr FY</TableHead><TableHead>Net Book Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.asset_unit_id}>
                  <TableCell className="font-mono">{row.asset_id}</TableCell>
                  <TableCell>{row.ledger_name}</TableCell>
                  <TableCell>{row.uop_total_units.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{row.uop_units_consumed_during_fy.toLocaleString('en-IN')}</TableCell>
                  <TableCell>₹{row.per_unit_rate.toFixed(4)}</TableCell>
                  <TableCell>₹{row.current_depr.toLocaleString('en-IN')}</TableCell>
                  <TableCell>₹{row.net_book_value.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default UOPDepreciationReportPanel;
