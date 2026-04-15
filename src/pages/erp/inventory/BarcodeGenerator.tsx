import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QrCode, Plus, Search, Edit2, Trash2, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { BarcodeJob, BarcodeSuperType } from '@/types/barcode-job';
import type { InventoryItem } from '@/types/inventory-item';
import type { LabelTemplate } from '@/types/label-template';
import { onEnterNext } from '@/lib/keyboard';

const KEY = 'erp_barcode_jobs';
const IKEY = 'erp_inventory_items';
const LTKEY = 'erp_label_templates';
// [JWT] GET /api/inventory/barcode-jobs
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const BARCODE_TYPES: { value: BarcodeSuperType; label: string; desc: string; group: 'standard' | 'advanced' }[] = [
  { value: 'EAN13', label: 'EAN-13', desc: 'International retail — 13 digits', group: 'standard' },
  { value: 'QR', label: 'QR Code', desc: 'Compact 2-D matrix — any alphanumeric payload', group: 'standard' },
  { value: 'Code128', label: 'Code 128', desc: 'High-density alphanumeric — logistics & internal', group: 'standard' },
  { value: 'ITF14', label: 'ITF-14', desc: 'Outer carton / case-level GTIN-14', group: 'standard' },
  { value: 'EAN8', label: 'EAN-8', desc: 'Small-pack retail — 8 digits', group: 'standard' },
  { value: 'GS1_128', label: 'GS1-128', desc: 'Supply-chain with Application Identifiers (GTIN, Lot, Expiry, Serial)', group: 'advanced' },
  { value: 'DataMatrix', label: 'DataMatrix', desc: '2-D matrix for pharma, electronics — small-area printing', group: 'advanced' },
  { value: 'DynamicQR', label: 'Dynamic QR', desc: 'Redirect QR — URL can change after print', group: 'advanced' },
];

interface FormState {
  item_id: string;
  item_code: string;
  item_name: string;
  barcode_type: BarcodeSuperType;
  barcode_value: string;
  gtin: string;
  lot_number: string;
  expiry_date: string;
  serial_number: string;
  qr_url: string;
  label_template_id: string;
  label_template_name: string;
  quantity: number;
}

const BLANK: FormState = {
  item_id: '', item_code: '', item_name: '',
  barcode_type: 'EAN13', barcode_value: '',
  gtin: '', lot_number: '', expiry_date: '', serial_number: '',
  qr_url: '', label_template_id: '', label_template_name: '',
  quantity: 1,
};

export function BarcodeGeneratorPanel() {
  const [jobs, setJobs] = useState<BarcodeJob[]>(ls(KEY));
  // [JWT] GET /api/labels/barcode-jobs
  const [items] = useState<InventoryItem[]>(ls<InventoryItem>(IKEY));
  const [templates] = useState<LabelTemplate[]>(ls<LabelTemplate>(LTKEY).filter(t => t.is_active));
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BarcodeJob | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPicked, setItemPicked] = useState(false);

  // [JWT] POST /api/inventory/barcode-jobs
  const sv = (d: BarcodeJob[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/barcode-jobs */ };

  const filtered = useMemo(() => jobs.filter(j => {
    const q = search.toLowerCase();
    return (!q || j.item_name.toLowerCase().includes(q) || j.item_code.toLowerCase().includes(q) || j.barcode_type.toLowerCase().includes(q))
      && (statusF === 'all' || j.status === statusF);
  }), [jobs, search, statusF]);

  const stats = useMemo(() => ({
    total: jobs.length,
    draft: jobs.filter(j => j.status === 'draft').length,
    queued: jobs.filter(j => j.status === 'queued').length,
    printed: jobs.filter(j => j.status === 'printed').length,
  }), [jobs]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)).slice(0, 20);
  }, [items, itemSearch]);

  const pickItem = (it: InventoryItem) => {
    setForm(f => ({
      ...f, item_id: it.id, item_code: it.code, item_name: it.name,
      qr_url: `https://app.4dsmartops.com/item/${it.code}`,
    }));
    setItemPicked(true);
    setItemSearch('');
  };

  const changeItem = () => {
    setForm(f => ({ ...f, item_id: '', item_code: '', item_name: '', qr_url: '' }));
    setItemPicked(false);
  };

  const openC = () => { setForm(BLANK); setEdit(null); setItemPicked(false); setOpen(true); };
  const openE = (j: BarcodeJob) => {
    setForm({
      item_id: j.item_id, item_code: j.item_code, item_name: j.item_name,
      barcode_type: j.barcode_type, barcode_value: j.barcode_value,
      gtin: j.gtin || '', lot_number: j.lot_number || '',
      expiry_date: j.expiry_date || '', serial_number: j.serial_number || '',
      qr_url: j.qr_url || '', label_template_id: j.label_template_id || '',
      label_template_name: j.label_template_name || '', quantity: j.quantity,
    });
    setEdit(j); setItemPicked(true); setOpen(true);
  };

  const handleSave = (status: 'draft' | 'queued') => {
    if (!form.item_id) { toast.error('Select an item'); return; }
    if (form.quantity < 1) { toast.error('Quantity must be ≥ 1'); return; }
    const now = new Date().toISOString();
    if (edit) {
      const u = jobs.map(x => x.id === edit.id ? {
        ...x, ...form,
        gtin: form.gtin || null, lot_number: form.lot_number || null,
        expiry_date: form.expiry_date || null, serial_number: form.serial_number || null,
        qr_url: form.qr_url || null, label_template_id: form.label_template_id || null,
        label_template_name: form.label_template_name || null,
        status, updated_at: now,
      } : x);
      setJobs(u); sv(u);
      toast.success('Barcode job updated');
      // [JWT] PATCH /api/labels/barcode-jobs/:id
    } else {
      const nj: BarcodeJob = {
        id: `bcj-${Date.now()}`, ...form,
        gtin: form.gtin || null, lot_number: form.lot_number || null,
        expiry_date: form.expiry_date || null, serial_number: form.serial_number || null,
        qr_url: form.qr_url || null, label_template_id: form.label_template_id || null,
        label_template_name: form.label_template_name || null,
        status, created_at: now, updated_at: now,
      };
      const u = [nj, ...jobs]; setJobs(u); sv(u);
      toast.success(status === 'draft' ? 'Draft saved' : 'Added to queue');
      // [JWT] POST /api/labels/barcode-jobs
    }
    setOpen(false);
  };

  const deleteJob = (id: string) => {
    const u = jobs.filter(x => x.id !== id); setJobs(u); sv(u);
    toast.success('Job deleted');
    // [JWT] DELETE /api/labels/barcode-jobs/:id
  };

  const sendToQueue = (id: string) => {
    const now = new Date().toISOString();
    const u = jobs.map(x => x.id === id ? { ...x, status: 'queued' as const, updated_at: now } : x);
    setJobs(u); sv(u);
    toast.success('Sent to print queue');
    // [JWT] POST /api/labels/print-jobs
  };

  const statusBadge = (s: string) => {
    if (s === 'draft') return <Badge variant="outline" className="text-amber-600 border-amber-300">Draft</Badge>;
    if (s === 'queued') return <Badge variant="outline" className="text-blue-600 border-blue-300">In Queue</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-300">Printed</Badge>;
  };

  const standardTypes = BARCODE_TYPES.filter(b => b.group === 'standard');
  const advancedTypes = BARCODE_TYPES.filter(b => b.group === 'advanced');

  return (
    <div data-keyboard-form className="max-w-7xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="h-6 w-6" />Barcode Generator</h1>
        <p className="text-sm text-muted-foreground">Create barcode jobs, assign label templates, and send to the print queue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-600">Draft</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{stats.draft}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">In Queue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{stats.queued}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-600">Printed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{stats.printed}</p></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="queued">In Queue</SelectItem>
            <SelectItem value="printed">Printed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openC}><Plus className="h-4 w-4 mr-1" />New Job</Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Barcode Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Template</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No barcode jobs yet — click New Job</TableCell></TableRow>
            )}
            {filtered.map(j => (
              <TableRow key={j.id}>
                <TableCell>
                  <div className="font-medium">{j.item_name}</div>
                  <div className="text-xs text-muted-foreground">{j.item_code}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{BARCODE_TYPES.find(b => b.value === j.barcode_type)?.label || j.barcode_type}</Badge></TableCell>
                <TableCell className="text-xs font-mono max-w-[140px] truncate">{j.barcode_value || '—'}</TableCell>
                <TableCell className="text-sm">{j.label_template_name || '—'}</TableCell>
                <TableCell className="text-right">{j.quantity}</TableCell>
                <TableCell>{statusBadge(j.status)}</TableCell>
                <TableCell className="text-right space-x-1">
                  {j.status === 'draft' && (
                    <Button size="icon" variant="ghost" title="Send to Queue" onClick={() => sendToQueue(j.id)}><Send className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openE(j)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteJob(j.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Barcode Job' : 'New Barcode Job'}</DialogTitle>
            <DialogDescription>Configure barcode type, value, and print quantity</DialogDescription>
          </DialogHeader>

          <div data-keyboard-form className="space-y-5">
            {/* Item Picker */}
            <div className="space-y-2">
              <Label className="font-semibold">Item *</Label>
              {itemPicked ? (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <div className="flex-1">
                    <p className="font-medium">{form.item_name}</p>
                    <p className="text-xs text-muted-foreground">{form.item_code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={changeItem}><RefreshCw className="h-3 w-3 mr-1" />Change</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search items by name or code…" value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="pl-9" />
                  </div>
                  {filteredItems.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {filteredItems.map(it => (
                        <button key={it.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => pickItem(it)}>
                          <span className="font-medium">{it.name}</span>
                          <span className="text-muted-foreground">{it.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Barcode Type */}
            <div className="space-y-3">
              <Label className="font-semibold">Barcode Type</Label>
              <RadioGroup value={form.barcode_type} onValueChange={(v: BarcodeSuperType) => setForm(f => ({ ...f, barcode_type: v }))}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Standard</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {standardTypes.map(bt => (
                    <label key={bt.value} className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent">
                      <RadioGroupItem value={bt.value} className="mt-0.5" />
                      <div><p className="text-sm font-medium">{bt.label}</p><p className="text-xs text-muted-foreground">{bt.desc}</p></div>
                    </label>
                  ))}
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Advanced</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {advancedTypes.map(bt => (
                    <label key={bt.value} className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent">
                      <RadioGroupItem value={bt.value} className="mt-0.5" />
                      <div><p className="text-sm font-medium">{bt.label}</p><p className="text-xs text-muted-foreground">{bt.desc}</p></div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* GS1-128 AI fields */}
            {form.barcode_type === 'GS1_128' && (
              <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                <p className="text-sm font-semibold">GS1-128 Application Identifiers</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">GTIN (AI 01)</Label><Input value={form.gtin} onChange={e => setForm(f => ({ ...f, gtin: e.target.value }))} placeholder="14-digit GTIN" /></div>
                  <div><Label className="text-xs">Lot / Batch (AI 10)</Label><Input value={form.lot_number} onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="Lot number" /></div>
                  <div><Label className="text-xs">Expiry Date (AI 17)</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
                  <div><Label className="text-xs">Serial No (AI 21)</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="Serial number" /></div>
                </div>
              </div>
            )}

            {/* Dynamic QR URL preview */}
            {form.barcode_type === 'DynamicQR' && form.item_code && (
              <div className="rounded-md border p-4 bg-muted/30 space-y-1">
                <p className="text-sm font-semibold">Dynamic QR URL Preview</p>
                <p className="text-xs font-mono text-primary break-all">{`https://app.4dsmartops.com/item/${form.item_code}`}</p>
              </div>
            )}

            <Separator />

            {/* Barcode Value */}
            <div className="space-y-2">
              <Label>Barcode Value</Label>
              <Input value={form.barcode_value} onChange={e => setForm(f => ({ ...f, barcode_value: e.target.value }))} placeholder="Value to encode" />
            </div>

            {/* Label Template */}
            <div className="space-y-2">
              <Label>Label Template</Label>
              <Select value={form.label_template_id} onValueChange={v => {
                const t = templates.find(x => x.id === v);
                setForm(f => ({ ...f, label_template_id: v, label_template_name: t?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button data-primary variant="outline" onClick={() => handleSave('draft')}>Save Draft</Button>
            <Button data-primary onClick={() => handleSave('queued')}>Add to Queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BarcodeGenerator() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><BarcodeGeneratorPanel /></main>
      </div>
    </SidebarProvider>
  );
}
