/**
 * PackingBOMMaster.tsx — Sprint 15b
 * MODULE ID: dh-m-packing-bom
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Search, Trash2, ChevronDown, Copy, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type PackingBOM, type PackingBOMLine, packingBOMsKey,
} from '@/types/packing-bom';
import { type PackingMaterial, packingMaterialsKey } from '@/types/packing-material';
import { computeBOMTotalCost } from '@/lib/packing-bom-engine';

interface ItemLite { id: string; code: string; name: string }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

function loadItems(): ItemLite[] {
  try {
    const raw = localStorage.getItem('erp_inventory_items');
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ id: string; code: string; name: string }>;
    return arr.map(i => ({ id: i.id, code: i.code, name: i.name }));
  } catch { return []; }
}

export function PackingBOMMasterPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const bomsKey = packingBOMsKey(entityCode);
  const matsKey = packingMaterialsKey(entityCode);

  const [boms, setBoms] = useState<PackingBOM[]>([]);
  const [materials, setMaterials] = useState<PackingMaterial[]>([]);
  const [items] = useState<ItemLite[]>(loadItems());
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PackingBOM | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    setBoms(ls<PackingBOM>(bomsKey));
    setMaterials(ls<PackingMaterial>(matsKey));
  }, [bomsKey, matsKey]);

  const persist = (next: PackingBOM[]) => {
    setBoms(next);
    localStorage.setItem(bomsKey, JSON.stringify(next));
    // [JWT] PUT /api/dispatch/packing-boms
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return boms.filter(b => !needle ||
      b.item_code.toLowerCase().includes(needle) ||
      b.item_name.toLowerCase().includes(needle));
  }, [boms, search]);

  const openCreate = () => {
    setEditing({
      id: `pb-${Date.now()}`, entity_id: entityCode,
      item_id: '', item_code: '', item_name: '',
      lines: [],
      total_packing_cost_paise: 0,
      active: true,
      effective_from: todayISO(), effective_to: null,
      notes: '',
      created_at: nowISO(), updated_at: nowISO(),
      created_by: userId,
    });
    setDialogOpen(true);
  };

  const openEdit = (b: PackingBOM) => { setEditing({ ...b, lines: [...b.lines] }); setDialogOpen(true); };

  const duplicate = (b: PackingBOM) => {
    const copy: PackingBOM = {
      ...b, id: `pb-${Date.now()}`,
      effective_from: todayISO(), effective_to: null,
      created_at: nowISO(), updated_at: nowISO(),
      lines: b.lines.map(l => ({ ...l, id: `pbl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
    };
    persist([copy, ...boms]);
    toast.success(`Duplicated BOM for ${b.item_code}`);
  };

  const deactivate = (id: string) => {
    persist(boms.map(b => b.id === id ? { ...b, active: false, updated_at: nowISO() } : b));
    toast.success('Deactivated');
  };

  const addLine = () => {
    if (!editing) return;
    const newLine: PackingBOMLine = {
      id: `pbl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      material_id: '', material_code: '', material_name: '', material_uom: '',
      qty_per_unit: 0, is_optional: false,
    };
    setEditing({ ...editing, lines: [...editing.lines, newLine] });
  };

  const updateLine = (id: string, patch: Partial<PackingBOMLine>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      lines: editing.lines.map(l => l.id === id ? { ...l, ...patch } : l),
    });
  };

  const pickMaterial = (lineId: string, materialId: string) => {
    const m = materials.find(x => x.id === materialId);
    if (!m) return;
    updateLine(lineId, {
      material_id: m.id, material_code: m.code, material_name: m.name, material_uom: m.uom,
    });
  };

  const removeLine = (id: string) => {
    if (!editing) return;
    setEditing({ ...editing, lines: editing.lines.filter(l => l.id !== id) });
  };

  const runningCost = useMemo(() => {
    if (!editing) return 0;
    return computeBOMTotalCost(editing, materials);
  }, [editing, materials]);

  const save = () => {
    if (!editing) return;
    if (!editing.item_id) { toast.error('Pick an item'); return; }
    if (editing.lines.length === 0) { toast.error('Add at least one BOM line'); return; }
    if (editing.lines.some(l => !l.material_id || l.qty_per_unit <= 0)) {
      toast.error('Each line needs a material and qty > 0');
      return;
    }
    // Overlap validation
    const overlap = boms.find(b =>
      b.id !== editing.id && b.item_id === editing.item_id && b.active &&
      b.effective_from <= (editing.effective_to ?? '9999-12-31') &&
      (b.effective_to ?? '9999-12-31') >= editing.effective_from,
    );
    if (overlap) {
      toast.error(`Overlaps with active BOM (${overlap.effective_from} → ${overlap.effective_to ?? 'active'})`);
      return;
    }
    const totalCost = computeBOMTotalCost(editing, materials);
    const next: PackingBOM = { ...editing, total_packing_cost_paise: totalCost, updated_at: nowISO() };
    const exists = boms.some(b => b.id === next.id);
    persist(exists ? boms.map(b => b.id === next.id ? next : b) : [next, ...boms]);
    toast.success(`Saved BOM for ${next.item_code}`);
    setDialogOpen(false);
  };

  const suggestSimilar = useMemo(() => {
    if (!editing || !editing.item_name) return [];
    const needle = editing.item_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return boms.filter(b =>
      b.id !== editing.id &&
      b.active &&
      needle.some(w => b.item_name.toLowerCase().includes(w))
    ).slice(0, 5);
  }, [boms, editing]);

  const copyFromSuggestion = (src: PackingBOM) => {
    if (!editing) return;
    setEditing({
      ...editing,
      lines: src.lines.map(l => ({
        ...l, id: `pbl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      })),
    });
    setSuggestOpen(false);
    toast.success(`Copied ${src.lines.length} lines from ${src.item_code}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packing BOM Master</h1>
          <p className="text-xs text-muted-foreground">{boms.length} BOMs · {boms.filter(b => b.active).length} active</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add BOM
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item code or name…" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.map(b => (
            <Collapsible key={b.id}>
              <Card className="border-border">
                <div className="flex items-center justify-between p-3 gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs">{b.item_code}</span>
                      <span className="font-semibold text-sm">{b.item_name}</span>
                      {b.active
                        ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/40">Active</Badge>
                        : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {b.effective_from} → {b.effective_to ?? 'active'} · {b.lines.length} lines
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    ₹ {(b.total_packing_cost_paise / 100).toFixed(2)} / unit
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicate(b)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {b.active && (
                      <Button size="icon" variant="ghost" onClick={() => deactivate(b.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                    <CollapsibleTrigger asChild>
                      <Button size="icon" variant="ghost"><ChevronDown className="h-4 w-4" /></Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="px-3 pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Qty / unit</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Optional</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {b.lines.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs">
                              <span className="font-mono">{l.material_code}</span> · {l.material_name}
                            </TableCell>
                            <TableCell className="text-right font-mono">{l.qty_per_unit}</TableCell>
                            <TableCell className="text-xs">{l.material_uom}</TableCell>
                            <TableCell>{l.is_optional ? 'Yes' : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No BOMs yet. Click "Add BOM" to create one.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && boms.find(b => b.id === editing.id) ? 'Edit' : 'Add'} Packing BOM</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Item</Label>
                  <Select value={editing.item_id} onValueChange={v => {
                    const it = items.find(i => i.id === v);
                    if (it) setEditing({ ...editing, item_id: it.id, item_code: it.code, item_name: it.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pick item…" /></SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>
                      ))}
                      {items.length === 0 && <SelectItem disabled value="__none__">No items found</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={() => setSuggestOpen(true)}
                    disabled={!editing.item_name || suggestSimilar.length === 0}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Suggest from similar ({suggestSimilar.length})
                  </Button>
                </div>
                <div>
                  <Label>Effective From</Label>
                  <Input type="date" value={editing.effective_from}
                    onChange={e => setEditing({ ...editing, effective_from: e.target.value })} />
                </div>
                <div>
                  <Label>Effective To (blank = active)</Label>
                  <Input type="date" value={editing.effective_to ?? ''}
                    onChange={e => setEditing({ ...editing, effective_to: e.target.value || null })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.active} onCheckedChange={v => setEditing({ ...editing, active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center pt-6 justify-end">
                  <Badge variant="outline" className="font-mono">
                    Running cost: ₹ {(runningCost / 100).toFixed(2)} / unit
                  </Badge>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">BOM Lines</h3>
                  <Button size="sm" variant="outline" onClick={addLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right w-[110px]">Qty / unit</TableHead>
                      <TableHead className="w-[80px]">Opt.</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editing.lines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Select value={l.material_id} onValueChange={v => pickMaterial(l.id, v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Pick…" /></SelectTrigger>
                            <SelectContent>
                              {materials.filter(m => m.active).map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.code} — {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.0001" className="h-8 text-right font-mono"
                            value={l.qty_per_unit}
                            onChange={e => updateLine(l.id, { qty_per_unit: parseFloat(e.target.value || '0') })} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={l.is_optional}
                            onCheckedChange={v => updateLine(l.id, { is_optional: v })} />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {editing.lines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-sm">
                          No lines. Click "Add Line" to start.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Similar BOMs</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {suggestSimilar.map(s => (
              <Card key={s.id} className="cursor-pointer hover:border-blue-600/50" onClick={() => copyFromSuggestion(s)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs">{s.item_code}</div>
                      <div className="text-sm font-semibold">{s.item_name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.lines.length} lines</div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      ₹ {(s.total_packing_cost_paise / 100).toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {suggestSimilar.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No similar BOMs found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PackingBOMMasterPanel;
