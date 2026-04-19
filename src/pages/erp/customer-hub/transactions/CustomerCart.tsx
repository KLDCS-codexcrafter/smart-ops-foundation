/**
 * CustomerCart.tsx — Sprint 13b · Module ch-t-cart
 * Reuses Sprint 12 scheme engine with audience='customer'.
 * Loyalty earn preview + redeem section + violet scheme card.
 */

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Send, Loader2, Sparkles, Gift, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

import { formatINR } from '@/lib/india-validations';
import { applySchemes, totalSchemeDiscountPaise, describeUnlockGap, type SchemeCart } from '@/lib/scheme-engine';
import { schemesKey, type Scheme, appliedSchemesKey, type AppliedScheme } from '@/types/scheme';
import {
  customerCartKey, customerOrdersKey, customerCartActivityKey,
  type CustomerCart, type CustomerOrder,
} from '@/types/customer-order';
import {
  loyaltyLedgerKey, loyaltyStateKey, TIER_THRESHOLDS,
  type CustomerLoyaltyState, type LoyaltyLedgerEntry,
} from '@/types/customer-loyalty';
import {
  pointsForPurchase, pointsToDiscountPaise, rebuildState,
} from '@/lib/loyalty-engine';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';

const ENTITY = 'SMRT';
const MAX_REDEEM_PCT = 0.3;   // anti-abuse: cap loyalty discount at 30% of subtotal

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

function loadCart(custId: string): CustomerCart {
  const all = ls<CustomerCart>(customerCartKey(ENTITY));
  return all.find(c => c.customer_id === custId) ?? {
    id: custId, customer_id: custId, entity_code: ENTITY,
    lines: [], subtotal_paise: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

function saveCart(cart: CustomerCart): void {
  const all = ls<CustomerCart>(customerCartKey(ENTITY));
  const idx = all.findIndex(c => c.customer_id === cart.customer_id);
  if (idx >= 0) all[idx] = cart; else all.push(cart);
  setLs(customerCartKey(ENTITY), all);
  // touch activity
  const act = ls<{ customer_id: string; updated_at: string }>(customerCartActivityKey(ENTITY));
  const ai = act.findIndex(a => a.customer_id === cart.customer_id);
  const next = { customer_id: cart.customer_id, updated_at: new Date().toISOString() };
  if (ai >= 0) act[ai] = next; else act.push(next);
  setLs(customerCartActivityKey(ENTITY), act);
}

function nextOrderNo(): string {
  const year = new Date().getFullYear();
  const all = ls<CustomerOrder>(customerOrdersKey(ENTITY));
  const yearOrders = all.filter(o => o.order_no.startsWith(`ORD/${year}/`));
  const nextN = (yearOrders.length + 1).toString().padStart(4, '0');
  return `ORD/${year}/${nextN}`;
}

export function CustomerCartPanel() {
  const customerId = getCustomerId();
  const [cart, setCart] = useState<CustomerCart>(() => loadCart(customerId));
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loyaltyState, setLoyaltyState] = useState<CustomerLoyaltyState | null>(null);

  // Hydrate loyalty state from ledger
  useEffect(() => {
    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const prev = states.find(s => s.customer_id === customerId) ?? null;
    const fresh = rebuildState(customerId, ENTITY, ledger, prev);
    setLoyaltyState(fresh);
  }, [customerId]);

  const allSchemes = useMemo<Scheme[]>(
    () => ls<Scheme>(schemesKey(ENTITY)).filter(s => s.status === 'active'),
    [cart.id],
  );

  const subtotal = cart.subtotal_paise;

  const schemeCart: SchemeCart = useMemo(() => ({
    audience: 'customer',
    order_value_paise: subtotal,
    lines: cart.lines.map(l => ({
      line_id: l.id, item_id: l.item_id, qty: l.qty,
      unit_price_paise: l.unit_price_paise,
      line_total_paise: l.line_total_paise,
    })),
  }), [cart.lines, subtotal]);

  const appliedSchemes: AppliedScheme[] = useMemo(
    () => applySchemes(schemeCart, allSchemes),
    [schemeCart, allSchemes],
  );
  const schemeDiscount = totalSchemeDiscountPaise(appliedSchemes);
  const unlockHints = useMemo(() => describeUnlockGap(schemeCart, allSchemes), [schemeCart, allSchemes]);

  // Loyalty calc
  const tier = loyaltyState?.current_tier ?? 'bronze';
  const balance = loyaltyState?.points_balance ?? 0;
  const maxRedeemDiscount = Math.floor((subtotal - schemeDiscount) * MAX_REDEEM_PCT);
  const requestedDiscount = pointsToDiscountPaise(redeemPoints);
  const loyaltyDiscount = Math.min(requestedDiscount, maxRedeemDiscount);
  const effectiveRedeemPoints = loyaltyDiscount > 0 ? Math.ceil(loyaltyDiscount * 10 / 100) : 0; // reverse calc
  const netPayable = Math.max(0, subtotal - schemeDiscount - loyaltyDiscount);
  const pointsToEarn = pointsForPurchase(netPayable, tier);

  // Tier progress (toward next threshold)
  const lifetimeEarned = loyaltyState?.lifetime_points_earned ?? 0;
  const projected = lifetimeEarned + pointsToEarn;
  const nextThreshold =
    tier === 'bronze'   ? TIER_THRESHOLDS.silver :
    tier === 'silver'   ? TIER_THRESHOLDS.gold :
    tier === 'gold'     ? TIER_THRESHOLDS.platinum :
    TIER_THRESHOLDS.platinum;
  const progressPct = Math.min(100, Math.round((projected / nextThreshold) * 100));

  const updateQty = (lineId: string, qty: number) => {
    const safe = Math.max(0, qty);
    const lines = safe === 0
      ? cart.lines.filter(l => l.id !== lineId)
      : cart.lines.map(l => l.id === lineId
          ? { ...l, qty: safe, line_total_paise: l.unit_price_paise * safe }
          : l);
    const next: CustomerCart = {
      ...cart,
      lines,
      subtotal_paise: lines.reduce((s, l) => s + l.line_total_paise, 0),
      updated_at: new Date().toISOString(),
    };
    setCart(next);
    saveCart(next);
  };

  const clearCart = () => {
    if (!confirm('Clear all items from cart?')) return;
    const next: CustomerCart = { ...cart, lines: [], subtotal_paise: 0, updated_at: new Date().toISOString() };
    setCart(next);
    saveCart(next);
    setRedeemPoints(0);
  };

  const placeOrder = () => {
    if (cart.lines.length === 0) return;
    setSubmitting(true);
    try {
      const orderNo = nextOrderNo();
      const now = new Date().toISOString();
      const order: CustomerOrder = {
        id: `ord-${Date.now()}`,
        order_no: orderNo,
        customer_id: customerId,
        customer_name: customerId,
        entity_code: ENTITY,
        status: 'placed',
        lines: cart.lines,
        subtotal_paise: subtotal,
        applied_schemes: appliedSchemes,
        scheme_discount_paise: schemeDiscount,
        loyalty_points_redeemed: effectiveRedeemPoints,
        loyalty_discount_paise: loyaltyDiscount,
        net_payable_paise: netPayable,
        loyalty_points_earned: pointsToEarn,
        placed_at: now,
        delivered_at: null,
        created_at: now,
        updated_at: now,
      };

      const orders = ls<CustomerOrder>(customerOrdersKey(ENTITY));
      orders.push(order);
      setLs(customerOrdersKey(ENTITY), orders);

      // Persist applied schemes for SchemeEffectivenessReport
      if (appliedSchemes.length > 0) {
        const appliedKey = appliedSchemesKey(ENTITY);
        const history = ls<unknown>(appliedKey);
        history.push({
          order_id: order.id,
          order_date: now,
          customer_id: customerId,
          customer_name: customerId,
          order_value_paise: subtotal,
          discount_paise: schemeDiscount,
          net_payable_paise: netPayable,
          applied: appliedSchemes,
        });
        setLs(appliedKey, history);
      }

      // Loyalty ledger entries
      const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
      if (effectiveRedeemPoints > 0) {
        ledger.push({
          id: `lle-${Date.now()}-r`,
          entity_id: ENTITY, customer_id: customerId,
          action: 'redeem_discount',
          points_delta: -effectiveRedeemPoints,
          ref_type: 'order', ref_id: order.id,
          note: `Redeemed for order ${orderNo}`,
          created_at: now,
          expires_at: null,
        });
      }
      if (pointsToEarn > 0) {
        const expires = new Date(); expires.setMonth(expires.getMonth() + 12);
        ledger.push({
          id: `lle-${Date.now()}-e`,
          entity_id: ENTITY, customer_id: customerId,
          action: 'earn_purchase',
          points_delta: pointsToEarn,
          ref_type: 'order', ref_id: order.id,
          note: `Earned from order ${orderNo}`,
          created_at: now,
          expires_at: expires.toISOString(),
        });
      }
      setLs(loyaltyLedgerKey(ENTITY), ledger);

      // Clear cart
      const cleared: CustomerCart = { ...cart, lines: [], subtotal_paise: 0, updated_at: now };
      saveCart(cleared);
      setCart(cleared);
      setRedeemPoints(0);

      // Audit + activity
      logAudit({
        entityCode: ENTITY,
        userId: customerId,
        userName: customerId,
        cardId: 'customer-hub',
        moduleId: 'ch-t-cart',
        action: 'voucher_post',
        refType: 'customer_order',
        refId: order.id,
        refLabel: `${orderNo} · ${appliedSchemes.length} scheme(s) · ${formatINR(netPayable)}`,
      });
      recordActivity(ENTITY, customerId, {
        card_id: 'customer-hub',
        kind: 'transaction',
        ref_id: order.id,
        title: `Order ${orderNo}`,
        subtitle: `${formatINR(netPayable)} · ${cart.lines.length} item(s)`,
        deep_link: `/erp/customer-hub#ch-t-orders`,
      });

      toast.success(`Order ${orderNo} placed`);
      window.location.hash = 'ch-t-orders';
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-teal-500" />
          Cart
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {cart.lines.length} item(s) · review and place your order
        </p>
      </header>

      {cart.lines.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">Your cart is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Browse the catalog to add items</p>
          <Button
            onClick={() => { window.location.hash = 'ch-t-catalog'; }}
            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white"
          >
            Browse catalog
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          {/* LEFT — line items */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground">Items</p>
              <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-[11px] gap-1 text-destructive">
                <Trash2 className="h-3 w-3" /> Clear cart
              </Button>
            </div>
            <div className="space-y-2">
              {cart.lines.map(l => (
                <div key={l.id} className="grid grid-cols-[40px_1fr_auto_auto] gap-3 items-center py-2 border-b last:border-0">
                  <div className="h-10 w-10 rounded bg-teal-500/10 flex items-center justify-center text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    {l.item_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{l.item_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {l.item_code} · {formatINR(l.unit_price_paise)} / {l.uom}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.id, l.qty - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-mono text-sm w-8 text-center">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.id, l.qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-mono text-sm font-semibold w-24 text-right">{formatINR(l.line_total_paise)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* RIGHT — summary */}
          <Card className="p-4 h-fit space-y-3 sticky top-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Order Summary</p>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatINR(subtotal)}</span>
              </div>

              {(appliedSchemes.length > 0 || unlockHints.length > 0) && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2.5 space-y-1.5 mt-2">
                  <p className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-semibold text-[11px]">
                    <Sparkles className="h-3 w-3" /> Schemes
                  </p>
                  {appliedSchemes.map(a => (
                    <div key={a.scheme_id} className="flex items-start justify-between gap-2 text-[11px]">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.scheme_name}</p>
                        <p className="text-muted-foreground text-[10px]">{a.note}</p>
                      </div>
                      {a.discount_paise > 0 && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                          −{formatINR(a.discount_paise)}
                        </span>
                      )}
                    </div>
                  ))}
                  {unlockHints.map((h, i) => (
                    <p key={`uh-${i}`} className="text-[10px] text-muted-foreground italic">{h}</p>
                  ))}
                </div>
              )}

              {/* Loyalty earn preview */}
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-2.5 mt-2">
                <p className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-semibold text-[11px]">
                  <Gift className="h-3 w-3" /> Loyalty
                </p>
                <p className="text-[11px] mt-1">
                  You will earn <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{pointsToEarn}</span> points
                  <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 capitalize">{tier}</Badge>
                </p>
                {tier !== 'platinum' && (
                  <div className="mt-1.5">
                    <Progress value={progressPct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{progressPct}% to next tier</p>
                  </div>
                )}
              </div>

              {/* Loyalty redeem */}
              {balance > 0 && (
                <div className="rounded-lg border border-border p-2.5 mt-2 space-y-2">
                  <Label className="text-[11px] font-semibold">Redeem points</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Balance: <span className="font-mono font-bold">{balance}</span> · Cap 30% of subtotal
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      type="number" min={0} max={balance}
                      value={redeemPoints}
                      onChange={e => setRedeemPoints(Math.max(0, Math.min(balance, parseInt(e.target.value || '0', 10))))}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => setRedeemPoints(0)} className="h-8 text-[11px]">
                      Clear
                    </Button>
                  </div>
                  {loyaltyDiscount > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Apply: −{formatINR(loyaltyDiscount)}
                    </p>
                  )}
                </div>
              )}

              {(schemeDiscount > 0 || loyaltyDiscount > 0) ? (
                <div className="pt-2 border-t mt-2 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono line-through">{formatINR(subtotal)}</span>
                  </div>
                  {schemeDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Scheme savings</span>
                      <span className="font-mono">−{formatINR(schemeDiscount)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Loyalty discount</span>
                      <span className="font-mono">−{formatINR(loyaltyDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-teal-600 dark:text-teal-400 pt-1 border-t">
                    <span>Net payable</span>
                    <span className="font-mono">{formatINR(netPayable)}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t mt-2 flex justify-between font-bold text-teal-600 dark:text-teal-400">
                  <span>Net payable</span>
                  <span className="font-mono">{formatINR(netPayable)}</span>
                </div>
              )}
            </div>

            <Button
              onClick={placeOrder}
              disabled={submitting || cart.lines.length === 0}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Place Order
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CustomerCartPanel;
