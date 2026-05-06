/**
 * @file     ProductionVarianceDashboard.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block E · D-560
 * @purpose  7-way variance drill-down dashboard (Q18=a financial priority).
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import {
  computeProductionVariance,
  listProductionVariances,
} from '@/lib/production-variance-engine';
import { listMaterialIssues } from '@/lib/material-issue-engine';
import { listProductionConfirmations } from '@/lib/production-confirmation-engine';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import { listJobWorkReceipts } from '@/lib/job-work-receipt-engine';
import type { ProductionVariance, VarianceComponent } from '@/types/production-variance';

const VARIANCE_KEYS: Array<keyof Pick<ProductionVariance,
  'rate_variance' | 'efficiency_variance' | 'yield_variance' | 'substitution_variance'
  | 'mix_variance' | 'timing_variance' | 'scope_variance'>> = [
  'rate_variance', 'efficiency_variance', 'yield_variance',
  'substitution_variance', 'mix_variance', 'timing_variance', 'scope_variance',
];

const VARIANCE_LABELS: Record<string, string> = {
  rate_variance: 'Rate', efficiency_variance: 'Efficiency', yield_variance: 'Yield',
  substitution_variance: 'Substitution', mix_variance: 'Mix',
  timing_variance: 'Timing', scope_variance: 'Scope',
};

function fmtINR(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function cellClass(c: VarianceComponent): string {
  if (c.threshold_breached) return 'text-destructive font-semibold font-mono';
  if (c.is_unfavourable) return 'text-warning font-mono';
  return 'text-muted-foreground font-mono';
}

export function ProductionVarianceDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { orders } = useProductionOrders();
  const config = useProductionConfig();
  const thresholdPct = config.varianceThresholdPct ?? 10;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [drillIndex, setDrillIndex] = useState<number | null>(null);

  const variances: ProductionVariance[] = useMemo(() => {
    const result: ProductionVariance[] = [];
    const stored = listProductionVariances(entityCode);
    for (const po of orders) {
      if (po.status !== 'completed' && po.status !== 'closed') continue;
      if (po.status === 'closed' && po.closed_variance_id) {
        const s = stored.find(v => v.id === po.closed_variance_id);
        if (s) { result.push(s); continue; }
      }
      const mins = listMaterialIssues(entityCode).filter(m => m.production_order_id === po.id);
      const pcs = listProductionConfirmations(entityCode).filter(p => p.production_order_id === po.id);
      const jwos = listJobWorkOutOrders(entityCode).filter(j => j.production_order_id === po.id);
      const jwrs = listJobWorkReceipts(entityCode);
      result.push(computeProductionVariance({ po, mins, pcs, jwos, jwrs, thresholdPct }));
    }
    return result;
  }, [orders, entityCode, thresholdPct]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return variances;
    if (statusFilter === 'breached') return variances.filter(v => v.threshold_breach_count > 0);
    if (statusFilter === 'favourable') return variances.filter(v => v.total_variance_amount < 0);
    if (statusFilter === 'unfavourable') return variances.filter(v => v.total_variance_amount > 0);
    return variances;
  }, [variances, statusFilter]);

  const totalVariance = filtered.reduce((s, v) => s + v.total_variance_amount, 0);
  const totalBreaches = filtered.reduce((s, v) => s + v.threshold_breach_count, 0);
  const avgPct = filtered.length ? filtered.reduce((s, v) => s + v.total_variance_pct, 0) / filtered.length : 0;

  const drillVariance = drillIndex !== null ? filtered[drillIndex] : null;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Production Variance Dashboard · 7-way (Q18=a)
        </h1>
        <p className="text-sm text-muted-foreground">
          Rate → Efficiency → Yield → Substitution → Mix → Timing → Scope · threshold {thresholdPct}%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">POs analyzed</div>
          <div className="text-2xl font-bold font-mono">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total variance</div>
          <div className="text-2xl font-bold font-mono">{fmtINR(totalVariance)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Threshold breaches</div>
          <div className="text-2xl font-bold font-mono text-destructive">{totalBreaches}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg variance %</div>
          <div className="text-2xl font-bold font-mono">{avgPct.toFixed(2)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">7-way Decomposition</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="breached">Threshold breached</SelectItem>
                <SelectItem value="favourable">Favourable only</SelectItem>
                <SelectItem value="unfavourable">Unfavourable only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No completed/closed POs to analyze.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Eff</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Sub</TableHead>
                  <TableHead>Mix</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Frozen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v, i) => (
                  <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrillIndex(i)}>
                    <TableCell className="font-mono text-xs">{v.po_doc_no}</TableCell>
                    {VARIANCE_KEYS.map(k => (
                      <TableCell key={k} className={cellClass(v[k])}>{fmtINR(v[k].amount)}</TableCell>
                    ))}
                    <TableCell className="font-mono font-semibold">{fmtINR(v.total_variance_amount)}</TableCell>
                    <TableCell>{v.is_frozen ? <Badge variant="outline">Frozen</Badge> : <Badge variant="secondary">Live</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={drillVariance !== null} onOpenChange={() => setDrillIndex(null)}>
        <SheetContent className="w-[480px] sm:w-[520px] overflow-y-auto">
          {drillVariance && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{drillVariance.po_doc_no} · Drill-down</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {VARIANCE_KEYS.map(k => {
                  const c = drillVariance[k];
                  return (
                    <Card key={k}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{VARIANCE_LABELS[k]}</div>
                          <div className={cellClass(c)}>{fmtINR(c.amount)} · {c.pct.toFixed(2)}%</div>
                        </div>
                        {c.threshold_breached && (
                          <Badge variant="destructive" className="mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />Threshold breached
                          </Badge>
                        )}
                        {c.contributing_factors.length > 0 && (
                          <ul className="mt-2 text-xs text-muted-foreground list-disc pl-4 space-y-1">
                            {c.contributing_factors.map((f, j) => <li key={`${k}-${j}`}>{f}</li>)}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ProductionVarianceDashboardPanel;
