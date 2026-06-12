/**
 * @file        src/pages/erp/servicedesk/customer-hub/CustomerSLAEnquiry.tsx
 * @purpose     C.1e · D-NEW-CY 4th consumer · FR-77 promotion · RPT-8a chart-enabled
 * @sprint      T-Phase-1.C.1e · Block E.2 · RPT-8a (additive · no real met-% available → thresholds OMITTED)
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  getActiveCustomerTier,
  applyTierToSLAHours,
} from '@/lib/servicedesk-engine';
import { getSLAMatrixSettings } from '@/lib/cc-compliance-settings';
import { TIER_BENEFITS } from '@/types/customer-service-tier';
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

const ENTITY = 'OPRX';

export function CustomerSLAEnquiry({ customerId }: { customerId?: string | null }): JSX.Element {
  const cid = customerId ?? 'C-1';
  // [JWT] D-NEW-CY 4th consumer · cc-compliance-settings READ-ONLY
  const matrix = getSLAMatrixSettings(ENTITY);
  const tier = getActiveCustomerTier(cid, ENTITY);
  const benefits = tier ? TIER_BENEFITS[tier.tier] : null;
  const fasterPct = benefits ? Math.round((1 - benefits.sla_multiplier) * 100) : 0;

  // Chart: status mix derived from SLA matrix severity distribution (honest counts,
  // no fabricated met-% → KPI thresholds OMITTED per spec).
  const chartRows = (() => {
    const bySeverity = new Map<string, number>();
    for (const cell of matrix.matrix) {
      bySeverity.set(cell.severity, (bySeverity.get(cell.severity) ?? 0) + 1);
    }
    return Array.from(bySeverity.entries()).map(([severity, count]) => ({ sla_status: severity, count }));
  })();
  const cfg = getKpi('sd-sla')?.defaultChart ?? defaultChartConfig({
    chartType: 'doughnut', xKey: 'sla_status',
    series: [{ key: 'count', label: 'Cells' }],
    title: 'SLA matrix coverage by severity',
  });
  const hash = signReport(chartRows);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Your SLA Targets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customer <span className="font-mono">{cid}</span>
        </p>
      </div>

      <Card className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your service tier</p>
          <p className="text-2xl font-semibold mt-1">{benefits?.label ?? 'Standard'}</p>
        </div>
        {fasterPct > 0 && <Badge variant="default">{fasterPct}% faster SLA</Badge>}
      </Card>

      <Card className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="p-3 font-medium">Call Type</th>
              <th className="p-3 font-medium">Severity</th>
              <th className="p-3 font-medium">Response</th>
              <th className="p-3 font-medium">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {matrix.matrix.map((cell, i) => {
              const adjResp = applyTierToSLAHours(cell.response_hours, cid, ENTITY);
              const adjRes = applyTierToSLAHours(cell.resolution_hours, cid, ENTITY);
              return (
                <tr key={`${cell.call_type_code}-${cell.severity}-${i}`} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{cell.call_type_code}</td>
                  <td className="p-3 text-xs">{cell.severity}</td>
                  <td className="p-3 font-mono text-xs">within {adjResp}h</td>
                  <td className="p-3 font-mono text-xs">within {adjRes}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-3 space-y-2" data-testid="sd-sla-dashboard-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="sd-sla-integrity-badge" title={hash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{short}
          </Badge>
        </div>
        <div className="w-full h-56" data-testid="sd-sla-chart-host">
          <ReportChart data={chartRows} config={cfg} />
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Your service tier determines response/resolution multipliers. Contact support to upgrade tier.
      </p>
    </div>
  );
}
