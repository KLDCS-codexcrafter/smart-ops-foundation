import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutTemplate, Plus, Search, Edit2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { ItemTemplateA3 } from '@/types/item-template-a3';
import { onEnterNext } from '@/lib/keyboard';

const KEY = 'erp_item_templates_a3';
// [JWT] GET /api/inventory/item-templates
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const INDUSTRIES = ['All', 'Manufacturing', 'Pharma', 'Electronics', 'FMCG', 'Steel & Metals', 'Services'];

// ── 12 System Templates ──────────────────────────────────────────────────────
const SYSTEM_TEMPLATES: ItemTemplateA3[] = [
  { id: 'sys-01', name: 'Raw Material — Steel', description: 'MS/SS/GI steel products with batch tracking', industry: 'Steel & Metals', icon: '🏗️', color: '#64748B', item_type: 'Raw Material', category_type: 'Raw Material', primary_uom_symbol: 'kg', costing_method: 'weighted_avg', hsn_sac_code: '7216', tax_category: 'Regular', igst_rate: 18, batch_tracking: true, serial_tracking: false, expiry_tracking: false, reorder_level: 500, moq: 100, lead_time_days: 7, tags: ['steel', 'metal', 'raw material'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-02', name: 'Pharma Tablet / Capsule', description: 'Pharmaceutical oral solids with batch + expiry', industry: 'Pharma', icon: '💊', color: '#0EA5E9', item_type: 'Finished Goods', category_type: 'Finished Goods', primary_uom_symbol: 'Strip', costing_method: 'fifo_annual', hsn_sac_code: '3004', tax_category: 'Regular', igst_rate: 12, batch_tracking: true, serial_tracking: false, expiry_tracking: true, reorder_level: 100, moq: 1000, lead_time_days: 21, tags: ['pharma', 'tablet', 'capsule', 'medicine'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-03', name: 'Electronic Component', description: 'ICs, resistors, capacitors — serial + batch tracked', industry: 'Electronics', icon: '⚡', color: '#8B5CF6', item_type: 'Component', category_type: 'Component', primary_uom_symbol: 'pcs', costing_method: 'weighted_avg', hsn_sac_code: '8542', tax_category: 'Regular', igst_rate: 18, batch_tracking: true, serial_tracking: false, expiry_tracking: false, reorder_level: 50, moq: 100, lead_time_days: 14, tags: ['electronics', 'component', 'IC', 'resistor'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-04', name: 'FMCG Packaged Food', description: 'Food items with FSSAI, MRP, expiry tracking', industry: 'FMCG', icon: '🥫', color: '#F59E0B', item_type: 'Finished Goods', category_type: 'Finished Goods', primary_uom_symbol: 'pcs', costing_method: 'fifo_perpetual', hsn_sac_code: '2106', tax_category: 'Regular', igst_rate: 12, batch_tracking: true, serial_tracking: false, expiry_tracking: true, reorder_level: 200, moq: 500, lead_time_days: 3, tags: ['FMCG', 'food', 'packaged', 'FSSAI'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-05', name: 'Finished Goods — General', description: 'General manufactured finished product', industry: 'Manufacturing', icon: '📦', color: '#10B981', item_type: 'Finished Goods', category_type: 'Finished Goods', primary_uom_symbol: 'pcs', costing_method: 'standard_cost', hsn_sac_code: null, tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: false, expiry_tracking: false, reorder_level: null, moq: null, lead_time_days: null, tags: ['finished goods', 'manufacturing'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-06', name: 'Service Item', description: 'Professional services — non-inventory, no stock tracking', industry: 'Services', icon: '⚙️', color: '#0F766E', item_type: 'Service', category_type: 'Service', primary_uom_symbol: 'Hrs', costing_method: 'zero_cost', hsn_sac_code: '9997', tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: false, expiry_tracking: false, reorder_level: null, moq: null, lead_time_days: null, tags: ['service', 'professional'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-07', name: 'Capital Equipment', description: 'Fixed assets with serial tracking and warranty', industry: 'Manufacturing', icon: '🏭', color: '#1B3A6B', item_type: 'Fixed Asset', category_type: 'Fixed Asset', primary_uom_symbol: 'pcs', costing_method: 'specific_id', hsn_sac_code: '8479', tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: true, expiry_tracking: false, reorder_level: null, moq: 1, lead_time_days: 60, tags: ['capital', 'equipment', 'fixed asset', 'machinery'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-08', name: 'Consumable / MRO', description: 'Maintenance, repair and operations items', industry: 'Manufacturing', icon: '🔧', color: '#78716C', item_type: 'Consumables', category_type: 'Consumables', primary_uom_symbol: 'pcs', costing_method: 'weighted_avg', hsn_sac_code: '3926', tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: false, expiry_tracking: false, reorder_level: 10, moq: 10, lead_time_days: 5, tags: ['consumable', 'MRO', 'maintenance'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-09', name: 'Packaging Material', description: 'Boxes, labels, pouches — inventory tracked', industry: 'Manufacturing', icon: '📑', color: '#D97706', item_type: 'Packaging Material', category_type: 'Packaging Material', primary_uom_symbol: 'pcs', costing_method: 'weighted_avg', hsn_sac_code: '4819', tax_category: 'Regular', igst_rate: 12, batch_tracking: false, serial_tracking: false, expiry_tracking: false, reorder_level: 1000, moq: 5000, lead_time_days: 7, tags: ['packaging', 'box', 'label', 'pouch'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-10', name: 'Semi-Finished / WIP', description: 'Work-in-progress items for multi-stage manufacturing', industry: 'Manufacturing', icon: '⚗️', color: '#A16207', item_type: 'Semi-Finished', category_type: 'Semi-Finished', primary_uom_symbol: 'pcs', costing_method: 'standard_cost', hsn_sac_code: null, tax_category: 'Regular', igst_rate: 18, batch_tracking: true, serial_tracking: false, expiry_tracking: false, reorder_level: null, moq: null, lead_time_days: null, tags: ['WIP', 'semi-finished', 'work in progress'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-11', name: 'IT Hardware', description: 'Computers, servers, peripherals with serial numbers', industry: 'Electronics', icon: '💻', color: '#2563EB', item_type: 'Fixed Asset', category_type: 'Fixed Asset', primary_uom_symbol: 'pcs', costing_method: 'specific_id', hsn_sac_code: '8471', tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: true, expiry_tracking: false, reorder_level: null, moq: 1, lead_time_days: 7, tags: ['IT', 'computer', 'server', 'hardware'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'sys-12', name: 'Spare Parts', description: 'Equipment spares — tracked by item code and bin location', industry: 'Manufacturing', icon: '🔩', color: '#BE123C', item_type: 'Stores & Consumables', category_type: 'Stores & Consumables', primary_uom_symbol: 'pcs', costing_method: 'weighted_avg', hsn_sac_code: '8487', tax_category: 'Regular', igst_rate: 18, batch_tracking: false, serial_tracking: false, expiry_tracking: false, reorder_level: 2, moq: 5, lead_time_days: 14, tags: ['spares', 'parts', 'maintenance'], is_system: true, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
];

const BLANK: Omit<ItemTemplateA3, 'id' | 'created_at' | 'updated_at'> = {
  name: '', description: null, industry: null, icon: '📦', color: '#1B3A6B',
  item_type: null, stock_group_id: null, stock_group_name: null, category_type: null,
  primary_uom_id: null, primary_uom_symbol: null, costing_method: null,
  hsn_sac_code: null, tax_category: null, igst_rate: null,
  batch_tracking: null, serial_tracking: null, expiry_tracking: null,
  reorder_level: null, moq: null, lead_time_days: null,
  tags: null, is_system: false, status: 'active',
};

const COSTING_METHODS = [
  { value: 'weighted_avg', label: 'Weighted Average' },
  { value: 'fifo_annual', label: 'FIFO — Annual' },
  { value: 'fifo_perpetual', label: 'FIFO — Perpetual' },
  { value: 'last_purchase', label: 'Last Purchase Price' },
  { value: 'standard_cost', label: 'Standard Cost' },
  { value: 'specific_id', label: 'Specific Identification' },
  { value: 'zero_cost', label: 'Zero Cost' },
];

const ITEM_TYPES = ['Raw Material', 'Finished Goods', 'Semi-Finished', 'Component', 'By-Product',
  'Co-Product', 'Scrap', 'Consumables', 'Stores & Consumables', 'Packaging Material', 'Service', 'Fixed Asset'];

const GST_RATES = [0, 5, 12, 18, 28];

function initTemplates(): ItemTemplateA3[] {
  const stored = ls<ItemTemplateA3>(KEY);
  if (stored.length > 0) return stored;
  // [JWT] POST /api/inventory/item-templates
  localStorage.setItem(KEY, JSON.stringify(SYSTEM_TEMPLATES)); /* [JWT] SEED /api/inventory/item-templates */
  return SYSTEM_TEMPLATES;
}

export function ItemTemplatesPanel() {
  const [templates, setTemplates] = useState<ItemTemplateA3[]>(initTemplates);
  /* [JWT] GET /api/inventory/item-templates */
  const [search, setSearch] = useState('');
  const [industryF, setIndustryF] = useState('All');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ItemTemplateA3 | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);

  // [JWT] POST /api/inventory/item-templates
  const sv = (d: ItemTemplateA3[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/item-templates */ };

  const filtered = useMemo(() => templates.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q));
    const matchI = industryF === 'All' || t.industry === industryF;
    return matchQ && matchI;
  }), [templates, search, industryF]);

  const openC = () => { setForm(BLANK); setEdit(null); setOpen(true); };
  const openE = (t: ItemTemplateA3) => {
    if (t.is_system) { toast.error('System templates cannot be edited'); return; }
    setForm({
      name: t.name, description: t.description || null, industry: t.industry || null,
      icon: t.icon || '📦', color: t.color || '#1B3A6B', item_type: t.item_type || null,
      stock_group_id: t.stock_group_id || null, stock_group_name: t.stock_group_name || null,
      category_type: t.category_type || null, primary_uom_id: t.primary_uom_id || null,
      primary_uom_symbol: t.primary_uom_symbol || null, costing_method: t.costing_method || null,
      hsn_sac_code: t.hsn_sac_code || null, tax_category: t.tax_category || null,
      igst_rate: t.igst_rate ?? null, batch_tracking: t.batch_tracking ?? null,
      serial_tracking: t.serial_tracking ?? null, expiry_tracking: t.expiry_tracking ?? null,
      reorder_level: t.reorder_level ?? null, moq: t.moq ?? null,
      lead_time_days: t.lead_time_days ?? null, tags: t.tags || null,
      is_system: false, status: t.status,
    });
    setEdit(t); setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return; }
    const now = new Date().toISOString();
    if (edit) {
      const u = templates.map(x => x.id === edit.id ? { ...x, ...form, updated_at: now } : x);
      setTemplates(u); sv(u); toast.success(`${form.name} updated`);
      /* [JWT] PATCH /api/inventory/item-templates/:id */
    } else {
      const nt: ItemTemplateA3 = { ...form, id: `tmpl-${Date.now()}`, created_at: now, updated_at: now };
      const u = [...templates, nt]; setTemplates(u); sv(u); toast.success(`${form.name} created`);
      /* [JWT] POST /api/inventory/item-templates */
    }
    setOpen(false);
  };

  const systemCount = templates.filter(t => t.is_system).length;
  const customCount = templates.filter(t => !t.is_system).length;
  const industries = [...new Set(templates.map(t => t.industry).filter(Boolean))];

  return (
    <div data-keyboard-form className="max-w-6xl mx-auto space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" /> Item Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Pre-configured item profiles — apply in Item Craft to auto-fill HSN, UOM, costing method and tracking
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openC}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Templates</CardDescription>
            <CardTitle className="text-2xl">{templates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>System</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1.5">
              {systemCount}<Lock className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custom</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{customCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Industries</CardDescription>
            <CardTitle className="text-2xl">{industries.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search + industry filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search templates..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {INDUSTRIES.map(ind => (
            <Button key={ind} size="sm" variant={industryF === ind ? 'default' : 'outline'}
              className="h-8 text-xs" onClick={() => setIndustryF(ind)}>
              {ind}
            </Button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(tmpl => (
          <Card key={tmpl.id} className="group relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: tmpl.color || '#1B3A6B' }} />
            <CardHeader className="pb-3 pl-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tmpl.icon || '📦'}</span>
                  <div>
                    <CardTitle className="text-sm font-semibold">{tmpl.name}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      {tmpl.is_system && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Lock className="h-2.5 w-2.5" />System
                        </Badge>
                      )}
                      {tmpl.industry && <Badge variant="outline" className="text-[10px]">{tmpl.industry}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!tmpl.is_system && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(tmpl)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const u = templates.filter(x => x.id !== tmpl.id); setTemplates(u); sv(u);
                        toast.success(`${tmpl.name} deleted`);
                        /* [JWT] DELETE /api/inventory/item-templates/:id */
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-5 pt-0 space-y-2">
              {tmpl.description && (
                <p className="text-xs text-muted-foreground">{tmpl.description}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {tmpl.item_type && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Type:</span>
                    <span className="text-[10px] font-medium">{tmpl.item_type}</span>
                  </div>
                )}
                {tmpl.primary_uom_symbol && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">UOM:</span>
                    <span className="text-[10px] font-medium">{tmpl.primary_uom_symbol}</span>
                  </div>
                )}
                {tmpl.hsn_sac_code && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">HSN:</span>
                    <span className="text-[10px] font-mono font-medium">{tmpl.hsn_sac_code}</span>
                  </div>
                )}
                {tmpl.igst_rate != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">GST:</span>
                    <span className="text-[10px] font-medium">{tmpl.igst_rate}%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {tmpl.batch_tracking && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Batch</span>}
                {tmpl.serial_tracking && <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">Serial</span>}
                {tmpl.expiry_tracking && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">Expiry</span>}
              </div>
              {tmpl.tags && tmpl.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tmpl.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{tag}</span>
                  ))}
                  {tmpl.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{tmpl.tags.length - 3}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <LayoutTemplate className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold text-foreground mb-1">No templates found</p>
            <p className="text-xs mb-4">Try a different search or industry filter</p>
            <Button size="sm" onClick={openC}><Plus className="h-4 w-4 mr-1" />New Template</Button>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? `Edit: ${edit.name}` : 'New Item Template'}</DialogTitle>
            <DialogDescription>Configure default values that will pre-fill Item Craft when this template is applied</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Input value={form.icon || ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="text-xl text-center" placeholder="emoji" />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Label>Template Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Steel Sheet, Pharma API, IT Server..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Brief description of what this template is for..." value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={form.industry || 'none'} onValueChange={v => setForm(f => ({ ...f, industry: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— General —</SelectItem>
                    {INDUSTRIES.filter(i => i !== 'All').map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Item Type</Label>
                <Select value={form.item_type || 'none'} onValueChange={v => setForm(f => ({ ...f, item_type: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not specified —</SelectItem>
                    {ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Values (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Primary UOM</Label>
                <Input placeholder="e.g. kg, pcs, Strip, Ltr" value={form.primary_uom_symbol || ''}
                  onChange={e => setForm(f => ({ ...f, primary_uom_symbol: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Costing Method</Label>
                <Select value={form.costing_method || 'none'} onValueChange={v => setForm(f => ({ ...f, costing_method: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not specified —</SelectItem>
                    {COSTING_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>HSN / SAC Code</Label>
                <Input placeholder="e.g. 7216" value={form.hsn_sac_code || ''}
                  onChange={e => setForm(f => ({ ...f, hsn_sac_code: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Default IGST (%)</Label>
                <Select value={String(form.igst_rate ?? 'none')} onValueChange={v => {
                  const r = parseFloat(v);
                  setForm(f => ({ ...f, igst_rate: isNaN(r) ? null : r }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not specified —</SelectItem>
                    {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { f: 'batch_tracking', l: 'Batch Tracking' },
                { f: 'serial_tracking', l: 'Serial Tracking' },
                { f: 'expiry_tracking', l: 'Expiry Tracking' },
              ] as const).map(({ f, l }) => (
                <label key={f} className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer">
                  <Switch checked={form[f] === true}
                    onCheckedChange={v => setForm(ff => ({ ...ff, [f]: v || null }))} />
                  <p className="text-xs font-medium">{l}</p>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { f: 'reorder_level', l: 'Reorder Level' },
                { f: 'moq', l: 'Min Order Qty' },
                { f: 'lead_time_days', l: 'Lead Time (days)' },
              ] as const).map(({ f, l }) => (
                <div key={f} className="space-y-1.5">
                  <Label>{l}</Label>
                  <Input type="number" min="0" value={(form as any)[f] || ''}
                    onChange={e => setForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) || null }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="e.g. steel, raw material, imported"
                value={(form.tags || []).join(', ')}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit ? 'Update' : 'Create'} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function ItemTemplates() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><ItemTemplatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
