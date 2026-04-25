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
import { Tags, Plus, Search, Edit2, Trash2, List, Network, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Classification } from '@/types/classification';
import type { Brand } from '@/types/brand';

const CLASS_TYPES = ['category', 'subcategory', 'group', 'class'];
const CAT_LVLS = ['L1', 'L2', 'L3'];
const MOVE_INDS = ['Normal', 'Fast', 'Slow', 'Non-moving'];
const MOVE_C: Record<string, string> = {
  Fast: 'bg-emerald-500/10 text-emerald-700',
  Slow: 'bg-amber-500/10 text-amber-700',
  'Non-moving': 'bg-red-500/10 text-red-700',
  Normal: 'bg-blue-500/10 text-blue-700',
};
const KEY = 'erp_classifications';
const BKEY = 'erp_brands';
const load = (): Classification[] => {
  // [JWT] GET /api/inventory/classifications
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
const loadB = (): Brand[] => {
  // [JWT] GET /api/inventory/classifications
  try { return JSON.parse(localStorage.getItem(BKEY) || '[]'); } catch { return []; }
};
const BLK = {
  name: '', code: '', short_name: '', description: '',
  classification_type: 'category' as const, category_level: 'L1' as const,
  parent_id: null as string | null, brand_id: null as string | null,
  sub_brand_id: null as string | null, movement_indicator: 'Normal',
  change_history_enabled: false, effective_from: '', effective_to: '',
};

export function ClassifyPanel() {
  const [items, setItems] = useState<Classification[]>(load()); // [JWT] GET /api/inventory/classifications
  const [brands] = useState<Brand[]>(loadB());
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'tree'>('table');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Classification | null>(null);
  const [form, setForm] = useState(BLK);
  const [exp, setExp] = useState<Set<string>>(new Set());

  const sv = (d: Classification[]) => {
    // [JWT] POST /api/inventory/classifications
    localStorage.setItem(KEY, JSON.stringify(d)); // [JWT] CRUD /api/inventory/classifications
  };

  const openC = () => { setForm(BLK); setEdit(null); setOpen(true); };
  const openE = (c: Classification) => {
    setForm({
      name: c.name || '', code: c.code || '', short_name: c.short_name || '',
      description: c.description || '', classification_type: c.classification_type as typeof BLK.classification_type,
      category_level: c.category_level as typeof BLK.category_level, parent_id: c.parent_id || null,
      brand_id: c.brand_id || null, sub_brand_id: c.sub_brand_id || null,
      movement_indicator: c.movement_indicator, change_history_enabled: c.change_history_enabled,
      effective_from: c.effective_from || '', effective_to: c.effective_to || '',
    });
    setEdit(c); setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const bName = brands.find(b => b.id === form.brand_id)?.name;
    if (edit) {
      const u = items.map(x => x.id === edit.id ? { ...x, ...form, brand_name: bName || null, updated_at: new Date().toISOString() } : x);
      setItems(u); sv(u); toast.success(`${form.name} updated`); // [JWT] PATCH /api/inventory/classifications/:id
    } else {
      const nc: Classification = {
        ...form, id: `cls-${Date.now()}`, brand_name: bName || null, sub_brand_name: null,
        status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const u = [...items, nc]; setItems(u); sv(u); toast.success(`${form.name} created`); // [JWT] POST /api/inventory/classifications
    }
    setOpen(false);
  };

  const handleDel = (c: Classification) => {
    if (items.some(x => x.parent_id === c.id)) { toast.error('Has children'); return; }
    const u = items.filter(x => x.id !== c.id); setItems(u); sv(u); toast.success(`${c.name} deleted`); // [JWT] DELETE /api/inventory/classifications/:id
  };

  const fil = items.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
  const roots = fil.filter(x => !x.parent_id);
  const kids = (id: string) => items.filter(x => x.parent_id === id);
  const tog = (id: string) => setExp(p => { const n = new Set(p); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const renderRow = (c: Classification, d = 0): React.ReactNode => {
    const ch = kids(c.id);
    const ie = exp.has(c.id);
    return (
      <>
        <TableRow key={c.id} className="group">
          <TableCell style={{ paddingLeft: `${d * 20 + 12}px` }}>
            <div className="flex items-center gap-1.5">
              {ch.length > 0 ? (
                <button onClick={() => tog(c.id)}>
                  {ie ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : <span className="w-3.5 inline-block" />}
              <span className="text-sm font-medium">{c.name}</span>
            </div>
          </TableCell>
          <TableCell><Badge variant="secondary" className="font-mono text-xs">{c.code || '-'}</Badge></TableCell>
          <TableCell><Badge variant="outline" className="text-xs">{c.category_level}</Badge></TableCell>
          <TableCell className="text-xs text-muted-foreground">{c.classification_type}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{c.brand_name || '-'}</TableCell>
          <TableCell>{c.movement_indicator && <Badge className={`text-xs ${MOVE_C[c.movement_indicator] || ''}`}>{c.movement_indicator}</Badge>}</TableCell>
          <TableCell><Badge className={`text-xs ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>{c.status}</Badge></TableCell>
          <TableCell>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(c)}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDel(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </TableCell>
        </TableRow>
        {ie && ch.map(k => renderRow(k, d + 1))}
      </>
    );
  };

  return (
    <div data-keyboard-form className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tags className="h-6 w-6" />Classifications</h1>
          <p className="text-sm text-muted-foreground">Analytical dimension — e.g. all 19 inch TVs across any brand or supplier</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openC}><Plus className="h-4 w-4" />Add Classification</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{items.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="text-2xl text-emerald-600">{items.filter(x => x.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>L1 Root</CardDescription><CardTitle className="text-2xl">{items.filter(x => x.category_level === 'L1').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Linked to Brand</CardDescription><CardTitle className="text-2xl">{items.filter(x => x.brand_id).length}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9 w-64" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('table')}><List className="h-4 w-4 mr-1" />Table</Button>
          <Button variant={view === 'tree' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('tree')}><Network className="h-4 w-4 mr-1" />Tree</Button>
        </div>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Name', 'Code', 'Level', 'Type', 'Brand', 'Movement', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {fil.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-16">
              <Tags className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold mb-1">No classifications yet</p>
              <p className="text-xs text-muted-foreground mb-4">Use for analytical grouping — e.g. 19 Inch TV, Premium Range</p>
              <Button size="sm" onClick={openC}><Plus className="h-4 w-4 mr-1" />Add Classification</Button>
            </TableCell></TableRow>
          ) : view === 'tree' ? roots.map(r => renderRow(r)) : fil.map(c => (
            <TableRow key={c.id} className="group">
              <TableCell className="text-sm font-medium">{c.name}</TableCell>
              <TableCell><Badge variant="secondary" className="font-mono text-xs">{c.code || '-'}</Badge></TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{c.category_level}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.classification_type}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.brand_name || '-'}</TableCell>
              <TableCell>{c.movement_indicator && <Badge className={`text-xs ${MOVE_C[c.movement_indicator] || ''}`}>{c.movement_indicator}</Badge>}</TableCell>
              <TableCell><Badge className={`text-xs ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>{c.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(c)}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDel(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? `Edit: ${edit.name}` : 'New Classification'}</DialogTitle>
            <DialogDescription>Analytical grouping – optional on items</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. 19 Inch" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Code</Label><Input placeholder="TV-19" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.classification_type} onValueChange={v => setForm(f => ({ ...f, classification_type: v as typeof f.classification_type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASS_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Level</Label>
                <Select value={form.category_level} onValueChange={v => setForm(f => ({ ...f, category_level: v as typeof f.category_level }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CAT_LVLS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Parent Classification</Label>
              <Select value={form.parent_id || 'none'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Root" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Root —</SelectItem>
                  {items.filter(x => x.id !== edit?.id).map(x => <SelectItem key={x.id} value={x.id}>{x.name} ({x.category_level})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Link to Brand (optional)</Label>
                <Select value={form.brand_id || 'none'} onValueChange={v => setForm(f => ({ ...f, brand_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Any brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Any Brand —</SelectItem>
                    {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Movement Indicator</Label>
                <Select value={form.movement_indicator} onValueChange={v => setForm(f => ({ ...f, movement_indicator: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOVE_INDS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label>
              <Input placeholder="What items belong here?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer border rounded-lg p-3">
              <Switch checked={form.change_history_enabled} onCheckedChange={v => setForm(f => ({ ...f, change_history_enabled: v }))} />
              <div>
                <p className="text-sm font-medium">Track Change History</p>
                <p className="text-xs text-muted-foreground">Audit trail when classification changes on items (pricing policy compliance)</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit ? 'Update' : 'Create'} Classification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Classify() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><ClassifyPanel /></main>
      </div>
    </SidebarProvider>
  );
}
