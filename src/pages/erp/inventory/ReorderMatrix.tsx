/**
 * ReorderMatrix.tsx — multi-godown per-item reorder rules CRUD
 * Sprint T-Phase-1.2.3-fix · Founder ask: "an item can have multiple reorder type department wise."
 *
 * Reads/writes erp_item_locations_${entityCode} (ItemLocation type).
 * Validates min ≤ reorder ≤ max, no duplicate (item, godown).
 *
 * [JWT] CRUD /api/inventory/item-locations
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Repeat, Plus, Trash2, Edit2, Search, Layers, Warehouse, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useGodowns } from '@/hooks/useGodowns';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  itemLocationsKey,
  type ItemLocation, type LocationType,
} from '@/types/item-location';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';

interface RuleForm {
  id: string | null;
  item_id: string;
  godown_id: string;
  location_type: LocationType;
  min_stock: number;
  max_stock: number;
  reorder_level: number;
  lead_time_days: number;
  safety_stock: number;
  eoq: number;
  notes: string;
}

const BLANK: RuleForm = {
  id: null,
  item_id: '', godown_id: '',
  location_type: 'departmental',
  min_stock: 0, max_stock: 0, reorder_level: 0,
  lead_time_days: 7, safety_stock: 0, eoq: 0,
  notes: '',
};

function loadRules(entityCode: string): ItemLocation[] {
  try {
    // [JWT] GET /api/inventory/item-locations?entity=
    const raw = localStorage.getItem(itemLocationsKey(entityCode));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadStockBalance(entityCode: string): StockBalanceEntry[] {
  try {
    return JSON.parse(localStorage.getItem(stockBalanceKey(entityCode)) || '[]');
  } catch { return []; }
}

export function ReorderMatrixPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { godowns } = useGodowns();

  const [rules, setRules] = useState<ItemLocation[]>(() => loadRules(safeEntity));
  const [search, setSearch] = useState('');
  const [godownFilter, setGodownFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(BLANK);

  useEffect(() => {
    setRules(loadRules(safeEntity));
  }, [safeEntity]);

  const persist = (next: ItemLocation[]) => {
    setRules(next);
    // [JWT] PUT /api/inventory/item-locations
    localStorage.setItem(itemLocationsKey(safeEntity), JSON.stringify(next));
  };

  const stockBalance = useMemo(() => loadStockBalance(safeEntity), [safeEntity]);

  const stockGroups = useMemo(
    () => [...new Set(items.map(i => i.stock_group_name).filter(Boolean))].sort() as string[],
    [items],
  );

  const filtered = useMemo(() => {
    return rules.filter(r => {
      const item = items.find(i => i.id === r.item_id);
      if (godownFilter !== 'all' && r.godown_id !== godownFilter) return false;
      if (groupFilter !== 'all' && item?.stock_group_name !== groupFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item) return false;
        if (!item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rules, items, godownFilter, groupFilter, search]);

  const kpis = useMemo(() => {
    const itemSet = new Set(rules.map(r => r.item_id));
    const godownSet = new Set(rules.map(r => r.godown_id).filter(Boolean));
    let belowReorder = 0;
    rules.forEach(r => {
      const bal = stockBalance.find(b => b.item_id === r.item_id && b.godown_id === r.godown_id);
      if (bal && bal.qty < (r.reorder_level ?? 0)) belowReorder++;
    });
    return {
      totalRules: rules.length,
      itemsWithRules: itemSet.size,
      godownsConfigured: godownSet.size,
      belowReorder,
    };
  }, [rules, stockBalance]);

  const startNew = () => {
    setForm(BLANK);
    setOpen(true);
  };

  const startEdit = (r: ItemLocation) => {
    setForm({
      id: r.id,
      item_id: r.item_id,
      godown_id: r.godown_id ?? '',
      location_type: r.location_type ?? 'departmental',
      min_stock: r.min_stock ?? 0,
      max_stock: r.max_stock ?? 0,
      reorder_level: r.reorder_level ?? 0,
      lead_time_days: r.lead_time_days ?? 7,
      safety_stock: r.safety_stock ?? 0,
      eoq: r.eoq ?? 0,
      notes: '',
    });
    setOpen(true);
  };

  const validate = (): string | null => {
    if (!form.item_id) return 'Item is required';
    if (!form.godown_id) return 'Godown is required';
    if (form.min_stock < 0 || form.max_stock < 0 || form.reorder_level < 0) return 'Values must be ≥ 0';
    if (form.min_stock > form.max_stock) return 'Min cannot exceed Max';
    if (form.reorder_level < form.min_stock || form.reorder_level > form.max_stock) {
      return 'Reorder Point must satisfy Min ≤ Reorder ≤ Max';
    }
    if (form.safety_stock > form.max_stock) return 'Safety Stock cannot exceed Max';
    const dup = rules.some(r =>
      r.item_id === form.item_id && r.godown_id === form.godown_id && r.id !== form.id,
    );
    if (dup) return 'A rule already exists for this item & godown';
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const now = new Date().toISOString();
    const item = items.find(i => i.id === form.item_id);
    const godown = godowns.find(g => g.id === form.godown_id);
    if (form.id) {
      const next = rules.map(r => r.id === form.id ? {
        ...r,
        item_id: form.item_id,
        godown_id: form.godown_id,
        godown_name: godown?.name ?? null,
        location_type: form.location_type,
        min_stock: form.min_stock,
        max_stock: form.max_stock,
        reorder_level: form.reorder_level,
        lead_time_days: form.lead_time_days,
        safety_stock: form.safety_stock,
        eoq: form.eoq,
        updated_at: now,
      } : r);
      persist(next);
      toast.success(`Reorder rule updated · ${item?.name ?? 'Item'} @ ${godown?.name ?? 'Godown'}`);
    } else {
      const fresh: ItemLocation = {
        id: `iloc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        item_id: form.item_id,
        godown_id: form.godown_id,
        godown_name: godown?.name ?? null,
        bin_id: null, bin_name: null,
        location_type: form.location_type,
        min_stock: form.min_stock,
        max_stock: form.max_stock,
        reorder_level: form.reorder_level,
        lead_time_days: form.lead_time_days,
        safety_stock: form.safety_stock,
        eoq: form.eoq,
        created_at: now, updated_at: now,
      };
      persist([fresh, ...rules]);
      toast.success(`Reorder rule created · ${item?.name ?? 'Item'} @ ${godown?.name ?? 'Godown'}`);
    }
    setOpen(false);
  };

  const remove = (r: ItemLocation) => {
    persist(rules.filter(x => x.id !== r.id));
    toast.success('Reorder rule removed');
  };

  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? id;
  const itemCode = (id: string) => items.find(i => i.id === id)?.code ?? '';
  const godownName = (id: string | null | undefined) =>
    id ? (godowns.find(g => g.id === id)?.name ?? id) : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="h-6 w-6 text-cyan-500" />
            Reorder Matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-Godown Reorder Rules · per-item per-godown min/max/reorder/lead-time configuration
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={startNew}>
          <Plus className="h-4 w-4" /> Add Reorder Rule
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Rules</CardDescription>
          <CardTitle className="text-2xl font-mono">{kpis.totalRules}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Items With Rules</CardDescription>
          <CardTitle className="text-2xl font-mono">{kpis.itemsWithRules}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Godowns Configured</CardDescription>
          <CardTitle className="text-2xl font-mono">{kpis.godownsConfigured}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Below Reorder</CardDescription>
          <CardTitle className={`text-2xl font-mono ${kpis.belowReorder > 0 ? 'text-rose-600' : ''}`}>
            {kpis.belowReorder}
          </CardTitle></CardHeader></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search item code / name..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={godownFilter} onValueChange={setGodownFilter}>
          <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Godowns</SelectItem>
            {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Groups</SelectItem>
            {stockGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Item', 'Godown', 'Min', 'Max', 'Reorder Pt', 'Lead', 'Safety', 'EOQ', ''].map(h =>
                  <TableHead key={h} className="text-xs uppercase font-semibold">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No reorder rules configured.</p>
                  <p className="text-xs mt-1">Add the first one to enable multi-godown reorder alerts.</p>
                </TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="group">
                  <TableCell className="text-xs">
                    <div className="font-medium">{itemName(r.item_id)}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{itemCode(r.item_id)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="h-3 w-3 text-muted-foreground" />
                      {godownName(r.godown_id)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.min_stock ?? 0}</TableCell>
                  <TableCell className="text-xs font-mono">{r.max_stock ?? 0}</TableCell>
                  <TableCell className="text-xs font-mono">
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {r.reorder_level ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.lead_time_days ?? 0}d</TableCell>
                  <TableCell className="text-xs font-mono">{r.safety_stock ?? 0}</TableCell>
                  <TableCell className="text-xs font-mono">{r.eoq ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => startEdit(r)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"
                        onClick={() => remove(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-cyan-500" />
              {form.id ? 'Edit Reorder Rule' : 'New Reorder Rule'}
            </DialogTitle>
            <DialogDescription>
              Per-item per-godown reorder configuration. Validate Min ≤ Reorder ≤ Max.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Item *</Label>
                <Select value={form.item_id} disabled={!!form.id}
                  onValueChange={v => setForm(f => ({ ...f, item_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Godown *</Label>
                <Select value={form.godown_id} disabled={!!form.id}
                  onValueChange={v => setForm(f => ({ ...f, godown_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger>
                  <SelectContent>
                    {godowns.filter(g => !g.is_virtual).map(g =>
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Stock</Label>
                <Input type="number" min={0} value={form.min_stock || ''}
                  onChange={e => {
                    const min = parseFloat(e.target.value) || 0;
                    setForm(f => ({
                      ...f, min_stock: min,
                      reorder_level: f.reorder_level || min * 2,
                    }));
                  }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Stock</Label>
                <Input type="number" min={0} value={form.max_stock || ''}
                  onChange={e => setForm(f => ({ ...f, max_stock: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reorder Pt</Label>
                <Input type="number" min={0} value={form.reorder_level || ''}
                  onChange={e => setForm(f => ({ ...f, reorder_level: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Lead Time (days)</Label>
                <Input type="number" min={0} value={form.lead_time_days || ''}
                  onChange={e => setForm(f => ({ ...f, lead_time_days: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" title="(max_daily × lead_time) − (avg_daily × lead_time)">
                  Safety Stock
                </Label>
                <Input type="number" min={0} value={form.safety_stock || ''}
                  onChange={e => setForm(f => ({ ...f, safety_stock: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" title="√(2 × annual_demand × order_cost / holding_cost)">
                  EOQ
                </Label>
                <Input type="number" min={0} value={form.eoq || ''}
                  onChange={e => setForm(f => ({ ...f, eoq: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location Type</Label>
              <Select value={form.location_type}
                onValueChange={v => setForm(f => ({ ...f, location_type: v as LocationType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="departmental">Departmental</SelectItem>
                  <SelectItem value="inward">Inward</SelectItem>
                  <SelectItem value="qc">QC</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="dispatch">Dispatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {form.min_stock > form.max_stock && form.max_stock > 0 && (
              <div className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Min cannot exceed Max
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{form.id ? 'Save Changes' : 'Create Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReorderMatrixPanel;
