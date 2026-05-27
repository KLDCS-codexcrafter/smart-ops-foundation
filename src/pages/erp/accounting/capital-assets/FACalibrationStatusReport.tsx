/**
 * FACalibrationStatusReport.tsx — Sprint 66 FAR-2 · Block 8 · FAR-CAP-12
 * Cross-asset calibration status (days-to-due color coded).
 * Reads parallel calibration log key (does NOT mutate AssetUnitRecord · FR-19).
 * [JWT] Replace with GET /api/fa/calibration-status
 */
import { useMemo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calculator } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
// [Sprint 68 FAR-4 Wire-Up T-fix · Tier 3 · F-DEAD-1 absorption · service-history-bridge call]
import { getServiceHistorySummary } from '@/lib/maintainpro-service-history-bridge';

interface CalibrationRecord {
  asset_unit_id: string;
  instrument: string;
  last_calibration_date: string;
  next_due_date: string;
}

const calibrationKey = (entityCode: string): string =>
  `fa_calibration_log_${entityCode}`;

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fa/calibration?entityCode=...
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

const daysTo = (iso: string): number => {
  if (!iso) return Infinity;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
};

interface Props { entityCode: string; }

export function FACalibrationStatusReportPanel({ entityCode }: Props) {
  const [units, setUnits] = useState<AssetUnitRecord[]>([]);
  const [records, setRecords] = useState<CalibrationRecord[]>([]);

  useEffect(() => {
    setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode));
    setRecords(ls<CalibrationRecord>(calibrationKey(entityCode)));
  }, [entityCode]);

  const rows = useMemo(() => {
    const unitMap = new Map(units.map(u => [u.id, u]));
    return records
      .map(r => ({ ...r, unit: unitMap.get(r.asset_unit_id), days: daysTo(r.next_due_date) }))
      .filter(r => r.unit)
      .sort((a, b) => a.days - b.days);
  }, [units, records]);

  // [Sprint 68 FAR-4 Wire-Up T-fix · Tier 3 · F-DEAD-1 absorption · bridge data]
  const bridgeCalibrations = useMemo(() => {
    let total = 0;
    let assetsWithEvents = 0;
    for (const u of units) {
      const summary = getServiceHistorySummary(entityCode, u.id);
      if (summary && summary.by_kind.calibration_done.count > 0) {
        total += summary.by_kind.calibration_done.count;
        assetsWithEvents += 1;
      }
    }
    return { total, assetsWithEvents };
  }, [units, entityCode]);

  const statusBadge = (days: number) => {
    if (days > 30) return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Current</Badge>;
    if (days > 7) return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Due Soon</Badge>;
    if (days >= 0) return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">Critical</Badge>;
    return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">Overdue</Badge>;
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5" /> Calibration Status Report
        </h2>
        <p className="text-sm text-muted-foreground">
          Cross-asset calibration view · sorted by days-to-due ascending.
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Bridge-sourced calibration events: {bridgeCalibrations.total} across {bridgeCalibrations.assetsWithEvents} asset(s)
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset ID</TableHead>
            <TableHead>Instrument</TableHead>
            <TableHead>Last Calibration</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead>Days To Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No calibration records
              </TableCell>
            </TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={`${r.asset_unit_id}-${i}`}>
              <TableCell className="font-mono">{r.unit?.asset_id}</TableCell>
              <TableCell>{r.instrument}</TableCell>
              <TableCell>{r.last_calibration_date ? new Date(r.last_calibration_date).toLocaleDateString('en-IN') : '—'}</TableCell>
              <TableCell>{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString('en-IN') : '—'}</TableCell>
              <TableCell className="font-mono">{Number.isFinite(r.days) ? r.days : '—'}</TableCell>
              <TableCell>{statusBadge(r.days)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default FACalibrationStatusReportPanel;
