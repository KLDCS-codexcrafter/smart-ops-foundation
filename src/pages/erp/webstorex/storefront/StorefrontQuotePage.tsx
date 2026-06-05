/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontQuotePage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-19.2 Request-a-Quote
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { loadPartyMaster } from '@/lib/party-master-engine';
import { requestQuote } from '@/lib/webstorex-order-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { PreviewRibbon, useStorefrontCart } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontQuotePage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const cart = useStorefrontCart(entityCode);
  const [partyId, setPartyId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const parties = useMemo(() => entityCode ? loadPartyMaster(entityCode) : [], [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onSubmit = (): void => {
    if (!partyId) { toast.error('Pick a party'); return; }
    if (!cart.lines.length) { toast.error('Cart is empty'); return; }
    setBusy(true);
    try {
      const r = requestQuote(entityCode, cart.lines, { partyId, note: note || null, byUserId: user?.id ?? 'guest' });
      toast.success(`Quote ${r.quote.quotation_no} created`);
      cart.clear();
      onNavigate('storefront-home');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <h1 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Request a quote</h1>

        <Card className="glass-card"><CardContent className="p-4 space-y-3">
          {cart.lines.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add items to your cart first.</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">{cart.lines.length} line{cart.lines.length === 1 ? '' : 's'} · {cart.totalQty} qty</div>
              <div>
                <Label className="text-xs">Party</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pick party" /></SelectTrigger>
                  <SelectContent>
                    {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.party_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Special terms, delivery window…" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onNavigate('storefront-cart')}>Back</Button>
                <Button className="flex-1" onClick={onSubmit} disabled={busy || !partyId}>{busy ? 'Submitting…' : 'Submit quote request'}</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Submitting creates a REAL Quotation voucher via the existing quotation path.</p>
            </>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
