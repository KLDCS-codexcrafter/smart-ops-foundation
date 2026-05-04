/**
 * BillPassingRegisterPanel.tsx — Sprint T-Phase-1.2.6f-c-3 · Block D · per D-292
 * Mirrors PurchaseRegister pattern · per-bill register with status / variance / FCPI columns.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBillPassing } from '@/lib/bill-passing-engine';
import type { BillPassingRecord, BillPassingStatus } from '@/types/bill-passing';

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function statusVariant(s: BillPassingStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'matched_clean': case 'approved_for_fcpi': case 'fcpi_drafted': return 'default';
    case 'matched_with_variance': case 'awaiting_qa': return 'secondary';
    case 'rejected': case 'qa_failed': case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

export function BillPassingRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const all = useMemo(() => listBillPassing(entityCode), [entityCode]);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (b) =>
        b.bill_no.toLowerCase().includes(term) ||
        b.vendor_name.toLowerCase().includes(term) ||
        b.po_no.toLowerCase().includes(term) ||
        b.vendor_invoice_no.toLowerCase().includes(term),
    );
  }, [all, q]);

  const totals = useMemo(() => {
    const inv = filtered.reduce((s, b) => s + b.total_invoice_value, 0);
    const po = filtered.reduce((s, b) => s + b.total_po_value, 0);
    const variance = filtered.reduce((s, b) => s + b.total_variance, 0);
    return { inv, po, variance, count: filtered.length };
  }, [filtered]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Bill Passing Register</h1>
        <p className="text-sm text-muted-foreground">
          All bills with PO · GRN · Invoice values · variance · FCPI status. (D-292)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Bills</div>
          <div className="text-xl font-bold font-mono">{totals.count}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">PO Total</div>
          <div className="text-xl font-bold font-mono">{inr(totals.po)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Invoice Total</div>
          <div className="text-xl font-bold font-mono">{inr(totals.inv)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Variance</div>
          <div className="text-xl font-bold font-mono text-warning">{inr(totals.variance)}</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by bill / vendor / PO / invoice no…"
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No bills match.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>Inv No</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="text-right">PO ₹</TableHead>
                  <TableHead className="text-right">Invoice ₹</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>FCPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b: BillPassingRecord) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs">{fmtDate(b.bill_date)}</TableCell>
                    <TableCell className="font-mono">{b.bill_no}</TableCell>
                    <TableCell>{b.vendor_name}</TableCell>
                    <TableCell className="font-mono">{b.po_no}</TableCell>
                    <TableCell>{b.vendor_invoice_no}</TableCell>
                    <TableCell><Badge variant="outline">{b.match_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{inr(b.total_po_value)}</TableCell>
                    <TableCell className="text-right font-mono">{inr(b.total_invoice_value)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {b.variance_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.fcpi_voucher_id ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
