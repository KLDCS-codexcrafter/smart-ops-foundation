/**
 * @file        src/pages/erp/store-hub/reports/DepartmentConsumptionSummary.tsx
 * @purpose     Thin Store Hub wrapper of Inventory Hub's ConsumptionSummaryReportPanel ·
 *              department-scoped · ZERO duplication of SD-9 inventory data per D-387.
 * @sprint      T-Phase-2.A-DepartmentStore-Phase2-Expansion · Block B
 *              RPT-6b · dashboard recipe (additive chart at wrapper level · reads same
 *              consumption keys page already loads · no synthetic data)
 * @reuses      @/pages/erp/inventory/reports/ConsumptionSummaryReport
 * @[JWT]       reads via ConsumptionSummaryReportPanel · localStorage entity-scoped
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useEntityCode } from '@/hooks/useEntityCode';
import { ConsumptionSummaryReportPanel } from '@/pages/erp/inventory/reports/ConsumptionSummaryReport';
import { consumptionEntriesKey } from '@/types/consumption';

interface ConsumptionEntryLite {
  department_name?: string;
  department_id?: string;
  total_value?: number;
  lines?: Array<{ value?: number }>;
}

export function DepartmentConsumptionSummaryPanel(): JSX.Element {
  const month = new Date().toISOString().slice(0, 7);
  const { entityCode } = useEntityCode();
  const entries = useMemo<ConsumptionEntryLite[]>(() => {
    try {
      const raw = typeof localStorage !== 'undefined'
        ? localStorage.getItem(consumptionEntriesKey(entityCode || 'SMRT')) : null;
      return raw ? (JSON.parse(raw) as ConsumptionEntryLite[]) : [];
    } catch { return []; }
  }, [entityCode]);

  const chartRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const dept = e.department_name || e.department_id || '—';
      const value = typeof e.total_value === 'number'
        ? e.total_value
        : (e.lines ?? []).reduce((s, l) => s + (l.value ?? 0), 0);
      m.set(dept, (m.get(dept) ?? 0) + value);
    }
    return Array.from(m.entries()).map(([department, consumption]) => ({ department, consumption }));
  }, [entries]);
  const chartConfig = getKpi('st-dept-consumption')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'department',
    series: [{ key: 'consumption', label: 'Consumption ₹' }],
    title: 'Consumption by department',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex justify-end px-6 pt-4">
        <Link to={`/erp/main-store-hub/consumption-register?month=${month}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            Drill: Consumption Register <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
      <ConsumptionSummaryReportPanel />
      <div className="px-6">
        <Card className="p-3 space-y-2" data-testid="st-dept-consumption-dashboard-host">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono" data-testid="st-dept-consumption-integrity-badge" title={integrityHash}>
              <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
            </Badge>
          </div>
          {chartRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No consumption data yet</div>
          ) : (
            <div className="w-full h-72" data-testid="st-dept-consumption-chart-host">
              <ReportChart data={chartRows} config={chartConfig} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default DepartmentConsumptionSummaryPanel;
