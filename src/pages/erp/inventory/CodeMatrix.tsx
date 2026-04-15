import { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hash, Plus, Edit2, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { CodeMatrixRule, BarcodeType } from '@/types/code-matrix';
import { onEnterNext } from '@/lib/keyboard';

const BARCODE_TYPES: { value: BarcodeType; label: string; desc: string }[] = [
  { value: 'EAN13', label: 'EAN-13', desc: 'Standard retail barcode (13 digits)' },
  { value: 'QR', label: 'QR Code', desc: 'High capacity 2D code' },
  { value: 'Code128', label: 'Code 128', desc: 'Alphanumeric, high density' },
  { value: 'ITF14', label: 'ITF-14', desc: 'Outer carton / master pack' },
  { value: 'EAN8', label: 'EAN-8', desc: 'Small pack (8 digits)' },
];

const APPLIES_OPTS = [
  { value: 'all', label: 'All Items (global default)' },
  { value: 'category_type', label: 'By Category Type' },
  { value: 'stock_group', label: 'By Stock Group' },
];

const CATEGORY_TYPES = ['Raw Material', 'Finished Goods', 'Semi-Finished', 'Component', 'Consumables',
  'By-Product', 'Scrap', 'Packaging Material', 'Service', 'Fixed Asset'];

const KEY = 'erp_code_matrix_rules';
const load = (): CodeMatrixRule[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

type FormState = Omit<CodeMatrixRule, 'id' | 'created_at' | 'updated_at'>;

const BLANK: FormState = {
  name: '', applies_to: 'all', applies_to_id: null, applies_to_label: null,
  prefix: '', suffix: null, separator: '-', sequence_digits: 5,
  current_sequence: 1, include_year: false, year_format: null,
  barcode_type: 'EAN13', status: 'active',
};

const genPreview = (r: FormState): string => {
  const yr = r.include_year
    ? (r.year_format === 'YYYY' ? new Date().getFullYear().toString() : String(new Date().getFullYear()).slice(-2))
    + r.separator
    : '';
  const seq = String(r.current_sequence || 1).padStart(r.sequence_digits, '0');
  return `${r.prefix}${r.separator}${yr}${seq}${r.suffix || ''}`;
};

export function CodeMatrixPanel() {
  const [rules, setRules] = useState<CodeMatrixRule[]>(load());
  // [JWT] Replace with GET /api/inventory/code-matrix
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CodeMatrixRule | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const sv = (d: CodeMatrixRule[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/code-matrix */ };

  const openC = () => { setForm(BLANK); setEdit(null); setOpen(true); };
  const openE = (r: CodeMatrixRule) => {
    setForm({
      name: r.name, applies_to: r.applies_to, applies_to_id: r.applies_to_id || null,
      applies_to_label: r.applies_to_label || null, prefix: r.prefix, suffix: r.suffix || null,
      separator: r.separator, sequence_digits: r.sequence_digits, current_sequence: r.current_sequence,
      include_year: r.include_year, year_format: r.year_format || null,
      barcode_type: r.barcode_type, status: r.status,
    });
    setEdit(r); setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.prefix.trim()) { toast.error('Name and Prefix required'); return; }
    if (edit) {
      const u = rules.map(x => x.id === edit.id ? { ...x, ...form, updated_at: new Date().toISOString() } : x);
      setRules(u); sv(u); toast.success(`${form.name} updated`);
      // [JWT] PATCH /api/inventory/code-matrix/:id
    } else {
      const nr: CodeMatrixRule = {
        ...form, id: `cm-${Date.now()}`,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const u = [nr, ...rules]; setRules(u); sv(u); toast.success(`${form.name} created`);
      // [JWT] POST /api/inventory/code-matrix
    }
    setOpen(false);
  };

  const copyPreview = (preview: string) => {
    navigator.clipboard?.writeText(preview);
    toast.success('Code format copied');
  };

  return (
    <div data-keyboard-form className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="h-6 w-6" /> Code Matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Item code generation rules — applied when items are created
          </p>
        </div>
        <Button data-primary size="sm" className="gap-1.5" onClick={openC}>
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Rules</CardDescription>
          <CardTitle className="text-2xl">{rules.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
          <CardTitle className="text-2xl text-emerald-600">{rules.filter(r => r.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Global Rules</CardDescription>
          <CardTitle className="text-2xl">{rules.filter(r => r.applies_to === 'all').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Barcode Types</CardDescription>
          <CardTitle className="text-2xl">{new Set(rules.map(r => r.barcode_type)).size}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Rule Name', 'Applies To', 'Code Preview', 'Barcode', 'Sequence', 'Status', ''].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Hash className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-foreground mb-1">No code rules yet</p>
                  <p className="text-xs mb-4">Define how item codes are generated — prefix, sequence, year</p>
     <Button data-primary size="sm" onClick={openC}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>Rule</Button>
                </TableCell></TableRow>
              ) : rules.map(r => {
                const preview = genPreview(r);
                return (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.applies_to === 'all' ? 'All Items' :
                        r.applies_to === 'category_type' ? `Category: ${r.applies_to_label || r.applies_to_id}` :
                          `Group: ${r.applies_to_label || r.applies_to_id}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{preview}</code>
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() => copyPreview(preview)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.barcode_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.sequence_digits} digits · next: {String(r.current_sequence).padStart(r.sequence_digits, '0')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(r)}>
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const u = rules.filter(x => x.id !== r.id); setRules(u); sv(u);
                          toast.success(`${r.name} deleted`);
                          // [JWT] DELETE /api/inventory/code-matrix/:id
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? `Edit: ${edit.name}` : 'New Code Rule'}</DialogTitle>
            <DialogDescription>Define the format for auto-generated item codes</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g. Default Item Code, Steel Items Code"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Applies To</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v as any, applies_to_id: null }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLIES_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.applies_to === 'category_type' && (
              <div className="space-y-1.5">
                <Label>Category Type</Label>
                <Select value={form.applies_to_id || ''} onValueChange={v => setForm(f => ({ ...f, applies_to_id: v, applies_to_label: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>{CATEGORY_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Prefix *</Label>
                <Input placeholder="ITM" value={form.prefix}
                  onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Separator</Label>
                 <Select value={form.separator || '_none'} onValueChange={v => setForm(f => ({ ...f, separator: v === '_none' ? '' : v }))}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="-">Hyphen ( - )</SelectItem>
                     <SelectItem value="/">Slash ( / )</SelectItem>
                     <SelectItem value=".">Dot ( . )</SelectItem>
                     <SelectItem value="_none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Suffix (optional)</Label>
                <Input placeholder="e.g. -IN" value={form.suffix || ''}
                  onChange={e => setForm(f => ({ ...f, suffix: e.target.value || null }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sequence Digits</Label>
                <Select value={String(form.sequence_digits)} onValueChange={v => setForm(f => ({ ...f, sequence_digits: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map(n => <SelectItem key={n} value={String(n)}>{n} digits (e.g. {String(1).padStart(n, '0')})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Sequence From</Label>
                <Input type="number" min="1" value={form.current_sequence}
                  onChange={e => setForm(f => ({ ...f, current_sequence: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
              <Switch checked={form.include_year}
                onCheckedChange={v => setForm(f => ({ ...f, include_year: v, year_format: v ? 'YY' : null }))} />
              <div>
                <p className="text-sm font-medium">Include Year in Code</p>
                <p className="text-xs text-muted-foreground">e.g. ITM-25-00001 or ITM-2025-00001</p>
              </div>
            </label>
            {form.include_year && (
              <Select value={form.year_format || 'YY'} onValueChange={v => setForm(f => ({ ...f, year_format: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YY">Short Year (25)</SelectItem>
                  <SelectItem value="YYYY">Full Year (2025)</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="space-y-1.5">
              <Label>Barcode / QR Type</Label>
              <div className="grid grid-cols-1 gap-2">
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
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Code Preview</p>
              <code className="text-base font-mono font-bold text-primary">{genPreview(form)}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit ? 'Update' : 'Create'} Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CodeMatrix() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><CodeMatrixPanel /></main>
      </div>
    </SidebarProvider>
  );
}
