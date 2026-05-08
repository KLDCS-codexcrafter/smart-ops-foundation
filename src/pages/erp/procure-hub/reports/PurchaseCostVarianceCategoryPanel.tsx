/**
 * @file        PurchaseCostVarianceCategoryPanel.tsx
 * @purpose     Tier-3 purchase cost variance · per classification dimension.
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish
 * @decisions   D-NEW-AR
 * @reuses      purchase-cost-variance-engine · useEntityCode · decimal-helpers · UI primitives
 * @[JWT]       GET /api/procure360/reports/cost-variance/category — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAllPurchaseCostVariances, type PurchaseCostVariance } from '@/lib/purchase-cost-variance-engine';
import { round2 } from '@/lib/decimal-helpers';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtPct = (n: number): string => `${n >= 0 ? '+' : ''}${round2(n)}%`;

export function PurchaseCostVarianceCategoryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const variances = useMemo<PurchaseCostVariance[]>(
    () => listAllPurchaseCostVariances(entityCode, 'category'),
    [entityCode],
  );

  const kpis = useMemo(() => ({
    total: variances.length,
    unfavorable: variances.filter((v) => v.direction === 'unfavorable').length,
    favorable: variances.filter((v) => v.direction === 'favorable').length,
    breaches: variances.filter((v) => v.threshold_breach).length,
  }), [variances]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Purchase Cost Variance · Category</h1>
        <p className="text-sm text-muted-foreground">
          Tier 3 of 3 · per classification dimension · weighted aggregate of item-level variance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Categories With Variance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Unfavorable</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{kpis.unfavorable}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Favorable</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{kpis.favorable}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Threshold Breaches</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{kpis.breaches}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {variances.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No category variances yet · need PO history.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Reference</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-right p-2">Actual</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Variance ₹</th>
                  <th className="text-right p-2">Variance %</th>
                  <th className="text-left p-2">Direction</th>
                  <th className="text-left p-2">Breach</th>
                </tr>
              </thead>
              <tbody>
                {variances.map((v) => (
                  <tr key={v.dimension_id} className="border-t">
                    <td className="p-2 font-medium">{v.dimension_name}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(v.reference_rate)}</td>
                    <td className="p-2 text-xs text-muted-foreground">{v.reference_source}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(v.actual_rate)}</td>
                    <td className="p-2 text-right font-mono">{v.qty}</td>
                    <td className={`p-2 text-right font-mono ${v.direction === 'unfavorable' ? 'text-destructive' : v.direction === 'favorable' ? 'text-success' : ''}`}>
                      {fmtMoney(v.variance_amount)}
                    </td>
                    <td className={`p-2 text-right font-mono ${v.direction === 'unfavorable' ? 'text-destructive' : v.direction === 'favorable' ? 'text-success' : ''}`}>
                      {fmtPct(v.variance_pct)}
                    </td>
                    <td className="p-2">
                      <Badge variant={v.direction === 'unfavorable' ? 'destructive' : v.direction === 'favorable' ? 'default' : 'outline'}>
                        {v.direction}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {v.threshold_breach ? <Badge variant="destructive">!</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
