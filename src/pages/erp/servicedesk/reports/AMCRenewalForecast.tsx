/**
 * @file        src/pages/erp/servicedesk/reports/AMCRenewalForecast.tsx
 * @purpose     Q-LOCK-8 · 6-month renewal forecast · framework ReportChart · group-by + drill-down
 * @sprint      T-Phase-1.C.1b · Block F.1 · RPT-12c chart-layer swap
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { defaultChartConfig, signReport } from '@/lib/report-framework';
import { listAMCRecords } from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';
import { AMCRenewalForecastDrillDown } from './AMCRenewalForecastDrillDown';
import { buildForecast, type GroupBy } from './AMCRenewalForecast.utils';

export function AMCRenewalForecast(): JSX.Element {
  const [records, setRecords] = useState<AMCRecord[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('oem');
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => setRecords(listAMCRecords()), []);

  const data = useMemo(() => buildForecast(records, groupBy), [records, groupBy]);
  const empty = data.every((d) => d.total === 0);
  const hash = useMemo(() => signReport(data), [data]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  const drillRecords = useMemo(() => {
    if (!drill) return [];
    const idx = data.findIndex((d) => d.month === drill);
    if (idx === -1) return [];
    const now = new Date();
    return records.filter((r) => {
      if (!r.contract_end) return false;
      const end = new Date(r.contract_end);
      const monthDiff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
      return monthDiff === idx;
    });
  }, [drill, data, records]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">6-Month Renewal Forecast</h1>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="sd-amc-renewal-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
      </div>
      <div className="flex gap-2">
        {(['oem', 'branch', 'service_tier'] as GroupBy[]).map((g) => (
          <Button key={g} size="sm" variant={groupBy === g ? 'default' : 'outline'} onClick={() => setGroupBy(g)}>
            {g}
          </Button>
        ))}
      </div>
      <Card className="p-5" data-testid="sd-amc-renewal-chart-host">
        {empty ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No expiring AMCs in next 6 months.</div>
        ) : (
          <div className="h-80">
            <ReportChart
              data={data}
              config={defaultChartConfig({
                chartType: 'stacked-column',
                xKey: 'month',
                series: [
                  { key: 'total', label: 'Total ₹' },
                  { key: 'risk_adjusted', label: 'Risk-adjusted ₹' },
                ],
              })}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {data.map((d) => (
                <Button key={d.month} size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setDrill(d.month)}>
                  {d.month}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
      <AMCRenewalForecastDrillDown
        open={!!drill}
        month={drill}
        records={drillRecords}
        onClose={() => setDrill(null)}
      />
    </div>
  );
}
