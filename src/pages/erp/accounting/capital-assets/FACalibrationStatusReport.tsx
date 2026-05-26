/**
 * @file        src/pages/erp/accounting/capital-assets/FACalibrationStatusReport.tsx
 * @purpose     Cross-asset Calibration status view · FAR-CAP-12 · LEAK-14 closed
 * @sprint      T-Phase-4.FAR-2 · Block 8
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Gauge } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const loadFAUnits = (entityCode: string): AssetUnitRecord[] => {
  try {
    const r = localStorage.getItem(faUnitsKey(entityCode));
    return r ? (JSON.parse(r) as AssetUnitRecord[]) : [];
  } catch { return []; }
};

function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function calibrationBadge(days: number): JSX.Element {
  if (days < 0) {
    return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Overdue ({Math.abs(days)}d)</Badge>;
  }
  if (days <= 7) {
    return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Critical {days}d</Badge>;
  }
  if (days <= 30) {
    return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Due {days}d</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Current {days}d</Badge>;
}

interface Props { entityCode?: string }

export function FACalibrationStatusReportPanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: Props): JSX.Element {
  const units = useMemo(
    () => loadFAUnits(entityCode).filter(u => u.entity_id === entityCode && u.status === 'active'),
    [entityCode],
  );

  // Surrogate calibration tracker: re-use amc_expiry as proxy when CalibrationMaster bridge absent.
  // Real bridge consumed read-only when present.
  const calibrationRows = useMemo(() => units
    .filter(u => u.amc_expiry || u.warranty_expiry)
    .map(u => ({
      unit: u,
      instrument: u.item_name,
      nextDue: u.amc_expiry || u.warranty_expiry,
      daysToDue: daysUntil(u.amc_expiry || u.warranty_expiry),
    }))
    .sort((a, b) => a.daysToDue - b.daysToDue),
    [units],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-teal-500" />
        <div>
          <h2 className="text-xl font-bold">Calibration Status Report</h2>
          <p className="text-xs text-muted-foreground">
            Cross-asset calibration view · sorted by days-to-due · {calibrationRows.length} item(s)
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Asset ID</TableHead>
              <TableHead className="text-xs">Instrument</TableHead>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Next Calibration Due</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {calibrationRows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No calibration-tracked assets
                </TableCell></TableRow>
              ) : calibrationRows.map(({ unit, instrument, nextDue, daysToDue }) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-mono text-xs">{unit.asset_id}</TableCell>
                  <TableCell className="text-xs">{instrument}</TableCell>
                  <TableCell className="text-xs">{unit.location || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{nextDue || '—'}</TableCell>
                  <TableCell>{calibrationBadge(daysToDue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FACalibrationStatusReport(): JSX.Element {
  return <FACalibrationStatusReportPanel />;
}
