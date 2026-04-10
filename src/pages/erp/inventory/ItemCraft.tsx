import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package, Plus, Search, Edit2, Trash2, Network, ChevronRight, ChevronLeft,
  Star, X, Tag, Ruler, Warehouse, ShieldCheck, ShoppingBag,
  Upload, Info, Layers, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem, ItemType, CostingMethodItem } from '@/types/inventory-item';
import type { ItemPacking } from '@/types/item-packing';
import type { ItemVendor } from '@/types/item-vendor';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { ItemPartyCode } from '@/types/item-party-code';
import type { ItemOpeningStockEntry } from '@/types/item-opening-stock';

/* ─── constants ─── */
const ITEM_TYPES: ItemType[] = [
  'Raw Material', 'Finished Goods', 'Semi-Finished', 'Component', 'By-Product',
  'Co-Product', 'Scrap', 'Consumables', 'Stores & Consumables', 'Packaging Material',
  'Service', 'Fixed Asset',
];
const COSTING_METHODS: { value: CostingMethodItem; label: string }[] = [
  { value: 'weighted_avg', label: 'Weighted Average (default)' },
  { value: 'fifo_annual', label: 'FIFO — Annual' },
  { value: 'fifo_perpetual', label: 'FIFO — Perpetual' },
  { value: 'lifo_annual', label: 'LIFO — Annual' },
  { value: 'lifo_perpetual', label: 'LIFO — Perpetual' },
  { value: 'last_purchase', label: 'Last Purchase Price' },
  { value: 'standard_cost', label: 'Standard Cost' },
  { value: 'specific_id', label: 'Specific Identification' },
  { value: 'monthly_avg', label: 'Monthly Average' },
  { value: 'zero_cost', label: 'Zero Cost' },
];
const TAX_CATS = ['Regular', 'Exempt', 'Nil Rated', 'Zero Rated', 'Non-GST'];
const SUPPLY_T = ['B2B', 'B2C', 'Export', 'Import', 'Deemed Export'];
const GST_RATES = [0, 0.25, 1.5, 3, 5, 12, 18, 28];
const COUNTRIES = ['India', 'China', 'USA', 'Germany', 'Japan', 'South Korea', 'UK',
  'France', 'Italy', 'Taiwan', 'Netherlands', 'Singapore', 'Malaysia', 'Bangladesh', 'Other'];
const WTY_UNITS = ['Days', 'Months', 'Years'];
const WTY_TYPES = ['Standard', 'Extended', 'On-Site', 'Carry-In', 'No Warranty'];
const QC_FREQ = ['Every Lot', 'Random Sampling', 'Monthly', 'Quarterly', 'Annual'];
const MKT_S: Record<string, string> = { not_listed: 'Not Listed', draft: 'Draft', live: 'Live' };

const IKEY = 'erp_inventory_items', PKEY = 'erp_item_packings', VKEY = 'erp_item_vendors';
const QKEY = 'erp_item_qc_params', PCKEY = 'erp_item_party_codes', OSKEY = 'erp_item_opening_stock';
const SGKEY = 'erp_stock_groups', BKEY = 'erp_brands', SBKEY = 'erp_sub_brands';
const CKEY = 'erp_classifications', UKEY = 'erp_uom', GKEY = 'erp_godowns';
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

/* ─── BLANK form ─── */
const BLANK: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> = {
  code: '', auto_code: true, name: '', display_name: null, short_name: null, regional_name: null,
  item_type: 'Raw Material', stock_group_id: null, stock_group_name: null, stock_group_breadcrumb: null,
  category_type: 'Raw Material', stock_nature: 'Inventory', use_for: 'All Transactions',
  description: null, purchase_description: null, sales_description: null, internal_notes: null,
  classification_id: null, classification_name: null,
  brand_id: null, brand_name: null, sub_brand_id: null, sub_brand_name: null, country_of_origin: null,
  primary_uom_id: null, primary_uom_symbol: null,
  secondary_uom_id: null, secondary_uom_symbol: null, secondary_conversion_factor: null,
  tertiary_uom_id: null, tertiary_uom_symbol: null, tertiary_conversion_factor: null,
  purchase_uom_id: null, purchase_uom_symbol: null,
  net_weight: null, gross_weight: null, weight_unit: 'kg',
  length: null, width: null, height: null, dimension_unit: 'cm',
  hsn_sac_code: null, hsn_description: null, tax_category: 'Regular',
  igst_rate: null, cgst_rate: null, sgst_rate: null, cess_rate: null, cess_valuation_type: null,
  itc_eligible: true, rcm_applicable: false, tcs_applicable: false, tds_applicable: false,
  supply_type: 'B2B', mrp: null, fssai_license: null, drug_license: null, epr_registration: null,
  costing_method: 'weighted_avg', costing_override: false,
  purchase_ledger_id: null, sales_ledger_id: null,
  reorder_level: null, reorder_qty: null, moq: null, lead_time_days: null,
  safety_stock: null, max_stock_level: null,
  batch_tracking: false, batch_override: false,
  serial_tracking: false, serial_override: false,
  expiry_tracking: false, qc_hold_on_receipt: false,
  warranty_period: null, warranty_unit: 'Months', warranty_type: 'Standard',
  service_required: false, service_interval: null, amc_applicable: false,
  listing_title: null, short_bullets: null, long_description: null,
  ecommerce_images: null, video_url: null, search_keywords: null,
  meta_title: null, meta_description: null, url_slug: null,
  amazon_status: null, flipkart_status: null, website_status: null,
  product_attributes: null, in_the_box: null,
  carbon_footprint: null, recyclability_percent: null, certifications: null,
  selected_param_ids: null, status: 'active', effective_from: null, effective_to: null,
};

/* ─── Progress Bar ─── */
const TABS = [
  { id: 1, label: 'Basic Info', icon: Package, req: ['name', 'item_type', 'stock_group_name'] },
  { id: 2, label: 'Parameters', icon: Layers, req: [] },
  { id: 3, label: 'Class./Party', icon: Tag, req: [] },
  { id: 4, label: 'Measure/Pack', icon: Ruler, req: ['primary_uom_symbol'] },
  { id: 5, label: 'Tax/Comply', icon: ShieldCheck, req: ['hsn_sac_code', 'tax_category'] },
  { id: 6, label: 'Inventory', icon: Warehouse, req: [] },
  { id: 7, label: 'Quality', icon: BarChart3, req: [] },
  { id: 8, label: 'Digital Shelf', icon: ShoppingBag, req: [] },
];

function ItemProgressBar({ activeTab, form, onTabClick }: { activeTab: number; form: typeof BLANK; onTabClick: (t: number) => void }) {
  const filled = TABS.filter(t => t.req.every(f => { const v = (form as any)[f]; return v && v !== '' && v !== null; })).length;
  const pct = Math.round((filled / TABS.length) * 100);
  return (
    <div className="px-5 pt-4 pb-3 border-b bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Record Completeness</span>
        <span className={`text-sm font-semibold ${pct === 100 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5 mb-3" />
      <div className="flex items-start overflow-x-auto gap-0">
        {TABS.map((tab, i) => {
          const done = tab.req.every(f => { const v = (form as any)[f]; return v && v !== '' && v !== null; });
          const cur = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabClick(tab.id)}
              className="flex flex-col items-center gap-1 flex-1 min-w-0 relative pb-1"
              style={{ position: 'relative' }}>
              {i < TABS.length - 1 && (
                <div style={{ position: 'absolute', top: 9, left: 'calc(50% + 10px)', right: 'calc(-50% + 10px)', height: 1, background: done ? '#10B981' : 'var(--border)', zIndex: 0 }} />
              )}
              <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center z-10 flex-shrink-0 text-[10px] font-semibold border transition-colors ${done && !cur ? 'bg-emerald-500 border-emerald-500 text-white' : cur ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'}`}>
                {done && !cur ? '✓' : tab.id}
              </div>
              <span className={`text-[9px] leading-tight text-center max-w-[56px] truncate ${cur ? 'text-primary font-medium' : done ? 'text-emerald-600' : 'text-muted-foreground'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Where Used Panel ─── */
function WhereUsedPanel({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  return (
    <Sheet open={!!item} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-[440px] sm:w-[540px]">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />Where Used — {item.name}
          </SheetTitle>
          <SheetDescription>All BOMs and Finished Goods that use this item as a component</SheetDescription>
        </SheetHeader>
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              BOM linkages auto-populate when the BOM module is built.
              This panel will show which Finished Goods use <strong>{item.name}</strong> and the qty per unit.
            </p>
          </div>
          {/* [JWT] GET /api/inventory/items/:id/where-used */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                {['FG Item', 'BOM', 'Qty/Unit', 'UOM'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                  No BOM links yet. Will auto-populate from BOM module.
                </TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── ItemCraftPanel ─── */
export function ItemCraftPanel() {
  const [items, setItems] = useState<InventoryItem[]>(ls(IKEY));
  // [JWT] GET /api/inventory/items
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [tab, setTab] = useState(1);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [vendors, setVendors] = useState<ItemVendor[]>([]);
  const [qcParams, setQcParams] = useState<ItemQCParam[]>([]);
  const [partyCodes, setPartyCodes] = useState<ItemPartyCode[]>([]);
  const [packings, setPackings] = useState<ItemPacking[]>([]);
  const [os, setOs] = useState<ItemOpeningStockEntry[]>([]);
  const [whereUsed, setWhereUsed] = useState<InventoryItem | null>(null);
  const groups = useState(() => ls<any>(SGKEY))[0];
  const brands = useState(() => ls<any>(BKEY))[0];
  const subs = useState(() => ls<any>(SBKEY))[0];
  const classifs = useState(() => ls<any>(CKEY))[0];
  const uoms = useState(() => ls<any>(UKEY))[0];
  const godowns = useState(() => ls<any>(GKEY))[0];
  const groupParams = useState(() => ls<any>('erp_parametric_templates'))[0];

  const sv  = (d: InventoryItem[]) => { localStorage.setItem(IKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items */ };
  const svR = <T,>(k: string, d: T[]) => { localStorage.setItem(k, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items/:id/related */ };

  const nextCode = () => `ITM-${String(items.length + 1).padStart(5, '0')}`;

  const openCreate = () => {
    setForm({ ...BLANK, code: nextCode() });
    setVendors([]); setQcParams([]); setPartyCodes([]); setPackings([]); setOs([]);
    setEditItem(null); setTab(1); setDlgOpen(true);
  };
  const openEdit = (item: InventoryItem) => {
    setForm({ ...BLANK, ...item } as typeof BLANK);
    setVendors(ls<ItemVendor>(VKEY).filter(v => v.item_id === item.id));
    setQcParams(ls<ItemQCParam>(QKEY).filter(q => q.item_id === item.id));
    setPartyCodes(ls<ItemPartyCode>(PCKEY).filter(p => p.item_id === item.id));
    setPackings(ls<ItemPacking>(PKEY).filter(p => p.item_id === item.id));
    setOs(ls<ItemOpeningStockEntry>(OSKEY).filter(o => o.item_id === item.id));
    setEditItem(item); setTab(1); setDlgOpen(true);
  };
  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Item Name is required'); return; }
    const now = new Date().toISOString();
    const sid = editItem?.id || `item-${Date.now()}`;
    if (editItem) {
      const u = items.map(x => x.id === editItem.id ? { ...x, ...form, id: editItem.id, updated_at: now } as InventoryItem : x);
      setItems(u); sv(u);
      // [JWT] PATCH /api/inventory/items/:id
    } else {
      const ni = { ...form, id: sid, created_at: now, updated_at: now } as InventoryItem;
      const u = [ni, ...items]; setItems(u); sv(u);
      // [JWT] POST /api/inventory/items
    }
    svR(VKEY, [...ls<ItemVendor>(VKEY).filter(v => v.item_id !== sid), ...vendors.map(v => ({ ...v, item_id: sid }))]);
    svR(QKEY, [...ls<ItemQCParam>(QKEY).filter(q => q.item_id !== sid), ...qcParams.map(q => ({ ...q, item_id: sid }))]);
    svR(PCKEY, [...ls<ItemPartyCode>(PCKEY).filter(p => p.item_id !== sid), ...partyCodes.map(p => ({ ...p, item_id: sid }))]);
    svR(PKEY, [...ls<ItemPacking>(PKEY).filter(p => p.item_id !== sid), ...packings.map(p => ({ ...p, item_id: sid }))]);
    svR(OSKEY, [...ls<ItemOpeningStockEntry>(OSKEY).filter(o => o.item_id !== sid), ...os.map(o => ({ ...o, item_id: sid }))]);
    // [JWT] POST /api/inventory/items/:id/vendors, /qc-params, /party-codes, /packings, /opening-stock
    toast.success(`${form.name} ${editItem ? 'updated' : 'created'}`);
    setDlgOpen(false);
  };
  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || (i.hsn_sac_code || '').includes(q))
      && (typeF === 'all' || i.item_type === typeF);
  }), [items, search, typeF]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Item Craft</h1>
          <p className="text-sm text-muted-foreground">Complete item master — pricing handled in Price Lists module</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" />Add Item</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Items</CardDescription><CardTitle className="text-2xl">{items.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="text-2xl text-emerald-600">{items.filter(i => i.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Services</CardDescription><CardTitle className="text-2xl">{items.filter(i => i.item_type === 'Service').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Draft</CardDescription><CardTitle className="text-2xl text-amber-600">{items.filter(i => i.status === 'draft').length}</CardTitle></CardHeader></Card>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by name, code, HSN..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} items</span>
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Code', 'Item Name', 'Type', 'HSN/SAC', 'UOM', 'Group', 'Where Used', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No items yet</p>
              <Button size="sm" className="mt-2" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
            </TableCell></TableRow>
          ) : filtered.map(item => (
            <TableRow key={item.id} className="group">
              <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{item.code}</code></TableCell>
              <TableCell className="font-medium text-sm max-w-[160px]">
                <div className="truncate">{item.name}</div>
                {item.short_name && <div className="text-xs text-muted-foreground truncate">{item.short_name}</div>}
              </TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{item.item_type}</Badge></TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">{item.hsn_sac_code || '—'}</TableCell>
              <TableCell className="text-xs">{item.primary_uom_symbol || '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">{item.stock_group_name || '—'}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => setWhereUsed(item)}>
                  <Network className="h-3 w-3" />Where Used
                </Button>
              </TableCell>
              <TableCell>
                <Badge className={`text-xs ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : item.status === 'draft' ? 'bg-amber-500/10 text-amber-700' : 'bg-slate-500/10 text-slate-500'}`}>{item.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    const u = items.filter(x => x.id !== item.id); setItems(u); sv(u); toast.success(`${item.name} deleted`);
                    // [JWT] DELETE /api/inventory/items/:id
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      {/* ── Main Dialog ── */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col">
          <div className="px-5 pt-4 pb-3 border-b">
            <DialogTitle>{editItem ? `Edit: ${editItem.name}` : 'New Item'}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {editItem ? 'Update item master record' : 'Complete all 8 sections — pricing in Price Lists module'}
            </DialogDescription>
          </div>
          <ItemProgressBar activeTab={tab} form={form} onTabClick={setTab} />
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ── TAB 1: BASIC INFO ── */}
            {tab === 1 && (
              <div className="space-y-4">
                {/* Template banner */}
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-blue-700 dark:text-blue-300">⚡ Use a template to auto-fill HSN, UOM, costing method and parameters</span>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-blue-300">Browse Templates</Button>
                </div>
                {/* Code + Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Item Code</Label>
                    {form.auto_code
                      ? <div className="font-mono text-sm px-3 py-1.5 bg-muted border rounded-md text-primary font-semibold tracking-wide">{form.code || nextCode()}</div>
                      : <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                    }
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.auto_code} onChange={e => setForm(f => ({ ...f, auto_code: e.target.checked }))} className="w-3 h-3 accent-primary" />
                      <span className="text-xs text-muted-foreground">Auto-generate from Code Matrix</span>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Item Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. MS Flat Bar 25x6mm x 6mtr" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Display Name</Label>
                    <Input placeholder="For invoices/reports" value={form.display_name || ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value || null }))} />
                    <p className="text-[10px] text-muted-foreground">Defaults to Item Name</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Name / Alias</Label>
                    <Input placeholder="e.g. MS Flat 25x6" value={form.short_name || ''} onChange={e => setForm(f => ({ ...f, short_name: e.target.value || null }))} />
                    <p className="text-[10px] text-muted-foreground">Quick search + barcode labels</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Regional Name</Label>
                    <Input placeholder="Hindi / regional script" value={form.regional_name || ''} onChange={e => setForm(f => ({ ...f, regional_name: e.target.value || null }))} />
                    <p className="text-[10px] text-muted-foreground">e.g. एम एस फ्लैट बार</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Item Type <span className="text-destructive">*</span></Label>
                    <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v as ItemType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock Group <span className="text-destructive">*</span></Label>
                    <Select value={form.stock_group_id || 'none'}
                      onValueChange={v => {
                        const g = groups.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, stock_group_id: v === 'none' ? null : v,
                          stock_group_name: g?.name || null, stock_group_breadcrumb: g?.name || null,
                          category_type: g?.category_type || f.category_type,
                          costing_method: g?.costing_method || f.costing_method,
                          batch_tracking: g?.batch_grid_enabled || f.batch_tracking,
                          serial_tracking: g?.serial_grid_enabled || f.serial_tracking }));
                      }}>
                      <SelectTrigger><SelectValue placeholder="Select stock group..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Select Group —</SelectItem>
                        {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category Type</Label>
                    <Input value={form.category_type} className="bg-muted"
                      onChange={e => setForm(f => ({ ...f, category_type: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Inherited from group</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock Nature</Label>
                    <Select value={form.stock_nature} onValueChange={v => setForm(f => ({ ...f, stock_nature: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inventory">Inventory</SelectItem>
                        <SelectItem value="Non-Inventory">Non-Inventory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Use For</Label>
                    <Select value={form.use_for} onValueChange={v => setForm(f => ({ ...f, use_for: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['All Transactions', 'Sales Only', 'Purchase Only', 'Manufacturing', 'Not Applicable'].map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Purchase Description <span className="text-[10px] text-muted-foreground">(prints on PO)</span></Label>
                    <Textarea placeholder="Text that prints on Purchase Orders and GRNs..." rows={2}
                      value={form.purchase_description || ''}
                      onChange={e => setForm(f => ({ ...f, purchase_description: e.target.value || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sales Description <span className="text-[10px] text-muted-foreground">(prints on invoice)</span></Label>
                    <Textarea placeholder="Text that prints on Sales Invoices and Delivery Notes..." rows={2}
                      value={form.sales_description || ''}
                      onChange={e => setForm(f => ({ ...f, sales_description: e.target.value || null }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Internal Notes</Label>
                  <Input placeholder="For internal team — handling, storage, sourcing notes..."
                    value={form.internal_notes || ''}
                    onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value || null }))} />
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Effective From</Label>
                    <Input type="date" value={form.effective_from || ''}
                      onChange={e => setForm(f => ({ ...f, effective_from: e.target.value || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Effective To</Label>
                    <Input type="date" value={form.effective_to || ''}
                      onChange={e => setForm(f => ({ ...f, effective_to: e.target.value || null }))} />
                    <p className="text-[10px] text-muted-foreground">For seasonal items</p>
                  </div>
                </div>
                {form.stock_group_name && (
                  <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inherited from {form.stock_group_name}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-md text-xs">
                        <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">COSTING</span>
                        {COSTING_METHODS.find(m => m.value === form.costing_method)?.label || form.costing_method}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-md text-xs ${form.batch_tracking ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                        <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">BATCH</span>
                        {form.batch_tracking ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-md text-xs ${form.serial_tracking ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                        <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">SERIAL</span>
                        {form.serial_tracking ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: PARAMETERS ── */}
            {tab === 2 && (
              <div className="space-y-4">
                {!form.stock_group_id ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-semibold text-foreground mb-1">Select a Stock Group first</p>
                    <p className="text-xs">Go back to Tab 1 and select a Stock Group to see inherited parameters</p>
                  </div>
                ) : (() => {
                  const allP: any[] = groupParams.flatMap((t: any) => t.parameters || []);
                  const sel = new Set<string>(form.selected_param_ids || []);
                  if (allP.length === 0) { return (
                    <div className="text-center py-12 text-muted-foreground">
                      <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold text-foreground mb-1">No parameters configured for this group</p>
                      <p className="text-xs">Configure parameters in A.1 Parametric Hub</p>
                    </div>
                  ); }
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Group Parameters ({allP.length} available)</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setForm(f => ({ ...f, selected_param_ids: allP.map((p: any) => p.id || p.name) }))}>
                          Keep All
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Toggle which parameters apply to this item. Required parameters cannot be removed.</p>
                      {allP.map((param: any) => {
                        const pid = param.id || param.name;
                        const isSelected = sel.has(pid);
                        const isRequired = param.required || param.is_required;
                        return (
                          <div key={pid} className={`flex items-center justify-between p-3 border rounded-lg ${isSelected ? 'border-primary/30 bg-primary/5' : ''}`}>
                            <div className="flex items-center gap-3">
                              <Switch checked={isSelected || isRequired} disabled={isRequired}
                                onCheckedChange={v => {
                                  const ns = new Set(sel); v ? ns.add(pid) : ns.delete(pid);
                                  setForm(f => ({ ...f, selected_param_ids: Array.from(ns) }));
                                }} />
                              <div>
                                <p className="text-sm font-medium">{param.name || param.label}</p>
                                <p className="text-xs text-muted-foreground">{param.type || param.param_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isRequired ? <Badge className="text-xs bg-red-500/10 text-red-700">Required</Badge>
                                : <Badge variant="outline" className="text-xs">Optional</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── TAB 3: CLASSIFICATION & PARTY CODES ── */}
            {tab === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Classification (optional)</Label>
                    <Select value={form.classification_id || 'none'}
                      onValueChange={v => { const c = classifs.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, classification_id: v === 'none' ? null : v, classification_name: c?.name || null })); }}>
                      <SelectTrigger><SelectValue placeholder="Any classification..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No Classification —</SelectItem>
                        {classifs.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Groups items analytically across brands</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country of Origin</Label>
                    <Select value={form.country_of_origin || 'none'}
                      onValueChange={v => setForm(f => ({ ...f, country_of_origin: v === 'none' ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Not Specified —</SelectItem>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Required for import duty and MEIS</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Brand</Label>
                    <Select value={form.brand_id || 'none'}
                      onValueChange={v => { const b = brands.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, brand_id: v === 'none' ? null : v, brand_name: b?.name || null, sub_brand_id: null, sub_brand_name: null })); }}>
                      <SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No Brand —</SelectItem>
                        {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sub-Brand</Label>
                    <Select value={form.sub_brand_id || 'none'} disabled={!form.brand_id}
                      onValueChange={v => { const s = subs.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, sub_brand_id: v === 'none' ? null : v, sub_brand_name: s?.name || null })); }}>
                      <SelectTrigger><SelectValue placeholder="Select sub-brand..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No Sub-Brand —</SelectItem>
                        {subs.filter((s: any) => s.brand_id === form.brand_id).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Party-Specific Item Codes</p>
                    <p className="text-xs text-muted-foreground">How vendors and customers refer to this item — printed on their documents</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setPartyCodes(p => [...p, { id: `pc-${Date.now()}`, item_id: '',
                      party_type: 'vendor' as const, party_id: null, party_name: '',
                      party_item_code: null, party_item_name: null, print_name: null,
                      created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])}>
                    <Plus className="h-3.5 w-3.5" />Add Party
                  </Button>
                </div>
                {partyCodes.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                    No party codes yet. Add vendor/customer codes to print their item codes on documents.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                        {['Type', 'Party Name', 'Their Item Code', 'Their Item Name', 'Print Name', ''].map(h => (
                          <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider py-2">{h}</TableHead>
                        ))}
                      </TableRow></TableHeader>
                      <TableBody>
                        {partyCodes.map((pc, i) => (
                          <TableRow key={pc.id}>
                            <TableCell className="py-1.5">
                              <Select value={pc.party_type}
                                onValueChange={v => setPartyCodes(a => a.map((x, j) => j === i ? { ...x, party_type: v as any } : x))}>
                                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="vendor">Vendor</SelectItem>
                                  <SelectItem value="customer">Customer</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-32" placeholder="Party name" value={pc.party_name}
                                onChange={e => setPartyCodes(a => a.map((x, j) => j === i ? { ...x, party_name: e.target.value } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-28" placeholder="Their code" value={pc.party_item_code || ''}
                                onChange={e => setPartyCodes(a => a.map((x, j) => j === i ? { ...x, party_item_code: e.target.value || null } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-32" placeholder="Their name" value={pc.party_item_name || ''}
                                onChange={e => setPartyCodes(a => a.map((x, j) => j === i ? { ...x, party_item_name: e.target.value || null } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-28" placeholder="Print name" value={pc.print_name || ''}
                                onChange={e => setPartyCodes(a => a.map((x, j) => j === i ? { ...x, print_name: e.target.value || null } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setPartyCodes(a => a.filter((_, j) => j !== i))}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: MEASUREMENT & PACKING ── */}
            {tab === 4 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit of Measure</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Primary UOM <span className="text-destructive">*</span></Label>
                    <Select value={form.primary_uom_id || 'none'}
                      onValueChange={v => { const u = uoms.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, primary_uom_id: v === 'none' ? null : v, primary_uom_symbol: u?.symbol || null })); }}>
                      <SelectTrigger><SelectValue placeholder="Select UOM..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Select UOM —</SelectItem>
                        {uoms.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Used for stock balance and sales</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Purchase UOM</Label>
                    <Select value={form.purchase_uom_id || 'none'}
                      onValueChange={v => { const u = uoms.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, purchase_uom_id: v === 'none' ? null : v, purchase_uom_symbol: u?.symbol || null })); }}>
                      <SelectTrigger><SelectValue placeholder="Same as primary..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Same as Primary —</SelectItem>
                        {uoms.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Secondary UOM</Label>
                    <Select value={form.secondary_uom_id || 'none'}
                      onValueChange={v => { const u = uoms.find((x: any) => x.id === v);
                        setForm(f => ({ ...f, secondary_uom_id: v === 'none' ? null : v, secondary_uom_symbol: u?.symbol || null })); }}>
                      <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {uoms.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.secondary_uom_id && (
                    <div className="space-y-1.5">
                      <Label>1 {form.secondary_uom_symbol} = ? {form.primary_uom_symbol}</Label>
                      <Input type="number" min="0" step="0.001" placeholder="e.g. 12 (1 Box = 12 pcs)"
                        value={form.secondary_conversion_factor || ''}
                        onChange={e => setForm(f => ({ ...f, secondary_conversion_factor: parseFloat(e.target.value) || null }))} />
                    </div>
                  )}
                </div>
                {form.secondary_uom_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tertiary UOM</Label>
                      <Select value={form.tertiary_uom_id || 'none'}
                        onValueChange={v => { const u = uoms.find((x: any) => x.id === v);
                          setForm(f => ({ ...f, tertiary_uom_id: v === 'none' ? null : v, tertiary_uom_symbol: u?.symbol || null })); }}>
                        <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— None —</SelectItem>
                          {uoms.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.tertiary_uom_id && (
                      <div className="space-y-1.5">
                        <Label>1 {form.tertiary_uom_symbol} = ? {form.secondary_uom_symbol}</Label>
                        <Input type="number" min="0" step="0.001" placeholder="e.g. 10 (1 Carton = 10 Boxes)"
                          value={form.tertiary_conversion_factor || ''}
                          onChange={e => setForm(f => ({ ...f, tertiary_conversion_factor: parseFloat(e.target.value) || null }))} />
                      </div>
                    )}
                  </div>
                )}
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Weight & Dimensions</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Net Weight / unit</Label>
                    <Input type="number" min="0" step="0.001" value={form.net_weight || ''}
                      onChange={e => setForm(f => ({ ...f, net_weight: parseFloat(e.target.value) || null }))} /></div>
                  <div className="space-y-1.5"><Label>Gross Weight / unit</Label>
                    <Input type="number" min="0" step="0.001" value={form.gross_weight || ''}
                      onChange={e => setForm(f => ({ ...f, gross_weight: parseFloat(e.target.value) || null }))} /></div>
                  <div className="space-y-1.5"><Label>Weight Unit</Label>
                    <Select value={form.weight_unit || 'kg'} onValueChange={v => setForm(f => ({ ...f, weight_unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['kg', 'g', 'MT', 'lb'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {['length', 'width', 'height'].map(d => (
                    <div key={d} className="space-y-1.5"><Label>{d.charAt(0).toUpperCase() + d.slice(1)}</Label>
                      <Input type="number" min="0" value={(form as any)[d] || ''}
                        onChange={e => setForm(f => ({ ...f, [d]: parseFloat(e.target.value) || null }))} /></div>
                  ))}
                  <div className="space-y-1.5"><Label>Dim. Unit</Label>
                    <Select value={form.dimension_unit || 'cm'} onValueChange={v => setForm(f => ({ ...f, dimension_unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['cm', 'inch', 'mm'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Packing Levels</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setPackings(p => [...p, { id: `pk-${Date.now()}`, item_id: '', level: 'primary' as const,
                      barcode: null, barcode_type: 'EAN13' as const, length: null, width: null, height: null,
                      dimension_unit: 'cm' as const, net_weight: null, gross_weight: null, weight_unit: 'kg' as const,
                      units_per_pack: null, packs_per_carton: null, cartons_per_pallet: null, pallet_gross_weight: null,
                      created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])}>
                    <Plus className="h-3.5 w-3.5" />Add Packing Level
                  </Button>
                </div>
                {packings.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
                    No packing levels defined. Add Primary, Inner, and Master carton levels.
                  </div>
                ) : packings.map((pk, i) => (
                  <div key={pk.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Select value={pk.level} onValueChange={v => setPackings(a => a.map((x, j) => j === i ? { ...x, level: v as any } : x))}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary Pack</SelectItem>
                          <SelectItem value="inner">Inner Pack</SelectItem>
                          <SelectItem value="master">Master Carton</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setPackings(a => a.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input className="h-7 text-xs" placeholder="Barcode" value={pk.barcode || ''}
                        onChange={e => setPackings(a => a.map((x, j) => j === i ? { ...x, barcode: e.target.value || null } : x))} />
                      <Select value={pk.barcode_type || 'EAN13'}
                        onValueChange={v => setPackings(a => a.map((x, j) => j === i ? { ...x, barcode_type: v as any } : x))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{['EAN13', 'QR', 'Code128', 'ITF14', 'EAN8'].map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="h-7 text-xs" type="number" placeholder="Units in pack"
                        value={pk.units_per_pack || ''}
                        onChange={e => setPackings(a => a.map((x, j) => j === i ? { ...x, units_per_pack: parseFloat(e.target.value) || null } : x))} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['length', 'width', 'height'].map(d => (
                        <Input key={d} className="h-7 text-xs" type="number" placeholder={d}
                          value={(pk as any)[d] || ''}
                          onChange={e => setPackings(a => a.map((x, j) => j === i ? { ...x, [d]: parseFloat(e.target.value) || null } : x))} />
                      ))}
                      <Select value={pk.dimension_unit}
                        onValueChange={v => setPackings(a => a.map((x, j) => j === i ? { ...x, dimension_unit: v as any } : x))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="cm">cm</SelectItem><SelectItem value="inch">inch</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB 5: TAX & COMPLIANCE ── */}
            {tab === 5 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>HSN / SAC Code <span className="text-destructive">*</span></Label>
                  <Input placeholder="Type 4+ digits to search e.g. 7216, 3004, 8528..."
                    value={form.hsn_sac_code || ''}
                    onChange={e => setForm(f => ({ ...f, hsn_sac_code: e.target.value || null, hsn_description: null, igst_rate: null, cgst_rate: null, sgst_rate: null }))} />
                  {form.hsn_sac_code && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <span className="text-xs font-mono text-primary font-semibold">{form.hsn_sac_code}</span>
                      {form.hsn_description && <span className="text-xs text-muted-foreground">— {form.hsn_description}</span>}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">[JWT] GET /api/compliance/hsn/search?q= → returns codes with descriptions + GST rates. On select: auto-fills IGST/CGST/SGST.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tax Category</Label>
                    <Select value={form.tax_category} onValueChange={v => setForm(f => ({ ...f, tax_category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TAX_CATS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Supply Type</Label>
                    <Select value={form.supply_type} onValueChange={v => setForm(f => ({ ...f, supply_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUPPLY_T.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {form.tax_category === 'Regular' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>IGST Rate (%)</Label>
                      <Select value={String(form.igst_rate ?? '')} onValueChange={v => {
                        const r = parseFloat(v);
                        setForm(f => ({ ...f, igst_rate: r, cgst_rate: r / 2, sgst_rate: r / 2 }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>CGST (%)</Label>
                      <Input readOnly value={form.cgst_rate ?? ''} className="bg-muted" />
                      <p className="text-[10px] text-muted-foreground">Auto = IGST ÷ 2</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>SGST / UTGST (%)</Label>
                      <Input readOnly value={form.sgst_rate ?? ''} className="bg-muted" />
                      <p className="text-[10px] text-muted-foreground">Auto = IGST ÷ 2</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cess Rate (%)</Label>
                    <Input type="number" min="0" step="0.01" value={form.cess_rate || ''}
                      onChange={e => setForm(f => ({ ...f, cess_rate: parseFloat(e.target.value) || null }))}
                      placeholder="e.g. 12 for aerated beverages" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cess Valuation Type</Label>
                    <Select value={form.cess_valuation_type || 'none'}
                      onValueChange={v => setForm(f => ({ ...f, cess_valuation_type: v === 'none' ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Not applicable" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Applicable</SelectItem>
                        <SelectItem value="ad_valorem">Ad Valorem (% of value)</SelectItem>
                        <SelectItem value="specific">Specific (Rs. per unit)</SelectItem>
                        <SelectItem value="compound">Compound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { f: 'itc_eligible', l: 'ITC Eligible', d: 'GST on purchase claimable as Input Tax Credit' },
                    { f: 'rcm_applicable', l: 'RCM Applicable', d: 'Reverse Charge — buyer pays GST directly' },
                    { f: 'tcs_applicable', l: 'TCS (Sec 206C)', d: 'Tax Collected at Source on sale' },
                    { f: 'tds_applicable', l: 'TDS (Sec 194Q)', d: 'Tax Deducted at Source on purchase' },
                  ] as const).map(({ f, l, d }) => (
                    <label key={f} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                      <Switch checked={(form as any)[f]} onCheckedChange={v => setForm(ff => ({ ...ff, [f]: v }))} />
                      <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                    </label>
                  ))}
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regulatory</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>MRP (Rs.) — if applicable</Label>
                    <Input type="number" min="0" step="0.01" value={form.mrp || ''} placeholder="Maximum Retail Price"
                      onChange={e => setForm(f => ({ ...f, mrp: parseFloat(e.target.value) || null }))} />
                    <p className="text-[10px] text-muted-foreground">Mandatory for FMCG, pharma, packaged goods</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>FSSAI License No.</Label>
                    <Input placeholder="For food items" value={form.fssai_license || ''}
                      onChange={e => setForm(f => ({ ...f, fssai_license: e.target.value || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Drug License No.</Label>
                    <Input placeholder="For pharma items" value={form.drug_license || ''}
                      onChange={e => setForm(f => ({ ...f, drug_license: e.target.value || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>EPR Registration No.</Label>
                    <Input placeholder="Extended Producer Responsibility" value={form.epr_registration || ''}
                      onChange={e => setForm(f => ({ ...f, epr_registration: e.target.value || null }))} />
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: INVENTORY & OPENING STOCK ── */}
            {tab === 6 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Costing Method</Label>
                    <Select value={form.costing_method} onValueChange={v => setForm(f => ({ ...f, costing_method: v as CostingMethodItem, costing_override: true }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COSTING_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {form.costing_override && (
                      <button className="text-[10px] text-primary underline" onClick={() => setForm(f => ({ ...f, costing_override: false }))}>Reset to group default</button>
                    )}
                    {!form.costing_override && form.stock_group_name && (
                      <p className="text-[10px] text-muted-foreground">Inherited from {form.stock_group_name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Purchase Ledger</Label>
                    <Input placeholder="Auto-link for purchase vouchers" value={form.purchase_ledger_id || ''} onChange={e => setForm(f => ({ ...f, purchase_ledger_id: e.target.value || null }))} />
                    <p className="text-[10px] text-muted-foreground">[JWT] Linked to Ledger Master</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Sales Ledger</Label>
                  <Input placeholder="Auto-link for sales vouchers" value={form.sales_ledger_id || ''} onChange={e => setForm(f => ({ ...f, sales_ledger_id: e.target.value || null }))} />
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Planning</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { f: 'reorder_level', l: 'Reorder Level', d: 'Trigger reorder when stock falls to' },
                    { f: 'reorder_qty', l: 'Reorder Qty', d: 'Standard qty to order' },
                    { f: 'moq', l: 'Min Order Qty', d: 'Minimum from supplier (MOQ)' },
                    { f: 'lead_time_days', l: 'Lead Time (days)', d: 'Days from PO to receipt' },
                    { f: 'safety_stock', l: 'Safety Stock', d: 'Buffer stock to maintain' },
                    { f: 'max_stock_level', l: 'Max Stock', d: 'Maximum stock to hold' },
                  ] as const).map(({ f, l, d }) => (
                    <div key={f} className="space-y-1.5">
                      <Label>{l}</Label>
                      <Input type="number" min="0" value={(form as any)[f] || ''} onChange={e => setForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) || null }))} />
                      <p className="text-[10px] text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Opening Stock</p>
                    <p className="text-xs text-muted-foreground">Godown-wise opening balance as of opening date</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOs(s => [...s, {
                    id: `os-${Date.now()}`, item_id: '',
                    godown_id: godowns[0]?.id || 'default', godown_name: godowns[0]?.name || 'Default',
                    batch_number: form.batch_tracking ? '' : undefined,
                    mfg_date: null, expiry_date: null,
                    serial_number: form.serial_tracking ? '' : undefined,
                    quantity: 0, rate: 0, value: 0,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
                  } as ItemOpeningStockEntry])}>
                    <Plus className="h-3.5 w-3.5" />Add Entry
                  </Button>
                </div>
                {os.length > 0 ? (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Godown</TableHead>
                          {form.batch_tracking && <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Batch No</TableHead>}
                          {form.serial_tracking && <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Serial No</TableHead>}
                          <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Qty</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Rate (Rs.)</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider py-2">Value (Rs.)</TableHead>
                          <TableHead className="py-2"></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {os.map((entry, i) => (
                            <TableRow key={entry.id}>
                              <TableCell className="py-1.5">
                                <Select value={entry.godown_id}
                                  onValueChange={v => { const g = godowns.find((x: any) => x.id === v);
                                    setOs(a => a.map((x, j) => j === i ? { ...x, godown_id: v, godown_name: g?.name } : x)); }}>
                                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {godowns.length > 0
                                      ? godowns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)
                                      : <SelectItem value="default">Default Godown</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              {form.batch_tracking && (
                                <TableCell className="py-1.5">
                                  <Input className="h-7 text-xs w-24" placeholder="Batch No" value={entry.batch_number || ''}
                                    onChange={e => setOs(a => a.map((x, j) => j === i ? { ...x, batch_number: e.target.value } : x))} />
                                </TableCell>
                              )}
                              {form.serial_tracking && (
                                <TableCell className="py-1.5">
                                  <Input className="h-7 text-xs w-28" placeholder="Serial No" value={entry.serial_number || ''}
                                    onChange={e => setOs(a => a.map((x, j) => j === i ? { ...x, serial_number: e.target.value } : x))} />
                                </TableCell>
                              )}
                              <TableCell className="py-1.5">
                                <Input className="h-7 text-xs w-20" type="number" min="0" value={entry.quantity}
                                  onChange={e => { const q = parseFloat(e.target.value) || 0;
                                    setOs(a => a.map((x, j) => j === i ? { ...x, quantity: q, value: q * x.rate } : x)); }} />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Input className="h-7 text-xs w-24" type="number" min="0" step="0.01" value={entry.rate}
                                  onChange={e => { const r = parseFloat(e.target.value) || 0;
                                    setOs(a => a.map((x, j) => j === i ? { ...x, rate: r, value: x.quantity * r } : x)); }} />
                              </TableCell>
                              <TableCell className="py-1.5 text-xs font-mono">
                                Rs.{entry.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => setOs(a => a.filter((_, j) => j !== i))}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end gap-6 text-xs text-muted-foreground px-1">
                      <span>Total Qty: <strong>{os.reduce((s, o) => s + o.quantity, 0).toLocaleString()}</strong></span>
                      <span>Total Value: <strong>Rs.{os.reduce((s, o) => s + o.value, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
                    No opening stock entries. Click Add Entry to enter godown-wise opening balance.
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 7: QUALITY, TRACKING & VENDOR ── */}
            {tab === 7 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracking (Override from Group)</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { tf: 'batch_tracking', l: 'Batch Tracking', d: 'Track by batch / lot number' },
                    { tf: 'serial_tracking', l: 'Serial Tracking', d: 'Track individual serial numbers' },
                    { tf: 'expiry_tracking', l: 'Expiry Tracking', d: 'Mandatory expiry date on every inward' },
                    { tf: 'qc_hold_on_receipt', l: 'QC Hold on Receipt', d: 'Hold in QC location before main godown' },
                  ] as const).map(({ tf, l, d }) => (
                    <label key={tf} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                      <Switch checked={(form as any)[tf]} onCheckedChange={v => setForm(f => ({ ...f, [tf]: v }))} />
                      <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                    </label>
                  ))}
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warranty & Service</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Warranty Period</Label>
                    <Input type="number" min="0" value={form.warranty_period || ''}
                      onChange={e => setForm(f => ({ ...f, warranty_period: parseInt(e.target.value) || null }))} /></div>
                  <div className="space-y-1.5"><Label>Unit</Label>
                    <Select value={form.warranty_unit || 'Months'} onValueChange={v => setForm(f => ({ ...f, warranty_unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WTY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="space-y-1.5"><Label>Warranty Type</Label>
                    <Select value={form.warranty_type || 'Standard'} onValueChange={v => setForm(f => ({ ...f, warranty_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                    <Switch checked={form.service_required} onCheckedChange={v => setForm(f => ({ ...f, service_required: v }))} />
                    <p className="text-sm font-medium">Service Required</p>
                  </label>
                  {form.service_required && (
                    <div className="space-y-1.5"><Label>Service Interval (days)</Label>
                      <Input type="number" min="0" value={form.service_interval || ''}
                        onChange={e => setForm(f => ({ ...f, service_interval: parseInt(e.target.value) || null }))} /></div>
                  )}
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                    <Switch checked={form.amc_applicable} onCheckedChange={v => setForm(f => ({ ...f, amc_applicable: v }))} />
                    <p className="text-sm font-medium">AMC Applicable</p>
                  </label>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QC Parameters</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setQcParams(p => [...p, { id: `qc-${Date.now()}`, item_id: '', sl_no: p.length + 1,
                      specification: '', standard: null, test_method: null, frequency: 'Every Lot',
                      is_critical: false, party_specific: false, party_id: null, party_name: null,
                      created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])}>
                    <Plus className="h-3.5 w-3.5" />Add QC Parameter
                  </Button>
                </div>
                {qcParams.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                        {['#', 'Specification', 'Standard', 'Method', 'Frequency', 'Critical', ''].map(h => (
                          <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider py-2">{h}</TableHead>
                        ))}
                      </TableRow></TableHeader>
                      <TableBody>
                        {qcParams.map((qc, i) => (
                          <TableRow key={qc.id}>
                            <TableCell className="py-1.5 text-xs text-muted-foreground w-6">{qc.sl_no}</TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs" placeholder="e.g. Hardness" value={qc.specification}
                                onChange={e => setQcParams(a => a.map((x, j) => j === i ? { ...x, specification: e.target.value } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-20" placeholder="IS/ISO" value={qc.standard || ''}
                                onChange={e => setQcParams(a => a.map((x, j) => j === i ? { ...x, standard: e.target.value || null } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Input className="h-7 text-xs w-20" placeholder="Method" value={qc.test_method || ''}
                                onChange={e => setQcParams(a => a.map((x, j) => j === i ? { ...x, test_method: e.target.value || null } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Select value={qc.frequency || 'Every Lot'}
                                onValueChange={v => setQcParams(a => a.map((x, j) => j === i ? { ...x, frequency: v } : x))}>
                                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>{QC_FREQ.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Switch checked={qc.is_critical}
                                onCheckedChange={v => setQcParams(a => a.map((x, j) => j === i ? { ...x, is_critical: v } : x))} />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setQcParams(a => a.filter((_, j) => j !== i).map((x, idx) => ({ ...x, sl_no: idx + 1 })))}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Information</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setVendors(v => [...v, { id: `v-${Date.now()}`, item_id: '', vendor_id: null,
                      vendor_name: '', vendor_item_code: null, current_rate: null, rate_valid_till: null,
                      moq: null, lead_time_days: null, avg_delivery_days: null, quality_rating: null,
                      last_rejection_percent: null, is_preferred: vendors.length === 0,
                      created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])}>
                    <Plus className="h-3.5 w-3.5" />Add Vendor
                  </Button>
                </div>
                {vendors.map((v, i) => (
                  <div key={v.id} className={`border rounded-lg p-3 space-y-2 ${v.is_preferred ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input className="h-7 text-sm font-medium w-44" placeholder="Vendor name"
                          value={v.vendor_name}
                          onChange={e => setVendors(a => a.map((x, j) => j === i ? { ...x, vendor_name: e.target.value } : x))} />
                        {v.is_preferred && <Badge className="text-xs bg-primary/10 text-primary">Preferred</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={() => setVendors(a => a.map((x, j) => ({ ...x, is_preferred: j === i })))}>
                          Set Preferred
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setVendors(a => a.filter((_, j) => j !== i))}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { f: 'vendor_item_code', ph: 'Their item code', t: 'text' },
                        { f: 'current_rate', ph: 'Rate (Rs.)', t: 'number' },
                        { f: 'lead_time_days', ph: 'Lead time (days)', t: 'number' },
                        { f: 'last_rejection_percent', ph: 'Rejection %', t: 'number' },
                      ] as const).map(({ f, ph, t }) => (
                        <Input key={f} className="h-7 text-xs" type={t} placeholder={ph}
                          value={(v as any)[f] || ''}
                          onChange={e => setVendors(a => a.map((x, j) => j === i ? { ...x, [f]: t === 'number' ? parseFloat(e.target.value) || null : e.target.value || null } : x))} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Quality:</span>
                      {([1, 2, 3, 4, 5] as const).map(s => (
                        <button key={s} type="button" onClick={() => setVendors(a => a.map((x, j) => j === i ? { ...x, quality_rating: s } : x))}>
                          <Star className={`h-4 w-4 ${(v.quality_rating || 0) >= s ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB 8: DIGITAL SHELF ── */}
            {tab === 8 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <ShoppingBag className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Centralised product content for Amazon, Flipkart, and your own website. Sync via integrations.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Product Listing Title</Label>
                  <Input placeholder="e.g. Tata Tiscon TMT Bar Fe500D 10mm | BIS Certified | 12 Metre"
                    value={form.listing_title || ''}
                    onChange={e => setForm(f => ({ ...f, listing_title: e.target.value || null }))} />
                  <div className="flex justify-between">
                    <p className="text-[10px] text-muted-foreground">Used as product title on marketplaces — keep under 200 chars</p>
                    <span className={`text-[10px] ${(form.listing_title || '').length > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {(form.listing_title || '').length}/200
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Short Description — Bullet Points ("About this item")</Label>
                  <p className="text-[10px] text-muted-foreground">Up to 5 bullets — appears as "About this item" on Amazon / Flipkart.</p>
                  <div className="space-y-2">
                    {(form.short_bullets || []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">•</span>
                        <Input className="flex-1 text-sm" value={b}
                          onChange={e => setForm(f => ({ ...f, short_bullets: (f.short_bullets || []).map((x, j) => j === i ? e.target.value : x) }))} />
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setForm(f => ({ ...f, short_bullets: (f.short_bullets || []).filter((_, j) => j !== i) }))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {(form.short_bullets || []).length < 5 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full"
                        onClick={() => setForm(f => ({ ...f, short_bullets: [...(f.short_bullets || []), ''] }))}>
                        <Plus className="h-3.5 w-3.5" />Add Bullet
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Long Description</Label>
                  <Textarea placeholder="Full HTML product description for product detail page..." rows={4}
                    value={form.long_description || ''}
                    onChange={e => setForm(f => ({ ...f, long_description: e.target.value || null }))} />
                  <p className="text-[10px] text-muted-foreground">HTML supported — used on your own e-commerce website</p>
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Images & Media</p>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground mb-1">Upload product images</p>
                  <p className="text-xs text-muted-foreground mb-3">Up to 10 images · Main image + alternate views · 1000x1000px min</p>
                  <Button size="sm" variant="outline" className="text-xs">Choose Images</Button>
                  <p className="text-[10px] text-muted-foreground mt-2">[JWT] POST /api/inventory/items/:id/images</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Video URL</Label>
                  <Input placeholder="https://youtube.com/watch?v=... or Vimeo URL"
                    value={form.video_url || ''}
                    onChange={e => setForm(f => ({ ...f, video_url: e.target.value || null }))} />
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO & Discovery</p>
                <div className="space-y-1.5">
                  <Label>Search Keywords</Label>
                  <Input placeholder="Comma-separated: tmt bar, fe500d, steel bar, 10mm rod..."
                    value={form.search_keywords || ''}
                    onChange={e => setForm(f => ({ ...f, search_keywords: e.target.value || null }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Meta Title</Label>
                    <Input placeholder="SEO title for product page"
                      value={form.meta_title || ''}
                      onChange={e => setForm(f => ({ ...f, meta_title: e.target.value || null,
                        url_slug: e.target.value ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL Slug</Label>
                    <Input placeholder="auto-generated-from-meta-title"
                      value={form.url_slug || ''}
                      onChange={e => setForm(f => ({ ...f, url_slug: e.target.value || null }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Description</Label>
                  <Textarea rows={2} placeholder="SEO meta description — 150-160 characters"
                    value={form.meta_description || ''}
                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value || null }))} />
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketplace Listing Status</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { f: 'amazon_status', l: 'Amazon', c: '#FF9900' },
                    { f: 'flipkart_status', l: 'Flipkart', c: '#2874F0' },
                    { f: 'website_status', l: 'Own Website', c: 'hsl(var(--primary))' },
                  ] as const).map(({ f, l, c }) => (
                    <div key={f} className="space-y-1.5">
                      <Label style={{ color: c }}>{l}</Label>
                      <Select value={(form as any)[f] || 'not_listed'}
                        onValueChange={v => setForm(ff => ({ ...ff, [f]: v === 'not_listed' ? null : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(MKT_S) as [string, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>In the Box / What's Included</Label>
                  <Textarea rows={2} placeholder="List what's included in the product package..."
                    value={form.in_the_box || ''}
                    onChange={e => setForm(f => ({ ...f, in_the_box: e.target.value || null }))} />
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ESG / Sustainability</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Carbon Footprint (kg CO2 / unit)</Label>
                    <Input type="number" min="0" step="0.001" value={form.carbon_footprint || ''}
                      onChange={e => setForm(f => ({ ...f, carbon_footprint: parseFloat(e.target.value) || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Recyclability (%)</Label>
                    <Input type="number" min="0" max="100" value={form.recyclability_percent || ''}
                      onChange={e => setForm(f => ({ ...f, recyclability_percent: parseFloat(e.target.value) || null }))} />
                  </div>
                </div>
              </div>
            )}

          </div>{/* end scrollable body */}

          {/* ── Dialog Footer ── */}
          <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Step {tab} of 8</span>
              {tab < 8 && <><span>·</span><span>Next: {TABS[tab]?.label}</span></>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDlgOpen(false)}>Cancel</Button>
              {tab > 1 && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setTab(t => t - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />Back
                </Button>
              )}
              <Button variant="outline" size="sm"
                onClick={() => { setForm(f => ({ ...f, status: 'draft' })); handleSave(); }}>
                Save Draft
              </Button>
              {tab < 8 ? (
                <Button size="sm" className="gap-1" onClick={() => setTab(t => t + 1)}>
                  Next<ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave}>
                  {editItem ? 'Update Item' : 'Create Item'}
                </Button>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {whereUsed && <WhereUsedPanel item={whereUsed} onClose={() => setWhereUsed(null)} />}
    </div>
  );
}

export default function ItemCraft() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><ItemCraftPanel /></main>
      </div>
    </SidebarProvider>
  );
}
