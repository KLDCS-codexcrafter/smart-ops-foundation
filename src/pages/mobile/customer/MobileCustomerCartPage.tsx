/**
 * MobileCustomerCartPage.tsx — Mobile customer cart, syncs with web via customerCartKey.
 * Sprint T-Phase-1.1.1l-d
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, Send, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type CustomerCart, type CustomerOrder,
  customerCartKey, customerOrdersKey,
} from '@/types/customer-order';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileCustomerCartPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const customerId = session?.user_id ?? 'anon';

  const cart = useMemo<CustomerCart | null>(() => {
    if (!session) return null;
    const all = loadList<CustomerCart>(customerCartKey(session.entity_code));
    return all.find(c => c.customer_id === customerId) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, customerId, reloadKey]);

  const persistCart = useCallback((next: CustomerCart) => {
    if (!session) return;
    const key = customerCartKey(session.entity_code);
    const all = loadList<CustomerCart>(key);
    const idx = all.findIndex(c => c.customer_id === customerId);
    if (idx >= 0) all[idx] = next; else all.push(next);
    // [JWT] POST /api/customer/cart
    localStorage.setItem(key, JSON.stringify(all));
    setReloadKey(k => k + 1);
  }, [session, customerId]);

  const handleQty = (id: string, delta: number) => {
    if (!cart) return;
    const lines = cart.lines.map(l => {
      if (l.id !== id) return l;
      const qty = Math.max(1, l.qty + delta);
      return { ...l, qty, line_total_paise: qty * l.unit_price_paise };
    });
    const subtotal = lines.reduce((s, l) => s + l.line_total_paise, 0);
    persistCart({ ...cart, lines, subtotal_paise: subtotal, updated_at: new Date().toISOString() });
  };

  const handleRemove = (id: string) => {
    if (!cart) return;
    const lines = cart.lines.filter(l => l.id !== id);
    const subtotal = lines.reduce((s, l) => s + l.line_total_paise, 0);
    persistCart({ ...cart, lines, subtotal_paise: subtotal, updated_at: new Date().toISOString() });
    toast.success('Removed');
  };

  const handleCheckout = useCallback(() => {
    if (!session || !cart || cart.lines.length === 0) return;
    setBusy(true);
    const now = new Date().toISOString();
    const orders = loadList<CustomerOrder>(customerOrdersKey(session.entity_code));
    const order: CustomerOrder = {
      id: `co-${Date.now()}`,
      order_no: `CO/${new Date().getFullYear()}/${String(orders.length + 1).padStart(4, '0')}`,
      customer_id: customerId,
      customer_name: session.display_name,
      entity_code: session.entity_code,
      status: 'placed',
      lines: cart.lines,
      subtotal_paise: cart.subtotal_paise,
      applied_schemes: [],
      scheme_discount_paise: 0,
      loyalty_points_redeemed: 0,
      loyalty_discount_paise: 0,
      net_payable_paise: cart.subtotal_paise,
      loyalty_points_earned: 0,
      placed_at: now,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    };
    // [JWT] POST /api/customer/orders
    localStorage.setItem(customerOrdersKey(session.entity_code), JSON.stringify([order, ...orders]));
    persistCart({ ...cart, lines: [], subtotal_paise: 0, updated_at: now });
    setBusy(false);
    toast.success(`Order placed: ${order.order_no}`);
    navigate('/mobile/customer/orders');
  }, [session, cart, customerId, persistCart, navigate]);

  if (!session) return null;

  const lines = cart?.lines ?? [];

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Cart</h1>
      </div>

      {lines.length === 0 ? (
        <Card className="p-6 text-center">
          <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Cart is empty</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/mobile/customer/catalog')}>
            Browse Catalog
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {lines.map(l => (
              <Card key={l.id} className="p-3">
                <p className="text-sm font-medium truncate">{l.item_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{l.item_code} · {fmtINR(l.unit_price_paise)}/{l.uom}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQty(l.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-mono text-sm w-8 text-center">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQty(l.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{fmtINR(l.line_total_paise)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleRemove(l.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-3 sticky bottom-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-base font-bold">{fmtINR(cart?.subtotal_paise ?? 0)}</span>
            </div>
            <Button className="w-full" disabled={busy} onClick={handleCheckout}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Place Order
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
