import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TrendingDown, Plus, Search, Edit2, Trash2, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { PriceList, PriceListItem, PriceListType } from '@/types/price-list';
import type { InventoryItem } from '@/types/inventory-item';

const PLKEY = 'erp_price_lists';
const PLIKEY = 'erp_price_list_items';
const IKEY = 'erp_inventory_items';
// [JWT] GET /api/entity/storage/:key
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const LIST_TYPE_CONFIG: { value: PriceListType; label: string; desc: string; color: string }[] = [
  { value: 'standard_selling', label: 'Standard Selling', desc: 'Default list for all customers not on a special list', color: 'bg-blue-500/10 text-blue-700' },
  { value: 'wholesale', label: 'Wholesale', desc: 'Bulk buyer pricing – applies above minimum order quantity', color: 'bg-purple-500/10 text-purple-700' },
  { value: 'export', label: 'Export', desc: 'Foreign currency pricing for international customers', color: 'bg-teal-500/10 text-teal-700' },
  { value: 'distributor', label: 'Distributor', desc: 'Exclusive authorised distributor pricing', color: 'bg-amber-500/10 text-amber-700' },
  { value: 'promotional', label: 'Promotional', desc: 'Time-bound sale pricing with effective date range', color: 'bg-rose-500/10 text-rose-700' },
  { value: 'customer_specific', label: 'Customer Specific', desc: 'Locked to one or more named customers', color: 'bg-slate-500/10 text-slate-700' },
];

const CURRENCY_SYMBOLS: { [k: string]: string } = { INR: '₹', USD: '$', EUR: '€' };

export function PriceListsPanel() {
  const [lists, setLists] = useState<PriceList[]>(ls(PLKEY));
  // [JWT] GET /api/inventory/price-lists
  const [listItems, setListItems] = useState<PriceListItem[]>(ls(PLIKEY));
  const [items] = useState<InventoryItem[]>(ls(IKEY));

  // View toggle
  const [matrixView, setMatrixView] = useState<'matrix' | 'list'>('matrix');

  // List view state
  const [search, setSearch] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [editList, setEditList] = useState<PriceList | null>(null);
  const [listForm, setListForm] = useState({
    name: '', list_type: 'standard_selling' as PriceListType,
    currency: 'INR' as PriceList['currency'], effective_from: '', effective_to: '',
    is_default: false, copy_from_id: '', status: 'draft' as PriceList['status'], notes: '',
  });
  const [activeList, setActiveList] = useState<PriceList | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [selItem, setSelItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ price: '', min_qty: '', discount_percent: '', is_tax_inclusive: true });
  const [editPLItem, setEditPLItem] = useState<PriceListItem | null>(null);

  // Matrix state
  type PriceKey = string;
  interface PendingPrice { listId: string; itemId: string; item: InventoryItem; oldPrice: number | null; newPrice: number; uom: string }
  const [pendingPrices, setPendingPrices] = useState<Record<PriceKey, PendingPrice>>({});
  const [groupFilter, setGroupFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Column fill dialog
  const [fillOpen, setFillOpen] = useState(false);
  const [fillListId, setFillListId] = useState('');
  const [fillMode, setFillMode] = useState<'pct_of_std' | 'fixed_pct_discount' | 'copy_list'>('pct_of_std');
  const [fillPct, setFillPct] = useState('');
  const [fillSourceId, setFillSourceId] = useState('');

  const pendingMatrixCount = Object.keys(pendingPrices).length;

  // [JWT] POST /api/inventory/price-lists
  const saveLists = (d: PriceList[]) => { localStorage.setItem(PLKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/price-lists */ };
  const saveListItems = (d: PriceListItem[]) => { localStorage.setItem(PLIKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/price-list-items */ };

  // Active lists for matrix columns (non-expired, standard_selling first)
  const activeLists = useMemo(() => {
    const al = lists.filter(l => l.status !== 'expired');
    al.sort((a, b) => {
      if (a.list_type === 'standard_selling' && b.list_type !== 'standard_selling') return -1;
      if (b.list_type === 'standard_selling' && a.list_type !== 'standard_selling') return 1;
      return a.name.localeCompare(b.name);
    });
    return al;
  }, [lists]);

  // Filter options
  const groups = useMemo(() => [...new Set(items.map(i => i.stock_group_name).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map(i => i.brand_name).filter(Boolean))].sort(), [items]);

  // Matrix filtered items
  const filteredItems = useMemo(() => {
    let list = items.filter(i => i.status === 'active');
    if (groupFilter !== 'all') list = list.filter(i => i.stock_group_name === groupFilter);
    if (brandFilter !== 'all') list = list.filter(i => i.brand_name === brandFilter);
    if (matrixSearch) {
      const q = matrixSearch.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    }
    return list;
  }, [items, groupFilter, brandFilter, matrixSearch]);

  // List view filtered
  const filtered = useMemo(() => lists.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name.toLowerCase().includes(q);
  }), [lists, search]);

  const activeListItems = useMemo(() =>
    activeList ? listItems.filter(li => li.price_list_id === activeList.id) : [],
    [listItems, activeList]);

  const filteredAddItems = useMemo(() => items.filter(i => {
    const q = itemSearch.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  }).slice(0, 15), [items, itemSearch]);

  const typeConfig = (t: PriceListType) => LIST_TYPE_CONFIG.find(x => x.value === t) || LIST_TYPE_CONFIG[0];
  const currSymbol = (c: string) => CURRENCY_SYMBOLS[c] || c;

  // === Matrix helpers ===
  const getEffectivePrice = useCallback((listId: string, itemId: string): number | null => {
    const existing = listItems.find(li => li.price_list_id === listId && li.item_id === itemId);
    return existing ? existing.price : null;
  }, [listItems]);

  const handleMatrixCell = useCallback((list: PriceList, item: InventoryItem, rawVal: string) => {
    const key: PriceKey = `${list.id}|${item.id}`;
    const newPrice = parseFloat(rawVal);
    if (!rawVal.trim() || isNaN(newPrice) || newPrice < 0) {
      setPendingPrices(p => { const n = { ...p }; delete n[key]; return n; });
      return;
    }
    const oldPrice = getEffectivePrice(list.id, item.id);
    if (newPrice === oldPrice) {
      setPendingPrices(p => { const n = { ...p }; delete n[key]; return n; });
      return;
    }
    setPendingPrices(p => ({
      ...p,
      [key]: { listId: list.id, itemId: item.id, item, oldPrice, newPrice, uom: item.primary_uom_symbol || 'pcs' },
    }));
  }, [getEffectivePrice]);

  const saveAllMatrix = () => {
    const now = new Date().toISOString();
    const updatedItems = [...listItems];
    Object.values(pendingPrices).forEach(({ listId, itemId, item, newPrice, uom }) => {
      const idx = updatedItems.findIndex(li => li.price_list_id === listId && li.item_id === itemId);
      if (idx >= 0) {
        updatedItems[idx] = { ...updatedItems[idx], price: newPrice, updated_at: now };
      } else {
        updatedItems.push({
          id: `pli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price_list_id: listId, item_id: itemId,
          item_code: item.code, item_name: item.name, uom_symbol: uom,
          price: newPrice, min_qty: null, discount_percent: null,
          is_tax_inclusive: true, created_at: now, updated_at: now,
        });
      }
    });
    setListItems(updatedItems);
    // [JWT] PATCH /api/inventory/opening-stock
    localStorage.setItem(PLIKEY, JSON.stringify(updatedItems));
    /* [JWT] POST /api/inventory/price-lists/items/bulk-upsert */
    const count = Object.keys(pendingPrices).length;
    setPendingPrices({});
    toast.success(`${count} prices saved`);
  };

  const applyColumnFill = () => {
    if (!fillListId) { toast.error('Select a price list column first'); return; }
    const list = lists.find(l => l.id === fillListId);
    if (!list) return;
    const newPending = { ...pendingPrices };
    let staged = 0;

    if (fillMode === 'pct_of_std') {
      const pct = parseFloat(fillPct);
      if (isNaN(pct)) { toast.error('Enter a valid percentage'); return; }
      filteredItems.forEach(item => {
        if (!item.std_selling_rate) return;
        const nv = Math.round(item.std_selling_rate * (pct / 100) * 100) / 100;
        const key = `${fillListId}|${item.id}`;
        newPending[key] = { listId: fillListId, itemId: item.id, item, oldPrice: getEffectivePrice(fillListId, item.id), newPrice: nv, uom: item.primary_uom_symbol || 'pcs' };
        staged++;
      });
    }
    if (fillMode === 'fixed_pct_discount') {
      const disc = parseFloat(fillPct);
      if (isNaN(disc)) { toast.error('Enter a valid discount %'); return; }
      filteredItems.forEach(item => {
        if (!item.std_selling_rate) return;
        const nv = Math.round(item.std_selling_rate * (1 - disc / 100) * 100) / 100;
        const key = `${fillListId}|${item.id}`;
        newPending[key] = { listId: fillListId, itemId: item.id, item, oldPrice: getEffectivePrice(fillListId, item.id), newPrice: nv, uom: item.primary_uom_symbol || 'pcs' };
        staged++;
      });
    }
    if (fillMode === 'copy_list' && fillSourceId) {
      filteredItems.forEach(item => {
        const srcPrice = getEffectivePrice(fillSourceId, item.id);
        if (srcPrice == null) return;
        const key = `${fillListId}|${item.id}`;
        newPending[key] = { listId: fillListId, itemId: item.id, item, oldPrice: getEffectivePrice(fillListId, item.id), newPrice: srcPrice, uom: item.primary_uom_symbol || 'pcs' };
        staged++;
      });
    }
    setPendingPrices(newPending);
    setFillOpen(false);
    toast.info(`${staged} prices staged — click "Save All" to confirm`);
  };

  // === List view handlers (unchanged) ===
  const openCreate = () => {
    setListForm({ name: '', list_type: 'standard_selling', currency: 'INR', effective_from: '', effective_to: '', is_default: false, copy_from_id: '', status: 'draft', notes: '' });
    setEditList(null); setListOpen(true);
  };

  const openEdit = (l: PriceList) => {
    setListForm({
      name: l.name, list_type: l.list_type, currency: l.currency,
      effective_from: l.effective_from || '', effective_to: l.effective_to || '',
      is_default: l.is_default, copy_from_id: l.copy_from_id || '',
      status: l.status, notes: l.notes || '',
    });
    setEditList(l); setListOpen(true);
  };

  const handleSaveList = () => {
    if (!listForm.name.trim()) { toast.error('Price list name is required'); return; }
    const now = new Date().toISOString();
    if (editList) {
      const u = lists.map(x => x.id === editList.id ? { ...x, ...listForm, updated_at: now } : x);
      setLists(u); saveLists(u); toast.success(`${listForm.name} updated`);
      // [JWT] PATCH /api/inventory/price-lists/:id
    } else {
      const nl: PriceList = {
        ...listForm, id: `pl-${Date.now()}`, created_at: now, updated_at: now,
        customer_ids: null, copy_from_id: listForm.copy_from_id || null,
        effective_from: listForm.effective_from || null, effective_to: listForm.effective_to || null,
        notes: listForm.notes || null,
      };
      if (listForm.copy_from_id) {
        const srcItems = listItems.filter(li => li.price_list_id === listForm.copy_from_id);
        const copiedItems = srcItems.map(li => ({
          ...li, id: `pli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price_list_id: nl.id, created_at: now, updated_at: now,
        }));
        const u = [...listItems, ...copiedItems]; setListItems(u); saveListItems(u);
      }
      const u = [nl, ...lists]; setLists(u); saveLists(u); toast.success(`${listForm.name} created`);
      // [JWT] POST /api/inventory/price-lists
    }
    setListOpen(false);
  };

  const addItemToList = () => {
    if (!activeList || !selItem) { toast.error('Select an item'); return; }
    const price = parseFloat(itemForm.price);
    if (isNaN(price) || price <= 0) { toast.error('Price is required'); return; }
    const now = new Date().toISOString();
    if (editPLItem) {
      const u = listItems.map(x => x.id === editPLItem.id ? {
        ...x, price,
        min_qty: itemForm.min_qty ? parseFloat(itemForm.min_qty) : null,
        discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null,
        is_tax_inclusive: itemForm.is_tax_inclusive, updated_at: now,
      } : x);
      setListItems(u); saveListItems(u); toast.success(`${selItem.name} price updated`);
      // [JWT] PATCH /api/inventory/price-list-items/:id
    } else {
      const existing = listItems.find(li => li.price_list_id === activeList.id && li.item_id === selItem.id);
      if (existing) { toast.error('Item already in this price list — edit existing entry'); return; }
      const ni: PriceListItem = {
        id: `pli-${Date.now()}`, price_list_id: activeList.id,
        item_id: selItem.id, item_code: selItem.code, item_name: selItem.name,
        uom_symbol: selItem.primary_uom_symbol || 'pcs', price,
        min_qty: itemForm.min_qty ? parseFloat(itemForm.min_qty) : null,
        discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null,
        is_tax_inclusive: itemForm.is_tax_inclusive, created_at: now, updated_at: now,
      };
      const u = [...listItems, ni]; setListItems(u); saveListItems(u); toast.success(`${selItem.name} added to list`);
      // [JWT] POST /api/inventory/price-list-items
    }
    setItemOpen(false); setSelItem(null); setItemSearch(''); setEditPLItem(null);
    setItemForm({ price: '', min_qty: '', discount_percent: '', is_tax_inclusive: true });
  };

  return (
    <div data-keyboard-form className="max-w-full mx-auto space-y-4 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6" />Price Lists</h1>
          <p className="text-sm text-muted-foreground">Manage customer pricing — matrix view for bulk editing, list view for metadata</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {([
              { v: 'matrix' as const, label: '⊞ Matrix' },
              { v: 'list' as const, label: '☰ List' },
            ]).map(({ v, label }) => (
              <button key={v} onClick={() => setMatrixView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${matrixView === v ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                {label}
              </button>
            ))}
          </div>
          {matrixView === 'list' && (
            <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" />New Price List</Button>
          )}
          {matrixView === 'matrix' && pendingMatrixCount > 0 && (
            <Button size="sm" className="gap-1.5" onClick={saveAllMatrix}>
              <CheckCircle2 className="h-4 w-4" />Save All ({pendingMatrixCount})
            </Button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Total Lists</CardDescription><CardTitle className="text-xl">{lists.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Active</CardDescription><CardTitle className="text-xl text-emerald-600">{lists.filter(l => l.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Total Items Priced</CardDescription><CardTitle className="text-xl">{listItems.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Multi-Currency</CardDescription><CardTitle className="text-xl">{lists.filter(l => l.currency !== 'INR').length}</CardTitle></CardHeader></Card>
      </div>

      {/* ========== MATRIX VIEW ========== */}
      {matrixView === 'matrix' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Groups" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Groups</SelectItem>
                {groups.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => <SelectItem key={b!} value={b!}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-7 h-8 w-48 text-xs" placeholder="Search items..." value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)} />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {filteredItems.length} items × {activeLists.length} lists
            </span>
          </div>

          {activeLists.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No price lists yet</p>
              <p className="text-xs mb-4">Switch to List view to create your first price list</p>
              <Button size="sm" onClick={() => { setMatrixView('list'); openCreate(); }}>
                <Plus className="h-4 w-4 mr-1" />New Price List
              </Button>
            </div>
          ) : (
            <>
              {/* Matrix Table */}
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase w-24 sticky left-0 bg-muted/40 z-10 whitespace-nowrap">Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase min-w-[180px] sticky left-24 bg-muted/40 z-10">Item Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase w-16">UOM</TableHead>
                      <TableHead className="text-xs font-semibold uppercase w-28 text-muted-foreground border-l whitespace-nowrap">Std Selling</TableHead>
                      {activeLists.map(list => (
                        <TableHead key={list.id} className="text-xs font-semibold uppercase min-w-[130px] border-l">
                          <div className="flex items-center justify-between gap-1">
                            <div>
                              <div className="font-semibold truncate max-w-[100px]">{list.name}</div>
                              <Badge className={`text-[10px] ${typeConfig(list.list_type).color}`}>{typeConfig(list.list_type).label}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0"
                              title="Fill this column"
                              onClick={() => { setFillListId(list.id); setFillMode('pct_of_std'); setFillPct(''); setFillSourceId(''); setFillOpen(true); }}>
                              <Sparkles className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4 + activeLists.length} className="text-center py-16 text-muted-foreground">
                          <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-semibold text-foreground mb-1">No items match the current filters</p>
                          <p className="text-xs">Try changing the filters above</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground py-1 sticky left-0 bg-background z-10">{item.code}</TableCell>
                        <TableCell className="py-1 sticky left-24 bg-background z-10">
                          <div className="text-sm font-medium leading-tight">{item.name}</div>
                          {item.stock_group_name && <div className="text-[10px] text-muted-foreground">{item.stock_group_name}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1">{item.primary_uom_symbol || '—'}</TableCell>
                        {/* Std Selling — read-only reference */}
                        <TableCell className="text-xs font-mono text-muted-foreground py-1 border-l">
                          {item.std_selling_rate ? `₹${item.std_selling_rate.toLocaleString('en-IN')}` : '—'}
                        </TableCell>
                        {/* Editable cells per price list */}
                        {activeLists.map(list => {
                          const key = `${list.id}|${item.id}`;
                          const isPending = !!pendingPrices[key];
                          const existing = getEffectivePrice(list.id, item.id);
                          const pendingVal = isPending ? pendingPrices[key].newPrice : null;
                          return (
                            <TableCell key={list.id} className="p-1 border-l">
                              <Input
                                type="number" min="0" step="0.01"
                                className={`h-7 w-28 text-xs text-right px-2 ${isPending
                                  ? 'bg-amber-500/10 border-amber-400'
                                  : 'border-0 bg-transparent focus:bg-background focus:border focus:border-primary'}`}
                                defaultValue={pendingVal != null ? String(pendingVal) : (existing ?? '')}
                                key={`${key}-${isPending ? pendingVal : existing ?? 'empty'}`}
                                placeholder={existing == null ? '—' : undefined}
                                onBlur={e => handleMatrixCell(list, item, e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                onFocus={e => e.target.select()}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Footer */}
                <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-6 text-xs font-medium">
                  <span className="text-muted-foreground">Showing {filteredItems.length} items</span>
                  {pendingMatrixCount > 0 && <span className="text-amber-600">{pendingMatrixCount} pending changes</span>}
                  <span className="text-muted-foreground ml-auto">{activeLists.length} price lists</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Empty cell = item not on that list (standard selling price applies at invoicing). Amber cell = pending unsaved change.
              </p>
            </>
          )}
        </div>
      )}

      {/* ========== LIST VIEW (existing, unchanged) ========== */}
      {matrixView === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search price lists..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(list => {
              const tc = typeConfig(list.list_type);
              const itemCount = listItems.filter(li => li.price_list_id === list.id).length;
              return (
                <Card key={list.id} className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveList(list)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={`text-xs mb-2 ${tc.color}`}>{tc.label}</Badge>
                        {list.is_default && <Badge className="text-xs ml-1 bg-emerald-500/10 text-emerald-700">Default</Badge>}
                        <CardTitle className="text-sm font-semibold mt-1">{list.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{tc.desc}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(list); }}>
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                          e.stopPropagation();
                          const u = lists.filter(x => x.id !== list.id); setLists(u); saveLists(u);
                          const ui = listItems.filter(li => li.price_list_id !== list.id); setListItems(ui); saveListItems(ui);
                          toast.success(`${list.name} deleted`);
                          // [JWT] DELETE /api/inventory/price-lists/:id
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{currSymbol(list.currency)} {list.currency}</span>
                      <span>{itemCount} items</span>
                      <Badge className={`text-xs ${list.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : list.status === 'draft' ? 'bg-amber-500/10 text-amber-700' : 'bg-slate-500/10 text-slate-500'}`}>{list.status}</Badge>
                    </div>
                    {(list.effective_from || list.effective_to) && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {list.effective_from && `From: ${list.effective_from}`}
                        {list.effective_from && list.effective_to && ' · '}
                        {list.effective_to && `Until: ${list.effective_to}`}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <span>View {itemCount} items</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-muted-foreground">
                <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold text-foreground mb-1">No price lists yet</p>
                <p className="text-xs mb-4">Create your first price list to manage customer pricing</p>
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Price List</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List detail sheet */}
      <Sheet open={!!activeList} onOpenChange={open => !open && setActiveList(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {activeList && <Badge className={`text-xs ${typeConfig(activeList.list_type).color}`}>
                {typeConfig(activeList.list_type).label}</Badge>}
              {activeList?.name}
            </SheetTitle>
          </SheetHeader>
          {activeList && (
            <div data-keyboard-form className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{activeListItems.length} items in this list</p>
                <Button size="sm" className="gap-1"
                  onClick={() => { setSelItem(null); setEditPLItem(null); setItemForm({ price: '', min_qty: '', discount_percent: '', is_tax_inclusive: true }); setItemOpen(true); }}>
                  <Plus className="h-4 w-4" />Add Item
                </Button>
              </div>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  {['Item', 'UOM', 'Price', 'Min Qty', 'Discount %', 'Tax', ''].map(h => <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {activeListItems.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">No items in this price list. Add items to set prices.</TableCell></TableRow>
                  ) : activeListItems.map(li => (
                    <TableRow key={li.id} className="group">
                      <TableCell className="text-sm font-medium">{li.item_name}<div className="text-xs font-mono text-muted-foreground">{li.item_code}</div></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{li.uom_symbol}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{currSymbol(activeList.currency)}{li.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{li.min_qty || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{li.discount_percent ? li.discount_percent + '%' : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{li.is_tax_inclusive ? 'Incl.' : 'Excl.'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const it = items.find(x => x.id === li.item_id);
                            setSelItem(it || null); setEditPLItem(li);
                            setItemForm({ price: String(li.price), min_qty: String(li.min_qty || ''), discount_percent: String(li.discount_percent || ''), is_tax_inclusive: li.is_tax_inclusive });
                            setItemOpen(true);
                          }}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const u = listItems.filter(x => x.id !== li.id); setListItems(u); saveListItems(u);
                            toast.success(`${li.item_name} removed`);
                            // [JWT] DELETE /api/inventory/price-list-items/:id
                          }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit List Dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editList ? 'Edit Price List' : 'New Price List'}</DialogTitle>
          </DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div className="space-y-1.5">
              <Label>List Name *</Label>
              <Input placeholder="e.g. Wholesale FY26, Export USD, Diwali Sale" value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>List Type</Label>
                <Select value={listForm.list_type} onValueChange={v => setListForm(f => ({ ...f, list_type: v as PriceListType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LIST_TYPE_CONFIG.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={listForm.currency} onValueChange={v => setListForm(f => ({ ...f, currency: v as PriceList['currency'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      try {
                        // [JWT] GET /api/accounting/currencies
                        const currencies = JSON.parse(localStorage.getItem('erp_currencies') || '[]');
                        const active = currencies.filter((c: any) => c.is_active);
                        if (!active.length) {
                          // [JWT] GET /api/entity/base-currency
                          const base = localStorage.getItem('erp_base_currency') || 'INR';
                          return <SelectItem value={base}>{base} (Base)</SelectItem>;
                        }
                        return active.map((c: any) => (
                          <SelectItem key={c.id} value={c.iso_code}>
                            {c.symbol} {c.iso_code} — {c.name}{c.is_base_currency ? ' (Base)' : ''}
                          </SelectItem>
                        ));
                      } catch {
                        return <SelectItem value="INR">₹ INR — Indian Rupee (Base)</SelectItem>;
                      }
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editList && (
              <div className="space-y-1.5">
                <Label>Copy Items From (optional)</Label>
                <Select value={listForm.copy_from_id || 'none'} onValueChange={v => setListForm(f => ({ ...f, copy_from_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Start empty or copy from..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Start empty —</SelectItem>
                    {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({listItems.filter(li => li.price_list_id === l.id).length} items)</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">All items from the selected list are copied. Adjust only what differs.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Effective From</Label>
                <Input type="date" value={listForm.effective_from} onChange={e => setListForm(f => ({ ...f, effective_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Until</Label>
                <Input type="date" value={listForm.effective_to} onChange={e => setListForm(f => ({ ...f, effective_to: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={listForm.status} onValueChange={v => setListForm(f => ({ ...f, status: v as PriceList['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
              <Switch checked={listForm.is_default} onCheckedChange={v => setListForm(f => ({ ...f, is_default: v }))} />
              <div>
                <p className="text-sm font-medium">Default List</p>
                <p className="text-xs text-muted-foreground">Applied to customers with no specific list assigned</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSaveList}>{editList ? 'Update' : 'Create'} List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editPLItem ? 'Edit Item Price' : 'Add Item to List'}</DialogTitle>
            <DialogDescription>{activeList?.name}</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-3">
            {selItem ? (
              <div className="p-2.5 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium">{selItem.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{selItem.code} · {selItem.primary_uom_symbol}</p>
                {!editPLItem && <Button variant="ghost" size="sm" className="h-5 text-xs mt-1 p-0"
                  onClick={() => { setSelItem(null); setItemSearch(''); }}>Change</Button>}
              </div>
            ) : (
              <>
                <Input placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                {itemSearch && filteredAddItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {filteredAddItems.map(item => (
                      <button key={item.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0"
                        onClick={() => {
                          setSelItem(item); setItemSearch('');
                          if (!editPLItem) setItemForm(f => ({ ...f, price: String(item.std_selling_rate || ''), is_tax_inclusive: true }));
                        }}>
                        <p className="text-sm">{item.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{item.code}{item.std_selling_rate ? <> · Std: {item.std_selling_rate}</> : null}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price ({activeList ? currSymbol(activeList.currency) : '₹'}) *</Label>
                <Input type="number" min="0" step="0.01" value={itemForm.price}
                  onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Min Qty (for this price)</Label>
                <Input type="number" min="0" placeholder="No minimum" value={itemForm.min_qty}
                  onChange={e => setItemForm(f => ({ ...f, min_qty: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="0%" value={itemForm.discount_percent}
                  onChange={e => setItemForm(f => ({ ...f, discount_percent: e.target.value }))} />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer">
                  <Switch checked={itemForm.is_tax_inclusive} onCheckedChange={v => setItemForm(f => ({ ...f, is_tax_inclusive: v }))} />
                  <p className="text-xs">Tax Inclusive</p>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button data-primary variant="outline" onClick={() => { setItemOpen(false); setSelItem(null); setEditPLItem(null); }}>Cancel</Button>
            <Button onClick={addItemToList}>{editPLItem ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Fill Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fill Column: {lists.find(l => l.id === fillListId)?.name}</DialogTitle>
            <DialogDescription>Set prices for all visible items ({filteredItems.length}) in one action</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fill Mode</Label>
              <Select value={fillMode} onValueChange={v => setFillMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pct_of_std">X% of Standard Selling (e.g. 95 = 5% below)</SelectItem>
                  <SelectItem value="fixed_pct_discount">Fixed Discount from Std Selling (e.g. 10 = 10% off)</SelectItem>
                  <SelectItem value="copy_list">Copy from Another List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(fillMode === 'pct_of_std' || fillMode === 'fixed_pct_discount') && (
              <div className="space-y-1.5">
                <Label>{fillMode === 'pct_of_std' ? '% of Standard Selling Rate' : 'Discount %'}</Label>
                <Input type="number" min="0" step="0.1"
                  placeholder={fillMode === 'pct_of_std' ? 'e.g. 90 (= 10% below std)' : 'e.g. 10'}
                  value={fillPct} onChange={e => setFillPct(e.target.value)} />
                {fillMode === 'pct_of_std' && (
                  <p className="text-[10px] text-muted-foreground">
                    90 = 90% of std selling. 100 = same as std. 110 = 10% above std.
                  </p>
                )}
              </div>
            )}
            {fillMode === 'copy_list' && (
              <div className="space-y-1.5">
                <Label>Copy Prices From</Label>
                <Select value={fillSourceId} onValueChange={setFillSourceId}>
                  <SelectTrigger><SelectValue placeholder="Select source list..." /></SelectTrigger>
                  <SelectContent>
                    {lists.filter(l => l.id !== fillListId).map(l =>
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillOpen(false)}>Cancel</Button>
            <Button onClick={applyColumnFill}>Stage Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stage 1 — Command Center registration alias (panel naming convention)
export function PriceListManagerPanel() {
  return <PriceListsPanel />;
}

export default function PriceListManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1 overflow-x-auto"><PriceListsPanel /></main>
      </div>
    </SidebarProvider>
  );
}
