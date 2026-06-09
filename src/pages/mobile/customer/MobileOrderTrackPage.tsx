/**
 * MobileOrderTrackPage.tsx — AM.4 Pass 2
 * Reads existing CustomerOrder from `customerOrdersKey` (0-DIFF schema)
 * + writes back to cart on Reorder via existing `customerCartKey` shape.
 */
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCw, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type CustomerCart, type CustomerOrder, type CustomerOrderStatus,
  customerCartKey, customerOrdersKey,
} from '@/types/customer-order';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TIMELINE: CustomerOrderStatus[] = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

export default function MobileOrderTrackPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params.id ?? '');
  const session = useMemo(() => readSession(), []);
  const customerId = session?.user_id ?? 'anon';

  const order = useMemo<CustomerOrder | null>(() => {
    if (!session) return null;
    return loadList<CustomerOrder>(customerOrdersKey(session.entity_code))
      .find(o => o.id === orderId) ?? null;
  }, [session, orderId]);

  const reorder = useCallback(() => {
    if (!session || !order) return;
    const key = customerCartKey(session.entity_code);
    const all = loadList<CustomerCart>(key);
    const now = new Date().toISOString();
    let cart = all.find(c => c.customer_id === customerId);
    if (!cart) {
      cart = { id: customerId, customer_id: customerId, entity_code: session.entity_code,
        lines: [], subtotal_paise: 0, created_at: now, updated_at: now };
      all.push(cart);
    }
    for (const l of order.lines) {
      const idx = cart.lines.findIndex(x => x.item_id === l.item_id);
      if (idx >= 0) {
        const q = cart.lines[idx].qty + l.qty;
        cart.lines[idx] = { ...cart.lines[idx], qty: q, line_total_paise: q * cart.lines[idx].unit_price_paise };
      } else {
        cart.lines.push({ ...l, id: `cl-${Date.now()}-${l.item_id}` });
      }
    }
    cart.subtotal_paise = cart.lines.reduce((s, l) => s + l.line_total_paise, 0);
    cart.updated_at = now;
    localStorage.setItem(key, JSON.stringify(all));
    toast.success('Re-added to cart');
    navigate('/mobile/customer/cart');
  }, [session, order, customerId, navigate]);

  if (!session) return null;
  if (!order) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Order not found</p>
        </Card>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'returned';
  const currentIdx = TIMELINE.indexOf(order.status);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/customer/orders')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Track Order</h1>
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-mono font-semibold">{order.order_no}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{(order.placed_at ?? order.created_at).slice(0, 10)}</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
        </div>
      </Card>

      <Card className="p-3 space-y-3">
        <h2 className="text-sm font-semibold">Timeline</h2>
        {isCancelled ? (
          <p className="text-xs text-muted-foreground">Order {order.status}.</p>
        ) : (
          <ol className="space-y-2">
            {TIMELINE.map((step, i) => {
              const done = i <= currentIdx;
              return (
                <li key={step} className="flex items-center gap-2">
                  {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={`text-xs ${done ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="p-3 space-y-1.5">
        <h2 className="text-sm font-semibold">Items</h2>
        {order.lines.map(l => (
          <div key={l.id} className="flex justify-between text-xs">
            <span className="truncate pr-2">{l.item_name} × {l.qty}</span>
            <span className="font-mono">{fmtINR(l.line_total_paise)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 border-t mt-2">
          <span className="text-sm font-semibold">Total</span>
          <span className="font-mono font-bold">{fmtINR(order.net_payable_paise)}</span>
        </div>
      </Card>

      <Button variant="outline" className="w-full" onClick={reorder}>
        <RotateCw className="h-4 w-4 mr-2" /> Reorder all items
      </Button>
    </div>
  );
}
