/**
 * OrderDeskPanel.tsx — Sales Order desk · Sprint 1.1.1k-followup
 * [JWT] GET /api/orders?type=sales_order
 *
 * Phase 1: read-only list. Creating new SOs still happens via Quote→SO conversion
 * or via FineCore /sales-order page.
 */
import { Fragment, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Package, ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types/order';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const STATUS_COLORS: Record<Order['status'], string> = {
  open:      'bg-blue-500/10 text-blue-700 border-blue-500/30',
  partial:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  closed:    'bg-green-500/10 text-green-700 border-green-500/30',
  preclosed: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export function OrderDeskPanelComponent({ entityCode }: Props) {
  const navigate = useNavigate();
  const { orders } = useOrders(entityCode);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const salesOrders = useMemo(() =>
    orders.filter(o => o.base_voucher_type === 'Sales Order'),
  [orders]);

  const filtered = useMemo(() => {
    let list = salesOrders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.order_no.toLowerCase().includes(s) ||
        o.party_name.toLowerCase().includes(s) ||
        (o.quotation_no ?? '').toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [salesOrders, statusFilter, search]);

  const stats = useMemo(() => ({
    total:     salesOrders.length,
    open:      salesOrders.filter(o => o.status === 'open').length,
    partial:   salesOrders.filter(o => o.status === 'partial').length,
    closed:    salesOrders.filter(o => o.status === 'closed').length,
    cancelled: salesOrders.filter(o => o.status === 'cancelled').length,
    totalValue: salesOrders.reduce((s, o) => s + o.net_amount, 0),
    pendingValue: salesOrders
      .filter(o => o.status === 'open' || o.status === 'partial')
      .reduce((s, o) => s + o.net_amount, 0),
  }), [salesOrders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Order Desk</h2>
          <Badge variant="outline" className="text-[10px]">Sales Orders</Badge>
        </div>
        <Button size="sm" variant="outline"
          onClick={() => navigate('/erp/finecore/sales-order')}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in FineCore
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total SOs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Open + Partial</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-amber-600">{stats.open + stats.partial}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Closed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-green-600">{stats.closed}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending Value</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-mono font-bold text-purple-600">₹{stats.pendingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by SO no, customer, source quote..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | Order['status'])}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partial">Partially Fulfilled</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="preclosed">Preclosed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No sales orders match the current filters.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left p-2 w-8"></th>
                  <th className="text-left p-2">SO No</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Source Quote</th>
                  <th className="text-right p-2">Lines</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <Fragment key={o.id}>
                    <tr className="border-b hover:bg-muted/20 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                      <td className="p-2">
                        {expandedId === o.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </td>
                      <td className="p-2 font-mono font-semibold">{o.order_no}</td>
                      <td className="p-2 font-mono text-[10px]">{o.date}</td>
                      <td className="p-2">{o.party_name}</td>
                      <td className="p-2 font-mono text-[10px] text-muted-foreground">
                        {o.quotation_no ?? '—'}
                      </td>
                      <td className="p-2 text-right font-mono">{o.lines.length}</td>
                      <td className="p-2 text-right font-mono">₹{o.net_amount.toLocaleString('en-IN')}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLORS[o.status])}>
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                    {expandedId === o.id && (
                      <tr className="bg-muted/20 border-b">
                        <td colSpan={8} className="p-3">
                          <p className="text-[10px] font-semibold mb-2">Order Lines ({o.lines.length})</p>
                          <table className="w-full text-[10px]">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="text-left">Item</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Rate</th>
                                <th className="text-right">Discount</th>
                                <th className="text-right">Taxable</th>
                                <th className="text-right">Pending</th>
                                <th className="text-left">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines.map(l => (
                                <tr key={l.id}>
                                  <td className="py-1">{l.item_name}</td>
                                  <td className="text-right font-mono">{l.qty} {l.uom}</td>
                                  <td className="text-right font-mono">₹{l.rate.toLocaleString('en-IN')}</td>
                                  <td className="text-right font-mono">{l.discount_percent}%</td>
                                  <td className="text-right font-mono">₹{l.taxable_value.toLocaleString('en-IN')}</td>
                                  <td className="text-right font-mono">{l.pending_qty} / {l.qty}</td>
                                  <td className="capitalize">{l.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {o.terms_conditions && (
                            <div className="mt-2 text-[10px] text-muted-foreground">
                              <strong>Terms:</strong> {o.terms_conditions}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OrderDeskPanelComponent;
