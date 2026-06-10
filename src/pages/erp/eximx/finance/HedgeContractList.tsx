/**
 * @file        src/pages/erp/eximx/finance/HedgeContractList.tsx
 * @purpose     Hedge contracts list + maturity calendar + D-NEW-FB quarter-end accrual tile (7th D-NEW-FG consumer)
 * @sprint      T-Phase-1.EX-8 + T-Phase-2.B-2 · RPT-2b-ii additive chart wrap
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Activity, ShieldCheck } from 'lucide-react';
import { loadHedges } from '@/lib/hedge-contract-engine';
import type { HedgeContract } from '@/types/hedge-contract';
import {
  computeQuarterEndHedgeAccruals,
  summarizeAccrualReport,
} from '@/lib/hedge-accrual-engine';
// RPT-2b-ii · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

export function HedgeContractList(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [hedges, setHedges] = useState<HedgeContract[]>([]);
  useEffect(() => { setHedges(loadHedges(entityCode)); }, []);

  const open = hedges.filter((h) => h.status === 'open');
  const totalNotionalInr = open.reduce((s, h) => s + h.notional_amount_inr_at_lock, 0);

  // D-NEW-FB · Q1 FY26-27 accrual · illustrative spot 87.50 INR/USD
  const accrualReport = useMemo(
    () => computeQuarterEndHedgeAccruals(entityCode, 'Q1', '2026-04-01', '2026-06-30', 87.50),
    [],
  );
  const summary = summarizeAccrualReport(accrualReport);

  // RPT-2b-ii · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const byCcy: Record<string, number> = {};
    for (const h of hedges) {
      byCcy[h.currency_code] = (byCcy[h.currency_code] ?? 0) + h.notional_amount_inr_at_lock;
    }
    return Object.entries(byCcy).map(([currency, notional]) => ({ currency, notional }));
  }, [hedges]);
  const chartConfig = getKpi('ex-hedge')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'currency',
    series: [{ key: 'notional', label: 'Notional' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]" data-testid="ex-hedge-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-hedge-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
      </div>

      <Card className="p-3" data-testid="ex-hedge-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'currency', label: 'Currency' },
            { key: 'notional', label: 'Notional (₹)', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No hedges"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{hedges.length}</div><div className="text-xs text-muted-foreground">Total Hedge Contracts</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{open.length}</div><div className="text-xs text-muted-foreground">Open</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">₹{totalNotionalInr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Notional Locked</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><TrendingUp className="w-4 h-4 inline mr-2" />Hedge Contracts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Contract No</TableHead><TableHead>Direction</TableHead><TableHead>Currency</TableHead><TableHead>Notional</TableHead><TableHead>Forward Rate</TableHead><TableHead>Maturity</TableHead><TableHead>Linked</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {hedges.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono">{h.hedge_contract_no}</TableCell>
                  <TableCell><Badge variant={h.direction === 'forward_sell' ? 'default' : 'secondary'}>{h.direction.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="font-mono">{h.currency_code}</TableCell>
                  <TableCell className="font-mono">{h.notional_amount_foreign.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-mono">{h.forward_rate_locked}</TableCell>
                  <TableCell>{h.maturity_date}</TableCell>
                  <TableCell className="text-xs">{h.is_speculative ? <Badge variant="outline">speculative</Badge> : <code>{h.linked_export_po_id ?? h.linked_import_po_id}</code>}</TableCell>
                  <TableCell><Badge variant="outline">{h.status.replace(/_/g, ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {summary.hedges > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Quarter-end Accrual · D-NEW-FB · 7th D-NEW-FG consumer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Open hedges</p>
                <p className="text-lg font-semibold">{summary.hedges}</p>
              </div>
              <div>
                <p className="text-muted-foreground">OCI (effective)</p>
                <p className="text-lg font-semibold">₹ {summary.oci_inr.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">P&amp;L (ineffective)</p>
                <p className="text-lg font-semibold">₹ {summary.pnl_inr.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net unrealised</p>
                <p className="text-lg font-semibold">₹ {summary.net_unrealised_inr.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ind AS 109 hedge accounting · effective portion to Hedge Reserve OCI · ineffective to P&amp;L MTM ledger.
              Voucher routing via voucher-runtime-engine (7th D-NEW-FG consumer · hedge-accrual-engine).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
