/**
 * @file        src/pages/erp/eximx/import/BoEList.tsx
 * @purpose     List of all BoEs · filter by status/type/RMS lane · Saathi tile entry
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Shield, Sparkles, ShieldCheck } from 'lucide-react';
import { loadBoEs, summarizeBoEs } from '@/lib/bill-of-entry-engine';
import { BOE_TYPE_DESCRIPTIONS } from '@/types/bill-of-entry';
import type { BillOfEntry } from '@/types/bill-of-entry';
// RPT-2b-i · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';


export function BoEList(): JSX.Element {
  const navigate = useNavigate();
  const entityCode = 'sinha-steel';
  const [boes, setBoes] = useState<BillOfEntry[]>([]);
  useEffect(() => { setBoes(loadBoEs(entityCode)); }, []);
  const summary = summarizeBoEs(boes);

  // RPT-2b-i · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const agg: Record<string, { status: string; duty: number; assessable_value: number }> = {};
    for (const b of boes) {
      const k = b.status;
      if (!agg[k]) agg[k] = { status: k, duty: 0, assessable_value: 0 };
      agg[k].duty += b.total_duty_inr;
      agg[k].assessable_value += b.total_landed_inr;
    }
    return Object.values(agg);
  }, [boes]);
  const chartConfig = getKpi('ex-boe-duty')?.defaultChart ?? defaultChartConfig({
    chartType: 'stacked-column', xKey: 'status',
    series: [
      { key: 'duty', label: 'Duty' },
      { key: 'assessable_value', label: 'Assessable value' },
    ],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  const laneBadge = (lane: BillOfEntry['icegate_simulated_lane']) => {
    if (lane === 'green') return <Badge variant="default" className="bg-green-600">Green</Badge>;
    if (lane === 'yellow') return <Badge variant="secondary" className="bg-yellow-500">Yellow</Badge>;
    if (lane === 'red') return <Badge variant="destructive">Red</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Bills of Entry</h1>
          <Badge variant="outline" className="text-[10px]" data-testid="ex-boe-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-boe-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
      </div>

      <Card className="p-3" data-testid="ex-boe-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'duty', label: 'Duty', align: 'right', render: (r) => `₹${Number(r.duty).toLocaleString('en-IN')}` },
            { key: 'assessable_value', label: 'Landed', align: 'right', render: (r) => `₹${Number(r.assessable_value).toLocaleString('en-IN')}` },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No BoEs"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

          <p className="text-sm text-muted-foreground">GL commit point · 5 auto-posted vouchers per BoE · RMS lane + AEO tier impact</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.total}</div><div className="text-xs text-muted-foreground">Total BoEs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success">{summary.aeo_fast_track_count}</div><div className="text-xs text-muted-foreground"><Shield className="w-3 h-3 inline mr-1" />AEO fast-track</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.project_import_count}</div><div className="text-xs text-muted-foreground">Project Imports (Sec 25)</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning">₹{summary.total_demurrage_inr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Demurrage YTD</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>BoE Register</CardTitle>
          <Button onClick={() => navigate('/erp/eximx/import')} variant="outline" size="sm">
            <Sparkles className="w-4 h-4 mr-2" /> Back to EximX
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>BoE No</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead>
              <TableHead>Status</TableHead><TableHead>RMS Lane</TableHead><TableHead>AEO</TableHead>
              <TableHead className="text-right">Duty (₹)</TableHead><TableHead className="text-right">Landed (₹)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {boes.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/import/bill-of-entry/${b.id}`)}>
                  <TableCell className="font-mono">{b.boe_no}</TableCell>
                  <TableCell><span title={BOE_TYPE_DESCRIPTIONS[b.boe_type]}>{b.boe_type.replace('_', ' ')}</span></TableCell>
                  <TableCell className="font-mono">{b.filing_date}</TableCell>
                  <TableCell><Badge variant="outline">{b.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{laneBadge(b.icegate_simulated_lane)}</TableCell>
                  <TableCell>{b.aeo_fast_track_eligible ? <Badge variant="default">{b.importer_aeo_tier}</Badge> : <Badge variant="outline">none</Badge>}</TableCell>
                  <TableCell className="text-right font-mono">{b.total_duty_inr.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono">{b.total_landed_inr.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
