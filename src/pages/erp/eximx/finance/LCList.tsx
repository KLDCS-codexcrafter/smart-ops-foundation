/**
 * @file src/pages/erp/eximx/finance/LCList.tsx
 * @purpose D-NEW-FJ · LC list with status filter + LC summary cards · 10th SIBLING UI surface
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block C
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadLCs, summarizeLCs } from '@/lib/lc-engine';
import type { LCStatus } from '@/types/letter-of-credit';
// RPT-2b-i · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';


const STATUS_VARIANT: Record<LCStatus, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  opened: 'default',
  advised: 'default',
  confirmed: 'default',
  amended: 'secondary',
  documents_presented: 'default',
  negotiated: 'default',
  settled: 'secondary',
  expired: 'destructive',
  cancelled: 'destructive',
};

export default function LCList(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [statusFilter] = useState<LCStatus | 'all'>('all');
  const lcs = useMemo(() => (entityCode ? loadLCs(entityCode) : []), [entityCode]);
  const filtered = useMemo(
    () => (statusFilter === 'all' ? lcs : lcs.filter((lc) => lc.status === statusFilter)),
    [lcs, statusFilter],
  );
  const summary = summarizeLCs(lcs);

  // RPT-2b-i · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lc of lcs) counts[lc.status] = (counts[lc.status] ?? 0) + 1;
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [lcs]);
  const chartConfig = getKpi('ex-lc-status')?.defaultChart ?? defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'count', label: 'LCs' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-semibold">Letters of Credit · D-NEW-FJ · 10th SIBLING</h1>
        <Badge variant="outline" className="text-[10px]" data-testid="ex-lc-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-lc-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
      </div>

      <Card className="p-3" data-testid="ex-lc-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'count', label: 'Count', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No LCs"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total LCs</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.open}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Docs pending</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.documents_pending}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Negotiated</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.negotiated}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">₹{summary.total_outstanding_inr.toLocaleString('en-IN')}</p></CardContent></Card>
      </div>


      <Card>
        <CardHeader><CardTitle className="text-base">LC contracts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>LC No</TableHead><TableHead>Type</TableHead>
              <TableHead>Status</TableHead><TableHead>Buyer</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead>Expiry</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((lc) => (
                <TableRow key={lc.id}>
                  <TableCell><Link to={`/erp/eximx/finance/lc/${lc.id}`} className="text-primary underline font-mono">{lc.lc_no}</Link></TableCell>
                  <TableCell className="text-xs">{lc.lc_type}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[lc.status]}>{lc.status}</Badge></TableCell>
                  <TableCell className="text-xs">{lc.issuing_bank_country}</TableCell>
                  <TableCell className="text-right font-mono">{lc.currency_code} {lc.lc_amount_foreign.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs font-mono">{lc.expiry_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
