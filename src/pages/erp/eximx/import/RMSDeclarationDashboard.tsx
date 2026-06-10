/**
 * @file        src/pages/erp/eximx/import/RMSDeclarationDashboard.tsx
 * @purpose     Cross-BoE RMS lane analytics · prediction vs actual variance · Moat #2 surface
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldCheck } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';
import { loadRMSDeclarations, computeLaneVariance } from '@/lib/rms-lane-engine';
import type { RMSDeclaration } from '@/types/rms-declaration';

export function RMSDeclarationDashboard(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [decs, setDecs] = useState<RMSDeclaration[]>([]);
  useEffect(() => { setDecs(loadRMSDeclarations(entityCode)); }, []);

  const total = decs.length;
  const pending = decs.filter((d) => d.actual_lane === null).length;
  const resolved = total - pending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RMS Declaration Dashboard</h1>
        <p className="text-sm text-muted-foreground">Moat #2 · prediction vs ICEGATE actual lane · variance tracking</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{total}</div><div className="text-xs text-muted-foreground">Total RMS</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning font-mono">{pending}</div><div className="text-xs text-muted-foreground">Pending ICEGATE</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success font-mono">{resolved}</div><div className="text-xs text-muted-foreground">Resolved</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Shield className="w-4 h-4 inline mr-2" />RMS Register</CardTitle></CardHeader>
        <CardContent>
          {decs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RMS declarations yet · file a BoE to auto-create</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>RMS ID</TableHead><TableHead>BoE</TableHead><TableHead>Declared</TableHead>
                <TableHead>Actual</TableHead><TableHead>Variance</TableHead><TableHead>Risk Factors</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {decs.map((d) => {
                  const v = computeLaneVariance(d.declared_lane, d.actual_lane);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.id}</TableCell>
                      <TableCell className="font-mono text-xs">{d.related_boe_id ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline">{d.declared_lane}</Badge></TableCell>
                      <TableCell>{d.actual_lane ? <Badge variant="outline">{d.actual_lane}</Badge> : <Badge variant="secondary">pending</Badge>}</TableCell>
                      <TableCell><Badge variant={v.variance === 'none' ? 'default' : 'outline'} title={v.description}>{v.variance}</Badge></TableCell>
                      <TableCell className="text-xs">{d.risk_factors.join(', ')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(() => {
        const chartRows = [
          { status: 'pending', count: pending },
          { status: 'resolved', count: resolved },
        ];
        const pct = total === 0 ? 100 : Math.round((resolved * 100) / total);
        const kpi = getKpi('ex-rms');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'doughnut', xKey: 'status',
          series: [{ key: 'count', label: 'Declarations' }],
          title: 'RMS declaration status',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 90, red: 70, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biv-rms-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="RMS declaration %" value={`${pct}%`} rag={rag} hint="Resolved vs total" />
              <ScorecardTile label="Pending ICEGATE" value={pending} hint="Awaiting actual lane" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-rms">
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

