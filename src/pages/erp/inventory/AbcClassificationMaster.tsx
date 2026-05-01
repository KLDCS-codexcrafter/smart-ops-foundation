/**
 * AbcClassificationMaster.tsx — Pareto ABC Master + Run Classification preview.
 * Sprint T-Phase-1.2.5
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useT } from '@/lib/i18n-engine';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pin, PinOff, TrendingUp, Play } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { InventoryItem } from '@/types/inventory-item';
import type { MaterialIssueNote, ConsumptionEntry } from '@/types/consumption';
import { minNotesKey, consumptionEntriesKey } from '@/types/consumption';
import {
  classifyItemsABC, applyAbcClassification,
  type AbcClassificationResult,
} from '@/lib/abc-classification-engine';

const IKEY = 'erp_inventory_items';

function loadJson<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}

const FMT = (n: number): string => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CLASS_BADGE = (cls: 'A' | 'B' | 'C' | null): string => {
  if (cls === 'A') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (cls === 'B') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  if (cls === 'C') return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
  return 'bg-muted text-muted-foreground';
};

export function AbcClassificationMasterPanel() {
  const t = useT();
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';

  const [items, setItems] = useState<InventoryItem[]>(() => loadJson<InventoryItem>(IKEY));
  const [windowDays, setWindowDays] = useState<number>(365);
  const [classFilter, setClassFilter] = useState<'all' | 'A' | 'B' | 'C' | 'unclassified'>('all');
  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<AbcClassificationResult[]>([]);
  const [pinDialog, setPinDialog] = useState<{ itemId: string; cls: 'A' | 'B' | 'C' } | null>(null);

  const persistItems = (next: InventoryItem[]) => {
    setItems(next);
    localStorage.setItem(IKEY, JSON.stringify(next));
    // [JWT] PATCH /api/inventory/items (bulk)
  };

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (classFilter === 'unclassified' && it.abc_class) return false;
      if (classFilter !== 'all' && classFilter !== 'unclassified' && it.abc_class !== classFilter) return false;
      if (pinnedOnly && !it.abc_class_pinned) return false;
      if (search && !`${it.code} ${it.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, classFilter, search, pinnedOnly]);

  const kpi = useMemo(() => {
    const acc = { A: { n: 0, v: 0 }, B: { n: 0, v: 0 }, C: { n: 0, v: 0 }, U: 0 };
    items.forEach(it => {
      const v = it.std_purchase_rate ?? 0;
      if (it.abc_class === 'A') { acc.A.n++; acc.A.v += v; }
      else if (it.abc_class === 'B') { acc.B.n++; acc.B.v += v; }
      else if (it.abc_class === 'C') { acc.C.n++; acc.C.v += v; }
      else acc.U++;
    });
    return acc;
  }, [items]);

  const handleRun = () => {
    const mins = loadJson<MaterialIssueNote>(minNotesKey(safeEntity));
    const ces = loadJson<ConsumptionEntry>(consumptionEntriesKey(safeEntity));
    const results = classifyItemsABC(items, mins, ces, windowDays);
    setPreview(results);
    setPreviewOpen(true);
  };

  const handleApplyAll = () => {
    const updated = applyAbcClassification(preview, items);
    const changed = preview.filter(r => r.will_change).length;
    const skipped = preview.filter(r => r.is_pinned).length;
    persistItems(updated);
    setPreviewOpen(false);
    toast.success(`Reclassified ${changed} items · ${skipped} pinned (skipped)`);
  };

  const handlePin = (itemId: string, cls: 'A' | 'B' | 'C') => {
    const now = new Date().toISOString();
    persistItems(items.map(it =>
      it.id === itemId
        ? { ...it, abc_class: cls, abc_class_pinned: true, abc_classified_at: now, updated_at: now }
        : it,
    ));
    toast.success(`Pinned to class ${cls}`);
    setPinDialog(null);
  };

  const handleUnpin = (itemId: string) => {
    persistItems(items.map(it =>
      it.id === itemId ? { ...it, abc_class_pinned: false, updated_at: new Date().toISOString() } : it,
    ));
    toast.success('Unpinned');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-cyan-500" />
        <h2 className="text-xl font-bold">{t('inv.abc_master.title', 'ABC Classification')}</h2>
        <Badge variant="outline" className="text-[10px]">Pareto 80 / 15 / 5</Badge>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">A-class</p>
          <p className="text-lg font-bold text-emerald-600">{kpi.A.n}</p>
          <p className="text-xs text-muted-foreground">{FMT(kpi.A.v)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">B-class</p>
          <p className="text-lg font-bold text-amber-600">{kpi.B.n}</p>
          <p className="text-xs text-muted-foreground">{FMT(kpi.B.v)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">C-class</p>
          <p className="text-lg font-bold text-blue-600">{kpi.C.n}</p>
          <p className="text-xs text-muted-foreground">{FMT(kpi.C.v)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Unclassified</p>
          <p className="text-lg font-bold text-muted-foreground">{kpi.U}</p>
        </Card>
      </div>

      {/* Filters + Run */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search item…" className="w-64 h-8"
        />
        <Select value={classFilter} onValueChange={v => setClassFilter(v as typeof classFilter)}>
          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            <SelectItem value="A">A only</SelectItem>
            <SelectItem value="B">B only</SelectItem>
            <SelectItem value="C">C only</SelectItem>
            <SelectItem value="unclassified">Unclassified</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="pinned" checked={pinnedOnly} onCheckedChange={setPinnedOnly} />
          <Label htmlFor="pinned" className="text-xs">Pinned only</Label>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={String(windowDays)} onValueChange={v => setWindowDays(Number(v))}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleRun} className="gap-1">
            <Play className="h-3.5 w-3.5" /> Run Classification
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Pinned</TableHead>
              <TableHead>Classified At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                  No items match
                </TableCell>
              </TableRow>
            )}
            {filtered.map(it => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell className="font-mono text-xs">{it.code}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={CLASS_BADGE(it.abc_class ?? null)}>
                    {it.abc_class ?? '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {it.abc_class_pinned
                    ? <Pin className="h-3.5 w-3.5 text-amber-600" />
                    : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {it.abc_classified_at?.slice(0, 10) ?? '—'}
                </TableCell>
                <TableCell>
                  {it.abc_class_pinned ? (
                    <Button size="sm" variant="ghost" onClick={() => handleUnpin(it.id)} className="h-7 gap-1">
                      <PinOff className="h-3.5 w-3.5" /> Unpin
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setPinDialog({ itemId: it.id, cls: it.abc_class ?? 'A' })}
                      className="h-7 gap-1"
                    >
                      <Pin className="h-3.5 w-3.5" /> Pin to Class
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Run preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Classification Preview · last {windowDays} days</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Issue Value</TableHead>
                  <TableHead>Cum %</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Suggested</TableHead>
                  <TableHead>Pin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map(r => (
                  <TableRow key={r.item_id} className={r.will_change ? 'bg-amber-500/5' : ''}>
                    <TableCell className="text-sm">{r.item_name}</TableCell>
                    <TableCell className="font-mono text-xs">{FMT(r.annualized_value)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cumulative_pct}%</TableCell>
                    <TableCell><Badge variant="outline" className={CLASS_BADGE(r.current_class)}>{r.current_class ?? '—'}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CLASS_BADGE(r.recommended_class)}>
                        {r.recommended_class}{r.will_change ? ' ⚠' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.is_pinned ? <Pin className="h-3 w-3 text-amber-600" /> : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyAll}>Apply All (skip pinned)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pin dialog */}
      <Dialog open={!!pinDialog} onOpenChange={() => setPinDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pin item to class</DialogTitle></DialogHeader>
          {pinDialog && (
            <div className="space-y-3">
              <Label>Class</Label>
              <Select
                value={pinDialog.cls}
                onValueChange={v => setPinDialog({ ...pinDialog, cls: v as 'A' | 'B' | 'C' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — top critical</SelectItem>
                  <SelectItem value="B">B — moderate</SelectItem>
                  <SelectItem value="C">C — low value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPinDialog(null)}>Cancel</Button>
            <Button onClick={() => pinDialog && handlePin(pinDialog.itemId, pinDialog.cls)}>
              Pin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
