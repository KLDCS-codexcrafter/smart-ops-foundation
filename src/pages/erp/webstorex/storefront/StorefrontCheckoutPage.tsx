/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontCheckoutPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-3 ONE-WRITE WALL · DP-WS-8 server-side truth
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { loadPartyMaster } from '@/lib/party-master-engine';
import { evaluateCart, getPointsBalance, getCreditBalance, getLoyaltyRule } from '@/lib/webstorex-commerce-engine';
import { checkoutCart } from '@/lib/webstorex-order-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PreviewRibbon, useStorefrontCart, fmtINR } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontCheckoutPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { user } = useCurrentUser();
  const cart = useStorefrontCart(entityCode);
  const [partyId, setPartyId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [redeemPts, setRedeemPts] = useState(0);
  const [redeemCr, setRedeemCr] = useState(0);
  const [busy, setBusy] = useState(false);

  const parties = useMemo(() => entityCode ? loadPartyMaster(entityCode) : [], [entityCode]);

  const evalResult = useMemo(() => {
    if (!entityCode || !cart.lines.length) return null;
    try {
      return evaluateCart(
        entityCode,
        cart.lines.map(l => ({ storeItemId: l.storeItemId, qty: l.qty })),
        { partyId: partyId || undefined, couponCode: coupon || undefined },
      );
    } catch { return null; }
  }, [entityCode, cart.lines, partyId, coupon]);

  const ptsBal = useMemo(() => (entityCode && partyId) ? getPointsBalance(entityCode, partyId) : 0, [entityCode, partyId]);
  const crBal = useMemo(() => (entityCode && partyId) ? getCreditBalance(entityCode, partyId) : 0, [entityCode, partyId]);
  const rule = useMemo(() => entityCode ? getLoyaltyRule(entityCode) : null, [entityCode]);

  const onConfirm = (): void => {
    if (!entityCode) return;
    if (!partyId) { toast.error('Pick a party'); return; }
    if (!cart.lines.length) { toast.error('Cart empty'); return; }
    setBusy(true);
    try {
      const result = checkoutCart(entityCode, cart.lines, {
        partyId,
        couponCode: coupon || null,
        voucherCode: voucherCode || null,
        redeemPoints: redeemPts || 0,
        redeemCredit: redeemCr || 0,
        byUserId: user?.id ?? 'guest',
        placedVia: 'storefront',
      });
      toast.success(`Order placed · ${result.voucher.order_no}`);
      cart.clear();
      onNavigate('storefront-orders');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;
  if (!cart.lines.length) {
    return (
      <div className="animate-fade-in"><PreviewRibbon />
        <div className="p-8 text-center space-y-3">
          <div className="text-sm text-muted-foreground">Cart is empty. Add items to checkout.</div>
          <Button onClick={() => onNavigate('storefront-home')}>Browse storefront</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Checkout</h1>

        <Card className="glass-card"><CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Party</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick party" /></SelectTrigger>
              <SelectContent>
                {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.party_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Coupon</Label><Input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="optional" className="h-9 font-mono" /></div>
            <div><Label className="text-xs">Gift voucher</Label><Input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="optional" className="h-9 font-mono" /></div>
            <div>
              <Label className="text-xs">Redeem points (bal {ptsBal})</Label>
              <Input type="number" min={0} value={redeemPts} onChange={e => setRedeemPts(Math.max(0, parseInt(e.target.value, 10) || 0))} className="h-9 font-mono" />
              {rule && <div className="text-[10px] text-muted-foreground mt-0.5">{fmtINR(rule.redeemValuePerPoint)} per point</div>}
            </div>
            <div>
              <Label className="text-xs">Redeem credit (bal {fmtINR(crBal)})</Label>
              <Input type="number" min={0} value={redeemCr} onChange={e => setRedeemCr(Math.max(0, parseFloat(e.target.value) || 0))} className="h-9 font-mono" />
            </div>
          </div>
        </CardContent></Card>

        {evalResult && (
          <Card className="glass-card"><CardContent className="p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{fmtINR(evalResult.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Scheme discount</span><span className="font-mono">−{fmtINR(evalResult.schemeDiscount)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Coupon discount</span><span className="font-mono">−{fmtINR(evalResult.couponDiscount)}</span></div>
            {evalResult.appliedSchemes.length > 0 && (
              <div className="text-xs pt-1">Applied: {evalResult.appliedSchemes.map(s => s.schemeName).join(', ')}</div>
            )}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-base font-semibold"><span>Payable</span><span className="font-mono">{fmtINR(evalResult.payable)}</span></div>
          </CardContent></Card>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('storefront-cart')}>Back to cart</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={busy || !partyId}>{busy ? 'Placing…' : 'Confirm order'}</Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Confirming creates a REAL Sales Order voucher (DP-WS-3 one-write wall). Customer auth + payment capture land P2BB.
        </p>
      </div>
    </div>
  );
}
