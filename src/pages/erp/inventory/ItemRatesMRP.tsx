import { useState, useMemo } from 'react';
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
import { DollarSign, Search, Edit2, History, AlertTriangle, TrendingUp, Copy, Upload } from 'lucide-react';
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

const RATE_LABELS: Record<RateType, string> = {
  mrp: 'MRP (₹)', std_purchase: 'Std Purchase Rate (₹)',
  std_selling: 'Std Selling Rate (₹)', std_cost: 'Std Cost Rate (₹)',
};

export function ItemRatesPanel() {
  const [items, setItems] = useState<InventoryItem[]>(ls(IKEY));
  // [JWT] GET /api/inventory/items
  const [history, setHistory] = useState<ItemRateHistory[]>(ls(RHKEY));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Inline edit state
  const [editCell, setEditCell] = useState<{ itemId: string; field: RateType } | null>(null);
  const [editVal, setEditVal] = useState('');

  // Change reason dialog
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonData, setReasonData] = useState<{ item: InventoryItem; field: RateType; newVal: number; oldVal: number | null } | null>(null);
  const [reasonCat, setReasonCat] = useState('price_revision');
  const [reasonText, setReasonText] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk update state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'percent' | 'copy_last' | 'csv'>('percent');
  const [bulkField, setBulkField] = useState<RateType>('std_selling');
  const [bulkPercent, setBulkPercent] = useState('');
  const [bulkDirection, setBulkDirection] = useState<'increase' | 'decrease'>('increase');
  const [csvText, setCsvText] = useState('');
  const [bulkReason, setBulkReason] = useState('bulk_update');
  const [bulkReasonText, setBulkReasonText] = useState('');
  const [bulkEffDate, setBulkEffDate] = useState(new Date().toISOString().split('T')[0]);

  const companySettings: any[] = ls(CSKEY);
  const mrpTax = companySettings?.[0]?.mrp_tax_treatment || 'inclusive';

  const saveItems = (d: InventoryItem[]) => { localStorage.setItem(IKEY, JSON.stringify(d)); /* [JWT] PATCH /api/inventory/items/bulk-rates */ };
  const saveHistory = (d: ItemRateHistory[]) => { localStorage.setItem(RHKEY, JSON.stringify(d)); /* [JWT] POST /api/inventory/item-rates/history */ };

  const filteredItems = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    const matchQ = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    const matchT = typeFilter === 'all' || i.item_type === typeFilter;
    return matchQ && matchT;
  }), [items, search, typeFilter]);

  const missingMRP = items.filter(i => !i.mrp && ['Finished Goods', 'Packaging Material'].includes(i.item_type || ''));
  const missingStdSell = items.filter(i => !i.std_selling_rate);

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

  const startEdit = (item: InventoryItem, field: RateType) => {
    setEditCell({ itemId: item.id, field });
    setEditVal(String(getField(item, field) || ''));
  };

  const commitEdit = (item: InventoryItem, field: RateType) => {
    const newVal = parseFloat(editVal);
    if (isNaN(newVal) || newVal < 0) { setEditCell(null); return; }
    const oldVal = getField(item, field);
    if (newVal === oldVal) { setEditCell(null); return; }
    setReasonData({ item, field, newVal, oldVal: oldVal ?? null });
    setReasonCat('price_revision'); setReasonText('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setReasonOpen(true);
    setEditCell(null);
  };

  const applyRateChange = () => {
    if (!reasonData) return;
    if (!reasonText.trim() && reasonCat === 'other') { toast.error('Please specify reason for rate change'); return; }
    const { item, field, newVal, oldVal } = reasonData;
    const now = new Date().toISOString();
    const u = items.map(i => i.id !== item.id ? i : setField(i, field, newVal));
    setItems(u); saveItems(u);
    const hr: ItemRateHistory = {
      id: `rh-${Date.now()}`,
      item_id: item.id, item_code: item.code, item_name: item.name,
      rate_type: field, old_rate: oldVal, new_rate: newVal,
      changed_by: 'Current User',
      change_reason: reasonText || REASON_CATEGORIES.find(r => r.value === reasonCat)?.label || reasonCat,
      change_reason_category: reasonCat as ItemRateHistory['change_reason_category'],
      effective_from: effectiveDate,
      bulk_update_id: null, created_at: now,
    };
    const nh = [hr, ...history]; setHistory(nh); saveHistory(nh);
    toast.success(`${item.name} — ${RATE_LABELS[field]} updated`);
    setReasonOpen(false); setReasonData(null);
  };

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

  const itemTypes = [...new Set(items.map(i => i.item_type).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" />Item Rates & MRP</h1>
          <p className="text-sm text-muted-foreground">
            Manage MRP and standard rates for all items — all changes are audited
            <span className="ml-2 text-[10px] bg-muted px-2 py-0.5 rounded">
              MRP: Tax {mrpTax === 'inclusive' ? 'Inclusive' : 'Exclusive'} (company setting)
            </span>
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkOpen(true)}>
          <TrendingUp className="h-4 w-4" />Bulk Update
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Items</CardDescription><CardTitle className="text-2xl">{items.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Missing MRP</CardDescription>
          <CardTitle className={`text-2xl ${missingMRP.length > 0 ? 'text-amber-600' : ''}`}>{missingMRP.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Missing Std Selling</CardDescription>
          <CardTitle className={`text-2xl ${missingStdSell.length > 0 ? 'text-amber-600' : ''}`}>{missingStdSell.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Rate Changes (All Time)</CardDescription><CardTitle className="text-2xl">{history.length}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Rate Master ({items.length})</TabsTrigger>
          <TabsTrigger value="history">Change History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Item Types</SelectItem>
                {itemTypes.map(t => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              {['Item', 'Type', 'MRP (₹)', 'Std Purchase (₹)', 'Std Selling (₹)', 'Std Cost (₹)', 'Last Purchase (₹)', 'Last Purchase Date'].map(h => (
                <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow></TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No items found</TableCell></TableRow>
              ) : filteredItems.map(item => (
                <TableRow key={item.id} className="group">
                  <TableCell className="font-medium text-sm">
                    <div>{item.name}</div>
                    <code className="text-xs font-mono text-muted-foreground">{item.code}</code>
                    {!item.mrp && ['Finished Goods', 'Packaging Material'].includes(item.item_type || '') && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] text-amber-600">MRP required</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.item_type || '—'}</Badge></TableCell>
                  {(['mrp', 'std_purchase', 'std_selling', 'std_cost'] as RateType[]).map(field => {
                    const val = getField(item, field);
                    const isEditing = editCell?.itemId === item.id && editCell?.field === field;
                    return (
                      <TableCell key={field} className="text-xs">
                        {isEditing ? (
                          <Input autoFocus type="number" min="0" step="0.01" className="h-7 w-28 text-xs"
                            value={editVal} onChange={e => setEditVal(e.target.value)}
                            onBlur={() => commitEdit(item, field)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(item, field); if (e.key === 'Escape') setEditCell(null); }} />
                        ) : (
                          <button className="group/cell flex items-center gap-1 font-mono hover:text-primary"
                            onClick={() => startEdit(item, field)}>
                            <span>{val != null ? '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : <span className="text-muted-foreground/50">—</span>}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover/cell:opacity-100 text-muted-foreground transition-opacity" />
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {item.last_purchase_rate ? '₹ ' + item.last_purchase_rate.toLocaleString('en-IN') : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.last_purchase_date || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent></Card>
        </TabsContent>

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

      {/* Change Reason Dialog */}
      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Change Reason Required</DialogTitle>
            <DialogDescription>
              {reasonData && <>
                {reasonData.item.name} — {RATE_LABELS[reasonData.field]}:
                ₹<span className="font-mono mx-1">{reasonData.oldVal != null ? ' ' + reasonData.oldVal : 'New'}</span>
                → <span className="font-mono font-semibold text-primary">₹{reasonData.newVal}</span>
              </>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReasonOpen(false); setReasonData(null); }}>Cancel</Button>
            <Button onClick={applyRateChange}>Apply Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
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
              <p className="text-xs text-muted-foreground">Applies to all {items.length} items. Items with no existing rate for the selected field are skipped.</p>
            </TabsContent>

            <TabsContent value="copy_last" className="space-y-3 mt-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Copy Last Purchase Rate → Std Purchase Rate</p>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">
                  For all items that have a last_purchase_rate (auto-updated from GRN), set std_purchase_rate = last_purchase_rate.
                  Items without a last purchase rate are skipped.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label>Paste CSV Data</Label>
                <p className="text-xs text-muted-foreground">Format: Item Code, MRP, Std Purchase Rate, Std Selling Rate (one item per line)</p>
                <Textarea rows={8} placeholder={"ITM-00001,450.00,320.00,420.00\nITM-00002,180.00,130.00,165.00"}
                  value={csvText} onChange={e => setCsvText(e.target.value)}
                  className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Leave blank for fields you don't want to update. Example: ITM-00001,,320.00, updates only Std Purchase Rate.</p>
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
        <ERPHeader /><main className="flex-1"><ItemRatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
