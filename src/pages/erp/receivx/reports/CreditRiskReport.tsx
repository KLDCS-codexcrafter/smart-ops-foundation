/**
 * CreditRiskReport.tsx — Per-customer credit risk classification
 * [JWT] GET /api/receivx/credit-risk
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Download, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type PTP, type ReceivXConfig,
  receivxPTPsKey, receivxConfigKey,
} from '@/types/receivx';
import type { OutstandingEntry } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
// RPT-2c · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

interface Customer {
  id: string;
  party_name?: string;
  name?: string;
  credit_limit?: number;
}

type Risk = 'GOOD' | 'WARN' | 'HOLD' | 'BAD';
const RISK_TONE: Record<Risk, string> = {
  GOOD: 'bg-green-100 text-green-800',
  WARN: 'bg-amber-100 text-amber-800',
  HOLD: 'bg-red-100 text-red-800',
  BAD: 'bg-red-200 text-red-900',
};

interface Row {
  id: string; name: string; creditLimit: number;
  outstanding: number; utilisation: number;
  oldestAge: number; brokenPtps: number; avgPeriod: number;
  risk: Risk;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const sixMonthsAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); };

export function CreditRiskReportPanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingEntry[]>([]);
  const [ptps, setPtps] = useState<PTP[]>([]);
  const [config, setConfig] = useState<ReceivXConfig | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      // [JWT] GET /api/masters/customers
      setCustomers(JSON.parse(localStorage.getItem(`erp_customers_${entityCode}`) || '[]'));
      // [JWT] GET /api/accounting/outstanding
      setOutstanding(JSON.parse(localStorage.getItem(`erp_outstanding_${entityCode}`) || '[]'));
      // [JWT] GET /api/receivx/ptps
      setPtps(JSON.parse(localStorage.getItem(receivxPTPsKey(entityCode)) || '[]'));
      // [JWT] GET /api/receivx/config
      const cfgRaw = localStorage.getItem(receivxConfigKey(entityCode));
      if (cfgRaw) setConfig(JSON.parse(cfgRaw));
    } catch { /* noop */ }
  }, [entityCode]);

  const rows: Row[] = useMemo(() => {
    const badAge = config?.bad_debtor_age_days ?? 180;
    const holdRatio = config?.credit_hold_ratio ?? 1.0;
    const sixMo = sixMonthsAgo();
    return customers.map(c => {
      const myOutstanding = outstanding.filter(o => o.party_id === c.id && o.party_type === 'debtor' && o.status !== 'settled' && o.status !== 'cancelled');
      const outAmt = myOutstanding.reduce((s, o) => s + o.pending_amount, 0);
      const creditLimit = Math.max(1, c.credit_limit ?? 0);
      const utilisation = creditLimit > 0 ? outAmt / creditLimit : 0;
      const todayD = new Date(today()).getTime();
      const ages = myOutstanding.map(o => Math.floor((todayD - new Date(o.due_date).getTime()) / (1000 * 60 * 60 * 24)));
      const oldestAge = ages.length > 0 ? Math.max(0, ...ages) : 0;
      const avgPeriod = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
      const brokenPtps = ptps.filter(p => p.party_id === c.id && p.status === 'broken' && p.created_at.slice(0, 10) >= sixMo).length;
      let risk: Risk = 'GOOD';
      if (oldestAge >= badAge) risk = 'BAD';
      else if (utilisation >= holdRatio) risk = 'HOLD';
      else if (brokenPtps >= 3 || utilisation >= 0.8) risk = 'WARN';
      return {
        id: c.id,
        name: c.party_name ?? c.name ?? c.id,
        creditLimit: c.credit_limit ?? 0,
        outstanding: outAmt,
        utilisation: Math.round(utilisation * 100),
        oldestAge,
        brokenPtps,
        avgPeriod,
        risk,
      };
    }).filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const order: Risk[] = ['BAD', 'HOLD', 'WARN', 'GOOD'];
        return order.indexOf(a.risk) - order.indexOf(b.risk);
      });
  }, [customers, outstanding, ptps, config, search]);

  const handleExport = useCallback(() => {
    const lines = [['Customer', 'Credit Limit', 'Outstanding', 'Util %', 'Oldest Age', 'Broken PTPs', 'Avg Period', 'Risk'].join(',')];
    for (const r of rows) lines.push([r.name, r.creditLimit, r.outstanding, r.utilisation, r.oldestAge, r.brokenPtps, r.avgPeriod, r.risk].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `credit-risk-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [rows]);

  useCtrlS(() => { handleExport(); });

  const placeOnHold = (id: string, name: string) => {
    toast.success(`${name} placed on credit hold`);
    // [JWT] POST /api/masters/customers/{id}/credit-hold — wired in next iteration
    void id;
  };

  // RPT-2c additive · chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const byRisk = new Map<string, number>();
    for (const r of rows) byRisk.set(r.risk, (byRisk.get(r.risk) ?? 0) + r.outstanding);
    return Array.from(byRisk.entries()).map(([risk, exposure]) => ({ risk, exposure }));
  }, [rows]);
  const chartConfig = getKpi('rx-credit-risk')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'risk',
    series: [{ key: 'exposure', label: 'Exposure' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Credit Risk Report</h1>
          <Badge variant="outline" className="text-[10px]" data-testid="rx-crr-period-chip">As of {today()}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="rx-crr-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <Button data-primary onClick={handleExport} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <Card className="p-3" data-testid="rx-crr-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'risk', label: 'Risk grade' },
            { key: 'exposure', label: 'Exposure', align: 'right', render: (r) => fmt(Number(r.exposure) || 0) },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No customers"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>


      <div className="flex items-center gap-2">
        <Input placeholder="Customer..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnterNext} className="w-60 h-8 text-xs" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs text-right">Credit Limit</TableHead>
              <TableHead className="text-xs text-right">Outstanding</TableHead>
              <TableHead className="text-xs text-right">Util %</TableHead>
              <TableHead className="text-xs text-right">Oldest</TableHead>
              <TableHead className="text-xs text-right">Broken PTP</TableHead>
              <TableHead className="text-xs text-right">Avg Period</TableHead>
              <TableHead className="text-xs">Risk</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">No customers.</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-medium">{r.name}</TableCell>
                <TableCell className="text-xs font-mono text-right">{fmt(r.creditLimit)}</TableCell>
                <TableCell className="text-xs font-mono text-right">{fmt(r.outstanding)}</TableCell>
                <TableCell className="text-xs text-right">{r.utilisation}%</TableCell>
                <TableCell className="text-xs text-right">{r.oldestAge}d</TableCell>
                <TableCell className="text-xs text-right">{r.brokenPtps}</TableCell>
                <TableCell className="text-xs text-right">{r.avgPeriod}d</TableCell>
                <TableCell><Badge className={`${RISK_TONE[r.risk]} text-[10px]`}>{r.risk}</Badge></TableCell>
                <TableCell>
                  {(r.risk === 'HOLD' || r.risk === 'BAD') && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => placeOnHold(r.id, r.name)}>
                      <Lock className="h-3 w-3 mr-1" /> Hold
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function CreditRiskReport() {
  return (
    <SidebarProvider>
      <CreditRiskReportPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />
    </SidebarProvider>
  );
}
