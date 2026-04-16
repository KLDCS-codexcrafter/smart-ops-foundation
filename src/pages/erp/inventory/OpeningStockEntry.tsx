import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageOpen, CheckCircle2, Info, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types/inventory-item';
import type { ItemOpeningStockEntry } from '@/types/item-opening-stock';
import { onEnterNext } from '@/lib/keyboard';

const OSKEY = 'erp_item_opening_stock';
const IKEY = 'erp_inventory_items';
const SLKEY = 'erp_stock_ledger';
// [JWT] GET /api/entity/storage/:key
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

interface RowState {
  qty: Record<string, string>;
  rate: Record<string, string>;
  mrp: string;
  stdPO: string;
  expanded: boolean;
}
type GridState = Record<string, RowState>;

export function OpeningStockPanel() {
  const [items] = useState<InventoryItem[]>(ls(IKEY));
  // [JWT] GET /api/inventory/items
  const [posted, setPosted] = useState<ItemOpeningStockEntry[]>(
    ls<ItemOpeningStockEntry>(OSKEY).filter(e => (e as any).status === 'posted')
  );
  const [goDate, setGoDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupFilter, setGroupFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [showUnfilled, setShowUnfilled] = useState(false);
  const [grid, setGrid] = useState<GridState>({});

  const godowns: any[] = ls('erp_godowns');
  const activeCols: { id: string; name: string }[] =
    godowns.length > 0
      ? godowns.filter((g: any) => g.status === 'active').map((g: any) => ({ id: g.id, name: g.name }))
      : [{ id: 'default', name: 'Default Warehouse' }];

  const groups = useMemo(() => [...new Set(items.map(i => i.stock_group_name).filter(Boolean))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map(i => i.item_type).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map(i => i.brand_name).filter(Boolean))].sort(), [items]);

  const postedItemIds = useMemo(() => new Set(posted.map(e => e.item_id)), [posted]);

  const hasAnyQty = (row?: RowState) =>
    row ? Object.values(row.qty).some(v => parseFloat(v) > 0) : false;

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
      activeCols.forEach(col => {
        const q = parseFloat(row.qty[col.id] || '0') || 0;
        const r = parseFloat(row.rate[col.id] || '0') || 0;
        v += q * r;
      });
    });
    return v;
  }, [grid, activeCols]);

  const setQty = useCallback((itemId: string, colId: string, val: string) => {
    setGrid(g => ({
      ...g,
      [itemId]: {
        qty: { ...(g[itemId]?.qty || {}), [colId]: val },
        rate: g[itemId]?.rate || {},
        mrp: g[itemId]?.mrp || '',
        stdPO: g[itemId]?.stdPO || '',
        expanded: g[itemId]?.expanded || false,
      },
    }));
  }, []);

  const setRate = useCallback((itemId: string, colId: string, val: string) => {
    setGrid(g => ({
      ...g,
      [itemId]: {
        qty: g[itemId]?.qty || {},
        rate: { ...(g[itemId]?.rate || {}), [colId]: val },
        mrp: g[itemId]?.mrp || '',
        stdPO: g[itemId]?.stdPO || '',
        expanded: g[itemId]?.expanded || false,
      },
    }));
  }, []);

  const setMrp = useCallback((itemId: string, val: string) => {
    setGrid(g => ({
      ...g,
      [itemId]: {
        ...(g[itemId] || { qty: {}, rate: {}, expanded: false }),
        mrp: val,
        stdPO: g[itemId]?.stdPO || '',
      },
    }));
  }, []);

  const setStdPO = useCallback((itemId: string, val: string) => {
    setGrid(g => ({
      ...g,
      [itemId]: {
        ...(g[itemId] || { qty: {}, rate: {}, expanded: false }),
        mrp: g[itemId]?.mrp || '',
        stdPO: val,
      },
    }));
  }, []);

  const postAll = () => {
    const toPost: ItemOpeningStockEntry[] = [];
    const now = new Date().toISOString();
    const allItems: any[] = ls(IKEY);
    let mrpUpdates = 0;

    Object.entries(grid).forEach(([itemId, row]) => {
      if (postedItemIds.has(itemId)) return;
      const item = items.find(i => i.id === itemId);
      if (!item) return;
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
      const idx = allItems.findIndex((i: any) => i.id === itemId);
      if (idx >= 0) {
        if (row.mrp) { allItems[idx].mrp = parseFloat(row.mrp); mrpUpdates++; }
        if (row.stdPO) { allItems[idx].std_purchase_rate = parseFloat(row.stdPO); }
      }
    });

    if (toPost.length === 0) { toast.error('No rows with quantity entered'); return; }

    // Save entries
    const existing = ls<ItemOpeningStockEntry>(OSKEY);
    // [JWT] PATCH /api/inventory/opening-stock
    localStorage.setItem(OSKEY, JSON.stringify([...existing, ...toPost]));
    /* [JWT] POST /api/inventory/opening-stock/bulk */

    // Write stock ledger
    const existSL: any[] = ls(SLKEY);
    const newSL = toPost.map(e => ({
      id: `sl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_id: e.item_id, item_code: e.item_code, item_name: e.item_name,
      godown_id: e.godown_id, godown_name: e.godown_name,
      txn_type: 'opening_balance', txn_ref: e.id,
      qty_in: e.quantity, qty_out: 0, rate: e.rate, value: e.value,
      batch_number: e.batch_number || null, txn_date: goDate, created_at: now,
    }));
    // [JWT] PATCH /api/inventory/opening-stock
    localStorage.setItem(SLKEY, JSON.stringify([...existSL, ...newSL]));
    /* [JWT] POST /api/inventory/stock-ledger/opening-entries */

    // Save item master updates
    // [JWT] PATCH /api/inventory/opening-stock
    localStorage.setItem(IKEY, JSON.stringify(allItems));
    /* [JWT] PATCH /api/inventory/items/bulk-rates */

    setPosted(prev => [...prev, ...toPost]);
    // Clear posted items from grid
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
    const updates: GridState = { ...grid };
    lines.forEach(line => {
      const [code, qtyStr, rateStr] = line.split(',').map(s => s.trim());
      const item = items.find(i => i.code === code);
      if (!item) return;
      const colId = activeCols[0]?.id || 'default';
      updates[item.id] = {
        qty: { ...(updates[item.id]?.qty || {}), [colId]: qtyStr || '' },
        rate: { ...(updates[item.id]?.rate || {}), [colId]: rateStr || '' },
        mrp: updates[item.id]?.mrp || '',
        stdPO: updates[item.id]?.stdPO || '',
        expanded: false,
      };
      applied++;
    });
    setGrid(updates);
    toast.success(`${applied} rows imported from CSV`);
  };

  return (
    <div data-keyboard-form className="max-w-full mx-auto space-y-4 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="h-6 w-6" />Opening Stock Workbench
          </h1>
          <p className="text-sm text-muted-foreground">
            All items pre-loaded — type qty and rate directly. Tab to move between cells.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">Go-Live Date</Label>
            <Input type="date" className="h-8 w-38 text-sm" value={goDate} onChange={e => setGoDate(e.target.value)} />
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

      {/* STATS */}
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

      {/* FILTERS */}
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
          <input type="checkbox" checked={showUnfilled} onChange={e => setShowUnfilled(e.target.checked)}
            className="rounded" />
          Show only unfilled items
        </label>
        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filteredItems.length} of {items.filter(i => i.status === 'active').length} items
        </span>
      </div>

      {postedItemIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {postedItemIds.size} items already posted and locked (shown in green). Continue adding remaining items.
          </p>
        </div>
      )}

      {/* WORKBENCH TABLE */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
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
              <TableHead /><TableHead /><TableHead />
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
                <TableCell colSpan={3 + activeCols.length * 2 + 2} className="text-center py-16 text-muted-foreground">
                  <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-foreground mb-1">No items match the current filters</p>
                  <p className="text-xs">Try changing the Group, Type or Brand filter above</p>
                </TableCell>
              </TableRow>
            ) : filteredItems.map(item => {
              const row = grid[item.id];
              const isPosted = postedItemIds.has(item.id);
              const isFilled = hasAnyQty(row);
              const rowBg = isPosted ? 'bg-emerald-500/5' : isFilled ? 'bg-amber-500/5' : '';

              return (
                <TableRow key={item.id} className={`${rowBg} group`}>
                  <TableCell className="text-xs font-mono text-muted-foreground py-1.5">
                    {item.code}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="text-sm font-medium leading-tight">{item.name}</div>
                    {(item.brand_name || item.stock_group_name) && (
                      <div className="text-[10px] text-muted-foreground">
                        {[item.stock_group_name, item.brand_name].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">
                    {item.primary_uom_symbol || '-'}
                  </TableCell>

                  {activeCols.map(col => (
                    <React.Fragment key={col.id + '-cells'}>
                      <TableCell className="p-1 border-l">
                        {isPosted ? (
                          <span className="text-xs font-mono text-emerald-700 px-2">
                            {posted.find(e => e.item_id === item.id && e.godown_id === col.id)?.quantity || '-'}
                          </span>
                        ) : (
                          <Input
                            type="number" min="0" step="0.001"
                            className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                            value={row?.qty[col.id] || ''}
                            onChange={e => setQty(item.id, col.id, e.target.value)}
                            onFocus={e => e.target.select()}
                          />
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        {isPosted ? (
                          <span className="text-xs font-mono text-emerald-700 px-2">
                            {posted.find(e => e.item_id === item.id && e.godown_id === col.id)?.rate || '-'}
                          </span>
                        ) : (
                          <Input
                            type="number" min="0" step="0.01"
                            className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                            value={row?.rate[col.id] || ''}
                            onChange={e => setRate(item.id, col.id, e.target.value)}
                            onFocus={e => e.target.select()}
                          />
                        )}
                      </TableCell>
                    </React.Fragment>
                  ))}

                  <TableCell className="p-1 border-l">
                    {isPosted ? (
                      <span className="text-xs font-mono text-muted-foreground px-2">
                        {posted.find(e => e.item_id === item.id)?.mrp || item.mrp || '-'}
                      </span>
                    ) : (
                      <Input
                        type="number" min="0" step="0.01"
                        className="h-7 w-20 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                        placeholder={item.mrp ? String(item.mrp) : undefined}
                        value={row?.mrp || ''}
                        onChange={e => setMrp(item.id, e.target.value)}
                        onFocus={e => e.target.select()}
                      />
                    )}
                  </TableCell>
                  <TableCell className="p-1">
                    {isPosted ? (
                      <span className="text-xs font-mono text-muted-foreground px-2">
                        {posted.find(e => e.item_id === item.id)?.std_purchase_rate || item.std_purchase_rate || '-'}
                      </span>
                    ) : (
                      <Input
                        type="number" min="0" step="0.01"
                        className="h-7 w-24 text-xs text-right px-2 border-0 bg-transparent focus:bg-background focus:border focus:border-primary"
                        placeholder={item.std_purchase_rate ? String(item.std_purchase_rate) : undefined}
                        value={row?.stdPO || ''}
                        onChange={e => setStdPO(item.id, e.target.value)}
                        onFocus={e => e.target.select()}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* TABLE FOOTER */}
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
