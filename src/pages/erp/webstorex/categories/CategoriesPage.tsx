/**
 * @file        src/pages/erp/webstorex/categories/CategoriesPage.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · 3-level tree · cycle guard
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listCategoryTree, createCategory, deleteCategory, updateCategory, listCategories, type CategoryTreeNode } from '@/lib/webstorex-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronRight } from 'lucide-react';

export function CategoriesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);

  const tree = useMemo(
    () => entityCode ? listCategoryTree(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const flat = useMemo(
    () => entityCode ? listCategories(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onDelete = (id: string): void => {
    try { deleteCategory(entityCode, id); toast.success('Deleted'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-xs text-muted-foreground">Max 3 levels deep · cycles blocked</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New category</Button>
      </div>
      <Card className="glass-card">
        <CardContent className="p-4 space-y-1">
          {tree.length === 0
            ? <div className="p-8 text-center text-sm text-muted-foreground">No categories yet.</div>
            : tree.map((n) => <TreeRow key={n.id} node={n} depth={0} onDelete={onDelete} onToggle={(id, a) => { updateCategory(entityCode, id, { isActive: a }); reload(); }} />)}
        </CardContent>
      </Card>
      <CategoryDialog open={open} onClose={() => setOpen(false)} entityCode={entityCode} parents={flat} onDone={reload} />
    </div>
  );
}

interface TreeRowProps { node: CategoryTreeNode; depth: number; onDelete: (id: string) => void; onToggle: (id: string, a: boolean) => void; }
function TreeRow({ node, depth, onDelete, onToggle }: TreeRowProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/30 rounded-lg" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">L{depth + 1}</span>
        <span className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onToggle(node.id, !node.isActive)}>{node.isActive ? 'Active' : 'Inactive'}</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(node.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </span>
      </div>
      {node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} onDelete={onDelete} onToggle={onToggle} />)}
    </div>
  );
}

interface DProps { open: boolean; onClose: () => void; entityCode: string; parents: { id: string; name: string }[]; onDone: () => void; }
function CategoryDialog({ open, onClose, entityCode, parents, onDone }: DProps): JSX.Element {
  const [name, setName] = useState('');
  const [parent, setParent] = useState<string>('__root');
  const onSubmit = (): void => {
    try {
      createCategory(entityCode, { name, parentCategoryId: parent === '__root' ? null : parent });
      toast.success('Created'); setName(''); setParent('__root'); onDone(); onClose();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Parent</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root">— Root —</SelectItem>
                {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
