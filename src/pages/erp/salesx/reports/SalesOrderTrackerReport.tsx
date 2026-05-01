/**
 * SalesOrderTrackerReport.tsx — Sprint 5
 * Tracks the SO → DN → Sales Invoice chain.
 * [JWT] GET /api/accounting/vouchers
 * [JWT] GET /api/accounting/orders
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, Search, ClipboardList, ArrowRight } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import type { Order } from '@/types/order';
import { cn } from '@/lib/utils';
import { dSub, dSum, round2 } from '@/lib/decimal-helpers';

interface Props {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

interface SOChainRow {
  so: Order;
  deliveryNotes: Voucher[];
  invoices: Voucher[];
  invoicedTotal: number;
  pendingValue: number;
  status: 'open' | 'partial' | 'closed' | 'preclosed' | 'cancelled';
}

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  catch { return []; }
}

function ordersKey(e: string): string {
  return `erp_orders_${e}`;
}

const STATUS_COLOR: Record<SOChainRow['status'], string> = {
  open:      'bg-blue-500/15 text-blue-700 border-blue-500/30',
  partial:   'bg-amber-500/15 text-amber-700 border-amber-500/30',
  closed:    'bg-success/15 text-success border-success/30',
  preclosed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function SalesOrderTrackerReportPanel({ entityCode, onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SOChainRow['status']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const vouchers = useMemo(
    // [JWT] GET /api/accounting/vouchers?entityCode={entityCode}
    () => ls<Voucher>(vouchersKey(entityCode)),
    [entityCode],
  );
  const orders = useMemo(
    // [JWT] GET /api/accounting/orders?entityCode={entityCode}
    () => ls<Order>(ordersKey(entityCode)),
    [entityCode],
  );

  const rows = useMemo<SOChainRow[]>(() => {
    return orders
      .filter(o => o.base_voucher_type === 'Sales Order')
      .map(so => {
        const deliveryNotes = vouchers.filter(
          v => v.base_voucher_type === 'Delivery Note' &&
               !v.is_cancelled &&
               v.ref_voucher_no === so.order_no,
        );
        const dnNos = new Set(deliveryNotes.map(d => d.voucher_no));
        const invoices = vouchers.filter(
          v => v.base_voucher_type === 'Sales' &&
               !v.is_cancelled &&
               (v.ref_voucher_no === so.order_no || (v.ref_voucher_no && dnNos.has(v.ref_voucher_no))),
        );
        const invoicedTotal = round2(dSum(invoices, v => v.net_amount));
        const pendingValue = Math.max(0, round2(dSub(so.net_amount, invoicedTotal)));
        return {
          so,
          deliveryNotes,
          invoices,
          invoicedTotal,
          pendingValue,
          status: so.status,
        };
      });
  }, [orders, vouchers]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.so.order_no.toLowerCase().includes(q) ||
        (r.so.party_name ?? '').toLowerCase().includes(q),
      );
    }
    return list.slice().sort((a, b) => b.so.date.localeCompare(a.so.date));
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => filtered.reduce((acc, r) => {
    acc.so += r.so.net_amount;
    acc.invoiced += r.invoicedTotal;
    acc.pending += r.pendingValue;
    return acc;
  }, { so: 0, invoiced: 0, pending: 0 }), [filtered]);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-orange-500" />
            Sales Order Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Trace the SO → Delivery Note → Sales Invoice chain
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('sx-analytics')}>
          <ArrowRight className="h-3.5 w-3.5 mr-1" /> Analytics
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">SO Total</p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.so)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">Invoiced</p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.invoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
            <p className="text-lg font-bold font-mono mt-1 text-amber-600">{formatINR(totals.pending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sales Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onEnterNext}
                placeholder="Search SO no / customer"
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'open', 'partial', 'closed', 'preclosed', 'cancelled'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'h-7 text-xs capitalize',
                    statusFilter === s && 'bg-orange-500 hover:bg-orange-600',
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Label className="text-[10px] text-muted-foreground ml-auto">
              {filtered.length} order(s)
            </Label>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No sales orders match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-6" />
                  <TableHead className="text-xs">SO No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">SO Value</TableHead>
                  <TableHead className="text-xs text-right">Invoiced</TableHead>
                  <TableHead className="text-xs text-right">Pending</TableHead>
                  <TableHead className="text-xs">DNs</TableHead>
                  <TableHead className="text-xs">Invoices</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(row => {
                  const isExpanded = expandedId === row.so.id;
                  const hasChain = row.deliveryNotes.length > 0 || row.invoices.length > 0;
                  return (
                    <>
                      <TableRow key={row.so.id}>
                        <TableCell>
                          {hasChain && (
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => setExpandedId(isExpanded ? null : row.so.id)}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.so.order_no}</TableCell>
                        <TableCell className="text-xs">{row.so.date}</TableCell>
                        <TableCell className="text-xs">{row.so.party_name ?? '—'}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{inrFmt.format(row.so.net_amount)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{inrFmt.format(row.invoicedTotal)}</TableCell>
                        <TableCell className={cn(
                          'text-xs text-right font-mono',
                          row.pendingValue > 0 && 'text-amber-600',
                        )}>
                          {inrFmt.format(row.pendingValue)}
                        </TableCell>
                        <TableCell className="text-xs">{row.deliveryNotes.length}</TableCell>
                        <TableCell className="text-xs">{row.invoices.length}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[row.status])}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasChain && (
                        <TableRow key={`${row.so.id}-chain`}>
                          <TableCell colSpan={10} className="bg-muted/30 p-3 space-y-3">
                            {row.deliveryNotes.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold mb-1.5">Delivery Notes</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {row.deliveryNotes.map(d => (
                                    <div key={d.id} className="rounded border p-2 bg-background">
                                      <p className="text-xs font-mono">{d.voucher_no}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {d.date} · {formatINR(d.net_amount)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {row.invoices.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold mb-1.5">Sales Invoices</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {row.invoices.map(v => (
                                    <div key={v.id} className="rounded border p-2 bg-background">
                                      <p className="text-xs font-mono">{v.voucher_no}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {v.date} · {formatINR(v.net_amount)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesOrderTrackerReport(props: Props) {
  return <SalesOrderTrackerReportPanel {...props} />;
}
