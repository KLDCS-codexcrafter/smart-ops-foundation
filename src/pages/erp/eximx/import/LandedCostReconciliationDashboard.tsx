/**
 * @file        src/pages/erp/eximx/import/LandedCostReconciliationDashboard.tsx
 * @purpose     Reconciliation dashboard · 3-bucket summary across all MLGITs · variance trends
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, AlertCircle, Banknote } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadMultiLegGITs, averageDwellTime } from '@/lib/multi-leg-git-engine';
import { summarizeMLGITReconciliation } from '@/lib/reconciliation-engine';
import { computeVarianceForAll, type LandedCostVarianceReport } from '@/lib/landed-cost-variance-engine';
import { SINHA_MULTI_LEG_GITS } from '@/data/sinha-multi-leg-git-seed-data';


export function LandedCostReconciliationDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const mlgits = useMemo(
    () => (entityCode ? loadMultiLegGITs(entityCode) : SINHA_MULTI_LEG_GITS),
    [entityCode],
  );

  const summaries = mlgits.map((m) => ({ mlgit: m, summary: summarizeMLGITReconciliation(m) }));
  const totalBooked = summaries.reduce((s, x) => s + x.summary.booked, 0);
  const totalRevalued = summaries.reduce((s, x) => s + x.summary.custom_revalued, 0);
  const totalActual = summaries.reduce((s, x) => s + x.summary.actual_landed, 0);
  const avgDwell = averageDwellTime(mlgits);
  const varianceReports: LandedCostVarianceReport[] = useMemo(() => computeVarianceForAll(mlgits), [mlgits]);
  const criticalVarianceCount = varianceReports.filter((r) => r.aggregate_severity === 'critical').length;
  const materialVarianceCount = varianceReports.filter((r) => r.aggregate_severity === 'material').length;


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6" /> Replayable Landed Cost Dashboard</h1>
        <p className="text-sm text-muted-foreground">Moat #1 · cross-MLGIT 3-bucket reconciliation · variance trends · CFS/ICD dwell time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Booked</div><div className="text-xl font-mono font-bold mt-1">₹{totalBooked.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Custom Revalued</div><div className="text-xl font-mono font-bold mt-1">₹{totalRevalued.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Actual Landed</div><div className="text-xl font-mono font-bold mt-1">₹{totalActual.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg CFS/ICD Dwell</div><div className="text-xl font-mono font-bold mt-1">{avgDwell.toFixed(1)} days</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Per-MLGIT Reconciliation</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MLGIT</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Custom Reval</TableHead>
                <TableHead>Δ Booked→Custom</TableHead>
                <TableHead>Actual Landed</TableHead>
                <TableHead>Δ Custom→Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ mlgit, summary }) => (
                <TableRow key={mlgit.id}>
                  <TableCell className="font-mono text-xs">{mlgit.mlgit_no}</TableCell>
                  <TableCell className="font-mono text-xs">₹{summary.booked.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="font-mono text-xs">{summary.custom_revalued > 0 ? `₹${summary.custom_revalued.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell><Badge variant={summary.variance_booked_to_custom_pct > 0 ? 'destructive' : summary.variance_booked_to_custom_pct < 0 ? 'default' : 'outline'}>{summary.variance_booked_to_custom_pct.toFixed(2)}%</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{summary.actual_landed > 0 ? `₹${summary.actual_landed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell><Badge variant={summary.variance_custom_to_actual_pct > 0 ? 'destructive' : summary.variance_custom_to_actual_pct < 0 ? 'default' : 'outline'}>{summary.variance_custom_to_actual_pct.toFixed(2)}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span>Export CSV/PDF deferred to EX-11 (TDL Gaps Atlas + Board Pack Export). Currently IN-UI display only.</span>
        </CardContent>
      </Card>
    </div>
  );
}
