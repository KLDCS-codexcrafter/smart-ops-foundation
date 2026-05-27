/**
 * EPCGStatusReport.tsx — FAR-1 Wire-Up T-fix · EPCG Status surface
 * Lights the epcg-fa-bridge engine in the UI · closes F-DEAD-2.
 * @reads-from  src/lib/epcg-fa-bridge.ts (FAR-CAP-11 · MOAT-41)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Ship, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { generateEPCGStatusReport, computeEPCGObligation } from '@/lib/epcg-fa-bridge';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { useEntityCode } from '@/hooks/useEntityCode';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { entityCode: string }

function loadUnits(entityCode: string): AssetUnitRecord[] {
  try {
    // [JWT] GET /api/fa-units?entityCode=...
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    if (!raw) return [];
    return (JSON.parse(raw) as AssetUnitRecord[]).filter(u => u.entity_id === entityCode);
  } catch { return []; }
}

const fmtINR = (n: number): string =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

function statusBadge(status: string) {
  if (status === 'fulfilled') {
    return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-mono">{status}</Badge>;
  }
  if (status === 'active') {
    return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-mono">{status}</Badge>;
  }
  if (status === 'breached') {
    return <Badge variant="destructive" className="font-mono">{status}</Badge>;
  }
  return <Badge variant="outline" className="font-mono">{status}</Badge>;
}

export function EPCGStatusReportPanel({ entityCode }: Props) {
  const report = useMemo(() => generateEPCGStatusReport(entityCode), [entityCode]);
  const obligations = useMemo(
    () => loadUnits(entityCode).map(u => computeEPCGObligation(entityCode, u.asset_id)),
    [entityCode],
  );

  const remainingInr = Math.max(
    0,
    report.totalExportObligationInr - report.totalFulfilledInr,
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            EPCG Status Report · Export Promotion Capital Goods
          </h2>
          <p className="text-xs text-muted-foreground">
            6x duty saved · 6-year window · Entity {entityCode}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {report.totalObligations} obligation{report.totalObligations === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono">{report.activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Fulfilled
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono">{report.fulfilledCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" /> Breached
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono">{report.breachedCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" /> Expired
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono">{report.expiredCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Aggregate (₹)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Obligation</p>
              <p className="text-lg font-mono">₹ {fmtINR(report.totalExportObligationInr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fulfilled</p>
              <p className="text-lg font-mono text-success">₹ {fmtINR(report.totalFulfilledInr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-mono">₹ {fmtINR(remainingInr)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Per-Asset Obligations</CardTitle></CardHeader>
        <CardContent>
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No EPCG-eligible assets in this entity yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Duty Saved</TableHead>
                  <TableHead>Obligation</TableHead>
                  <TableHead>Fulfilled</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.map((o, i) => (
                  <TableRow key={`${o.assetId}-${i}`}>
                    <TableCell className="font-mono text-xs">{o.assetId}</TableCell>
                    <TableCell className="font-mono">₹ {fmtINR(o.dutySavedInr)}</TableCell>
                    <TableCell className="font-mono">₹ {fmtINR(o.exportObligationInr)}</TableCell>
                    <TableCell className="font-mono">₹ {fmtINR(o.fulfilledInr)}</TableCell>
                    <TableCell className="font-mono text-xs">{o.periodEnd || '—'}</TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
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

export default function EPCGStatusReport() {
  const { entityCode } = useEntityCode();
  return <EPCGStatusReportPanel entityCode={entityCode || DEFAULT_ENTITY_SHORTCODE} />;
}
