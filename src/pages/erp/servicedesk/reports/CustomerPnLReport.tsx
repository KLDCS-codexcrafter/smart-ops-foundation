/**
 * @file        src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx
 * @purpose     S28 Customer P&L · per-customer revenue/cost/margin via framework ReportChart
 * @sprint      T-Phase-1.C.1f · Block E.1 · RPT-12c chart-layer swap · wires sd-customer-pnl
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { getKpi, defaultChartConfig, signReport } from '@/lib/report-framework';
import { computeCustomerPnL } from '@/lib/servicedesk-engine';

export function CustomerPnLReport(): JSX.Element {
  const rows = computeCustomerPnL().sort((a, b) => b.margin_paise - a.margin_paise);
  const top10 = rows.slice(0, 10);
  const bottom10 = rows.slice(-10).reverse();

  const chartData = useMemo(() => rows.slice(0, 15).map((r) => ({
    customer: r.customer_id.slice(0, 10),
    revenue: r.revenue_paise / 100,
    cost: r.cost_paise / 100,
    margin: r.margin_paise / 100,
  })), [rows]);

  const hash = useMemo(() => signReport(chartData), [chartData]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  const cfg = getKpi('sd-customer-pnl')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'customer',
    series: [
      { key: 'revenue', label: 'Revenue ₹' },
      { key: 'cost', label: 'Cost ₹' },
      { key: 'margin', label: 'Margin ₹' },
    ],
    title: 'Revenue · Cost · Margin (top 15)',
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Customer P&amp;L Report</h1>
          <p className="text-sm text-muted-foreground">
            S28 Tier 2 OOB · {rows.length} customer(s) with AMC activity
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="sd-customer-pnl-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
      </div>

      <Card className="p-4" data-testid="sd-customer-pnl-chart-host">
        <h2 className="font-semibold mb-3">Revenue · Cost · Margin (top 15)</h2>
        <div className="h-72">
          <ReportChart data={chartData} config={cfg} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Top 10 Most Profitable</h2>
          {top10.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th>Customer</th><th>Revenue ₹</th><th>Margin ₹</th><th>%</th></tr></thead>
              <tbody>
                {top10.map((r) => (
                  <tr key={`top-${r.customer_id}`} className="border-t">
                    <td className="py-2 font-mono text-xs">{r.customer_id}</td>
                    <td className="py-2 font-mono">{(r.revenue_paise / 100).toFixed(0)}</td>
                    <td className="py-2 font-mono"><Badge variant="default">{(r.margin_paise / 100).toFixed(0)}</Badge></td>
                    <td className="py-2 font-mono">{r.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Bottom 10 Most Loss-Making</h2>
          {bottom10.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th>Customer</th><th>Revenue ₹</th><th>Margin ₹</th><th>%</th></tr></thead>
              <tbody>
                {bottom10.map((r) => (
                  <tr key={`btm-${r.customer_id}`} className="border-t">
                    <td className="py-2 font-mono text-xs">{r.customer_id}</td>
                    <td className="py-2 font-mono">{(r.revenue_paise / 100).toFixed(0)}</td>
                    <td className="py-2 font-mono"><Badge variant="destructive">{(r.margin_paise / 100).toFixed(0)}</Badge></td>
                    <td className="py-2 font-mono">{r.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
