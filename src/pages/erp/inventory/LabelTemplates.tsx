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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag, Plus, Search, Edit2, Trash2, Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { LabelTemplate, LabelType, LabelSize, LabelBarcodeType } from '@/types/label-template';

const KEY = 'erp_label_templates';
// [JWT] GET /api/inventory/label-templates
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const LABEL_TYPES: { value: LabelType; label: string; group: string; compliance: boolean }[] = [
  { value: 'product', label: 'Product Label', group: 'Standard', compliance: false },
  { value: 'price_tag', label: 'Price Tag', group: 'Standard', compliance: false },
  { value: 'shelf', label: 'Shelf Label', group: 'Standard', compliance: false },
  { value: 'carton', label: 'Carton / Master Pack', group: 'Standard', compliance: false },
  { value: 'pallet', label: 'Pallet Label', group: 'Standard', compliance: false },
  { value: 'serial_number', label: 'Serial Number Tag', group: 'Standard', compliance: false },
  { value: 'asset_tag', label: 'Fixed Asset Tag', group: 'Standard', compliance: false },
  { value: 'bin_location', label: 'Bin Location Label', group: 'Standard', compliance: false },
  { value: 'custody_transfer', label: 'Custody Transfer', group: 'Standard', compliance: false },
  { value: 'mrp_compliance', label: 'MRP Label (Legal Metrology)', group: 'Compliance', compliance: true },
  { value: 'fssai_compliance', label: 'FSSAI Label (Food Safety)', group: 'Compliance', compliance: true },
  { value: 'drug_compliance', label: 'Drug Label (Schedule H/X)', group: 'Compliance', compliance: true },
  { value: 'epr_compliance', label: 'EPR/Plastic Label (EPR Rules)', group: 'Compliance', compliance: true },
];

const LABEL_SIZES: { value: LabelSize; label: string }[] = [
  { value: '30x20', label: '30 × 20 mm (small item)' },
  { value: '50x25', label: '50 × 25 mm (standard roll)' },
  { value: '38x25', label: '38 × 25 mm (jewellery/pharma)' },
  { value: '100x50', label: '100 × 50 mm (product label)' },
  { value: 'A4', label: 'A4 Sheet (multi-up)' },
  { value: 'custom', label: 'Custom Size' },
];

const BARCODE_TYPES: { value: LabelBarcodeType; label: string; desc: string }[] = [
  { value: 'EAN13', label: 'EAN-13', desc: 'Standard retail (13 digits)' },
  { value: 'QR', label: 'QR Code', desc: 'High capacity 2D' },
  { value: 'Code128', label: 'Code 128', desc: 'Alphanumeric, high density' },
  { value: 'ITF14', label: 'ITF-14', desc: 'Outer carton / master pack' },
  { value: 'EAN8', label: 'EAN-8', desc: 'Small pack (8 digits)' },
  { value: 'GS1_128', label: 'GS1-128', desc: 'GTIN + Lot + Expiry in one barcode — retail chains, pharma' },
  { value: 'DataMatrix', label: 'DataMatrix', desc: '2D matrix, very small — pharma strips, instruments' },
  { value: 'DynamicQR', label: 'Dynamic QR', desc: 'URL-based QR — links to live item data page' },
];

const BLANK: Omit<LabelTemplate, 'id' | 'created_at' | 'updated_at'> = {
  name: '', label_type: 'product', size: '50x25', custom_width_mm: null, custom_height_mm: null,
  orientation: 'portrait', show_item_name: true, show_regional_name: false, show_item_code: true,
  show_barcode: true, barcode_type: 'Code128', show_mrp: false, show_hsn: false,
  show_batch_no: false, show_mfg_date: false, show_expiry_date: false, show_weight: false,
  show_uom: true, show_company_name: false, show_serial_number: false, show_fssai_number: false,
  show_drug_license: false, show_epr_registration: false, custom_fields: null,
  version: 1, is_active: true, is_compliance: false, notes: null,
};

export function LabelTemplatesPanel() {
  const [templates, setTemplates] = useState<LabelTemplate[]>(ls(KEY));
  // [JWT] GET /api/labels/templates
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);

  // [JWT] POST /api/inventory/label-templates
  const sv = (d: LabelTemplate[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/templates */ };

  const filtered = useMemo(() => templates.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.name.toLowerCase().includes(q)) && (typeFilter === 'all' || t.label_type === typeFilter);
  }), [templates, search, typeFilter]);

  const openC = () => { setForm(BLANK); setEdit(null); setOpen(true); };
  const openE = (t: LabelTemplate) => {
    setForm({
      name: t.name, label_type: t.label_type, size: t.size, custom_width_mm: t.custom_width_mm || null,
      custom_height_mm: t.custom_height_mm || null, orientation: t.orientation,
      show_item_name: t.show_item_name, show_regional_name: t.show_regional_name,
      show_item_code: t.show_item_code, show_barcode: t.show_barcode, barcode_type: t.barcode_type,
      show_mrp: t.show_mrp, show_hsn: t.show_hsn, show_batch_no: t.show_batch_no,
      show_mfg_date: t.show_mfg_date, show_expiry_date: t.show_expiry_date,
      show_weight: t.show_weight, show_uom: t.show_uom, show_company_name: t.show_company_name,
      show_serial_number: t.show_serial_number, show_fssai_number: t.show_fssai_number,
      show_drug_license: t.show_drug_license, show_epr_registration: t.show_epr_registration,
      custom_fields: t.custom_fields || null, version: t.version, is_active: t.is_active,
      is_compliance: t.is_compliance, notes: t.notes || null,
    });
    setEdit(t); setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return; }
    const now = new Date().toISOString();
    if (edit) {
      const u = templates.map(x => x.id === edit.id ? { ...x, ...form, version: (edit.version || 1) + 1, updated_at: now } : x);
      setTemplates(u); sv(u); toast.success(`${form.name} updated (v${(edit.version || 1) + 1})`);
      // [JWT] PATCH /api/labels/templates/:id
    } else {
      const nt: LabelTemplate = { ...form, id: `lt-${Date.now()}`, created_at: now, updated_at: now };
      const u = [nt, ...templates]; setTemplates(u); sv(u); toast.success(`${form.name} created`);
      // [JWT] POST /api/labels/templates
    }
    setOpen(false);
  };

  const dupTemplate = (t: LabelTemplate) => {
    const now = new Date().toISOString();
    const dup: LabelTemplate = { ...t, id: `lt-${Date.now()}`, name: `${t.name} (Copy)`, version: 1, created_at: now, updated_at: now };
    const u = [dup, ...templates]; setTemplates(u); sv(u);
    toast.success(`${t.name} duplicated`);
    // [JWT] POST /api/labels/templates
  };

  const complianceCount = templates.filter(t => t.is_compliance).length;
  const activeCount = templates.filter(t => t.is_active).length;

  return (
    <div data-keyboard-form className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" />Label Templates</h1>
          <p className="text-sm text-muted-foreground">Design and manage label layouts — standard and compliance types</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openC}><Plus className="h-4 w-4" />New Template</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Templates</CardDescription><CardTitle className="text-2xl">{templates.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="text-2xl text-emerald-600">{activeCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Compliance Types</CardDescription><CardTitle className="text-2xl text-blue-600 flex items-center gap-1">{complianceCount}<ShieldCheck className="h-4 w-4" /></CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Label Types Used</CardDescription><CardTitle className="text-2xl">{new Set(templates.map(t => t.label_type)).size}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="__standard__" disabled className="text-xs font-semibold text-muted-foreground">── Standard ──</SelectItem>
            {LABEL_TYPES.filter(t => !t.compliance).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            <SelectItem value="__compliance__" disabled className="text-xs font-semibold text-muted-foreground">── Compliance ──</SelectItem>
            {LABEL_TYPES.filter(t => t.compliance).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} templates</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Template Name', 'Type', 'Size', 'Barcode', 'Version', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No templates yet</p>
              <p className="text-xs mb-4">Create label templates for products, compliance, assets and bins</p>
              <Button size="sm" onClick={openC}><Plus className="h-4 w-4 mr-1" />New Template</Button>
            </TableCell></TableRow>
          ) : filtered.map(t => (
            <TableRow key={t.id} className="group">
              <TableCell className="font-medium text-sm">
                <div className="flex items-center gap-2">
                  {t.is_compliance && <ShieldCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />}
                  {t.name}
                </div>
                {t.notes && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{t.notes}</div>}
              </TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{LABEL_TYPES.find(x => x.value === t.label_type)?.label || t.label_type}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{LABEL_SIZES.find(x => x.value === t.size)?.label || t.size}</TableCell>
              <TableCell><Badge variant="secondary" className="text-xs font-mono">{t.barcode_type}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">v{t.version}</TableCell>
              <TableCell>
                <Badge className={`text-xs ${t.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(t)}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dupTemplate(t)}><Copy className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    const u = templates.filter(x => x.id !== t.id); setTemplates(u); sv(u);
                    toast.success(`${t.name} deleted`);
                    // [JWT] DELETE /api/labels/templates/:id
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? `Edit: ${edit.name}` : 'New Label Template'}</DialogTitle>
            <DialogDescription>Configure what appears on this label layout</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Template Name *</Label>
                <Input placeholder="e.g. Standard Product Label 50x25" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Label Type</Label>
                <Select value={form.label_type} onValueChange={v => setForm(f => ({ ...f, label_type: v as LabelType, is_compliance: LABEL_TYPES.find(t => t.value === v)?.compliance || false }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__s__" disabled className="text-xs font-semibold text-muted-foreground">── Standard ──</SelectItem>
                    {LABEL_TYPES.filter(t => !t.compliance).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    <SelectItem value="__c__" disabled className="text-xs font-semibold text-muted-foreground">── Compliance (India) ──</SelectItem>
                    {LABEL_TYPES.filter(t => t.compliance).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Label Size</Label>
                <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v as LabelSize }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LABEL_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.size === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Width (mm)</Label>
                    <Input type="number" min="10" value={form.custom_width_mm || ''}
                      onChange={e => setForm(f => ({ ...f, custom_width_mm: parseFloat(e.target.value) || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Height (mm)</Label>
                    <Input type="number" min="10" value={form.custom_height_mm || ''}
                      onChange={e => setForm(f => ({ ...f, custom_height_mm: parseFloat(e.target.value) || null }))} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Orientation</Label>
                <Select value={form.orientation} onValueChange={v => setForm(f => ({ ...f, orientation: v as 'portrait' | 'landscape' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Barcode / QR</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer">
                <Switch checked={form.show_barcode} onCheckedChange={v => setForm(f => ({ ...f, show_barcode: v }))} />
                <p className="text-sm font-medium">Include Barcode / QR on Label</p>
              </label>
              {form.show_barcode && (
                <div className="grid grid-cols-1 gap-2 pl-3">
                  {BARCODE_TYPES.map(bt => (
                    <label key={bt.value} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer ${form.barcode_type === bt.value ? 'border-primary bg-primary/5' : ''}`}>
                      <input type="radio" checked={form.barcode_type === bt.value}
                        onChange={() => setForm(f => ({ ...f, barcode_type: bt.value }))} className="accent-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{bt.label}</p>
                        <p className="text-xs text-muted-foreground">{bt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fields to Show</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { f: 'show_item_name', l: 'Item Name' },
                { f: 'show_regional_name', l: 'Regional Name (Hindi/regional script)' },
                { f: 'show_item_code', l: 'Item Code' },
                { f: 'show_mrp', l: 'MRP (₹)' },
                { f: 'show_hsn', l: 'HSN / SAC Code' },
                { f: 'show_batch_no', l: 'Batch Number' },
                { f: 'show_mfg_date', l: 'Manufacturing Date' },
                { f: 'show_expiry_date', l: 'Expiry Date' },
                { f: 'show_weight', l: 'Weight' },
                { f: 'show_uom', l: 'Unit of Measure' },
                { f: 'show_company_name', l: 'Company Name' },
                { f: 'show_serial_number', l: 'Serial Number' },
              ] as const).map(({ f, l }) => (
                <label key={f} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer">
                  <Switch checked={(form as any)[f]} onCheckedChange={v => setForm(ff => ({ ...ff, [f]: v }))} />
                  <p className="text-xs">{l}</p>
                </label>
              ))}
            </div>
            {form.is_compliance && (
              <>
                <Separator />
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />Compliance Fields
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { f: 'show_fssai_number', l: 'FSSAI License Number', show: form.label_type === 'fssai_compliance' },
                      { f: 'show_drug_license', l: 'Drug License Number', show: form.label_type === 'drug_compliance' },
                      { f: 'show_epr_registration', l: 'EPR Registration Number', show: form.label_type === 'epr_compliance' },
                    ] as const).filter(x => x.show).map(({ f, l }) => (
                      <label key={f} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer">
                        <Switch checked={(form as any)[f]} onCheckedChange={v => setForm(ff => ({ ...ff, [f]: v }))} />
                        <p className="text-xs">{l}</p>
                      </label>
                    ))}
                    {form.label_type === 'mrp_compliance' && (
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        MRP Label auto-includes: MRP (₹), Net weight, Manufacturer, Month/Year of manufacture as per Legal Metrology Act 2009.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Internal notes about this template..." value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} />
            </div>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <div><p className="text-sm font-medium">Active Template</p><p className="text-xs text-muted-foreground">Inactive templates are hidden from Barcode Generator and Print Queue</p></div>
            </label>
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

export default function LabelTemplates() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><LabelTemplatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
