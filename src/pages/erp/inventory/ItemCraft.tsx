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
  CheckCircle2, Star, X, Tag, Ruler, Warehouse, ShieldCheck, ShoppingBag,
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

      {/* Dialog placeholder — full 8-tab dialog comes in INV-10b */}

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
