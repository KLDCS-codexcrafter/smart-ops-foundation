import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageOpen, Plus, Search, Trash2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { ItemOpeningStockEntry } from '@/types/item-opening-stock';
import type { InventoryItem } from '@/types/inventory-item';

const OSKEY = 'erp_item_opening_stock';
const IKEY = 'erp_inventory_items';
const SLKEY = 'erp_stock_ledger';
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

export function OpeningStockPanel() {
  const [entries, setEntries] = useState<ItemOpeningStockEntry[]>(ls(OSKEY));
  // [JWT] GET /api/inventory/opening-stock
  const [items] = useState<InventoryItem[]>(ls(IKEY));
  const [search, setSearch] = useState('');
  const [goDate, setGoDate] = useState(new Date().toISOString().split('T')[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selItem, setSelItem] = useState<InventoryItem | null>(null);
  const [rowForm, setRowForm] = useState({
    godown_id: '', godown_name: '', batch_number: '',
    mfg_date: '', expiry_date: '', serial_number: '',
    quantity: 0, rate: 0, value: 0,
    mrp: '', std_purchase_rate: '',
  });

  const sv = (d: ItemOpeningStockEntry[]) => { localStorage.setItem(OSKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/opening-stock */ };

  const godowns: any[] = ls('erp_godowns');
  const posted = entries.filter(e => e.status === 'posted');
  const draft = entries.filter(e => e.status !== 'posted');
  const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
  const totalValue = entries.reduce((s, e) => s + e.value, 0);

  const filteredItems = useMemo(() => items.filter(i => {
    const q = itemSearch.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  }).slice(0, 20), [items, itemSearch]);

  const filteredEntries = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    return !q || e.item_name?.toLowerCase().includes(q) || e.item_code?.toLowerCase().includes(q);
  }), [entries, search]);

  const addRow = () => {
    if (!selItem) { toast.error('Select an item'); return; }
    if (rowForm.quantity <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (rowForm.rate <= 0) { toast.error('Rate is required'); return; }
    const now = new Date().toISOString();
    const ne: ItemOpeningStockEntry = {
      id: `os-${Date.now()}`,
      item_id: selItem.id, item_code: selItem.code, item_name: selItem.name,
      godown_id: rowForm.godown_id || 'default', godown_name: rowForm.godown_name || 'Default',
      batch_number: rowForm.batch_number || undefined,
      mfg_date: rowForm.mfg_date || undefined,
      expiry_date: rowForm.expiry_date || undefined,
      serial_number: rowForm.serial_number || undefined,
      quantity: rowForm.quantity, rate: rowForm.rate, value: rowForm.quantity * rowForm.rate,
      mrp: rowForm.mrp ? parseFloat(rowForm.mrp) : null,
      std_purchase_rate: rowForm.std_purchase_rate ? parseFloat(rowForm.std_purchase_rate) : null,
      status: 'draft', created_at: now, updated_at: now,
    };
    const u = [...entries, ne]; setEntries(u); sv(u);
    toast.success(`${selItem.name} added`);
    // [JWT] POST /api/inventory/opening-stock
    setAddOpen(false); setSelItem(null); setItemSearch('');
    setRowForm({ godown_id: '', godown_name: '', batch_number: '', mfg_date: '', expiry_date: '', serial_number: '', quantity: 0, rate: 0, value: 0, mrp: '', std_purchase_rate: '' });
  };

  const postAll = () => {
    if (draft.length === 0) { toast.error('No draft entries to post'); return; }
    const now = new Date().toISOString();
    // Update entries to posted
    const u = entries.map(e => e.status !== 'posted' ? { ...e, status: 'posted' as const, updated_at: now } : e);
    setEntries(u); sv(u);
    // Write to stock ledger
    const existSL: any[] = ls(SLKEY);
    const newSL = draft.map(e => ({
      id: `sl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_id: e.item_id, item_code: e.item_code, item_name: e.item_name,
      godown_id: e.godown_id, godown_name: e.godown_name,
      txn_type: 'opening_balance', txn_ref: e.id,
      qty_in: e.quantity, qty_out: 0, rate: e.rate, value: e.value,
      batch_number: e.batch_number || null, serial_number: e.serial_number || null,
      txn_date: goDate, created_at: now,
    }));
    localStorage.setItem(SLKEY, JSON.stringify([...existSL, ...newSL]));
    /* [JWT] POST /api/inventory/stock-ledger/opening-entries */
    // Update item master: mrp + std_purchase_rate for each item
    const allItems: any[] = ls(IKEY);
    draft.forEach(e => {
      const idx = allItems.findIndex((i: any) => i.id === e.item_id);
      if (idx >= 0) {
        if (e.mrp) allItems[idx].mrp = e.mrp;
        if (e.std_purchase_rate) allItems[idx].std_purchase_rate = e.std_purchase_rate;
      }
    });
    localStorage.setItem(IKEY, JSON.stringify(allItems));
    /* [JWT] PATCH /api/inventory/items/bulk-rates */
    toast.success(`${draft.length} entries posted to stock ledger`);
  };

  const deleteEntry = (id: string) => {
    const e = entries.find(x => x.id === id);
    if (e?.status === 'posted') { toast.error('Cannot delete posted entries'); return; }
    const u = entries.filter(x => x.id !== id); setEntries(u); sv(u);
    toast.success('Entry removed');
    // [JWT] DELETE /api/inventory/opening-stock/:id
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackageOpen className="h-6 w-6" />Opening Stock Entry</h1>
          <p className="text-sm text-muted-foreground">Bulk entry of opening stock on go-live date — also sets MRP and standard purchase rates</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Go-Live Date</Label>
            <Input type="date" className="h-8 w-40 text-sm" value={goDate} onChange={e => setGoDate(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Item</Button>
          {draft.length > 0 && (
            <Button size="sm" className="gap-1" onClick={postAll}>
              <CheckCircle2 className="h-4 w-4" />Post {draft.length} Entries
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Items</CardDescription><CardTitle className="text-2xl">{entries.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Quantity</CardDescription><CardTitle className="text-2xl">{totalQty.toLocaleString('en-IN')}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Value (₹)</CardDescription><CardTitle className="text-2xl">{Math.round(totalValue).toLocaleString('en-IN')}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Draft / Posted</CardDescription><CardTitle className="text-2xl"><span className="text-amber-600">{draft.length}</span><span className="text-muted-foreground text-lg"> / </span><span className="text-emerald-600">{posted.length}</span></CardTitle></CardHeader></Card>
      </div>

      {posted.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {posted.length} entries already posted to stock ledger and locked. Add new entries for any remaining items.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by item name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filteredEntries.length} entries</span>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            {['Item', 'Godown', 'Batch/Serial', 'Expiry', 'Qty', 'Rate (₹)', 'Value (₹)', 'MRP (₹)', 'Std. Purchase (₹)', 'Status', ''].map(h => (
              <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
            ))}
          </TableRow></TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold text-foreground mb-1">No opening stock entries yet</p>
                <p className="text-xs mb-4">Add items to record your stock on the go-live date</p>
                <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              </TableCell></TableRow>
            ) : filteredEntries.map(e => (
              <TableRow key={e.id} className="group">
                <TableCell className="font-medium text-sm">
                  <div>{e.item_name}</div>
                  <code className="text-xs text-muted-foreground font-mono">{e.item_code}</code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.godown_name || 'Default'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.batch_number || e.serial_number || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.expiry_date || '—'}</TableCell>
                <TableCell className="text-xs font-mono">{e.quantity.toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-xs font-mono">₹{e.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-xs font-mono">₹{e.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-xs font-mono">{e.mrp ? '₹' + e.mrp.toLocaleString('en-IN') : '—'}</TableCell>
                <TableCell className="text-xs font-mono">{e.std_purchase_rate ? '₹' + e.std_purchase_rate.toLocaleString('en-IN') : '—'}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${e.status === 'posted' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                    {e.status === 'posted' ? 'Posted' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {e.status !== 'posted' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteEntry(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {entries.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex items-center gap-6 text-sm font-medium">
            <span>Total: {entries.length} items</span>
            <span>Total Qty: {totalQty.toLocaleString('en-IN')}</span>
            <span className="text-primary">Total Value: ₹{Math.round(totalValue).toLocaleString('en-IN')}</span>
          </div>
        )}
      </CardContent></Card>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opening Stock Entry</DialogTitle>
            <DialogDescription>Select item and enter opening balance details including MRP and standard rates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Item picker */}
            <div className="space-y-1.5">
              <Label>Item *</Label>
              {selItem ? (
                <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selItem.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{selItem.code} · {selItem.primary_uom_symbol}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setSelItem(null); setItemSearch(''); }}>Change</Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                  {itemSearch && filteredItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {filteredItems.map(item => (
                        <button key={item.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0"
                          onClick={() => {
                            setSelItem(item); setItemSearch('');
                            setRowForm(f => ({
                              ...f,
                              mrp: item.mrp ? String(item.mrp) : '',
                              std_purchase_rate: item.std_purchase_rate ? String(item.std_purchase_rate) : '',
                            }));
                          }}>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{item.code} · {item.primary_uom_symbol || '-'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <Separator />
            {/* Godown */}
            <div className="space-y-1.5">
              <Label>Godown</Label>
              <Select value={rowForm.godown_id || 'default'}
                onValueChange={v => { const g = godowns.find((x: any) => x.id === v); setRowForm(f => ({ ...f, godown_id: v, godown_name: g?.name || 'Default' })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Warehouse</SelectItem>
                  {godowns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Batch/Serial/Expiry conditional */}
            {selItem?.batch_tracking && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Batch Number</Label>
                  <Input value={rowForm.batch_number} onChange={e => setRowForm(f => ({ ...f, batch_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mfg Date</Label>
                  <Input type="date" value={rowForm.mfg_date} onChange={e => setRowForm(f => ({ ...f, mfg_date: e.target.value }))} />
                </div>
              </div>
            )}
            {(selItem?.expiry_tracking || selItem?.batch_tracking) && (
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={rowForm.expiry_date} onChange={e => setRowForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            )}
            {selItem?.serial_tracking && (
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input value={rowForm.serial_number} onChange={e => setRowForm(f => ({ ...f, serial_number: e.target.value }))} />
              </div>
            )}
            <Separator />
            {/* Qty, Rate, Value */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Opening Qty *</Label>
                <Input type="number" min="0" step="0.001" value={rowForm.quantity || ''}
                  onChange={e => { const q = parseFloat(e.target.value) || 0; setRowForm(f => ({ ...f, quantity: q, value: q * f.rate })); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={rowForm.rate || ''}
                  onChange={e => { const r = parseFloat(e.target.value) || 0; setRowForm(f => ({ ...f, rate: r, value: f.quantity * r })); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Value (₹)</Label>
                <Input readOnly className="bg-muted" value={rowForm.value ? rowForm.value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''} />
              </div>
            </div>
            <Separator />
            {/* MRP + Std Purchase Rate */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate Master — auto-fills from Item Craft if set</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>MRP (₹)</Label>
                <Input type="number" min="0" step="0.01" placeholder="Maximum Retail Price" value={rowForm.mrp} onChange={e => setRowForm(f => ({ ...f, mrp: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">Legal Metrology Act — printed on every label</p>
              </div>
              <div className="space-y-1.5">
                <Label>Std Purchase Rate (₹)</Label>
                <Input type="number" min="0" step="0.01" placeholder="Reference PO rate" value={rowForm.std_purchase_rate} onChange={e => setRowForm(f => ({ ...f, std_purchase_rate: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">Default rate on Purchase Orders</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addRow}>Add to List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OpeningStockEntry() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><OpeningStockPanel /></main>
      </div>
    </SidebarProvider>
  );
}
