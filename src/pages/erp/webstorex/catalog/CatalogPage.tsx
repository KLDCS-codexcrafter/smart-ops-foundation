/**
 * @file        src/pages/erp/webstorex/catalog/CatalogPage.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · Block 4
 * @purpose     Catalog manager · publish-from-master picker · list · visibility · DELETE NOT EXPOSED
 *              (PIM wrapper · master READ-ONLY).
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listStoreItems, listMasterCandidates, publishItem, setVisibility,
  updateStoreItem, buildReconciliationReport,
} from '@/lib/webstorex-engine';
import type { StoreVisibility, WebStoreItem } from '@/types/webstorex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, RefreshCw } from 'lucide-react';

function visibilityColor(v: StoreVisibility): 'gray' | 'green' | 'amber' {
  if (v === 'published') return 'green';
  if (v === 'hidden') return 'amber';
  return 'gray';
}

export function CatalogPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const items: WebStoreItem[] = useMemo(() => {
    if (!entityCode) return [];
    const all = listStoreItems(entityCode);
    const q = search.trim().toLowerCase();
    return q
      ? all.filter((i) => i.storeTitle.toLowerCase().includes(q) || i.itemRefName.toLowerCase().includes(q))
      : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, search, tick]);

  const recon = useMemo(() => entityCode ? buildReconciliationReport(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick]);
  const drifts = recon.filter((r) => r.overAllocated).length;

  const onVisibility = useCallback((id: string, v: StoreVisibility) => {
    if (!entityCode) return;
    try { setVisibility(entityCode, id, v); toast.success(`Visibility → ${v}`); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }, [entityCode, reload]);

  if (!entityCode) {
    return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Catalog</h1>
          <p className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} · {drifts} over-allocation drift</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or master name" className="pl-7 h-9 w-64" />
          </div>
          <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setPublishOpen(true)}><Plus className="h-4 w-4 mr-1" />Publish from master</Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No items published yet. Click "Publish from master" to wrap an inventory item.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Master Ref</TableHead>
                  <TableHead className="text-right font-mono">List Price</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.storeTitle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{it.itemRefName}</TableCell>
                    <TableCell className="text-right font-mono">₹{it.listPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        visibilityColor(it.visibility) === 'green' ? 'text-success border-success/40'
                          : visibilityColor(it.visibility) === 'amber' ? 'text-warning border-warning/40'
                            : 'text-muted-foreground'
                      }>{it.visibility}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <PriceEditor item={it} entityCode={entityCode} onSaved={reload} />
                      <Select value={it.visibility} onValueChange={(v) => onVisibility(it.id, v as StoreVisibility)}>
                        <SelectTrigger className="h-8 w-28 inline-flex"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">draft</SelectItem>
                          <SelectItem value="published">published</SelectItem>
                          <SelectItem value="hidden">hidden</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PublishDialog
        open={publishOpen} onClose={() => setPublishOpen(false)}
        entityCode={entityCode} userId={user?.id ?? 'demo-user'} onDone={reload}
      />
    </div>
  );
}

interface PublishDialogProps {
  open: boolean; onClose: () => void; entityCode: string; userId: string; onDone: () => void;
}
function PublishDialog({ open, onClose, entityCode, userId, onDone }: PublishDialogProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [refId, setRefId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const candidates = useMemo(() => listMasterCandidates(entityCode, search), [entityCode, search]);

  const onSubmit = (): void => {
    if (!refId) { toast.error('Pick a master item'); return; }
    try {
      publishItem(entityCode, refId, userId, { listPrice: Number(price) || 0 });
      toast.success('Published as draft');
      setRefId(''); setPrice(''); setSearch('');
      onDone(); onClose();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish from inventory master</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search master items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-72 overflow-auto border rounded-lg divide-y">
            {candidates.length === 0
              ? <div className="p-3 text-xs text-muted-foreground">No matches.</div>
              : candidates.slice(0, 100).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setRefId(c.id)}
                  disabled={!!c.alreadyPublishedAs}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${refId === c.id ? 'bg-primary/10' : 'hover:bg-muted/40'} ${c.alreadyPublishedAs ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">qty {c.qty}{c.alreadyPublishedAs ? ' · published' : ''}</span>
                </button>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>List price (₹)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Publish (draft)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceEditor({ item, entityCode, onSaved }: { item: WebStoreItem; entityCode: string; onSaved: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(item.listPrice));
  const onSave = (): void => {
    try { updateStoreItem(entityCode, item.id, { listPrice: Number(price) || 0 }); toast.success('Updated'); onSaved(); setOpen(false); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {item.storeTitle}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>List price (₹)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="font-mono" />
          <p className="text-xs text-muted-foreground">Master fields (name/qty) are READ-ONLY and not shown here.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
