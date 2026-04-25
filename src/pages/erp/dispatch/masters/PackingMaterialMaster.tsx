/**
 * PackingMaterialMaster.tsx — Sprint 15b
 * MODULE ID: dh-m-packing-material
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type PackingMaterial, type PackingMaterialKind, type PackingMaterialUOM,
  type MaterialPricingSource, packingMaterialsKey,
} from '@/types/packing-material';

const KINDS: PackingMaterialKind[] = [
  'carton', 'tape', 'bubble_wrap', 'foam', 'label', 'strapping',
  'stretch_film', 'pallet', 'crate', 'ice_pack', 'other',
];
const UOMS: PackingMaterialUOM[] = ['piece', 'meter', 'roll', 'kg', 'sheet'];
const SOURCES: MaterialPricingSource[] = ['latest_purchase', 'weighted_average', 'manual'];

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

function nowISO() { return new Date().toISOString(); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function seedDefaults(entity: string): PackingMaterial[] {
  const base = (
    code: string, name: string, kind: PackingMaterialKind,
    uom: PackingMaterialUOM, costPaise: number, stock: number, reorder: number,
    extras: Partial<PackingMaterial> = {},
  ): PackingMaterial => ({
    id: `pm-seed-${code}`, entity_id: entity, code, name, kind, uom,
    length_cm: null, width_cm: null, height_cm: null, weight_g: null,
    cost_per_uom_paise: costPaise, pricing_source: 'manual',
    price_effective_from: todayISO(),
    opening_stock: stock, current_stock: stock,
    reorder_level: reorder, reorder_qty: reorder * 2,
    is_reusable: false, return_expected_days: null,
    tracks_expiry: false, shelf_life_days: null,
    active: true, notes: 'Seeded default',
    created_at: nowISO(), updated_at: nowISO(),
    ...extras,
  });
  return [
    base('CRT-SML-01', 'Small Carton 20x15x15 cm', 'carton', 'piece', 1800, 500, 100,
      { length_cm: 20, width_cm: 15, height_cm: 15, weight_g: 120 }),
    base('CRT-MED-01', 'Medium Carton 30x20x20 cm', 'carton', 'piece', 3200, 350, 80,
      { length_cm: 30, width_cm: 20, height_cm: 20, weight_g: 220 }),
    base('CRT-LRG-01', 'Large Carton 45x30x30 cm', 'carton', 'piece', 5500, 200, 50,
      { length_cm: 45, width_cm: 30, height_cm: 30, weight_g: 380 }),
    base('TAPE-BR-48', 'Brown BOPP Tape 48mm x 65m', 'tape', 'roll', 4500, 80, 25),
    base('BUB-W10', 'Bubble Wrap 1m wide', 'bubble_wrap', 'meter', 600, 1200, 300),
    base('LBL-FRG-01', 'Fragile Label 75x50 mm', 'label', 'piece', 80, 5000, 1000),
    base('PLT-WD-STD', 'Wooden Pallet 120x80 cm', 'pallet', 'piece', 45000, 60, 15,
      { is_reusable: true, return_expected_days: 30 }),
  ];
}

export function PackingMaterialMasterPanel() {
  const { entityCode } = useCardEntitlement();
  const storageKey = packingMaterialsKey(entityCode);

  const [materials, setMaterials] = useState<PackingMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | PackingMaterialKind>('all');
  const [editing, setEditing] = useState<PackingMaterial | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let data = ls<PackingMaterial>(storageKey);
    if (data.length === 0) {
      data = seedDefaults(entityCode);
      localStorage.setItem(storageKey, JSON.stringify(data));
      // [JWT] POST /api/dispatch/packing-materials/seed
    }
    setMaterials(data);
  }, [entityCode, storageKey]);

  const persist = (next: PackingMaterial[]) => {
    setMaterials(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    // [JWT] PUT /api/dispatch/packing-materials
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return materials.filter(m =>
      (kindFilter === 'all' || m.kind === kindFilter) &&
      (!needle || m.code.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle))
    );
  }, [materials, search, kindFilter]);

  const lowStock = useMemo(
    () => materials.filter(m => m.active && m.current_stock <= m.reorder_level),
    [materials],
  );

  const openCreate = () => {
    setEditing({
      id: `pm-${Date.now()}`, entity_id: entityCode, code: '', name: '',
      kind: 'carton', uom: 'piece',
      length_cm: null, width_cm: null, height_cm: null, weight_g: null,
      cost_per_uom_paise: 0, pricing_source: 'manual',
      price_effective_from: todayISO(),
      opening_stock: 0, current_stock: 0,
      reorder_level: 0, reorder_qty: 0,
      is_reusable: false, return_expected_days: null,
      tracks_expiry: false, shelf_life_days: null,
      active: true, notes: '',
      created_at: nowISO(), updated_at: nowISO(),
    });
    setDialogOpen(true);
  };

  const openEdit = (m: PackingMaterial) => { setEditing({ ...m }); setDialogOpen(true); };

  const save = () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const next = editing.updated_at === editing.created_at && !materials.find(x => x.id === editing.id)
      ? [...materials, editing]
      : materials.map(m => m.id === editing.id ? { ...editing, updated_at: nowISO() } : m);
    persist(next);
    toast.success(`Saved ${editing.code}`);
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    if (!confirm('Delete this material?')) return;
    persist(materials.filter(m => m.id !== id));
    toast.success('Deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packing Materials</h1>
          <p className="text-xs text-muted-foreground">{materials.length} materials · {lowStock.length} low-stock</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Material
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{lowStock.length}</span>
              <span className="text-muted-foreground"> material(s) at or below reorder level: </span>
              <span className="font-mono text-xs">{lowStock.map(m => m.code).join(', ')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search code or name…" className="pl-8" />
            </div>
            <Select value={kindFilter} onValueChange={v => setKindFilter(v as typeof kindFilter)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {KINDS.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Cost (₹)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reorder Lvl</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const low = m.current_stock <= m.reorder_level;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.code}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{m.kind}</Badge></TableCell>
                    <TableCell className="text-xs">{m.uom}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(m.cost_per_uom_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${low ? 'text-amber-600 font-semibold' : ''}`}>
                      {m.current_stock}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{m.reorder_level}</TableCell>
                    <TableCell>
                      {m.active
                        ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/40">Active</Badge>
                        : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No materials match the filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && materials.find(x => x.id === editing.id) ? 'Edit' : 'Add'} Packing Material</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Kind</Label>
                <Select value={editing.kind} onValueChange={v => setEditing({ ...editing, kind: v as PackingMaterialKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KINDS.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>UOM</Label>
                <Select value={editing.uom} onValueChange={v => setEditing({ ...editing, uom: v as PackingMaterialUOM })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UOMS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost per UOM (₹)</Label>
                <Input type="number" step="0.01"
                  value={(editing.cost_per_uom_paise / 100).toString()}
                  onChange={e => setEditing({ ...editing, cost_per_uom_paise: Math.round(parseFloat(e.target.value || '0') * 100) })} />
              </div>
              <div>
                <Label>Pricing Source</Label>
                <Select value={editing.pricing_source} onValueChange={v => setEditing({ ...editing, pricing_source: v as MaterialPricingSource })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Stock</Label>
                <Input type="number" value={editing.current_stock}
                  onChange={e => setEditing({ ...editing, current_stock: parseFloat(e.target.value || '0') })} />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input type="number" value={editing.reorder_level}
                  onChange={e => setEditing({ ...editing, reorder_level: parseFloat(e.target.value || '0') })} />
              </div>
              <div>
                <Label>Reorder Qty</Label>
                <Input type="number" value={editing.reorder_qty}
                  onChange={e => setEditing({ ...editing, reorder_qty: parseFloat(e.target.value || '0') })} />
              </div>
              <div>
                <Label>Length (cm)</Label>
                <Input type="number" value={editing.length_cm ?? ''}
                  onChange={e => setEditing({ ...editing, length_cm: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div>
                <Label>Width (cm)</Label>
                <Input type="number" value={editing.width_cm ?? ''}
                  onChange={e => setEditing({ ...editing, width_cm: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={editing.height_cm ?? ''}
                  onChange={e => setEditing({ ...editing, height_cm: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editing.is_reusable}
                  onCheckedChange={v => setEditing({ ...editing, is_reusable: v })} />
                <Label>Reusable</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editing.active}
                  onCheckedChange={v => setEditing({ ...editing, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PackingMaterialMasterPanel;
