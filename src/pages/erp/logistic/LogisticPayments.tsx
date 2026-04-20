/**
 * LogisticPayments.tsx — Transporter sees payment status of their submitted invoices.
 * Sprint 15c-2. Gold accent. Read-only listing scoped to session.logistic_id.
 * [JWT] GET /api/logistic/payments
 */
import { useState, useMemo } from 'react';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { getLogisticSession } from '@/lib/logistic-auth-engine';
import {
  transporterInvoicesKey, type TransporterInvoice, type InvoiceStatus,
} from '@/types/transporter-invoice';

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; fg: string; label: string }> = {
  uploaded:         { bg: 'hsl(215 16% 47% / 0.15)', fg: 'hsl(215 16% 47%)', label: 'Uploaded' },
  reconciling:      { bg: 'hsl(48 96% 53% / 0.15)',  fg: 'hsl(38 92% 45%)',  label: 'Reconciling' },
  reconciled:       { bg: 'hsl(213 94% 68% / 0.15)', fg: 'hsl(213 94% 50%)', label: 'Reconciled' },
  approved:         { bg: 'hsl(142 71% 45% / 0.15)', fg: 'hsl(142 71% 35%)', label: 'Approved' },
  partial_approved: { bg: 'hsl(48 96% 53% / 0.15)',  fg: 'hsl(38 92% 45%)',  label: 'Partial' },
  disputed:         { bg: 'hsl(0 84% 60% / 0.15)',   fg: 'hsl(0 84% 50%)',   label: 'Disputed' },
  paid:             { bg: 'hsl(142 71% 45% / 0.15)', fg: 'hsl(142 71% 35%)', label: 'Paid' },
  void:             { bg: 'hsl(215 16% 47% / 0.15)', fg: 'hsl(215 16% 47%)', label: 'Void' },
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function LogisticPayments() {
  const session = getLogisticSession();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const invoices = useMemo(() => {
    if (!session) return [];
    try {
      const all: TransporterInvoice[] = JSON.parse(
        localStorage.getItem(transporterInvoicesKey(session.entity_code)) ?? '[]',
      );
      return all.filter(i => i.logistic_id === session.logistic_id);
    } catch { return []; }
  }, [session]);

  const ytdStart = new Date(); ytdStart.setMonth(0, 1); ytdStart.setHours(0, 0, 0, 0);
  const ytd = invoices.filter(i => new Date(i.invoice_date) >= ytdStart);
  const submitted = ytd.reduce((s, i) => s + i.grand_total, 0);
  const approved = ytd.filter(i => i.status === 'approved' || i.status === 'partial_approved' || i.status === 'paid')
    .reduce((s, i) => s + i.grand_total, 0);
  const paid = ytd.filter(i => i.status === 'paid').reduce((s, i) => s + i.grand_total, 0);

  const filtered = invoices.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search && !i.invoice_no.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!session) return <LogisticLayout><div /></LogisticLayout>;

  const expectedPayDate = (i: TransporterInvoice): string => {
    if (i.status !== 'approved' && i.status !== 'partial_approved') return '—';
    const d = new Date(i.invoice_date);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <LogisticLayout title="Payments" subtitle="Status of your submitted invoices">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Submitted (YTD)</p>
            <p className="text-2xl font-bold font-mono mt-1">{fmt(submitted)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold font-mono mt-1">{fmt(approved)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold font-mono mt-1">{fmt(paid)}</p>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice no…" className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(['all', ...Object.keys(STATUS_STYLE)] as Array<'all' | InvoiceStatus>).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[10px] rounded-full border font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border hover:bg-muted/50'
                }`}>
                {s === 'all' ? 'All' : STATUS_STYLE[s].label}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-2">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">No invoices match your filter</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice No</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Lines</TableHead>
                    <TableHead className="text-xs text-right">Declared</TableHead>
                    <TableHead className="text-xs text-right">GST</TableHead>
                    <TableHead className="text-xs text-right">Grand Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Expected Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => {
                    const st = STATUS_STYLE[i.status];
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(i.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{i.lines.length}</TableCell>
                        <TableCell className="text-xs font-mono text-right">{fmt(i.total_declared)}</TableCell>
                        <TableCell className="text-xs font-mono text-right">{fmt(i.total_gst)}</TableCell>
                        <TableCell className="text-xs font-mono text-right font-semibold">{fmt(i.grand_total)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]" style={{ background: st.bg, color: st.fg, borderColor: st.fg }}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{expectedPayDate(i)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LogisticLayout>
  );
}
