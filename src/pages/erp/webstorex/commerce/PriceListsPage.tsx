/**
 * @file        src/pages/erp/webstorex/commerce/PriceListsPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-4
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listPriceLists, createPriceList, updatePriceList, deletePriceList,
  assignPartyToPriceList,
} from '@/lib/webstorex-commerce-engine';
import { listStoreItems } from '@/lib/webstorex-engine';
import type { WsPriceList } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus } from 'lucide-react';

export function PriceListsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<WsPriceList | null>(null);
  const [partyId, setPartyId] = useState('');

  const lists = useMemo<WsPriceList[]>(
    () => entityCode ? listPriceLists(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const items = useMemo(
    () => entityCode ? listStoreItems(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onDelete = (id: string): void => {
    try { deletePriceList(entityCode, id); toast.success('Deleted'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const onAssign = (): void => {
    if (!assignOpen || !partyId.trim()) return;
    try {
      assignPartyToPriceList(entityCode, assignOpen.id, partyId.trim());
      toast.success(`Party moved → ${assignOpen.name}`);
      setAssignOpen(null); setPartyId(''); reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">B2B Price Lists</h1>
          <p className="text-xs text-muted-foreground">{lists.length} list{lists.length === 1 ? '' : 's'} · single assignment per party</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New list</Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {lists.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No price lists yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Mode</TableHead>
                  <TableHead>Parties</TableHead><TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.name}</TableCell>
                    <TableCell><Badge variant="outline">{pl.mode === 'per_item' ? 'Per item' : `${pl.percentOff ?? 0}% off`}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{pl.assignedPartyIds.length}</TableCell>
                    <TableCell><Badge variant={pl.isActive ? 'default' : 'secondary'}>{pl.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setAssignOpen(pl)}><UserPlus className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => updatePriceList(entityCode, pl.id, { isActive: !pl.isActive }) && reload()}>
                        Toggle
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(pl.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* "Who pays what" preview */}
      {lists.length > 0 && items.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4 text-xs">
            <div className="font-semibold mb-2">Who pays what · preview</div>
            <div className="space-y-1 font-mono">
              {items.slice(0, 5).map(it => (
                <div key={it.id} className="grid grid-cols-3 gap-2">
                  <span className="truncate">{it.itemRefName}</span>
                  <span>List ₹{it.listPrice}</span>
                  <span className="text-muted-foreground">{lists.length} price tier{lists.length === 1 ? '' : 's'} configured</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <NewListDialog open={open} onOpenChange={setOpen} entityCode={entityCode} items={items} onCreated={reload} />

      <Dialog open={!!assignOpen} onOpenChange={(o) => !o && setAssignOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign party → {assignOpen?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Party ID</Label>
            <Input value={partyId} onChange={(e) => setPartyId(e.target.value)} placeholder="e.g. P-101" />
            <p className="text-xs text-muted-foreground">If the party already belongs to another list, it will be moved (audited).</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(null)}>Cancel</Button>
            <Button onClick={onAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewListDialog(props: {
  open: boolean; onOpenChange: (o: boolean) => void;
  entityCode: string; items: { id: string; itemRefName: string }[]; onCreated: () => void;
}): JSX.Element {
  const { open, onOpenChange, entityCode, onCreated } = props;
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'per_item' | 'percent_off_list'>('percent_off_list');
  const [percentOff, setPercentOff] = useState('10');

  const create = (): void => {
    try {
      createPriceList(entityCode, {
        name: name.trim(), mode,
        percentOff: mode === 'percent_off_list' ? Number(percentOff) : null,
        itemRates: [], assignedPartyIds: [], isActive: true,
      });
      toast.success('Price list created');
      setName(''); setPercentOff('10');
      onOpenChange(false); onCreated();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New price list</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as 'per_item' | 'percent_off_list')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent_off_list">Percent off list</SelectItem>
                <SelectItem value="per_item">Per item rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'percent_off_list' && (
            <div><Label>% off</Label><Input type="number" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
