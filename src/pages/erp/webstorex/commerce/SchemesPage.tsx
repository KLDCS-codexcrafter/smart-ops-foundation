/**
 * @file        src/pages/erp/webstorex/commerce/SchemesPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-10 + DP-WS-16
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listSchemes, createScheme, deleteScheme, evaluateCart,
} from '@/lib/webstorex-commerce-engine';
import { listStoreItems } from '@/lib/webstorex-engine';
import type { WsScheme, SchemeType, CartEvaluation } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, FlaskConical } from 'lucide-react';

export function SchemesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const schemes = useMemo<WsScheme[]>(
    () => entityCode ? listSchemes(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const nowISO = new Date().toISOString();
  const status = (s: WsScheme): 'active' | 'upcoming' | 'expired' =>
    nowISO < s.validFrom ? 'upcoming' : nowISO > s.validTo ? 'expired' : 'active';

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Schemes Manager</h1>
          <p className="text-xs text-muted-foreground">{schemes.length} scheme{schemes.length === 1 ? '' : 's'} · best-single-wins unless stackable</p>
        </div>
        <div className="space-x-2">
          <Button size="sm" variant="outline" onClick={() => setTestOpen(true)}><FlaskConical className="h-4 w-4 mr-1" />Cart tester</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New scheme</Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {schemes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No schemes yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead>
                  <TableHead>Window</TableHead><TableHead>Status</TableHead>
                  <TableHead>Stackable</TableHead><TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((s) => {
                  const st = status(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{s.validFrom.slice(0, 10)} → {s.validTo.slice(0, 10)}</TableCell>
                      <TableCell><Badge variant={st === 'active' ? 'default' : 'secondary'}>{st}</Badge></TableCell>
                      <TableCell>{s.stackable ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { deleteScheme(entityCode, s.id); reload(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewSchemeDialog open={open} onOpenChange={setOpen} entityCode={entityCode} onCreated={reload} />
      <CartTesterDrawer open={testOpen} onOpenChange={setTestOpen} entityCode={entityCode} />
    </div>
  );
}

function NewSchemeDialog(props: {
  open: boolean; onOpenChange: (o: boolean) => void;
  entityCode: string; onCreated: () => void;
}): JSX.Element {
  const { open, onOpenChange, entityCode, onCreated } = props;
  const items = useMemo(() => listStoreItems(entityCode), [entityCode]);
  const [type, setType] = useState<SchemeType>('order_value_discount');
  const [name, setName] = useState('');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [buyId, setBuyId] = useState(''); const [buyQty, setBuyQty] = useState('1');
  const [getId, setGetId] = useState(''); const [getQty, setGetQty] = useState('1');
  const [slabItem, setSlabItem] = useState(''); const [slabMin, setSlabMin] = useState('10'); const [slabPct, setSlabPct] = useState('5');
  const [minOrd, setMinOrd] = useState('1000'); const [ordPct, setOrdPct] = useState('5');
  const [code, setCode] = useState(''); const [limit, setLimit] = useState(''); const [pct, setPct] = useState('10'); const [flat, setFlat] = useState('');
  const [stackable, setStackable] = useState(false);
  const [groupFilter, setGroupFilter] = useState('');

  const create = (): void => {
    try {
      const base = {
        name: name.trim(), type, stackable, isActive: true,
        validFrom: new Date(validFrom).toISOString(), validTo: new Date(validTo).toISOString(),
        partyGroupFilter: groupFilter.trim() || null,
        buyStoreItemId: null, buyQty: null, getStoreItemId: null, getQty: null,
        slabStoreItemId: null, slabs: undefined, minOrderValue: null, orderDiscountPct: null,
        couponCode: null, couponUsageLimit: null, couponDiscountPct: null, couponDiscountFlat: null,
      };
      let payload: Parameters<typeof createScheme>[1] = base as Parameters<typeof createScheme>[1];
      if (type === 'buy_x_get_y') {
        payload = { ...base, buyStoreItemId: buyId, buyQty: Number(buyQty), getStoreItemId: getId, getQty: Number(getQty) };
      } else if (type === 'slab_discount') {
        payload = { ...base, slabStoreItemId: slabItem, slabs: [{ minQty: Number(slabMin), discountPct: Number(slabPct) }] };
      } else if (type === 'order_value_discount') {
        payload = { ...base, minOrderValue: Number(minOrd), orderDiscountPct: Number(ordPct) };
      } else if (type === 'coupon') {
        payload = {
          ...base, couponCode: code.trim().toUpperCase(),
          couponUsageLimit: limit ? Number(limit) : null,
          couponDiscountPct: flat ? null : Number(pct),
          couponDiscountFlat: flat ? Number(flat) : null,
        };
      }
      createScheme(entityCode, payload);
      toast.success('Scheme created');
      setName(''); onOpenChange(false); onCreated();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New scheme</DialogTitle></DialogHeader>
        <Tabs value={type} onValueChange={(v) => setType(v as SchemeType)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="buy_x_get_y">B1G1</TabsTrigger>
            <TabsTrigger value="slab_discount">Slab</TabsTrigger>
            <TabsTrigger value="order_value_discount">Order value</TabsTrigger>
            <TabsTrigger value="coupon">Coupon</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Party group filter</Label><Input value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} placeholder="optional" /></div>
            <div><Label>Valid from</Label><Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></div>
            <div><Label>Valid to</Label><Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} /></div>
          </div>
          {type === 'buy_x_get_y' && (
            <div className="grid grid-cols-2 gap-3">
              <ItemPicker label="Buy item" value={buyId} onChange={setBuyId} items={items} />
              <div><Label>Buy qty</Label><Input type="number" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} /></div>
              <ItemPicker label="Get free item" value={getId} onChange={setGetId} items={items} />
              <div><Label>Get qty</Label><Input type="number" value={getQty} onChange={(e) => setGetQty(e.target.value)} /></div>
            </div>
          )}
          {type === 'slab_discount' && (
            <div className="grid grid-cols-3 gap-3">
              <ItemPicker label="Item" value={slabItem} onChange={setSlabItem} items={items} />
              <div><Label>Min qty</Label><Input type="number" value={slabMin} onChange={(e) => setSlabMin(e.target.value)} /></div>
              <div><Label>% off</Label><Input type="number" value={slabPct} onChange={(e) => setSlabPct(e.target.value)} /></div>
            </div>
          )}
          {type === 'order_value_discount' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min order ₹</Label><Input type="number" value={minOrd} onChange={(e) => setMinOrd(e.target.value)} /></div>
              <div><Label>% off</Label><Input type="number" value={ordPct} onChange={(e) => setOrdPct(e.target.value)} /></div>
            </div>
          )}
          {type === 'coupon' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DIWALI10" /></div>
              <div><Label>Usage limit</Label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="unlimited" /></div>
              <div><Label>Discount %</Label><Input type="number" value={pct} onChange={(e) => { setPct(e.target.value); setFlat(''); }} /></div>
              <div><Label>Discount ₹ (flat)</Label><Input type="number" value={flat} onChange={(e) => { setFlat(e.target.value); setPct(''); }} /></div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} />
            Stackable with other schemes
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemPicker(props: { label: string; value: string; onChange: (v: string) => void; items: { id: string; itemRefName: string }[] }): JSX.Element {
  return (
    <div>
      <Label>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
        <SelectContent>
          {props.items.map(it => <SelectItem key={it.id} value={it.id}>{it.itemRefName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CartLine { itemId: string; qty: number }

function CartTesterDrawer(props: { open: boolean; onOpenChange: (o: boolean) => void; entityCode: string }): JSX.Element {
  const { open, onOpenChange, entityCode } = props;
  const items = useMemo(() => listStoreItems(entityCode), [entityCode]);
  const [lines, setLines] = useState<CartLine[]>([{ itemId: '', qty: 1 }]);
  const [partyId, setPartyId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<CartEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (): void => {
    setError(null);
    try {
      const r = evaluateCart(
        entityCode,
        lines.filter(l => l.itemId).map(l => ({ storeItemId: l.itemId, qty: l.qty })),
        { partyId: partyId || undefined, couponCode: coupon || undefined, nowISO: new Date(date).toISOString() },
      );
      setResult(r);
    } catch (e) {
      setError((e as Error).message); setResult(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader><SheetTitle>Cart Tester</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label>Lines</Label>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_30px] gap-2">
                <Select value={l.itemId} onValueChange={(v) => setLines(lines.map((x, j) => j === i ? { ...x, itemId: v } : x))}>
                  <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                  <SelectContent>{items.map(it => <SelectItem key={it.id} value={it.id}>{it.itemRefName}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
                <Button size="sm" variant="ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setLines([...lines, { itemId: '', qty: 1 }])}>+ line</Button>
          </div>
          <div><Label>Party ID (optional)</Label><Input value={partyId} onChange={(e) => setPartyId(e.target.value)} /></div>
          <div><Label>Coupon code (optional)</Label><Input value={coupon} onChange={(e) => setCoupon(e.target.value)} /></div>
          <div><Label>As of date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <Button onClick={run} className="w-full">Evaluate cart</Button>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {result && (
            <div className="glass-card rounded-lg p-3 text-xs space-y-1 font-mono">
              <div>Subtotal: ₹{result.subtotal.toFixed(2)}</div>
              <div>Scheme discount: ₹{result.schemeDiscount.toFixed(2)}</div>
              <div>Coupon discount: ₹{result.couponDiscount.toFixed(2)}</div>
              <div>Total discount: ₹{result.totalDiscount.toFixed(2)}</div>
              <div className="font-semibold">Payable: ₹{result.payable.toFixed(2)}</div>
              {result.appliedSchemes.length > 0 && (
                <div className="pt-2 border-t border-border space-y-0.5">
                  {result.appliedSchemes.map(a => <div key={a.schemeId}>· {a.displayText}</div>)}
                </div>
              )}
              {result.freeLines.length > 0 && (
                <div className="text-success">Free: {result.freeLines.map(f => `${f.qty} × ${f.storeItemId}`).join(', ')}</div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
