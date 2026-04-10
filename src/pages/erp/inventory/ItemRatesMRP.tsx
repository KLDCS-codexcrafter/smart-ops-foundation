import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, Search, History, AlertTriangle, TrendingUp, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types/inventory-item';
import type { ItemRateHistory, RateType } from '@/types/item-rate-history';

const IKEY = 'erp_inventory_items';
const RHKEY = 'erp_item_rate_history';
const CSKEY = 'erp_company_settings';
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const REASON_CATEGORIES = [
  { value: 'price_revision', label: 'Scheduled Price Revision' },
  { value: 'vendor_rate_change', label: 'Vendor / Supplier Rate Change' },
  { value: 'currency_adjustment', label: 'Currency / Exchange Rate Adjustment' },
  { value: 'market_correction', label: 'Market Rate Correction' },
  { value: 'seasonal_update', label: 'Seasonal / Festive Update' },
  { value: 'bulk_update', label: 'Bulk Rate Update' },
  { value: 'copy_from_last_purchase', label: 'Copied from Last Purchase Rate' },
  { value: 'other', label: 'Other (specify below)' },
];

const RATE_FIELDS: { key: RateType; label: string; itemKey: keyof InventoryItem }[] = [
  { key: 'mrp', label: 'MRP', itemKey: 'mrp' },
  { key: 'std_purchase', label: 'Std PO Rate', itemKey: 'std_purchase_rate' },
  { key: 'std_selling', label: 'Std Sell Rate', itemKey: 'std_selling_rate' },
  { key: 'std_cost', label: 'Std Cost Rate', itemKey: 'std_cost_rate' },
];

const RATE_LABELS: Record<RateType, string> = {
  mrp: 'MRP (₹)', std_purchase: 'Std Purchase Rate (₹)',
  std_selling: 'Std Selling Rate (₹)', std_cost: 'Std Cost Rate (₹)',
};

interface PendingChange {
  item: InventoryItem;
  field: RateType;
  oldVal: number | null;
  newVal: number;
}

const getField = (item: InventoryItem, f: RateType): number | null => {
  if (f === 'mrp') return item.mrp ?? null;
  if (f === 'std_purchase') return item.std_purchase_rate ?? null;
  if (f === 'std_selling') return item.std_selling_rate ?? null;
  if (f === 'std_cost') return item.std_cost_rate ?? null;
  return null;
};

const setField = (item: InventoryItem, f: RateType, val: number): InventoryItem => {
  const upd = { ...item };
  if (f === 'mrp') upd.mrp = val;
  if (f === 'std_purchase') upd.std_purchase_rate = val;
  if (f === 'std_selling') upd.std_selling_rate = val;
  if (f === 'std_cost') upd.std_cost_rate = val;
  return upd;
};

export function ItemRatesPanel() {
  const [items, setItems] = useState<InventoryItem[]>(ls(IKEY));
  // [JWT] GET /api/inventory/items
  const [history, setHistory] = useState<ItemRateHistory[]>(ls(RHKEY));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // Deferred pending changes: key = "itemId|field"
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const pendingCount = Object.keys(pending).length;

  // Reason dialog (covers ALL pending at once)
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonCat, setReasonCat] = useState('price_revision');
  const [reasonText, setReasonText] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk update dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'percent' | 'copy_last' | 'csv'>('percent');
  const [bulkField, setBulkField] = useState<RateType>('std_selling');
  const [bulkPercent, setBulkPercent] = useState('');
  const [bulkDirection, setBulkDirection] = useState<'increase' | 'decrease'>('increase');
  const [csvText, setCsvText] = useState('');
  const [bulkReason, setBulkReason] = useState('bulk_update');
  const [bulkReasonText, setBulkReasonText] = useState('');
  const [bulkEffDate, setBulkEffDate] = useState(new Date().toISOString().split('T')[0]);

  // Quick action bar
  const [qaField, setQaField] = useState<RateType>('std_selling');
  const [qaDirection, setQaDirection] = useState<'increase' | 'decrease'>('increase');
  const [qaPercent, setQaPercent] = useState('');
  const [qaScope, setQaScope] = useState<'filtered' | 'all'>('filtered');

  const companySettings: any[] = ls(CSKEY);
  const mrpTax = companySettings?.[0]?.mrp_tax_treatment || 'inclusive';

  const saveItems = (d: InventoryItem[]) => { localStorage.setItem(IKEY, JSON.stringify(d)); /* [JWT] PATCH /api/inventory/items/bulk-rates */ };
  const saveHistory = (d: ItemRateHistory[]) => { localStorage.setItem(RHKEY, JSON.stringify(d)); /* [JWT] POST /api/inventory/item-rates/history */ };

  const itemTypes = useMemo(() => [...new Set(items.map(i => i.item_type).filter(Boolean))].sort(), [items]);
  const stockGroups = useMemo(() => [...new Set(items.map(i => i.stock_group_name).filter(Boolean))].sort(), [items]);
  const brands = useMemo(() => [...new Set(items.map(i => i.brand_name).filter(Boolean))].sort(), [items]);

  const filteredItems = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    const matchQ = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    const matchT = typeFilter === 'all' || i.item_type === typeFilter;
    const matchG = groupFilter === 'all' || i.stock_group_name === groupFilter;
    const matchB = brandFilter === 'all' || i.brand_name === brandFilter;
    return matchQ && matchT && matchG && matchB;
  }), [items, search, typeFilter, groupFilter, brandFilter]);

  const missingMRP = items.filter(i => !i.mrp && ['Finished Goods', 'Packaging Material'].includes(i.item_type || ''));
  const missingStdSell = items.filter(i => !i.std_selling_rate);

  // Cell edit handler — deferred, no dialog
  const handleCellEdit = useCallback((item: InventoryItem, field: RateType, rawVal: string) => {
    const key = `${item.id}|${field}`;
    const oldVal = getField(item, field);
    const trimmed = rawVal.trim();

    if (!trimmed || trimmed === '') {
      // Blank = remove from pending
      setPending(p => { const n = { ...p }; delete n[key]; return n; });
      return;
    }

    const newVal = parseFloat(trimmed);
    if (isNaN(newVal) || newVal < 0) {
      setPending(p => { const n = { ...p }; delete n[key]; return n; });
      return;
    }

    if (newVal === oldVal) {
      // Unchanged = remove from pending
      setPending(p => { const n = { ...p }; delete n[key]; return n; });
      return;
    }

    setPending(p => ({ ...p, [key]: { item, field, oldVal, newVal } }));
  }, []);

  // Apply all pending with shared reason
  const applyAllPending = () => {
    if (!reasonText.trim() && reasonCat === 'other') {
      toast.error('Please specify reason for rate changes');
      return;
    }
    const now = new Date().toISOString();
    const batchId = `bulk-${Date.now()}`;
    const newItems = [...items];
    const newHist = [...history];

    Object.values(pending).forEach(({ item, field, oldVal, newVal }) => {
      const idx = newItems.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        newItems[idx] = setField(newItems[idx], field, newVal);
      }
      newHist.unshift({
        id: `rh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        item_id: item.id, item_code: item.code, item_name: item.name,
        rate_type: field, old_rate: oldVal, new_rate: newVal,
        changed_by: 'Current User',
        change_reason: reasonText || REASON_CATEGORIES.find(r => r.value === reasonCat)?.label || reasonCat,
        change_reason_category: reasonCat as ItemRateHistory['change_reason_category'],
        effective_from: effectiveDate,
        bulk_update_id: batchId, created_at: now,
      });
    });

    setItems(newItems); saveItems(newItems);
    setHistory(newHist); saveHistory(newHist);
    /* [JWT] POST /api/inventory/item-rates/bulk-apply */
    toast.success(`${pendingCount} rate changes applied`);
    setPending({});
    setReasonOpen(false);
    setReasonCat('price_revision');
    setReasonText('');
  };

  // Quick action: stage % changes into pending
  const stageQuickAction = () => {
    const pct = parseFloat(qaPercent);
    if (isNaN(pct) || pct <= 0) { toast.error('Enter a valid percentage'); return; }
    const scope = qaScope === 'filtered' ? filteredItems : items;
    let staged = 0;
    const newPending = { ...pending };

    scope.forEach(item => {
      const old = getField(item, qaField);
      if (old == null || old === 0) return;
      const nv = qaDirection === 'increase' ? old * (1 + pct / 100) : old * (1 - pct / 100);
      const rounded = Math.round(nv * 100) / 100;
      if (rounded === old) return;
      const key = `${item.id}|${qaField}`;
      newPending[key] = { item, field: qaField, oldVal: old, newVal: rounded };
      staged++;
    });

    setPending(newPending);
    toast.success(`${staged} changes staged — click "Apply Changes" to confirm`);
    setQaPercent('');
  };

  // Bulk update (existing dialog - CSV/copy last/%)
  const applyBulkUpdate = () => {
    if (!bulkReasonText.trim()) { toast.error('Reason is mandatory for bulk update'); return; }
    const batchId = `bulk-${Date.now()}`;
    const now = new Date().toISOString();
    let updated = 0;
    const newItems = [...items];
    const newHist = [...history];

    if (bulkMode === 'percent') {
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct) || pct <= 0) { toast.error('Enter a valid percentage'); return; }
      newItems.forEach((item, idx) => {
        const old = getField(item, bulkField);
        if (old == null) return;
        const nv = bulkDirection === 'increase' ? old * (1 + pct / 100) : old * (1 - pct / 100);
        const rounded = Math.round(nv * 100) / 100;
        newItems[idx] = setField(item, bulkField, rounded);
        newHist.unshift({
          id: `rh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_id: item.id, item_code: item.code, item_name: item.name,
          rate_type: bulkField, old_rate: old, new_rate: rounded,
          changed_by: 'Current User', change_reason: bulkReasonText,
          change_reason_category: bulkReason as ItemRateHistory['change_reason_category'],
          effective_from: bulkEffDate, bulk_update_id: batchId, created_at: now,
        });
        updated++;
      });
    }

    if (bulkMode === 'copy_last') {
      newItems.forEach((item, idx) => {
        const lastRate = item.last_purchase_rate;
        if (!lastRate) return;
        const old = item.std_purchase_rate ?? null;
        newItems[idx] = { ...item, std_purchase_rate: lastRate };
        newHist.unshift({
          id: `rh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_id: item.id, item_code: item.code, item_name: item.name,
          rate_type: 'std_purchase', old_rate: old, new_rate: lastRate,
          changed_by: 'Current User', change_reason: bulkReasonText,
          change_reason_category: 'copy_from_last_purchase',
          effective_from: bulkEffDate, bulk_update_id: batchId, created_at: now,
        });
        updated++;
      });
    }

    if (bulkMode === 'csv') {
      const lines = csvText.trim().split('\n').filter(Boolean);
      lines.forEach(line => {
        const [code, mrpVal, stdPurchase, stdSelling] = line.split(',').map(s => s.trim());
        const idx = newItems.findIndex(i => i.code === code);
        if (idx < 0) return;
        const item = newItems[idx];
        if (mrpVal) {
          const n = parseFloat(mrpVal);
          if (!isNaN(n)) {
            const old = item.mrp ?? null;
            newItems[idx] = { ...newItems[idx], mrp: n };
            newHist.unshift({
              id: `rh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              item_id: item.id, item_code: item.code, item_name: item.name,
              rate_type: 'mrp', old_rate: old, new_rate: n, changed_by: 'Current User',
              change_reason: bulkReasonText,
              change_reason_category: bulkReason as ItemRateHistory['change_reason_category'],
              effective_from: bulkEffDate, bulk_update_id: batchId, created_at: now,
            });
            updated++;
          }
        }
        if (stdPurchase) {
          const n = parseFloat(stdPurchase);
          if (!isNaN(n)) {
            const old = newItems[idx].std_purchase_rate ?? null;
            newItems[idx] = { ...newItems[idx], std_purchase_rate: n };
            newHist.unshift({
              id: `rh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              item_id: item.id, item_code: item.code, item_name: item.name,
              rate_type: 'std_purchase', old_rate: old, new_rate: n, changed_by: 'Current User',
              change_reason: bulkReasonText,
              change_reason_category: bulkReason as ItemRateHistory['change_reason_category'],
              effective_from: bulkEffDate, bulk_update_id: batchId, created_at: now,
            });
          }
        }
        if (stdSelling) {
          const n = parseFloat(stdSelling);
          if (!isNaN(n)) {
            const old = newItems[idx].std_selling_rate ?? null;
            newItems[idx] = { ...newItems[idx], std_selling_rate: n };
            newHist.unshift({
              id: `rh-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              item_id: item.id, item_code: item.code, item_name: item.name,
              rate_type: 'std_selling', old_rate: old, new_rate: n,
              changed_by: 'Current User', change_reason: bulkReasonText,
              change_reason_category: bulkReason as ItemRateHistory['change_reason_category'],
              effective_from: bulkEffDate, bulk_update_id: batchId, created_at: now,
            });
          }
        }
      });
    }

    setItems(newItems); saveItems(newItems);
    setHistory(newHist); saveHistory(newHist);
    toast.success(`${updated} item rates updated`);
    setBulkOpen(false); setBulkPercent(''); setCsvText(''); setBulkReasonText('');
  };

  const pendingList = Object.values(pending);

  const fmt = (v: number | null) => v != null ? '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';

  return (
    <div className="max-w-full mx-auto space-y-4 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />Item Rates & MRP
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit rates inline — all changes are batched and audited
            <span className="ml-2 text-[10px] bg-muted px-2 py-0.5 rounded">
              MRP: Tax {mrpTax === 'inclusive' ? 'Inclusive' : 'Exclusive'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkOpen(true)}>
            <TrendingUp className="h-4 w-4" />Bulk Update
          </Button>
          {pendingCount > 0 && (
            <Button size="sm" className="gap-1.5" onClick={() => {
              setReasonCat('price_revision');
              setReasonText('');
              setEffectiveDate(new Date().toISOString().split('T')[0]);
              setReasonOpen(true);
            }}>
              <CheckCircle2 className="h-4 w-4" />Apply Changes ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Total Items</CardDescription>
          <CardTitle className="text-xl">{items.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Missing MRP</CardDescription>
          <CardTitle className={`text-xl ${missingMRP.length > 0 ? 'text-amber-600' : ''}`}>{missingMRP.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Missing Std Selling</CardDescription>
          <CardTitle className={`text-xl ${missingStdSell.length > 0 ? 'text-amber-600' : ''}`}>{missingStdSell.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-1"><CardDescription className="text-xs">Pending Changes</CardDescription>
          <CardTitle className={`text-xl ${pendingCount > 0 ? 'text-amber-600' : ''}`}>{pendingCount}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Rate Workbench ({items.length})</TabsTrigger>
          <TabsTrigger value="history">Change History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-4 space-y-3">
          {/* QUICK ACTION BAR */}
          <Card className="border-dashed">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">Quick Action:</span>
                <Select value={qaField} onValueChange={v => setQaField(v as RateType)}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RATE_FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={qaDirection} onValueChange={v => setQaDirection(v as 'increase' | 'decrease')}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step="0.1" placeholder="%" className="h-8 w-20 text-xs"
                  value={qaPercent} onChange={e => setQaPercent(e.target.value)} />
                <span className="text-xs text-muted-foreground">Apply to:</span>
                <Select value={qaScope} onValueChange={v => setQaScope(v as 'filtered' | 'all')}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filtered">Filtered ({filteredItems.length})</SelectItem>
                    <SelectItem value="all">All ({items.length})</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={stageQuickAction}>
                  Stage Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FILTERS */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-8 w-52 text-xs" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Groups" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Groups</SelectItem>
                {stockGroups.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Item Types</SelectItem>
                {itemTypes.map(t => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => <SelectItem key={b!} value={b!}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {filteredItems.length} of {items.length} items
            </span>
          </div>

          {/* RATE TABLE */}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase w-24 whitespace-nowrap">Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase min-w-[160px]">Item Name</TableHead>
                  {RATE_FIELDS.map(f => (
                    <TableHead key={f.key} colSpan={2} className="text-xs font-semibold uppercase text-center border-l whitespace-nowrap">
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold uppercase w-24 border-l whitespace-nowrap">Last PO Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase w-24 whitespace-nowrap">Last PO Date</TableHead>
                </TableRow>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead /><TableHead />
                  {RATE_FIELDS.map(f => (
                    <React.Fragment key={f.key + '-sub'}>
                      <TableHead className="text-[10px] text-center text-muted-foreground border-l">CURR</TableHead>
                      <TableHead className="text-[10px] text-center text-muted-foreground">NEW</TableHead>
                    </React.Fragment>
                  ))}
                  <TableHead className="border-l" /><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3 + RATE_FIELDS.length * 2 + 2} className="text-center py-16 text-muted-foreground">
                      <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold text-foreground mb-1">No items match the current filters</p>
                      <p className="text-xs">Try changing the filters above</p>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map(item => {
                  const hasAnyPending = RATE_FIELDS.some(f => pending[`${item.id}|${f.key}`]);
                  const rowBg = hasAnyPending ? 'bg-amber-500/5' : '';

                  return (
                    <TableRow key={item.id} className={`${rowBg} group`}>
                      <TableCell className="text-xs font-mono text-muted-foreground py-1.5">{item.code}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="text-sm font-medium leading-tight">{item.name}</div>
                        {(item.stock_group_name || item.brand_name) && (
                          <div className="text-[10px] text-muted-foreground">
                            {[item.stock_group_name, item.brand_name].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {!item.mrp && ['Finished Goods', 'Packaging Material'].includes(item.item_type || '') && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600">MRP required</span>
                          </div>
                        )}
                      </TableCell>

                      {RATE_FIELDS.map(f => {
                        const currVal = getField(item, f.key);
                        const pendingKey = `${item.id}|${f.key}`;
                        const isPending = !!pending[pendingKey];
                        const pendingVal = isPending ? pending[pendingKey].newVal : null;

                        return (
                          <React.Fragment key={f.key + '-cells'}>
                            {/* CURR — grey, read-only */}
                            <TableCell className="p-1 border-l">
                              <span className="text-xs font-mono text-muted-foreground px-2">
                                {currVal != null ? currVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                              </span>
                            </TableCell>
                            {/* NEW — editable */}
                            <TableCell className="p-1">
                              <Input
                                type="number" min="0" step="0.01"
                                className={`h-7 w-24 text-xs text-right px-2 ${
                                  isPending
                                    ? 'bg-amber-500/10 border-amber-400'
                                    : 'border-0 bg-transparent focus:bg-background focus:border focus:border-primary'
                                }`}
                                defaultValue={pendingVal != null ? String(pendingVal) : ''}
                                key={`${pendingKey}-${isPending ? pendingVal : 'empty'}`}
                                onBlur={e => handleCellEdit(item, f.key, e.target.value)}
                                onFocus={e => e.target.select()}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              />
                            </TableCell>
                          </React.Fragment>
                        );
                      })}

                      {/* Last PO Rate + Date — read-only */}
                      <TableCell className="p-1 border-l">
                        <span className="text-xs font-mono text-muted-foreground px-2">
                          {item.last_purchase_rate ? item.last_purchase_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground px-2">{item.last_purchase_date || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {items.length > 0 && (
              <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center gap-6 text-xs font-medium">
                <span className="text-muted-foreground">Showing {filteredItems.length} items</span>
                {pendingCount > 0 && <span className="text-amber-600">{pendingCount} pending changes</span>}
                <span className="ml-auto text-muted-foreground">Rate Changes (all time): {history.length}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* HISTORY TAB — unchanged */}
        <TabsContent value="history" className="mt-4">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              {['Item', 'Rate Type', 'Old Rate', 'New Rate', 'Change', 'Changed By', 'Reason', 'Effective From'].map(h => (
                <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
              ))}
            </TableRow></TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">No rate changes recorded yet</TableCell></TableRow>
              ) : history.slice(0, 100).map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm font-medium">{h.item_name}<div className="text-xs font-mono text-muted-foreground">{h.item_code}</div></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{RATE_LABELS[h.rate_type]}</Badge></TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{h.old_rate != null ? '₹' + h.old_rate.toLocaleString('en-IN') : 'New'}</TableCell>
                  <TableCell className="text-xs font-mono font-medium">₹{h.new_rate.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {h.old_rate != null && (
                      <span className={`text-xs font-medium ${h.new_rate > h.old_rate ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.new_rate > h.old_rate ? '↑' : '↓'} {Math.abs(((h.new_rate - h.old_rate) / h.old_rate) * 100).toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.changed_by}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{h.change_reason}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{h.effective_from}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* DEFERRED REASON DIALOG — covers ALL pending */}
      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Apply {pendingCount} Rate Changes</DialogTitle>
            <DialogDescription>
              Provide a reason and effective date for all pending changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-1.5">
              <Label>Reason Category *</Label>
              <Select value={reasonCat} onValueChange={setReasonCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASON_CATEGORIES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{reasonCat === 'other' ? 'Reason *' : 'Additional Notes'}</Label>
              <Input placeholder={reasonCat === 'other' ? 'Describe the reason...' : 'e.g. vendor increased rates by 5%'}
                value={reasonText} onChange={e => setReasonText(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
            <Separator />
            <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col">
              <Label className="text-xs text-muted-foreground">Changes Summary ({pendingList.length})</Label>
              <ScrollArea className="flex-1 max-h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {pendingList.slice(0, 20).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-muted/30 rounded">
                      <span className="font-medium truncate max-w-[140px]">{c.item.name}</span>
                      <Badge variant="outline" className="text-[10px] mx-1">{RATE_FIELDS.find(f => f.key === c.field)?.label}</Badge>
                      <span className="font-mono text-muted-foreground">{fmt(c.oldVal)}</span>
                      <span className="mx-1">→</span>
                      <span className="font-mono font-semibold text-primary">{fmt(c.newVal)}</span>
                    </div>
                  ))}
                  {pendingList.length > 20 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">+{pendingList.length - 20} more changes</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(false)}>Cancel</Button>
            <Button onClick={applyAllPending}>Apply All {pendingCount} Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK UPDATE DIALOG — existing */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Rate Update</DialogTitle>
            <DialogDescription>Update rates for multiple items at once. All changes are audited.</DialogDescription>
          </DialogHeader>
          <Tabs value={bulkMode} onValueChange={v => setBulkMode(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="percent" className="flex-1">% Revision</TabsTrigger>
              <TabsTrigger value="copy_last" className="flex-1">Copy Last Purchase</TabsTrigger>
              <TabsTrigger value="csv" className="flex-1">CSV / Paste</TabsTrigger>
            </TabsList>
            <TabsContent value="percent" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label>Rate to Update</Label>
                <Select value={bulkField} onValueChange={v => setBulkField(v as RateType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RATE_LABELS) as [RateType, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select value={bulkDirection} onValueChange={v => setBulkDirection(v as 'increase' | 'decrease')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase</SelectItem>
                      <SelectItem value="decrease">Decrease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Percentage (%)</Label>
                  <Input type="number" min="0" step="0.1" placeholder="e.g. 5" value={bulkPercent}
                    onChange={e => setBulkPercent(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Applies to all {items.length} items. Items with no existing rate are skipped.</p>
            </TabsContent>
            <TabsContent value="copy_last" className="space-y-3 mt-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Copy Last Purchase Rate → Std Purchase Rate</p>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">
                  For all items with a last_purchase_rate, set std_purchase_rate = last_purchase_rate. Items without are skipped.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="csv" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label>Paste CSV Data</Label>
                <p className="text-xs text-muted-foreground">Format: Item Code, MRP, Std Purchase Rate, Std Selling Rate (one per line)</p>
                <Textarea rows={8} placeholder={"ITM-00001,450.00,320.00,420.00\nITM-00002,180.00,130.00,165.00"}
                  value={csvText} onChange={e => setCsvText(e.target.value)} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Leave blank for fields you don't want to update.</p>
              </div>
            </TabsContent>
          </Tabs>
          <Separator />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason for Bulk Update *</Label>
              <Select value={bulkReason} onValueChange={setBulkReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASON_CATEGORIES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes * (mandatory)</Label>
              <Input placeholder="Describe this bulk rate update..." value={bulkReasonText}
                onChange={e => setBulkReasonText(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Effective From</Label>
              <Input type="date" value={bulkEffDate} onChange={e => setBulkEffDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={applyBulkUpdate}>Apply Bulk Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ItemRatesMRP() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1 overflow-x-auto"><ItemRatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
