/**
 * @file        src/pages/erp/webstorex/variants/VariantsPage.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · DP-WS-14 allocation guard surface
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listStoreItems, listVariants, addVariant, updateVariant, buildReconciliationReport,
} from '@/lib/webstorex-engine';
import type { WsVariant, WebStoreItem } from '@/types/webstorex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function VariantsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [storeItemId, setStoreItemId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);

  const items: WebStoreItem[] = useMemo(() => entityCode ? listStoreItems(entityCode) : [], [entityCode]);
  const variants: WsVariant[] = useMemo(
    () => (entityCode && storeItemId) ? listVariants(entityCode, storeItemId) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, storeItemId, tick],
  );
  const recon = useMemo(() => entityCode ? buildReconciliationReport(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick]);
  const reconForItem = recon.find((r) => r.storeItemId === storeItemId);

  if (!entityCode) {
    return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Variants</h1>
          <p className="text-xs text-muted-foreground">DP-WS-14 · Σ active allocations ≤ master qty</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={storeItemId} onValueChange={setStoreItemId}>
            <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Pick a store item…" /></SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.storeTitle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!storeItemId} onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Add variant
          </Button>
        </div>
      </div>

      {storeItemId && reconForItem && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Allocation snapshot</CardTitle>
          </CardHeader>
          <CardContent className="text-sm flex items-center gap-6 font-mono">
            <div>Master qty: <span className="text-primary">{reconForItem.masterQty}</span></div>
            <div>Allocated: <span className="text-primary">{reconForItem.allocatedTotal}</span></div>
            <div>Drift:
              <span className={reconForItem.overAllocated ? 'text-destructive ml-1' : 'text-success ml-1'}>
                {reconForItem.drift}
              </span>
            </div>
            {reconForItem.overAllocated && (
              <Badge variant="outline" className="text-destructive border-destructive/40">OVER-ALLOCATED</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardContent className="p-0">
          {!storeItemId ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Pick a store item to manage variants.</div>
          ) : variants.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No variants yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Axes</TableHead>
                  <TableHead className="text-right font-mono">Price override</TableHead>
                  <TableHead className="text-right font-mono">Allocation</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">{v.sku}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.axes.map((a) => `${a.name}:${a.value}`).join(' · ')}
                    </TableCell>
                    <TableCell className="text-right font-mono">{v.priceOverride != null ? `₹${v.priceOverride.toFixed(2)}` : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{v.stockAllocation}</TableCell>
                    <TableCell>
                      <Badge variant={v.isActive ? 'secondary' : 'outline'}>{v.isActive ? 'active' : 'inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleActive variant={v} entityCode={entityCode} onSaved={reload} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddVariantDialog
        open={addOpen} onClose={() => setAddOpen(false)}
        entityCode={entityCode} storeItemId={storeItemId} onDone={reload}
      />
    </div>
  );
}

function ToggleActive({ variant, entityCode, onSaved }: { variant: WsVariant; entityCode: string; onSaved: () => void }): JSX.Element {
  const onClick = (): void => {
    try { updateVariant(entityCode, variant.id, { isActive: !variant.isActive }); toast.success('Updated'); onSaved(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return <Button size="sm" variant="ghost" onClick={onClick}>{variant.isActive ? 'Deactivate' : 'Activate'}</Button>;
}

interface AddProps {
  open: boolean; onClose: () => void; entityCode: string; storeItemId: string; onDone: () => void;
}
function AddVariantDialog({ open, onClose, entityCode, storeItemId, onDone }: AddProps): JSX.Element {
  const [sku, setSku] = useState('');
  const [axisName, setAxisName] = useState('Size');
  const [axisValue, setAxisValue] = useState('');
  const [alloc, setAlloc] = useState('0');

  const onSubmit = (): void => {
    try {
      addVariant(entityCode, storeItemId, {
        sku,
        axes: axisValue ? [{ name: axisName, value: axisValue }] : [],
        stockAllocation: Number(alloc) || 0,
      });
      toast.success('Variant added');
      setSku(''); setAxisValue(''); setAlloc('0');
      onDone(); onClose();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add variant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Axis name</Label><Input value={axisName} onChange={(e) => setAxisName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Axis value</Label><Input value={axisValue} onChange={(e) => setAxisValue(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label>Stock allocation</Label>
            <Input type="number" value={alloc} onChange={(e) => setAlloc(e.target.value)} className="font-mono" />
            <p className="text-xs text-muted-foreground">Engine throws if Σ active allocations &gt; master qty.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
