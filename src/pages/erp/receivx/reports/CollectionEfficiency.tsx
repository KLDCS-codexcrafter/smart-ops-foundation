/**
 * CollectionEfficiency.tsx — Per-salesman collection KPIs
 * [JWT] GET /api/receivx/collection-efficiency
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type OutstandingTask, type PTP,
  receivxTasksKey, receivxPTPsKey,
} from '@/types/receivx';
import type { Voucher } from '@/types/voucher';
import { computeDSO, computePTPKeptRatio } from '@/lib/receivx-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const lastMonthStart = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };
const lastMonthEnd = () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); };

interface Row {
  id: string; name: string;
  invoiced: number; collected: number; dso: number;
  pctKept: number; avgPeriod: number; over60: number; trend: number;
}

export function CollectionEfficiencyPanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [tasks, setTasks] = useState<OutstandingTask[]>([]);
  const [ptps, setPtps] = useState<PTP[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  useEffect(() => {
    try {
      // [JWT] GET /api/receivx/tasks
      setTasks(JSON.parse(localStorage.getItem(receivxTasksKey(entityCode)) || '[]'));
      // [JWT] GET /api/receivx/ptps
      setPtps(JSON.parse(localStorage.getItem(receivxPTPsKey(entityCode)) || '[]'));
      // [JWT] GET /api/accounting/vouchers
      setVouchers(JSON.parse(localStorage.getItem(`erp_group_vouchers_${entityCode}`) || '[]'));
    } catch { /* noop */ }
  }, [entityCode]);

  const rows: Row[] = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; tasks: OutstandingTask[] }>();
    for (const t of tasks) {
      const id = t.assigned_salesman_id ?? '__unassigned__';
      const name = t.assigned_salesman_name ?? 'Unassigned';
      if (!groups.has(id)) groups.set(id, { id, name, tasks: [] });
      groups.get(id)!.tasks.push(t);
    }
    return Array.from(groups.values()).map(g => {
      const invoicesMTD = vouchers.filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted'
        && v.date >= fromDate && v.date <= toDate
        && v.sam_salesman_id === g.id);
      const receiptsMTD = vouchers.filter(v => v.base_voucher_type === 'Receipt' && v.status === 'posted'
        && v.date >= fromDate && v.date <= toDate
        && v.sam_salesman_id === g.id);
      const invoiced = invoicesMTD.reduce((s, v) => s + v.net_amount, 0);
      const collected = receiptsMTD.reduce((s, v) => s + v.net_amount, 0);
      const dso = computeDSO(
        invoicesMTD.map(v => ({ date: v.date, amount: v.net_amount })),
        receiptsMTD.map(v => ({ date: v.date, amount: v.net_amount })),
        30,
      );
      const personPtps = ptps.filter(p => g.tasks.some(t => t.party_id === p.party_id));
      const pctKept = computePTPKeptRatio(personPtps, fromDate, toDate).pctKept;
      const avgPeriod = g.tasks.length > 0 ? Math.round(g.tasks.reduce((s, t) => s + t.age_days, 0) / g.tasks.length) : 0;
      const over60Total = g.tasks.filter(t => t.age_days > 60).reduce((s, t) => s + t.pending_amount, 0);
      const allTotal = g.tasks.reduce((s, t) => s + t.pending_amount, 0);
      const over60 = allTotal > 0 ? Math.round((over60Total / allTotal) * 100) : 0;
      const lmInvoiced = vouchers.filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted'
        && v.date >= lastMonthStart() && v.date <= lastMonthEnd()
        && v.sam_salesman_id === g.id).reduce((s, v) => s + v.net_amount, 0);
      const trend = lmInvoiced > 0 ? Math.round(((collected - lmInvoiced) / lmInvoiced) * 100) : 0;
      return { id: g.id, name: g.name, invoiced, collected, dso, pctKept, avgPeriod, over60, trend };
    }).filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.collected - a.collected);
  }, [tasks, ptps, vouchers, fromDate, toDate, search]);

  const handleExport = useCallback(() => {
    const lines = [['Salesman', 'Invoiced', 'Collected', 'DSO', 'Kept %', 'Avg Period', 'Over-60 %', 'Trend %'].join(',')];
    for (const r of rows) lines.push([r.name, r.invoiced, r.collected, r.dso, r.pctKept, r.avgPeriod, r.over60, r.trend].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `collection-efficiency-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [rows]);

  useCtrlS(() => { handleExport(); });

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Collection Efficiency</h1>
          <p className="text-xs text-muted-foreground">Per-salesman MTD collection KPIs</p>
        </div>
        <Button data-primary onClick={handleExport} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input placeholder="Salesman..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnterNext} className="w-48 h-8 text-xs" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Salesman</TableHead>
              <TableHead className="text-xs text-right">Invoiced</TableHead>
              <TableHead className="text-xs text-right">Collected</TableHead>
              <TableHead className="text-xs text-right">DSO</TableHead>
              <TableHead className="text-xs text-right">Kept %</TableHead>
              <TableHead className="text-xs text-right">Avg Period</TableHead>
              <TableHead className="text-xs text-right">Over-60 %</TableHead>
              <TableHead className="text-xs text-right">Trend vs LM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No data.</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-medium">{r.name}</TableCell>
                <TableCell className="text-xs font-mono text-right">{fmt(r.invoiced)}</TableCell>
                <TableCell className="text-xs font-mono text-right text-green-600">{fmt(r.collected)}</TableCell>
                <TableCell className="text-xs text-right">{r.dso}</TableCell>
                <TableCell className="text-xs text-right">{r.pctKept}%</TableCell>
                <TableCell className="text-xs text-right">{r.avgPeriod}d</TableCell>
                <TableCell className="text-xs text-right">{r.over60}%</TableCell>
                <TableCell className="text-xs text-right">
                  <span className={r.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {r.trend >= 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                    {r.trend}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-3">
        <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-2">Legend</p>
        <ul className="text-[10px] text-muted-foreground space-y-1">
          <li><b>Invoiced/Collected:</b> Sales and Receipts within selected window per salesman.</li>
          <li><b>DSO:</b> Days Sales Outstanding · (AR / Sales) × 30.</li>
          <li><b>Kept %:</b> Promise-to-Pay completion rate.</li>
          <li><b>Avg Period:</b> Average task age in days.</li>
          <li><b>Over-60 %:</b> Share of pending receivables aged &gt; 60 days.</li>
          <li><b>Trend vs LM:</b> Collected this period vs invoiced last month.</li>
        </ul>
      </Card>
    </div>
  );
}

export default function CollectionEfficiency() {
  return (
    <SidebarProvider>
      <CollectionEfficiencyPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />
    </SidebarProvider>
  );
}
