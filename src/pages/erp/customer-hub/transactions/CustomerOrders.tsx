/**
 * CustomerOrders.tsx — Sprint 13b · Module ch-t-orders
 * Order list · status filter · reorder · download invoice · raise complaint.
 */

import { useMemo, useState } from 'react';
import { History, Search, RotateCcw, Printer, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatINR, formatIndianDate } from '@/lib/india-validations';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  customerOrdersKey, customerCartKey,
  type CustomerOrder, type CustomerOrderStatus, type CustomerCart, type CustomerCartLine,
} from '@/types/customer-order';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;
const STATUS_FILTERS: { id: 'all' | CustomerOrderStatus; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'placed',    label: 'Placed' },
  { id: 'shipped',   label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<CustomerOrderStatus, string> = {
  draft:     'border-slate-500/30 text-slate-700 dark:text-slate-300',
  placed:    'border-teal-500/30 text-teal-700 dark:text-teal-300',
  confirmed: 'border-teal-500/30 text-teal-700 dark:text-teal-300',
  packed:    'border-violet-500/30 text-violet-700 dark:text-violet-300',
  shipped:   'border-violet-500/30 text-violet-700 dark:text-violet-300',
  delivered: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  cancelled: 'border-slate-500/30 text-slate-700 dark:text-slate-300',
  returned:  'border-amber-500/30 text-amber-700 dark:text-amber-300',
};

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function getCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

function printReceipt(order: CustomerOrder): void {
  const win = window.open('', '_blank', 'width=600,height=800');
  if (!win) { toast.error('Pop-up blocked'); return; }
  win.document.write(`
    <html><head><title>${order.order_no}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#222;}
      h1{font-size:18px;margin:0 0 8px;}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;}
      th,td{border-bottom:1px solid #eee;padding:6px;text-align:left;}
      th{background:#f4f4f4;}
      .right{text-align:right;}
      .total{font-weight:bold;font-size:14px;}
    </style></head><body>
    <h1>Receipt · ${order.order_no}</h1>
    <p>Date: ${order.placed_at ? formatIndianDate(new Date(order.placed_at)) : '-'}</p>
    <p>Customer: ${order.customer_name}</p>
    <table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Total</th></tr></thead><tbody>
    ${order.lines.map(l => `<tr><td>${l.item_name}</td><td class="right">${l.qty}</td><td class="right">${formatINR(l.unit_price_paise)}</td><td class="right">${formatINR(l.line_total_paise)}</td></tr>`).join('')}
    </tbody></table>
    <p class="right">Subtotal: ${formatINR(order.subtotal_paise)}</p>
    ${order.scheme_discount_paise > 0 ? `<p class="right">Scheme savings: −${formatINR(order.scheme_discount_paise)}</p>` : ''}
    ${order.loyalty_discount_paise > 0 ? `<p class="right">Loyalty discount: −${formatINR(order.loyalty_discount_paise)}</p>` : ''}
    <p class="right total">Net payable: ${formatINR(order.net_payable_paise)}</p>
    <p style="font-size:10px;color:#888;margin-top:24px;">This is a customer receipt, not a tax invoice.</p>
    </body></html>
  `);
  win.document.close();
  win.print();
}

export function CustomerOrdersPanel() {
  const customerId = getCustomerId();
  const [filter, setFilter] = useState<'all' | CustomerOrderStatus>('all');
  const [search, setSearch] = useState('');

  const orders = useMemo(() => {
    const all = ls<CustomerOrder>(customerOrdersKey(ENTITY))
      .filter(o => o.customer_id === customerId);
    return all.sort((a, b) => (b.placed_at ?? b.created_at).localeCompare(a.placed_at ?? a.created_at));
  }, [customerId]);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter !== 'all') list = list.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => o.order_no.toLowerCase().includes(q));
    }
    return list;
  }, [orders, filter, search]);

  const handleReorder = (order: CustomerOrder) => {
    const all = ls<CustomerCart>(customerCartKey(ENTITY));
    const idx = all.findIndex(c => c.customer_id === customerId);
    const cart: CustomerCart = idx >= 0 ? all[idx] : {
      id: customerId, customer_id: customerId, entity_code: ENTITY,
      lines: [], subtotal_paise: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const merged = new Map<string, CustomerCartLine>();
    for (const l of cart.lines) merged.set(l.item_id, l);
    for (const l of order.lines) {
      const existing = merged.get(l.item_id);
      const qty = (existing?.qty ?? 0) + l.qty;
      merged.set(l.item_id, {
        id: existing?.id ?? `cl-${l.item_id}`,
        item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
        uom: l.uom, qty,
        unit_price_paise: l.unit_price_paise,
        line_total_paise: l.unit_price_paise * qty,
      });
    }
    const lines = Array.from(merged.values());
    const next: CustomerCart = {
      ...cart, lines,
      subtotal_paise: lines.reduce((s, l) => s + l.line_total_paise, 0),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) all[idx] = next; else all.push(next);
    setLs(customerCartKey(ENTITY), all);
    toast.success(`Added ${order.lines.length} item(s) to cart`);
    window.location.hash = 'ch-t-cart';
  };

  const handleComplaint = (order: CustomerOrder) => {
    try {
      sessionStorage.setItem('erp_complaint_context', JSON.stringify({
        order_id: order.id, order_no: order.order_no, line_count: order.lines.length,
      }));
    } catch { /* ignore */ }
    window.location.hash = 'ch-t-voice-complaint';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-teal-500" />
            My Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {orders.length} orders</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order #..."
            className="pl-8 h-9 w-56 text-sm"
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? 'default' : 'outline'}
            onClick={() => setFilter(f.id)}
            className={`h-7 text-[11px] ${filter === f.id ? 'bg-teal-500 hover:bg-teal-600 text-white' : ''}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-1">Explore the catalog to place your first order</p>
          <Button
            onClick={() => { window.location.hash = 'ch-t-catalog'; }}
            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white"
          >
            Browse catalog
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold">{o.order_no}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {o.placed_at ? formatIndianDate(new Date(o.placed_at)) : 'Draft'}
                  </p>
                  <p className="text-xs mt-2">
                    {o.lines.slice(0, 2).map(l => `${l.qty}× ${l.item_name}`).join(' · ')}
                    {o.lines.length > 2 && ` and ${o.lines.length - 2} more`}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>Subtotal <span className="font-mono">{formatINR(o.subtotal_paise)}</span></span>
                    {o.scheme_discount_paise > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Saved <span className="font-mono">{formatINR(o.scheme_discount_paise)}</span>
                      </span>
                    )}
                    {o.loyalty_points_earned > 0 && (
                      <span className="text-teal-600 dark:text-teal-400">
                        Earned <span className="font-mono">{o.loyalty_points_earned}</span> pts
                      </span>
                    )}
                    <span className="font-semibold text-foreground">
                      Net <span className="font-mono">{formatINR(o.net_payable_paise)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleReorder(o)} className="h-7 text-[11px] gap-1 border-teal-500/30 text-teal-700 dark:text-teal-300">
                    <RotateCcw className="h-3 w-3" /> Reorder
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printReceipt(o)} className="h-7 text-[11px] gap-1">
                    <Printer className="h-3 w-3" /> Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleComplaint(o)} className="h-7 text-[11px] gap-1">
                    <AlertCircle className="h-3 w-3" /> Complaint
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerOrdersPanel;
