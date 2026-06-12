/**
 * @file        src/pages/erp/servicedesk/reports/AMCRenewalForecastDrillDown.tsx
 * @purpose     Drill-down dialog for forecast bar · RPT-8a chart-enabled
 * @sprint      T-Phase-1.C.1b · Block F.2 · RPT-8a (additive)
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import type { AMCRecord } from '@/types/servicedesk';

interface Props {
  open: boolean;
  month: string | null;
  records: AMCRecord[];
  onClose: () => void;
}

export function AMCRenewalForecastDrillDown({ open, month, records, onClose }: Props): JSX.Element {
  const chartRows = (() => {
    const byMonth = new Map<string, number>();
    for (const r of records) {
      const m = (r.contract_end ?? '').slice(0, 7) || (month ?? 'n/a');
      byMonth.set(m, (byMonth.get(m) ?? 0) + Math.round(r.contract_value_paise / 100));
    }
    return Array.from(byMonth.entries()).map(([m, v]) => ({ month: m, renewal_value: v }));
  })();
  const cfg = getKpi('sd-amc-forecast')?.defaultChart ?? defaultChartConfig({
    chartType: 'line', xKey: 'month',
    series: [{ key: 'renewal_value', label: 'Renewal Value ₹' }],
    title: 'AMC renewal value by month',
  });
  const hash = signReport(chartRows);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>AMCs in {month}</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">OEM</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">Renewal %</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.customer_id}</td>
                  <td className="px-3 py-2">{r.oem_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.contract_end ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{(r.contract_value_paise / 100).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.renewal_probability}</td>
                  <td className="px-3 py-2">{r.risk_bucket}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No AMCs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Card className="p-3 space-y-2 mt-3" data-testid="sd-amc-forecast-dashboard-host">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono" data-testid="sd-amc-forecast-integrity-badge" title={hash}>
              <ShieldCheck className="h-3 w-3 mr-1" />{short}
            </Badge>
          </div>
          <div className="w-full h-56" data-testid="sd-amc-forecast-chart-host">
            <ReportChart data={chartRows} config={cfg} />
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
