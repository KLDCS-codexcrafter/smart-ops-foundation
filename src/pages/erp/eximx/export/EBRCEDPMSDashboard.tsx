/**
 * @file        src/pages/erp/eximx/export/EBRCEDPMSDashboard.tsx
 * @purpose     e-BRC + EDPMS reconciliation dashboard · v7 Gap #2
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, ShieldCheck } from 'lucide-react';
import { loadEBRCs, loadEDPMS } from '@/lib/ebrc-edpms-engine';
import type { EBRC, EDPMSDeclaration } from '@/types/ebrc-edpms';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';

export function EBRCEDPMSDashboard(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [ebrcs, setEbrcs] = useState<EBRC[]>([]);
  const [edpms, setEdpms] = useState<EDPMSDeclaration[]>([]);
  useEffect(() => { setEbrcs(loadEBRCs(entityCode)); setEdpms(loadEDPMS(entityCode)); }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">e-BRC + EDPMS Reconciliation</h1>
        <p className="text-sm text-muted-foreground">v7 Gap #2 · EBRC (issued by AD bank · enables drawback/RoDTEP) DISTINCT from FIRC (per-remittance certificate)</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Banknote className="w-4 h-4 inline mr-2" />EBRC Register</CardTitle></CardHeader>
        <CardContent>
          {ebrcs.length === 0 ? <p className="text-sm text-muted-foreground">No EBRCs yet · auto-issued upon full realisation</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>EBRC No</TableHead><TableHead>AD Bank</TableHead><TableHead>SB</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Value (₹)</TableHead><TableHead>Claims Used</TableHead></TableRow></TableHeader>
              <TableBody>
                {ebrcs.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.ebrc_no}</TableCell>
                    <TableCell>{e.ad_bank_name}</TableCell>
                    <TableCell className="font-mono text-xs">{e.related_shipping_bill_no}</TableCell>
                    <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{e.full_value_inr.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{e.drawback_claim_used && <Badge variant="default" className="bg-blue-600 mr-1">DBK</Badge>}{e.rodtep_claim_used && <Badge variant="default" className="bg-purple-600">RoDTEP</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Banknote className="w-4 h-4 inline mr-2" />EDPMS · RBI Master State</CardTitle></CardHeader>
        <CardContent>
          {edpms.length === 0 ? <p className="text-sm text-muted-foreground">No EDPMS declarations yet · auto-created on shipping bill submission</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>EDPMS Ref</TableHead><TableHead>SB</TableHead><TableHead>State</TableHead><TableHead>Reported</TableHead><TableHead>Realised</TableHead></TableRow></TableHeader>
              <TableBody>
                {edpms.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.edpms_ref_no}</TableCell>
                    <TableCell className="font-mono text-xs">{e.related_shipping_bill_no}</TableCell>
                    <TableCell><Badge variant={e.state === 'closed' ? 'default' : e.state === 'caution' ? 'destructive' : 'outline'} className={e.state === 'closed' ? 'bg-green-600' : ''}>{e.state}</Badge></TableCell>
                    <TableCell>{e.rbi_reported_date}</TableCell>
                    <TableCell>{e.rbi_realised_date ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(() => {
        const closed = edpms.filter((e) => e.state === 'closed').length;
        const caution = edpms.filter((e) => e.state === 'caution').length;
        const open = edpms.length - closed - caution;
        const chartRows = [
          { status: 'Closed', count: closed },
          { status: 'Caution', count: caution },
          { status: 'Open', count: open },
        ];
        const pct = edpms.length > 0 ? Math.round((closed * 100) / edpms.length) : 100;
        const kpi = getKpi('ex-ebrc');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'doughnut', xKey: 'status',
          series: [{ key: 'count', label: 'EDPMS records' }],
          title: 'e-BRC / EDPMS recon status',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 90, red: 75, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biii-ebrc-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="e-BRC/EDPMS recon %" value={`${pct}%`} rag={rag} hint="Closed vs total EDPMS" />
              <ScorecardTile label="EBRCs issued" value={ebrcs.length} hint="Auto-issued on full realisation" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-ebrc">
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
