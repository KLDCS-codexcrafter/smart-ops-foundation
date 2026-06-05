/**
 * @file        src/pages/erp/webstorex/brands/BrandsPage.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBrands, createBrand, updateBrand, deleteBrand } from '@/lib/webstorex-engine';
import type { WsBrand } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

export function BrandsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);
  const brands: WsBrand[] = useMemo(
    () => entityCode ? listBrands(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onDelete = (id: string): void => {
    try { deleteBrand(entityCode, id); toast.success('Deleted'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Brands</h1>
          <p className="text-xs text-muted-foreground">{brands.length} brand{brands.length === 1 ? '' : 's'}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New brand</Button>
      </div>
      <Card className="glass-card">
        <CardContent className="p-0">
          {brands.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No brands yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {brands.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{b.description ?? '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { updateBrand(entityCode, b.id, { isActive: !b.isActive }); reload(); }}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => onDelete(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <BrandDialog open={open} onClose={() => setOpen(false)} entityCode={entityCode} onDone={reload} />
    </div>
  );
}

function BrandDialog({ open, onClose, entityCode, onDone }: { open: boolean; onClose: () => void; entityCode: string; onDone: () => void }): JSX.Element {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const onSubmit = (): void => {
    try { createBrand(entityCode, { name, description: desc }); toast.success('Created'); setName(''); setDesc(''); onDone(); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New brand</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
