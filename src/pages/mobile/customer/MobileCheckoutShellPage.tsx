/**
 * MobileCheckoutShellPage.tsx — AM.4 Pass 2
 * Checkout SHELL only · address + summary + place-order.
 * Consumes the EXISTING customer order create path:
 *   `customerCartKey` (read cart) → write `customerOrdersKey` (existing schema)
 *   + fiscal_year_id stamping via fyForDate (mirrors MobileCustomerCartPage).
 * NO payment gateway · NO charge · honest Wave-2 banner.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Info, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type CustomerCart, type CustomerOrder, customerCartKey, customerOrdersKey } from '@/types/customer-order';
import { fyForDate } from '@/lib/fincore-engine';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }
const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ADDR_KEY = (entity: string, customer: string) => `erp_customer_shipto_${entity}_${customer}`;

export default function MobileCheckoutShellPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const customerId = session?.user_id ?? 'anon';
  const [busy, setBusy] = useState(false);

  const cart = useMemo<CustomerCart | null>(() => {
    if (!session) return null;
    return loadList<CustomerCart>(customerCartKey(session.entity_code))
      .find(c => c.customer_id === customerId) ?? null;
  }, [session, customerId]);

  const savedAddr = useMemo(() => {
    if (!session) return '';
    try { return localStorage.getItem(ADDR_KEY(session.entity_code, customerId)) ?? ''; } catch { return ''; }
  }, [session, customerId]);
  const [address, setAddress] = useState(savedAddr);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const placeOrder = useCallback(() => {
    if (!session || !cart || cart.lines.length === 0) return;
    if (address.trim().length < 10) { toast.error('Please enter a delivery address (min 10 chars).'); return; }
    if (!/^[6-9][0-9]{9}$/.test(phone.trim())) { toast.error('Enter valid 10-digit Indian mobile (6-9 start).'); return; }
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
    order.fiscal_year_id = `FY-20${fyForDate(order.placed_at!, order.entity_code)}`;
    // Append notes/address into existing narration-style storage via order id sidecar.
    try {
      localStorage.setItem(ADDR_KEY(session.entity_code, customerId), address);
      localStorage.setItem(`erp_customer_order_meta_${order.id}`,
        JSON.stringify({ ship_to: address, phone, notes, payment_status: 'pending_wave2' }));
    } catch { /* ignore */ }
    // [JWT] POST /api/customer/orders  · NO payment gateway invoked (Wave-2).
    localStorage.setItem(customerOrdersKey(session.entity_code), JSON.stringify([order, ...orders]));
    // Clear cart (existing schema).
    const allCarts = loadList<CustomerCart>(customerCartKey(session.entity_code));
    const idx = allCarts.findIndex(c => c.customer_id === customerId);
    if (idx >= 0) {
      allCarts[idx] = { ...allCarts[idx], lines: [], subtotal_paise: 0, updated_at: now };
      localStorage.setItem(customerCartKey(session.entity_code), JSON.stringify(allCarts));
    }
    setBusy(false);
    toast.success(`Order placed: ${order.order_no}`);
    navigate(`/mobile/customer/track/${encodeURIComponent(order.id)}`);
  }, [session, cart, customerId, address, phone, notes, navigate]);

  if (!session) return null;
  const lines = cart?.lines ?? [];

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-24 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Checkout</h1>
      </div>

      <Card className="p-3 border-amber-500/40 bg-amber-500/5 flex items-start gap-2" data-payment-honesty="wave-2">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          Secure payment &amp; instant checkout arrive with Wave-2. Placing this order reserves your items;
          our team confirms payment &amp; dispatch.
        </p>
      </Card>

      <Card className="p-3 space-y-2">
        <h2 className="text-sm font-semibold">Delivery</h2>
        <Textarea placeholder="Full delivery address (line 1, line 2, city, PIN)"
          value={address} onChange={e => setAddress(e.target.value)} rows={3} />
        <Input placeholder="10-digit mobile (6-9…)" inputMode="numeric" maxLength={10}
          value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
        <Textarea placeholder="Delivery notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </Card>

      <Card className="p-3 space-y-1.5">
        <h2 className="text-sm font-semibold">Order summary</h2>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground">Cart is empty.</p>
        ) : (
          <>
            {lines.map(l => (
              <div key={l.id} className="flex justify-between text-xs">
                <span className="truncate pr-2">{l.item_name} × {l.qty}</span>
                <span className="font-mono">{fmtINR(l.line_total_paise)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t mt-2">
              <span className="text-sm font-semibold">Payable</span>
              <span className="font-mono text-base font-bold">{fmtINR(cart?.subtotal_paise ?? 0)}</span>
            </div>
          </>
        )}
      </Card>

      <Button className="w-full" disabled={busy || lines.length === 0} onClick={placeOrder}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        Place order (payment pending Wave-2)
      </Button>
    </div>
  );
}
