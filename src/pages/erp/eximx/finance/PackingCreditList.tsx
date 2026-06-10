/**
 * @file src/pages/erp/eximx/finance/PackingCreditList.tsx
 * @purpose D-NEW-FK · PC list with variant filter + RBI deadline tile · 11th SIBLING UI · RPT-2b-ii chart wrap
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block D · RPT-2b-ii additive chart wrap
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { Banknote, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadPCs, summarizePCs } from '@/lib/packing-credit-engine';
import type { PCStatus } from '@/types/packing-credit';
// RPT-2b-ii · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

const STATUS_VARIANT: Record<PCStatus, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  sanctioned: 'default',
  drawn: 'default',
  partially_liquidated: 'default',
  fully_liquidated: 'secondary',
  overdue: 'destructive',
  cancelled: 'destructive',
};

export default function PackingCreditList(): JSX.Element {
  const { entityCode } = useEntityCode();
  const pcs = useMemo(() => (entityCode ? loadPCs(entityCode) : []), [entityCode]);
  const summary = summarizePCs(pcs);

  // RPT-2b-ii · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const pc of pcs) {
      byStatus[pc.status] = (byStatus[pc.status] ?? 0) + pc.outstanding_amount_inr;
    }
    return Object.entries(byStatus).map(([status, outstanding]) => ({ status, outstanding }));
  }, [pcs]);
  const chartConfig = getKpi('ex-packing-credit')?.defaultChart ?? defaultChartConfig({
    chartType: 'doughnut', xKey: 'status',
    series: [{ key: 'outstanding', label: 'Outstanding' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Banknote className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-semibold">Packing Credit · D-NEW-FK · 11th SIBLING</h1>
        <Badge variant="outline" className="text-[10px]" data-testid="ex-pc-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-pc-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
      </div>

      <Card className="p-3" data-testid="ex-pc-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'outstanding', label: 'Outstanding (₹)', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No packing credit"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Drawn</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.drawn}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overdue (270d)</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">{summary.overdue}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">PCFC out.</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">₹{summary.pcfc_outstanding_inr.toLocaleString('en-IN')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">EPC out.</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-semibold font-mono">₹{summary.epc_outstanding_inr.toLocaleString('en-IN')}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">PC contracts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Contract No</TableHead><TableHead>Variant</TableHead>
              <TableHead>Status</TableHead><TableHead>Bank</TableHead>
              <TableHead className="text-right">Outstanding</TableHead><TableHead>Days to deadline</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pcs.map((pc) => (
                <TableRow key={pc.id}>
                  <TableCell><Link to={`/erp/eximx/finance/packing-credit/${pc.id}`} className="text-primary underline font-mono">{pc.pc_contract_no}</Link></TableCell>
                  <TableCell><Badge variant="outline">{pc.variant}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[pc.status]}>{pc.status}</Badge></TableCell>
                  <TableCell className="text-xs">{pc.ad_bank_name}</TableCell>
                  <TableCell className="text-right font-mono">₹{pc.outstanding_amount_inr.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs font-mono">{pc.days_to_deadline}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
