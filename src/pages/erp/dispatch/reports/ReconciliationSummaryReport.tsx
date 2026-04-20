/**
 * ReconciliationSummaryReport.tsx — Sprint 15c-1
 * MODULE ID: dh-r-reconciliation-summary
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Lightbulb, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type MatchLine, type Dispute, matchLinesKey, disputesKey,
} from '@/types/freight-reconciliation';
import { type TransporterInvoice, transporterInvoicesKey } from '@/types/transporter-invoice';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthOf(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }

export function ReconciliationSummaryReportPanel() {
  const { entityCode } = useCardEntitlement();
  const [matches, setMatches] = useState<MatchLine[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [invoices, setInvoices] = useState<TransporterInvoice[]>([]);

  const today = new Date();
  const defFrom = startOfMonth(today).toISOString().slice(0, 10);
  const defTo = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);

  const refresh = useCallback(() => {
    setMatches(ls<MatchLine>(matchLinesKey(entityCode)));
    setDisputes(ls<Dispute>(disputesKey(entityCode)));
    setInvoices(ls<TransporterInvoice>(transporterInvoicesKey(entityCode)));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const inRange = useCallback((iso: string) => {
    return iso >= from && iso <= `${to}T23:59:59Z`;
  }, [from, to]);

  const periodMatches = useMemo(() =>
    matches.filter(m => inRange(m.computed_at)), [matches, inRange]);

  const periodInvoices = useMemo(() =>
    invoices.filter(i =>
      i.reconciled_at ? inRange(i.reconciled_at) : inRange(i.uploaded_at),
    ), [invoices, inRange]);

  const kpi = useMemo(() => {
    const totalDeclared = periodMatches.reduce((s, m) => s + m.declared_amount, 0);
    const totalExpected = periodMatches.reduce((s, m) => s + m.expected_amount, 0);
    const variance = totalDeclared - totalExpected;
    const totalLines = periodMatches.length;
    const approved = periodMatches.filter(m =>
      m.auto_decision === 'approve' || m.final_decision === 'approve').length;
    const flagged = periodMatches.filter(m => m.auto_decision === 'flag').length;
    const disputed = periodMatches.filter(m => m.auto_decision === 'dispute').length;
    const pctAuto = totalLines > 0 ? (approved / totalLines) * 100 : 0;
    const pctFlag = totalLines > 0 ? (flagged / totalLines) * 100 : 0;
    const pctDisp = totalLines > 0 ? (disputed / totalLines) * 100 : 0;
    return {
      invoicesReconciled: periodInvoices.filter(i => i.status !== 'uploaded').length,
      lines: totalLines, totalDeclared, totalExpected, variance,
      pctAuto, pctFlag, pctDisp,
    };
  }, [periodMatches, periodInvoices]);

  const byTransporter = useMemo(() => {
    const map = new Map<string, {
      logistic_id: string; name: string; invoices: number;
      lines: number; declared: number; expected: number;
      disputes: number; savingsFlagged: number;
    }>();
    const invByLogistic = new Map<string, Set<string>>();
    for (const inv of periodInvoices) {
      const set = invByLogistic.get(inv.logistic_id) ?? new Set<string>();
      set.add(inv.id);
      invByLogistic.set(inv.logistic_id, set);
    }
    for (const m of periodMatches) {
      const inv = invoices.find(i => i.id === m.invoice_id);
      if (!inv) continue;
      const cur = map.get(inv.logistic_id) ?? {
        logistic_id: inv.logistic_id, name: inv.logistic_name,
        invoices: invByLogistic.get(inv.logistic_id)?.size ?? 0,
        lines: 0, declared: 0, expected: 0, disputes: 0, savingsFlagged: 0,
      };
      cur.lines += 1;
      cur.declared += m.declared_amount;
      cur.expected += m.expected_amount;
      if (m.status === 'over_billed' || m.status === 'ghost_lr') {
        cur.savingsFlagged += Math.max(0, m.variance_amount);
      }
      map.set(inv.logistic_id, cur);
    }
    for (const d of disputes) {
      if (!inRange(d.raised_at)) continue;
      const cur = map.get(d.logistic_id);
      if (cur) cur.disputes += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.declared - b.expected) - (a.declared - a.expected),
    );
  }, [periodInvoices, periodMatches, invoices, disputes, inRange]);

  const insights = useMemo(() => {
    const overBilled = matches
      .filter(m => m.status === 'over_billed')
      .sort((a, b) => b.variance_amount - a.variance_amount);
    const largest = overBilled[0];
    const largestInv = largest ? invoices.find(i => i.id === largest.invoice_id) : null;

    const dispCount = new Map<string, { name: string; count: number }>();
    for (const d of disputes) {
      const cur = dispCount.get(d.logistic_id) ?? { name: d.logistic_name, count: 0 };
      cur.count += 1;
      dispCount.set(d.logistic_id, cur);
    }
    const topDisputer = Array.from(dispCount.values()).sort((a, b) => b.count - a.count)[0];

    const totalFlagged = matches
      .filter(m => m.status === 'over_billed' || m.status === 'ghost_lr')
      .reduce((s, m) => s + Math.max(0, m.variance_amount), 0);

    const recovered = disputes
      .filter(d => d.status === 'resolved_in_favor_of_us' || d.status === 'resolved_split')
      .reduce((s, d) => s + (d.resolution_amount ?? d.amount_in_dispute), 0);

    return { largest, largestInv, topDisputer, totalFlagged, recovered };
  }, [matches, disputes, invoices]);

  const trend = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const buckets = new Map<string, { declared: number; expected: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(sixMonthsAgo.getMonth() + i);
      buckets.set(d.toISOString().slice(0, 7), { declared: 0, expected: 0 });
    }
    for (const m of matches) {
      const k = monthOf(m.computed_at);
      const b = buckets.get(k);
      if (b) {
        b.declared += m.declared_amount;
        b.expected += m.expected_amount;
      }
    }
    return Array.from(buckets.entries()).map(([month, v]) => ({
      month,
      variance_pct: v.expected > 0 ? ((v.declared - v.expected) / v.expected) * 100 : 0,
    }));
  }, [matches]);

  const exportCsv = () => {
    const headers = ['Transporter', 'Invoices', 'Lines', 'Declared', 'Expected', 'Variance', 'Variance %', 'Disputes', 'Flagged Savings'];
    const rows = byTransporter.map(r => {
      const varPct = r.expected > 0 ? ((r.declared - r.expected) / r.expected) * 100 : 0;
      return [
        r.name, r.invoices, r.lines,
        r.declared.toFixed(2), r.expected.toFixed(2),
        (r.declared - r.expected).toFixed(2), varPct.toFixed(2),
        r.disputes, r.savingsFlagged.toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reconciliation-summary-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const lowAuto = kpi.lines > 0 && kpi.pctAuto < 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Reconciliation Summary</h2>
          <p className="text-xs text-muted-foreground">3-way match outcomes · Variance analytics · Insights</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-[10px]">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36" />
          </div>
          <div>
            <Label className="text-[10px]">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Invoices Reconciled</p>
          <p className="text-2xl font-mono font-bold text-blue-600">{kpi.invoicesReconciled}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Lines Matched</p>
          <p className="text-2xl font-mono font-bold text-foreground">{kpi.lines}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Declared</p>
          <p className="text-xl font-mono font-bold text-foreground">{fmtINR(kpi.totalDeclared)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Expected</p>
          <p className="text-xl font-mono font-bold text-foreground">{fmtINR(kpi.totalExpected)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Net Variance</p>
          <p className={`text-xl font-mono font-bold ${kpi.variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmtINR(kpi.variance)}
          </p>
        </CardContent></Card>
      </div>

      {/* Workflow efficiency */}
      <Card><CardContent className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground uppercase">Workflow Efficiency</p>
        <div className="flex gap-6 text-sm">
          <span className="text-emerald-600 font-mono">{kpi.pctAuto.toFixed(1)}% auto-approved</span>
          <span className="text-amber-600 font-mono">{kpi.pctFlag.toFixed(1)}% flagged</span>
          <span className="text-red-600 font-mono">{kpi.pctDisp.toFixed(1)}% disputed</span>
        </div>
        {lowAuto && (
          <div className="flex gap-2 items-center text-xs bg-amber-500/10 border border-amber-500/30 p-2 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Auto-approval rate is below 60% — consider tightening rate cards or widening tolerance.</span>
          </div>
        )}
      </CardContent></Card>

      {/* By transporter table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transporter</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead className="text-right">Declared</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Variance ₹</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead className="text-right">Disputes</TableHead>
              <TableHead className="text-right">Flagged Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byTransporter.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No reconciliation data in this period.
              </TableCell></TableRow>
            )}
            {byTransporter.map(r => {
              const variance = r.declared - r.expected;
              const varPct = r.expected > 0 ? (variance / r.expected) * 100 : 0;
              return (
                <TableRow key={r.logistic_id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{r.invoices}</TableCell>
                  <TableCell className="text-right font-mono">{r.lines}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(r.declared)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(r.expected)}</TableCell>
                  <TableCell className={`text-right font-mono ${variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtINR(variance)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{varPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono">{r.disputes}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">{fmtINR(r.savingsFlagged)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Insights + trend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Insights</p>
          </div>
          <ul className="text-xs space-y-1 list-disc pl-5">
            {insights.largest && insights.largestInv && (
              <li>Largest over-bill: <strong>{insights.largestInv.logistic_name}</strong> · {fmtINR(insights.largest.variance_amount)} on LR {insights.largest.lr_no}</li>
            )}
            {insights.topDisputer && (
              <li>Most disputes: <strong>{insights.topDisputer.name}</strong> ({insights.topDisputer.count})</li>
            )}
            <li>Total flagged savings (over-billed): <strong className="text-amber-600">{fmtINR(insights.totalFlagged)}</strong></li>
            <li>Savings recovered (resolved in our favor): <strong className="text-emerald-600">{fmtINR(insights.recovered)}</strong></li>
          </ul>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Variance % · Last 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="variance_pct" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
