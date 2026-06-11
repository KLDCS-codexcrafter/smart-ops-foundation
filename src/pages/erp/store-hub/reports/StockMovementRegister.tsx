/**
 * @file        src/pages/erp/store-hub/reports/StockMovementRegister.tsx
 * @purpose     Thin Store Hub wrapper of Inventory Hub's ItemMovementHistoryReportPanel ·
 *              ZERO duplication of SD-9 inventory data per D-387.
 * @sprint      T-Phase-1.A.6.α-b-Department-Stores-Closeout
 *              RPT-6b · dashboard recipe (additive chart at wrapper level · reads stock
 *              issues already loaded by the page graph · no synthetic data)
 * @reuses      @/pages/erp/inventory/reports/ItemMovementHistoryReport
 * @[JWT]       reads via ItemMovementHistoryReportPanel · localStorage entity-scoped
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useEntityCode } from '@/hooks/useEntityCode';
import { ItemMovementHistoryReportPanel } from '@/pages/erp/inventory/reports/ItemMovementHistoryReport';
import { stockIssuesKey, type StockIssue } from '@/types/stock-issue';

export function StockMovementRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const issues = useMemo<StockIssue[]>(() => {
    try {
      const raw = typeof localStorage !== 'undefined'
        ? localStorage.getItem(stockIssuesKey(entityCode || 'SMRT')) : null;
      return raw ? (JSON.parse(raw) as StockIssue[]) : [];
    } catch { return []; }
  }, [entityCode]);

  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of issues) {
      const day = (r.issue_date || '').slice(0, 10);
      if (!day) continue;
      const qty = (r.lines ?? []).reduce((s, l) => s + (l.qty ?? 0), 0);
      m.set(day, (m.get(day) ?? 0) + qty);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, movement_qty]) => ({ date, movement_qty }));
  }, [issues]);
  const chartConfig = getKpi('st-movement')?.defaultChart ?? defaultChartConfig({
    chartType: 'line', xKey: 'date',
    series: [{ key: 'movement_qty', label: 'Movement Qty' }],
    title: 'Stock movement by date',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-3">
      <ItemMovementHistoryReportPanel />
      <div className="px-6">
        <Card className="p-3 space-y-2" data-testid="st-movement-dashboard-host">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono" data-testid="st-movement-integrity-badge" title={integrityHash}>
              <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
            </Badge>
          </div>
          {chartRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No movement data yet</div>
          ) : (
            <div className="w-full h-72" data-testid="st-movement-chart-host">
              <ReportChart data={chartRows} config={chartConfig} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default StockMovementRegisterPanel;
