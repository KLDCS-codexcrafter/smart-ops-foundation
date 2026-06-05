/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontSavedCartsPage.tsx
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-19.6
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listSavedCarts, saveCart, deleteSavedCart, loadSavedCart } from '@/lib/webstorex-order-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bookmark, Trash2, Upload } from 'lucide-react';
import { PreviewRibbon, useStorefrontCart } from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontSavedCartsPage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { user } = useCurrentUser();
  const [tick, setTick] = useState(0);
  const cart = useStorefrontCart(entityCode);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const carts = useMemo(
    () => entityCode ? listSavedCarts(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onSave = (): void => {
    if (!name.trim()) { toast.error('Name required'); return; }
    if (!cart.lines.length) { toast.error('Cart empty'); return; }
    try {
      saveCart(entityCode, { name: name.trim(), lines: cart.lines, byUserId: user?.id ?? 'guest' });
      toast.success('Saved');
      setOpen(false); setName(''); setTick(t => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  };

  const onLoad = (id: string): void => {
    const sc = loadSavedCart(entityCode, id);
    if (!sc) return;
    cart.replaceAll(sc.lines);
    toast.success(`Loaded · ${sc.name}`);
    onNavigate('storefront-cart');
  };

  const onDelete = (id: string): void => {
    deleteSavedCart(entityCode, id); toast.success('Deleted'); setTick(t => t + 1);
  };

  return (
    <div className="animate-fade-in">
      <PreviewRibbon />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2"><Bookmark className="h-5 w-5" />Saved carts</h1>
          <Button size="sm" onClick={() => setOpen(true)} disabled={cart.lines.length === 0}>Save current ({cart.totalQty})</Button>
        </div>

        <Card className="glass-card"><CardContent className="p-0">
          {carts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No saved carts yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {carts.map(sc => (
                <div key={sc.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sc.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sc.lines.length} line{sc.lines.length === 1 ? '' : 's'} · {sc.lines.reduce((s, l) => s + l.qty, 0)} qty</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onLoad(sc.id)}><Upload className="h-3.5 w-3.5 mr-1" />Load</Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(sc.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save current cart</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly reorder" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
