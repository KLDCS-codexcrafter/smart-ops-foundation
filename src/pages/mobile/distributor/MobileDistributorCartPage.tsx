/**
 * MobileDistributorCartPage.tsx — Mobile distributor cart
 * Sprint T-Phase-1.1.1l-d · Audit fix round 1.
 * Uses the SAME IndexedDB cart store as the web (distributor-cart-store) and the
 * SAME cartToOrder pipeline so submissions become real DistributorOrder records
 * visible in the existing ERP DistributorOrder review queue.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, Send, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type DistributorCartState, type DistributorOrder,
  distributorOrdersKey,
} from '@/types/distributor-order';
import { getCart, setCart, clearCart, removeLine, isAvailable } from '@/lib/distributor-cart-store';
import { cartToOrder, nextOrderNumber } from '@/lib/distributor-order-engine';
import { loadDistributors } from '@/lib/distributor-auth-engine';
import type { Distributor } from '@/types/distributor';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCartPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const distributor = useMemo<Distributor | null>(() => {
    if (!session || !session.user_id) return null;
    return loadDistributors(session.entity_code).find(d => d.id === session.user_id) ?? null;
  }, [session]);

  const [cart, setLocalCart] = useState<DistributorCartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || !session.user_id) { setLoading(false); return; }
    if (!isAvailable()) { setLoading(false); return; }
    setLoading(true);
    try {
      setLocalCart(await getCart(session.user_id));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void refresh(); }, [refresh]);

  const grand = cart?.lines.reduce((s, l) => s + l.total_paise, 0) ?? 0;

  const handleQty = useCallback(async (lineId: string, delta: number) => {
    if (!cart) return;
    const next: DistributorCartState = {
      ...cart,
      lines: cart.lines.map(l => {
        if (l.id !== lineId) return l;
        const newQty = Math.max(1, l.qty + delta);
        const ratio = newQty / l.qty;
        return {
          ...l,
          qty: newQty,
          taxable_paise: Math.round(l.taxable_paise * ratio),
          cgst_paise: Math.round(l.cgst_paise * ratio),
          sgst_paise: Math.round(l.sgst_paise * ratio),
          igst_paise: Math.round(l.igst_paise * ratio),
          total_paise: Math.round(l.total_paise * ratio),
        };
      }),
    };
    await setCart(next);
    setLocalCart(next);
  }, [cart]);

  const handleRemove = useCallback(async (itemId: string) => {
    if (!session || !session.user_id) return;
    const updated = await removeLine(session.user_id, itemId);
    setLocalCart(updated);
    toast.success('Removed');
  }, [session]);

  const handleSubmit = useCallback(async () => {
    if (!session || !session.user_id || !distributor || !cart || cart.lines.length === 0) return;
    setSubmitting(true);
    try {
      const existing = loadList<DistributorOrder>(distributorOrdersKey(session.entity_code));
      const orderNo = nextOrderNumber(existing);
      const order = cartToOrder(cart, distributor, orderNo);
      // [JWT] POST /api/distributor/orders
      localStorage.setItem(distributorOrdersKey(session.entity_code), JSON.stringify([order, ...existing]));
      await clearCart(session.user_id);
      setLocalCart(null);
      toast.success(`Order ${orderNo} submitted`);
      navigate('/mobile/distributor/invoices');
    } catch (e) {
      toast.error('Submit failed', { description: e instanceof Error ? e.message : 'Storage error' });
    } finally {
      setSubmitting(false);
    }
  }, [session, distributor, cart, navigate]);

  if (!session) return null;

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold">Cart</h1>
        </div>
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Distributor profile unavailable.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Cart</h1>
      </div>

      {!cart || cart.lines.length === 0 ? (
        <Card className="p-6 text-center">
          <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Cart is empty</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/mobile/distributor/catalog')}>
            Browse Catalog
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {cart.lines.map(l => (
              <Card key={l.id} className="p-3">
                <p className="text-sm font-medium truncate">{l.item_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{l.item_code} · {fmtINR(l.rate_paise)}/{l.uom}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => void handleQty(l.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-mono text-sm w-8 text-center">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => void handleQty(l.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{fmtINR(l.total_paise)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => void handleRemove(l.item_id)}>
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
              <span className="font-mono text-base font-bold">{fmtINR(grand)}</span>
            </div>
            <Button className="w-full" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Place Order
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
