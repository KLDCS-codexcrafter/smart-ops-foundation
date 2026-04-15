import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Search, Edit2, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { BinLabel } from '@/types/bin-label';
import { onEnterNext } from '@/lib/keyboard';

const KEY = 'erp_bin_labels';
const GKEY = 'erp_godowns';
// [JWT] GET /api/entity/storage/:key
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const LOC_TYPES = ['storage', 'inward', 'qc', 'production', 'dispatch'] as const;
const BLANK: Omit<BinLabel, 'id' | 'created_at' | 'updated_at'> = {
  godown_id: '', godown_name: '', location_code: '', aisle: null, rack: null, shelf: null, bin: null,
  location_type: 'storage', barcode_type: 'QR', label_template_id: null,
  items_assigned: null, status: 'active', printed: false, last_printed: null,
};

export function BinLocationLabelsPanel() {
  const [labels, setLabels] = useState<BinLabel[]>(ls(KEY));
  // [JWT] GET /api/labels/bin-labels
  const [godowns] = useState<any[]>(ls(GKEY));
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<BinLabel | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);

  // [JWT] PATCH /api/entity/storage/:key
  const sv = (d: BinLabel[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/bin-labels */ };

  const buildCode = (f: typeof BLANK) => [
    f.godown_name?.substring(0, 3).toUpperCase() || 'WH',
    f.aisle ? `A${f.aisle}` : '',
    f.rack ? `R${f.rack}` : '',
    f.shelf ? `S${f.shelf}` : '',
    f.bin ? `B${f.bin}` : '',
  ].filter(Boolean).join('-');

  const filtered = useMemo(() => labels.filter(l => {
    const q = search.toLowerCase();
    return !q || l.location_code.toLowerCase().includes(q) || l.godown_name.toLowerCase().includes(q);
  }), [labels, search]);

  const openC = () => { setForm(BLANK); setEdit(null); setOpen(true); };
  const openE = (l: BinLabel) => {
    setForm({
      godown_id: l.godown_id, godown_name: l.godown_name, location_code: l.location_code,
      aisle: l.aisle || null, rack: l.rack || null, shelf: l.shelf || null, bin: l.bin || null,
      location_type: l.location_type, barcode_type: l.barcode_type,
      label_template_id: l.label_template_id || null, items_assigned: l.items_assigned || null,
      status: l.status, printed: l.printed, last_printed: l.last_printed || null
    });
    setEdit(l); setOpen(true);
  };

  const handleSave = () => {
    if (!form.godown_id) { toast.error('Select a godown'); return; }
    const code = buildCode(form) || form.location_code;
    if (!code || code === (form.godown_name?.substring(0, 3).toUpperCase() || 'WH')) {
      toast.error('At least one location field required (Aisle, Rack, Shelf or Bin)'); return;
    }
    const now = new Date().toISOString();
    const finalForm = { ...form, location_code: code };
    if (edit) {
      const u = labels.map(x => x.id === edit.id ? { ...x, ...finalForm, updated_at: now } : x);
      setLabels(u); sv(u); toast.success('Bin label updated');
      // [JWT] PATCH /api/labels/bin-labels/:id
    } else {
      const nl: BinLabel = { ...finalForm, id: `bl-${Date.now()}`, created_at: now, updated_at: now };
      const u = [nl, ...labels]; setLabels(u); sv(u); toast.success(`Bin ${code} created`);
      // [JWT] POST /api/labels/bin-labels
    }
    setOpen(false);
  };

  const markPrinted = (l: BinLabel) => {
    const u = labels.map(x => x.id === l.id ? { ...x, printed: true, last_printed: new Date().toISOString(), updated_at: new Date().toISOString() } : x);
    setLabels(u); sv(u); toast.success(`${l.location_code} marked as printed`);
    // [JWT] POST /api/labels/print-jobs — create print job for this bin label
  };

  return (
    <div data-keyboard-form className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" />Bin Location Labels</h1>
          <p className="text-sm text-muted-foreground">Generate QR/barcode labels for warehouse bins, racks and shelves</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openC}><Plus className="h-4 w-4" />New Bin Label</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Bin Labels</CardDescription><CardTitle className="text-2xl">{labels.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Printed</CardDescription><CardTitle className="text-2xl text-emerald-600">{labels.filter(l => l.printed).length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pending Print</CardDescription><CardTitle className="text-2xl text-amber-600">{labels.filter(l => !l.printed).length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Godowns Covered</CardDescription><CardTitle className="text-2xl">{new Set(labels.map(l => l.godown_id)).size}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by location code or godown..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} labels</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Location Code', 'Godown', 'Type', 'Barcode', 'Printed', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No bin labels yet</p>
              <Button size="sm" className="mt-2" onClick={openC}><Plus className="h-4 w-4 mr-1" />New Bin Label</Button>
            </TableCell></TableRow>
          ) : filtered.map(l => (
            <TableRow key={l.id} className="group">
              <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{l.location_code}</code></TableCell>
              <TableCell className="text-sm">{l.godown_name}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs capitalize">{l.location_type}</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">{l.barcode_type}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.printed ? (l.last_printed?.split('T')[0] || 'Yes') : 'Pending'}</TableCell>
              <TableCell><Badge className={`text-xs ${l.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>{l.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!l.printed && <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Printed" onClick={() => markPrinted(l)}><Printer className="h-3.5 w-3.5 text-blue-600" /></Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(l)}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    const u = labels.filter(x => x.id !== l.id); setLabels(u); sv(u); toast.success('Label deleted');
                    // [JWT] DELETE /api/labels/bin-labels/:id
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Bin Label' : 'New Bin Location Label'}</DialogTitle>
            <DialogDescription>Location code auto-generates from fields below</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div className="space-y-1.5">
              <Label>Godown *</Label>
              <Select value={form.godown_id || 'none'} onValueChange={v => { const g = godowns.find((x: any) => x.id === v); setForm(f => ({ ...f, godown_id: v === 'none' ? '' : v, godown_name: g?.name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select Godown —</SelectItem>
                  {godowns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  {godowns.length === 0 && <SelectItem value="wh1">Default Warehouse</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location Type</Label>
              <Select value={form.location_type} onValueChange={v => setForm(f => ({ ...f, location_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([{ f: 'aisle', l: 'Aisle' }, { f: 'rack', l: 'Rack' }, { f: 'shelf', l: 'Shelf' }, { f: 'bin', l: 'Bin' }] as const).map(({ f, l }) => (
                <div key={f} className="space-y-1.5">
                  <Label className="text-xs">{l}</Label>
                  <Input className="h-8 text-xs" placeholder={l[0]} value={(form as any)[f] || ''}
                    onChange={e => setForm(ff => ({ ...ff, [f]: e.target.value || null }))} />
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Location Code Preview</p>
              <code className="text-sm font-mono font-bold text-primary">{buildCode(form) || 'Fill fields above'}</code>
            </div>
            <div className="space-y-1.5">
              <Label>Barcode Type</Label>
              <Select value={form.barcode_type} onValueChange={v => setForm(f => ({ ...f, barcode_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QR">QR Code</SelectItem>
                  <SelectItem value="Code128">Code 128</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit ? 'Update' : 'Create'} Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BinLocationLabels() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><BinLocationLabelsPanel /></main>
      </div>
    </SidebarProvider>
  );
}
