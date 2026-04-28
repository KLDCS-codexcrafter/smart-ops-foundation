/**
 * MobileDistributorCartPage.tsx — Mobile distributor cart with quantity steppers
 * Sprint T-Phase-1.1.1l-d · Submit creates a DistributorOrder in distributorOrdersKey.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, Trash2, Send, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type DistributorOrder, type DistributorOrderLine,
  distributorOrdersKey,
} from '@/types/distributor-order';

const mobileCartKey = (entity: string, userId: string) =>
  `opx_mobile_distributor_cart_${entity}_${userId}`;

interface MobileCartLine { item_id: string; item_code: string; item_name: string; uom: string; qty: number; rate_paise: number; }

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileDistributorCartPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const cart = useMemo<MobileCartLine[]>(() => {
    if (!session) return [];
    return loadList<MobileCartLine>(mobileCartKey(session.entity_code, session.user_id ?? 'anon'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.qty * l.rate_paise, 0), [cart]);

  const updateCart = useCallback((next: MobileCartLine[]) => {
    if (!session) return;
    // [JWT] POST /api/distributor/cart-lines
    localStorage.setItem(mobileCartKey(session.entity_code, session.user_id ?? 'anon'), JSON.stringify(next));
    setReloadKey(k => k + 1);
  }, [session]);

  const handleQty = (id: string, delta: number) => {
    const next = cart.map(l => l.item_id === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l);
    updateCart(next);
  };

  const handleRemove = (id: string) => {
    updateCart(cart.filter(l => l.item_id !== id));
    toast.success('Removed');
  };

  const handleSubmit = useCallback(() => {
    if (!session || cart.length === 0) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const lines: DistributorOrderLine[] = cart.map((l, idx) => ({
      id: `dl-${Date.now()}-${idx}`,
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom, qty: l.qty,
      rate_paise: l.rate_paise, discount_percent: 0,
      taxable_paise: l.qty * l.rate_paise,
      cgst_paise: 0, sgst_paise: 0, igst_paise: 0,
      total_paise: l.qty * l.rate_paise, hsn_sac: null,
    }));
    const grand = lines.reduce((s, l) => s + l.total_paise, 0);
    const existing = loadList<DistributorOrder>(distributorOrdersKey(session.entity_code));
    const order: DistributorOrder = {
      id: `do-${Date.now()}`,
      order_no: `M/${new Date().getFullYear()}/${String(existing.length + 1).padStart(4, '0')}`,
      partner_id: session.user_id ?? '',
      partner_code: session.user_id ?? '',
      partner_name: session.display_name,
      entity_code: session.entity_code,
      status: 'submitted',
      lines,
      total_taxable_paise: grand,
      total_tax_paise: 0,
      grand_total_paise: grand,
      notes: 'Submitted via mobile',
      delivery_address: '',
      expected_delivery_date: null,
      rejection_reason: null,
      linked_invoice_id: null,
      submitted_at: now,
      reviewed_at: null,
      reviewed_by: null,
      created_at: now,
      updated_at: now,
    };
    // [JWT] POST /api/distributor/orders
    localStorage.setItem(distributorOrdersKey(session.entity_code), JSON.stringify([order, ...existing]));
    updateCart([]);
    setSubmitting(false);
    toast.success(`Order placed: ${order.order_no}`);
    navigate('/mobile/distributor/invoices');
  }, [session, cart, updateCart, navigate]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Cart</h1>
      </div>

      {cart.length === 0 ? (
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
            {cart.map(l => (
              <Card key={l.item_id} className="p-3">
                <p className="text-sm font-medium truncate">{l.item_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{l.item_code} · {fmtINR(l.rate_paise)}/{l.uom}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQty(l.item_id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-mono text-sm w-8 text-center">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQty(l.item_id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{fmtINR(l.qty * l.rate_paise)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleRemove(l.item_id)}>
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
              <span className="font-mono text-base font-bold">{fmtINR(total)}</span>
            </div>
            <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Place Order
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
