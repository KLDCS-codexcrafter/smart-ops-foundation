import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageOpen, CheckCircle2, Info, Upload, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types/inventory-item';
import type { ItemOpeningStockEntry } from '@/types/item-opening-stock';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { stockLedgerKey } from '@/lib/finecore-engine';
import { onEnterNext } from '@/lib/keyboard';

const IKEY = 'erp_inventory_items';
// [JWT] GET /api/entity/storage/:key
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

interface BatchRow {
  id: string; godown_id: string; batch_no: string;
  mfg_date: string; expiry_date: string;
  qty: string; rate: string;
}
interface SerialRow {
  id: string; godown_id: string; serial_no: string;
  mfg_date: string; expiry_date: string; rate: string;
}
interface RowState {
  qty: Record<string, string>;
  rate: Record<string, string>;
  mrp: string;
  stdPO: string;
  expanded: boolean;
  batches: BatchRow[];
  serials: SerialRow[];
}
type GridState = Record<string, RowState>;

export function OpeningStockPanel() {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';

  // [JWT] GET /api/inventory/opening-stock?entity={entityCode}
  const osKey = `erp_item_opening_stock_${entityCode}`;
  const slKey = stockLedgerKey(entityCode);

  const [items] = useState<InventoryItem[]>(ls(IKEY));
  const [posted, setPosted] = useState<ItemOpeningStockEntry[]>(
    ls<ItemOpeningStockEntry>(osKey).filter(e => e.status === 'posted')
  );
  const [goDate, setGoDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupFilter, setGroupFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showUnfilled, setShowUnfilled] = useState(false);
  const [grid, setGrid] = useState<GridState>({});

  const godowns: Array<{ id: string; name: string; status: string }> = ls('erp_godowns');
  const activeCols: { id: string; name: string }[] =
    godowns.length > 0
      ? godowns.filter(g => g.status === 'active').map(g => ({ id: g.id, name: g.name }))
      : [{ id: 'default', name: 'Default Warehouse' }];

  const groups = useMemo(() => [...new Set(items.map(i => i.stock_group_name).filter(Boolean))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map(i => i.item_type).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map(i => i.brand_name).filter(Boolean))].sort(), [items]);

  const postedItemIds = useMemo(() => new Set(posted.map(e => e.item_id)), [posted]);

  const hasAnyQty = (row?: RowState) => {
    if (!row) return false;
    if (row.batches.length > 0 && row.batches.some(b => parseFloat(b.qty) > 0)) return true;
    if (row.serials.length > 0) return true;
    return Object.values(row.qty).some(v => parseFloat(v) > 0);
  };

  const filteredItems = useMemo(() => {
    let list = items.filter(i => i.status === 'active');
    if (groupFilter !== 'all') list = list.filter(i => i.stock_group_name === groupFilter);
    if (typeFilter !== 'all') list = list.filter(i => i.item_type === typeFilter);
    if (brandFilter !== 'all') list = list.filter(i => i.brand_name === brandFilter);
    if (showUnfilled) list = list.filter(i => !postedItemIds.has(i.id) && !hasAnyQty(grid[i.id]));
    return list;
  }, [items, groupFilter, typeFilter, brandFilter, showUnfilled, postedItemIds, grid]);

  const pendingCount = useMemo(() =>
    Object.entries(grid).filter(([id, row]) => !postedItemIds.has(id) && hasAnyQty(row)).length,
  [grid, postedItemIds]);

  const totalValue = useMemo(() => {
    let v = 0;
    Object.entries(grid).forEach(([, row]) => {
      // batches
      row.batches.forEach(b => {
        const q = parseFloat(b.qty || '0') || 0;
        const r = parseFloat(b.rate || '0') || 0;
        v += q * r;
      });
      // serials
      row.serials.forEach(s => {
        const r = parseFloat(s.rate || '0') || 0;
        v += r;
      });
      // flat qty
      activeCols.forEach(col => {
        const q = parseFloat(row.qty[col.id] || '0') || 0;
        const r = parseFloat(row.rate[col.id] || '0') || 0;
        v += q * r;
      });
    });
    return v;
  }, [grid, activeCols]);

  const ensureRow = (g: GridState, id: string): RowState =>
    g[id] || { qty: {}, rate: {}, mrp: '', stdPO: '', expanded: false, batches: [], serials: [] };

  const setQty = useCallback((itemId: string, colId: string, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, qty: { ...r.qty, [colId]: val } } };
    });
  }, []);

  const setRate = useCallback((itemId: string, colId: string, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, rate: { ...r.rate, [colId]: val } } };
    });
  }, []);

  const setMrp = useCallback((itemId: string, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, mrp: val } };
    });
  }, []);

  const setStdPO = useCallback((itemId: string, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, stdPO: val } };
    });
  }, []);

  const toggleExpand = useCallback((itemId: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, expanded: !r.expanded } };
    });
  }, []);

  const addBatchRow = useCallback((itemId: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      const b: BatchRow = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        godown_id: activeCols[0]?.id || 'default',
        batch_no: '', mfg_date: '', expiry_date: '', qty: '', rate: '',
      };
      return { ...g, [itemId]: { ...r, expanded: true, batches: [...r.batches, b] } };
    });
  }, [activeCols]);

  const updateBatchRow = useCallback((itemId: string, batchId: string, field: keyof BatchRow, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return {
        ...g,
        [itemId]: { ...r, batches: r.batches.map(b => b.id === batchId ? { ...b, [field]: val } : b) },
      };
    });
  }, []);

  const removeBatchRow = useCallback((itemId: string, batchId: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, batches: r.batches.filter(b => b.id !== batchId) } };
    });
  }, []);

  const addSerialRow = useCallback((itemId: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      const s: SerialRow = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        godown_id: activeCols[0]?.id || 'default',
        serial_no: '', mfg_date: '', expiry_date: '', rate: '',
      };
      return { ...g, [itemId]: { ...r, expanded: true, serials: [...r.serials, s] } };
    });
  }, [activeCols]);

  const updateSerialRow = useCallback((itemId: string, serialId: string, field: keyof SerialRow, val: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return {
        ...g,
        [itemId]: { ...r, serials: r.serials.map(s => s.id === serialId ? { ...s, [field]: val } : s) },
      };
    });
  }, []);

  const removeSerialRow = useCallback((itemId: string, serialId: string) => {
    setGrid(g => {
      const r = ensureRow(g, itemId);
      return { ...g, [itemId]: { ...r, serials: r.serials.filter(s => s.id !== serialId) } };
    });
  }, []);

  const postAll = () => {
    const toPost: ItemOpeningStockEntry[] = [];
    const now = new Date().toISOString();
    const allItems: InventoryItem[] = ls(IKEY);
    let mrpUpdates = 0;

    Object.entries(grid).forEach(([itemId, row]) => {
      if (postedItemIds.has(itemId)) return;
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      if (item.batch_tracking) {
        // One entry per batch row
        row.batches.forEach(b => {
          const qty = parseFloat(b.qty || '0') || 0;
          const rate = parseFloat(b.rate || '0') || 0;
          if (qty <= 0) return;
          const col = activeCols.find(c => c.id === b.godown_id) || activeCols[0];
          toPost.push({
            id: `os-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            item_id: itemId, item_code: item.code, item_name: item.name,
            godown_id: col.id, godown_name: col.name,
            batch_number: b.batch_no || null,
            mfg_date: b.mfg_date || null,
            expiry_date: b.expiry_date || null,
            quantity: qty, rate, value: qty * rate,
            mrp: row.mrp ? parseFloat(row.mrp) : null,
            std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,
            status: 'posted', created_at: now, updated_at: now,
          });
        });
      } else if (item.serial_tracking) {
        // One entry per serial row, qty = 1
        row.serials.forEach(s => {
          const rate = parseFloat(s.rate || '0') || 0;
          const col = activeCols.find(c => c.id === s.godown_id) || activeCols[0];
          toPost.push({
            id: `os-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            item_id: itemId, item_code: item.code, item_name: item.name,
            godown_id: col.id, godown_name: col.name,
            serial_number: s.serial_no || null,
            mfg_date: s.mfg_date || null,
            expiry_date: s.expiry_date || null,
            quantity: 1, rate, value: rate,
            mrp: row.mrp ? parseFloat(row.mrp) : null,
            std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,
            status: 'posted', created_at: now, updated_at: now,
          });
        });
      } else {
        // Flat — one entry per godown
        activeCols.forEach(col => {
          const qty = parseFloat(row.qty[col.id] || '0') || 0;
          const rate = parseFloat(row.rate[col.id] || '0') || 0;
          if (qty <= 0) return;
          toPost.push({
            id: `os-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            item_id: itemId, item_code: item.code, item_name: item.name,
            godown_id: col.id, godown_name: col.name,
            quantity: qty, rate, value: qty * rate,
            mrp: row.mrp ? parseFloat(row.mrp) : null,
            std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,
            status: 'posted', created_at: now, updated_at: now,
          });
        });
      }

      const idx = allItems.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        if (row.mrp) { allItems[idx].mrp = parseFloat(row.mrp); mrpUpdates++; }
        if (row.stdPO) { allItems[idx].std_purchase_rate = parseFloat(row.stdPO); }
      }
    });

    if (toPost.length === 0) { toast.error('No rows with quantity entered'); return; }

    // [JWT] GET /api/inventory/opening-stock?entity={entityCode}
    const existing = ls<ItemOpeningStockEntry>(osKey);
    // [JWT] POST /api/inventory/opening-stock/bulk
    localStorage.setItem(osKey, JSON.stringify([...existing, ...toPost]));

    // [JWT] GET /api/stock-ledger?entity={entityCode}
    const existSL: Array<Record<string, unknown>> = ls(slKey);
    const newSL = toPost.map(e => ({
      id: `sl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_id: e.item_id, item_code: e.item_code, item_name: e.item_name,
      godown_id: e.godown_id, godown_name: e.godown_name,
      txn_type: 'opening_balance', txn_ref: e.id,
      qty_in: e.quantity, qty_out: 0, rate: e.rate, value: e.value,
      batch_number: e.batch_number || null,
      serial_number: e.serial_number || null,
      txn_date: goDate, created_at: now,
    }));
    // [JWT] POST /api/stock-ledger/opening-entries
    localStorage.setItem(slKey, JSON.stringify([...existSL, ...newSL]));

    // [JWT] PATCH /api/inventory/items/bulk-rates
    localStorage.setItem(IKEY, JSON.stringify(allItems));

    setPosted(prev => [...prev, ...toPost]);
    setGrid(g => {
      const next = { ...g };
      toPost.forEach(e => { delete next[e.item_id]; });
      return next;
    });
    toast.success(`${toPost.length} stock entries posted${mrpUpdates > 0 ? ` · ${mrpUpdates} MRP rates updated` : ''}`);
  };

  const handleCSVPaste = (raw: string) => {
    const lines = raw.trim().split('\n').filter(Boolean);
    let applied = 0;
    setGrid(prev => {
      const updates: GridState = { ...prev };
      lines.forEach(line => {
        const [code, qtyStr, rateStr] = line.split(',').map(s => s.trim());
        const item = items.find(i => i.code === code);
        if (!item) return;
        const colId = activeCols[0]?.id || 'default';
        const r = ensureRow(updates, item.id);
        updates[item.id] = {
          ...r,
          qty: { ...r.qty, [colId]: qtyStr || '' },
          rate: { ...r.rate, [colId]: rateStr || '' },
        };
        applied++;
      });
      return updates;
    });
    toast.success(`${applied} rows imported from CSV`);
  };

  return (
    <div data-keyboard-form className="max-w-full mx-auto space-y-4 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="h-6 w-6" />Opening Stock Workbench
          </h1>
          <p className="text-sm text-muted-foreground">
            Entity {entityCode} · Items with batch / serial tracking show an expand button.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">Go-Live Date</Label>
            <Input type="date" className="h-8 w-38 text-sm" value={goDate} onChange={e => setGoDate(e.target.value)} onKeyDown={onEnterNext} />
          </div>
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => {
              const csv = prompt('Paste CSV rows (item_code, qty, rate):');
              if (csv) handleCSVPaste(csv);
            }}>
            <Upload className="h-4 w-4" />Import CSV
          </Button>
          {pendingCount > 0 && (
            <Button size="sm" className="gap-1" onClick={postAll} data-primary>
              <CheckCircle2 className="h-4 w-4" />Post {pendingCount} Items
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Total Items</CardDescription>
          <CardTitle className="text-xl">{items.filter(i => i.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Filled (pending)</CardDescription>
          <CardTitle className="text-xl text-amber-600">{pendingCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Already Posted</CardDescription>
          <CardTitle className="text-xl text-emerald-600">{postedItemIds.size}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Total Value (₹)</CardDescription>
          <CardTitle className="text-xl">₹{Math.round(totalValue).toLocaleString('en-IN')}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Groups" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Groups</SelectItem>
            {groups.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Item Types</SelectItem>
            {types.map(t => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(b => <SelectItem key={b!} value={b!}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none ml-2">
          <input type="checkbox" checked={showUnfilled} onChange={e => setShowUnfilled(e.target.checked)} className="rounded" />
          Show only unfilled items
        </label>
        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filteredItems.length} of {items.filter(i => i.status === 'active').length} items
        </span>
      </div>

      {postedItemIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Info className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-300">
            {postedItemIds.size} items already posted and locked.
          </p>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-8" />
              <TableHead className="text-xs font-semibold uppercase w-24 whitespace-nowrap">Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase min-w-[180px]">Item Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase w-16">UOM</TableHead>
              {activeCols.map(col => (
                <TableHead key={col.id} colSpan={2}
                  className="text-xs font-semibold uppercase text-center border-l whitespace-nowrap">
                  {col.name}
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase w-24 whitespace-nowrap border-l">MRP (₹)</TableHead>
              <TableHead className="text-xs font-semibold uppercase w-28 whitespace-nowrap">Std PO Rate</TableHead>
            </TableRow>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead /><TableHead /><TableHead /><TableHead />
              {activeCols.map(col => (
                <React.Fragment key={col.id + '-sub'}>
                  <TableHead className="text-[10px] text-center text-muted-foreground border-l">Qty</TableHead>
                  <TableHead className="text-[10px] text-center text-muted-foreground">Rate (₹)</TableHead>
                </React.Fragment>
              ))}
              <TableHead className="border-l" /><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + activeCols.length * 2 + 2} className="text-center py-16 text-muted-foreground">
                  <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-foreground mb-1">No items match the current filters</p>
                </TableCell>
              </TableRow>
            ) : filteredItems.map(item => {
              const row = grid[item.id];
              const isPosted = postedItemIds.has(item.id);
              const isFilled = hasAnyQty(row);
              const rowBg = isPosted ? 'bg-emerald-500/5' : isFilled ? 'bg-amber-500/5' : '';
              const trackable = item.batch_tracking || item.serial_tracking;
              const colspan = 4 + activeCols.length * 2 + 2;

              // Compute aggregated qty per godown for batch items
              const batchQtyByGodown: Record<string, number> = {};
              if (item.batch_tracking && row?.batches) {
                row.batches.forEach(b => {
                  batchQtyByGodown[b.godown_id] = (batchQtyByGodown[b.godown_id] || 0) + (parseFloat(b.qty) || 0);
                });
              }
              const serialCountByGodown: Record<string, number> = {};
              if (item.serial_tracking && row?.serials) {
                row.serials.forEach(s => {
                  serialCountByGodown[s.godown_id] = (serialCountByGodown[s.godown_id] || 0) + 1;
                });
              }

              return (
                <React.Fragment key={item.id}>
                  <TableRow className={`${rowBg} group`}>
                    <TableCell className="p-1">
                      {trackable && !isPosted && (
                        <button onClick={() => toggleExpand(item.id)} className="p-1 hover:bg-muted rounded" type="button">
                          {row?.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground py-1.5">{item.code}</TableCell>
                    <TableCell className="py-1.5">
                      <div className="text-sm font-medium leading-tight">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        {[item.stock_group_name, item.brand_name].filter(Boolean).join(' · ')}
                        {item.batch_tracking && <span className="px-1 rounded bg-amber-500/20 text-amber-300">BATCH</span>}
                        {item.serial_tracking && <span className="px-1 rounded bg-violet-500/20 text-violet-300">SERIAL</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-1.5">
                      {item.primary_uom_symbol || '-'}
                    </TableCell>

                    {activeCols.map(col => {
                      const isBatch = item.batch_tracking;
                      const isSerial = item.serial_tracking;
                      const aggregateQty = isBatch ? batchQtyByGodown[col.id] || 0
                                          : isSerial ? serialCountByGodown[col.id] || 0
                                          : null;
                      return (
                        <React.Fragment key={col.id + '-cells'}>
                          <TableCell className="p-1 border-l">
                            {isPosted ? (
                              <span className="text-xs font-mono text-emerald-500 px-2">
                                {posted.find(e => e.item_id === item.id && e.godown_id === col.id)?.quantity || '-'}
                              </span>
                            ) : trackable ? (
                              <span className="text-xs font-mono text-muted-foreground px-2">
                                {aggregateQty || '-'}
                              </span>
                            ) : (
                              <Input type="number" min="0" step="0.001"
                                className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                                value={row?.qty[col.id] || ''}
                                onChange={e => setQty(item.id, col.id, e.target.value)}
                                onKeyDown={onEnterNext}
                                onFocus={e => e.target.select()} />
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            {isPosted ? (
                              <span className="text-xs font-mono text-emerald-500 px-2">
                                {posted.find(e => e.item_id === item.id && e.godown_id === col.id)?.rate || '-'}
                              </span>
                            ) : trackable ? (
                              <span className="text-xs text-muted-foreground px-2">—</span>
                            ) : (
                              <Input type="number" min="0" step="0.01"
                                className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                                value={row?.rate[col.id] || ''}
                                onChange={e => setRate(item.id, col.id, e.target.value)}
                                onKeyDown={onEnterNext}
                                onFocus={e => e.target.select()} />
                            )}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}

                    <TableCell className="p-1 border-l">
                      {!isPosted && (
                        <Input type="number" min="0" step="0.01"
                          className="h-7 w-20 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                          placeholder={item.mrp ? String(item.mrp) : undefined}
                          value={row?.mrp || ''}
                          onChange={e => setMrp(item.id, e.target.value)}
                          onKeyDown={onEnterNext}
                          onFocus={e => e.target.select()} />
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      {!isPosted && (
                        <Input type="number" min="0" step="0.01"
                          className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                          placeholder={item.std_purchase_rate ? String(item.std_purchase_rate) : undefined}
                          value={row?.stdPO || ''}
                          onChange={e => setStdPO(item.id, e.target.value)}
                          onKeyDown={onEnterNext}
                          onFocus={e => e.target.select()} />
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Sub-grid for batch tracking */}
                  {trackable && row?.expanded && item.batch_tracking && (
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableCell colSpan={colspan} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground">Batch Sub-Grid · {row.batches.length} batches</h4>
                            <Button size="sm" variant="outline" onClick={() => addBatchRow(item.id)} className="h-7 gap-1">
                              <Plus className="h-3 w-3" />Add Batch
                            </Button>
                          </div>
                          {row.batches.length > 0 && (
                            <div className="rounded border bg-background overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/40">
                                  <tr>
                                    <th className="p-2 text-left font-medium">Godown</th>
                                    <th className="p-2 text-left font-medium">Batch No</th>
                                    <th className="p-2 text-left font-medium">Mfg Date</th>
                                    <th className="p-2 text-left font-medium">Expiry Date</th>
                                    <th className="p-2 text-right font-medium">Qty</th>
                                    <th className="p-2 text-right font-medium">Rate (₹)</th>
                                    <th className="p-2 text-right font-medium">Value</th>
                                    <th className="p-2 w-8" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.batches.map(b => {
                                    const val = (parseFloat(b.qty) || 0) * (parseFloat(b.rate) || 0);
                                    return (
                                      <tr key={b.id} className="border-t">
                                        <td className="p-1">
                                          <Select value={b.godown_id} onValueChange={v => updateBatchRow(item.id, b.id, 'godown_id', v)}>
                                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {activeCols.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="p-1"><Input className="h-7 text-xs" value={b.batch_no} onChange={e => updateBatchRow(item.id, b.id, 'batch_no', e.target.value)} onKeyDown={onEnterNext} /></td>
                                        <td className="p-1"><Input type="date" className="h-7 text-xs" value={b.mfg_date} onChange={e => updateBatchRow(item.id, b.id, 'mfg_date', e.target.value)} onKeyDown={onEnterNext} /></td>
                                        <td className="p-1"><Input type="date" className="h-7 text-xs" value={b.expiry_date} onChange={e => updateBatchRow(item.id, b.id, 'expiry_date', e.target.value)} onKeyDown={onEnterNext} /></td>
                                        <td className="p-1"><Input type="number" min="0" step="0.001" className="h-7 text-xs text-right" value={b.qty} onChange={e => updateBatchRow(item.id, b.id, 'qty', e.target.value)} onKeyDown={onEnterNext} /></td>
                                        <td className="p-1"><Input type="number" min="0" step="0.01" className="h-7 text-xs text-right" value={b.rate} onChange={e => updateBatchRow(item.id, b.id, 'rate', e.target.value)} onKeyDown={onEnterNext} /></td>
                                        <td className="p-1 text-right font-mono text-muted-foreground">₹{val.toLocaleString('en-IN')}</td>
                                        <td className="p-1">
                                          <Button size="icon" variant="ghost" onClick={() => removeBatchRow(item.id, b.id)} className="h-6 w-6">
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Sub-grid for serial tracking */}
                  {trackable && row?.expanded && item.serial_tracking && (
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableCell colSpan={colspan} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground">Serial Sub-Grid · {row.serials.length} serials</h4>
                            <Button size="sm" variant="outline" onClick={() => addSerialRow(item.id)} className="h-7 gap-1">
                              <Plus className="h-3 w-3" />Add Serial
                            </Button>
                          </div>
                          {row.serials.length > 0 && (
                            <div className="rounded border bg-background overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/40">
                                  <tr>
                                    <th className="p-2 text-left font-medium">Godown</th>
                                    <th className="p-2 text-left font-medium">Serial No</th>
                                    <th className="p-2 text-left font-medium">Mfg Date</th>
                                    {item.expiry_tracking && <th className="p-2 text-left font-medium">Expiry Date</th>}
                                    <th className="p-2 text-right font-medium">Rate (₹)</th>
                                    <th className="p-2 w-8" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.serials.map(s => (
                                    <tr key={s.id} className="border-t">
                                      <td className="p-1">
                                        <Select value={s.godown_id} onValueChange={v => updateSerialRow(item.id, s.id, 'godown_id', v)}>
                                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {activeCols.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="p-1"><Input className="h-7 text-xs" value={s.serial_no} onChange={e => updateSerialRow(item.id, s.id, 'serial_no', e.target.value)} onKeyDown={onEnterNext} /></td>
                                      <td className="p-1"><Input type="date" className="h-7 text-xs" value={s.mfg_date} onChange={e => updateSerialRow(item.id, s.id, 'mfg_date', e.target.value)} onKeyDown={onEnterNext} /></td>
                                      {item.expiry_tracking && <td className="p-1"><Input type="date" className="h-7 text-xs" value={s.expiry_date} onChange={e => updateSerialRow(item.id, s.id, 'expiry_date', e.target.value)} onKeyDown={onEnterNext} /></td>}
                                      <td className="p-1"><Input type="number" min="0" step="0.01" className="h-7 text-xs text-right" value={s.rate} onChange={e => updateSerialRow(item.id, s.id, 'rate', e.target.value)} onKeyDown={onEnterNext} /></td>
                                      <td className="p-1">
                                        <Button size="icon" variant="ghost" onClick={() => removeSerialRow(item.id, s.id)} className="h-6 w-6">
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {items.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-6 text-xs font-medium">
            <span className="text-muted-foreground">Showing {filteredItems.length} items</span>
            <span className="text-amber-600">{pendingCount} filled (pending post)</span>
            <span className="text-emerald-600">{postedItemIds.size} posted</span>
            <span className="ml-auto text-primary font-semibold">
              Pending Value: ₹{Math.round(totalValue).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpeningStockEntry() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1 overflow-x-auto"><OpeningStockPanel /></main>
      </div>
    </SidebarProvider>
  );
}
