/**
 * @file        CreditXRayPage.tsx
 * @sprint      RPT-10a · Block 3 · Credit X-Ray executive cockpit
 * @purpose     Composes receivx.ar + distributor.orders (cross-card at MGMT only).
 *              No synthetic data — every tile/chart reads real DSC rows or
 *              shows an honest empty-state. Uses FROZEN primitives only.
 * @[JWT]       N/A — pure consumption
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/report-framework/export-csv';
import {
  ReportChart, ScorecardTile, TableChartToggle,
  type TableChartColumn,
} from '@/components/operix-core/report-framework';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import { defaultChartConfig } from '@/lib/report-framework/chart-config';
import { resolveRag } from '@/lib/report-framework/rag';
import { signReport } from '@/lib/report-framework/integrity-sign';
import { layerCeilingFor } from '@/lib/report-framework/role-layer';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import '@/lib/report-framework/data-sources';

interface Props { entityCode: string }

function rowsFromSource(id: string, entityCode: string): Record<string, unknown>[] {
  try { return getSource(id)?.read(entityCode) ?? []; } catch { return []; }
}

export default function CreditXRayPage({ entityCode }: Props): JSX.Element {
  const { profile } = useCardEntitlement();
  const ceiling = layerCeilingFor(profile.role);
  const isManagement = ceiling === 'management';

  const arRows = useMemo(() => rowsFromSource('receivx.ar', entityCode), [entityCode]);
  const distRows = useMemo(
    () => (isManagement ? rowsFromSource('distributor.orders', entityCode) : []),
    [entityCode, isManagement],
  );

  // Aging waterfall (stacked-column by bucket)
  const agingByBucket = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of arRows) {
      const b = String((r as { age_bucket?: string }).age_bucket ?? '—');
      map.set(b, (map.get(b) ?? 0) + Number((r as { pending_amount?: number }).pending_amount ?? 0));
    }
    return Array.from(map.entries()).map(([age_bucket, outstanding]) => ({ age_bucket, outstanding }));
  }, [arRows]);

  // Top-10 exposure by party
  const top10 = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of arRows) {
      const p = String((r as { party_name?: string }).party_name ?? '—');
      map.set(p, (map.get(p) ?? 0) + Number((r as { pending_amount?: number }).pending_amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([party, exposure]) => ({ party, exposure }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 10);
  }, [arRows]);

  // Overdue %
  const overduePct = useMemo(() => {
    const total = arRows.reduce((s, r) => s + Number((r as { pending_amount?: number }).pending_amount ?? 0), 0);
    const overdue = arRows.reduce((s, r) => s + Number((r as { overdue_amount?: number }).overdue_amount ?? 0), 0);
    return total > 0 ? Math.round((overdue / total) * 100) : 0;
  }, [arRows]);
  const overdueRag = resolveRag(overduePct, { amber: 20, red: 40, direction: 'lower-good' });

  const tableCols: TableChartColumn<Record<string, unknown>>[] = [
    { key: 'party_name', label: 'Customer' },
    { key: 'voucher_no', label: 'Voucher' },
    { key: 'due_date', label: 'Due' },
    { key: 'age_bucket', label: 'Bucket' },
    { key: 'pending_amount', label: 'Outstanding', align: 'right' },
  ];

  const sig = useMemo(() => (arRows.length ? signReport(arRows) : '—'), [arRows]);

  return (
    <div className="space-y-6" data-testid="credit-xray-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Credit X-Ray</h1>
          <p className="text-sm text-muted-foreground">
            Customer exposure · aging · overdue health. Composes <code>receivx.ar</code>
            {isManagement ? <> + <code>distributor.orders</code> (cross-card · mgmt only).</> : '.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" type="button" data-testid="credit-xray-csv"
            onClick={() => downloadCsv(`credit-xray-${entityCode}-${Date.now()}`, arRows)} disabled={arRows.length === 0}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Badge variant="outline" className="font-mono text-[10px]" data-testid="credit-xray-integrity">
            ◇ {sig.slice(0, 12)}
          </Badge>
        </div>
      </header>


      {arRows.length === 0 ? (
        <Card className="p-8 text-sm text-muted-foreground text-center" data-testid="credit-xray-empty">
          No A/R rows yet for entity <span className="font-mono">{entityCode}</span>. Post Sales
          vouchers to populate <code>receivx.ar</code>.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScorecardTile
              label="Open A/R Lines"
              value={arRows.length}
              hint="receivx.ar · debtors only"
            />
            <ScorecardTile
              label="Overdue %"
              value={`${overduePct}%`}
              rag={overdueRag}
              hint="rx-overdue-pct · lower-good"
            />
            <ScorecardTile
              label="Top Exposure"
              value={top10[0]?.party ?? '—'}
              hint={top10[0] ? `₹${Math.round(top10[0].exposure).toLocaleString('en-IN')}` : ''}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4" data-testid="credit-xray-aging">
              <div className="text-sm text-muted-foreground mb-2">Aging Waterfall</div>
              <ReportChart
                data={agingByBucket}
                config={defaultChartConfig({
                  chartType: 'stacked-column',
                  xKey: 'age_bucket',
                  series: [{ key: 'outstanding', label: 'Outstanding ₹' }],
                })}
              />
            </Card>
            <Card className="p-4" data-testid="credit-xray-top10">
              <div className="text-sm text-muted-foreground mb-2">Top-10 Customer Exposure</div>
              <ReportChart
                data={top10}
                config={defaultChartConfig({
                  chartType: 'column',
                  xKey: 'party',
                  series: [{ key: 'exposure', label: 'Exposure ₹' }],
                })}
              />
            </Card>
          </div>

          <Card className="p-4" data-testid="credit-xray-table">
            <div className="text-sm text-muted-foreground mb-2">Drill · A/R Rows</div>
            <TableChartToggle
              rows={arRows}
              columns={tableCols}
              chartConfig={defaultChartConfig({
                chartType: 'stacked-column',
                xKey: 'age_bucket',
                series: [{ key: 'pending_amount', label: 'Outstanding ₹' }],
              })}
            />
          </Card>

          {isManagement && distRows.length > 0 && (
            <Card className="p-4" data-testid="credit-xray-distributor">
              <div className="text-sm text-muted-foreground mb-2">
                Distributor Orders (cross-card · management only)
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {distRows.length} rows from <code>distributor.orders</code>
              </div>
            </Card>
          )}
          {isManagement && distRows.length === 0 && (
            <Card className="p-4 text-xs text-muted-foreground" data-testid="credit-xray-distributor-empty">
              No distributor.orders rows yet for this entity.
            </Card>
          )}
        </>
      )}
    </div>
  );
}
