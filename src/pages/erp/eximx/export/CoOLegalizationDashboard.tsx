/**
 * @file        src/pages/erp/eximx/export/CoOLegalizationDashboard.tsx
 * @purpose     Cross-SB embassy legalization TAT tracker · Moat #10 ADVANCED
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, ShieldCheck } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';
import { loadShippingBills } from '@/lib/shipping-bill-engine';
import { LEGALIZATION_COST_INR, LEGALIZATION_TAT_DAYS } from '@/lib/coo-legalization-engine';
import type { ShippingBill } from '@/types/shipping-bill';

export function CoOLegalizationDashboard(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [sbs, setSbs] = useState<ShippingBill[]>([]);
  useEffect(() => { setSbs(loadShippingBills(entityCode)); }, []);
  const legalization_required = sbs.filter((sb) => sb.coo_legalization_state !== 'not_required');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">CoO Legalization Dashboard</h1>
        <p className="text-sm text-muted-foreground">Moat #10 ADVANCED · 4-state workflow · UAE/CEPA legalization tracking · TAT + cost monitoring</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Award className="w-4 h-4 inline mr-2" />Legalization Pipeline</CardTitle></CardHeader>
        <CardContent>
          {legalization_required.length === 0 ? <p className="text-sm text-muted-foreground">No CoO legalization in flight</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>SB No</TableHead><TableHead>Rule</TableHead><TableHead>State</TableHead><TableHead>TAT (days)</TableHead><TableHead className="text-right">Cost (₹)</TableHead></TableRow></TableHeader>
              <TableBody>
                {legalization_required.map((sb) => (
                  <TableRow key={sb.id}>
                    <TableCell className="font-mono">{sb.sb_no}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{sb.coo_rule_kind}</Badge></TableCell>
                    <TableCell><Badge variant={sb.coo_legalization_state === 'legalized_returned' ? 'default' : 'secondary'}>{sb.coo_legalization_state.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>{LEGALIZATION_TAT_DAYS[sb.coo_rule_kind]}</TableCell>
                    <TableCell className="text-right font-mono">{LEGALIZATION_COST_INR[sb.coo_rule_kind].toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(() => {
        const states = ['not_required', 'chamber_attested', 'embassy_submitted', 'legalized_returned'] as const;
        const chartRows = states.map((st) => ({ state: st, count: sbs.filter((sb) => sb.coo_legalization_state === st).length }));
        const required = legalization_required.length;
        const returned = sbs.filter((sb) => sb.coo_legalization_state === 'legalized_returned').length;
        const pct = required === 0 ? 100 : Math.round((returned * 100) / required);
        const kpi = getKpi('ex-coo-legal');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'doughnut', xKey: 'state',
          series: [{ key: 'count', label: 'SB / state' }],
          title: 'CoO legalization status',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 80, red: 60, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biv-coo-legal-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="CoO legalization %" value={`${pct}%`} rag={rag} hint="Returned vs required" />
              <ScorecardTile label="In flight" value={required} hint="Legalization required" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-coo-legal">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Integrity</span>
                <span className="font-mono text-xs">{sig.slice(0, 12)}</span>
              </Card>
            </div>
            <Card className="p-4">
              <div className="h-72">
                <ReportChart data={chartRows} config={chartConfig} />
              </div>
            </Card>
          </section>
        );
      })()}
    </div>
  );
}

