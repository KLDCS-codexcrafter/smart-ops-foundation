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
import { Ruler, Plus, Search, Edit2, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { UnitOfMeasure, UOMCategory, UOMType } from '@/types/uom';

const CATS: { value: UOMCategory; label: string }[] = [
  { value: 'weight', label: 'Weight / Mass' },
  { value: 'length', label: 'Length' },
  { value: 'volume', label: 'Volume' },
  { value: 'quantity', label: 'Quantity / Count' },
  { value: 'area', label: 'Area' },
  { value: 'time', label: 'Time' },
];
const TYPES: { value: UOMType; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'compound', label: 'Compound' },
  { value: 'alternate', label: 'Alternate' },
];
const KEY = 'erp_uom';
const load = (): UnitOfMeasure[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const BLK = { name: '', symbol: '', code: '', short_name: '', category: 'quantity' as UOMCategory, uom_type: 'simple' as UOMType, decimal_precision: 2, uqc_code: '', internal_notes: '' };

export function MeasureXPanel() {
  const [units, setUnits] = useState<UnitOfMeasure[]>(load()); // [JWT] GET /api/inventory/uom
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState<UOMCategory | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<UnitOfMeasure | null>(null);
  const [form, setForm] = useState(BLK);

  const sv = (d: UnitOfMeasure[]) => { localStorage.setItem(KEY, JSON.stringify(d)); // [JWT] CRUD /api/inventory/uom
  };
  const fil = useMemo(() => units.filter(u => (catF === 'all' || u.category === catF) && (u.name.toLowerCase().includes(search.toLowerCase()) || u.symbol.toLowerCase().includes(search.toLowerCase()))), [units, search, catF]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; units.forEach(u => { c[u.category] = (c[u.category] || 0) + 1; }); return c; }, [units]);

  const openC = () => { setForm(BLK); setEdit(null); setOpen(true); };
  const openE = (u: UnitOfMeasure) => {
    if (u.is_system) toast.warning('System UOM — symbol is locked');
    setForm({ name: u.name, symbol: u.symbol, code: u.code || '', short_name: u.short_name || '', category: u.category, uom_type: u.uom_type, decimal_precision: u.decimal_precision, uqc_code: u.uqc_code || '', internal_notes: u.internal_notes || '' });
    setEdit(u); setOpen(true);
  };
  const handleSave = () => {
    if (!form.name.trim() || !form.symbol.trim()) { toast.error('Name and Symbol required'); return; }
    const dup = units.find(u => (edit ? u.id !== edit.id : true) && u.symbol.toLowerCase() === form.symbol.toLowerCase());
    if (dup) { toast.error(`Symbol '${form.symbol}' already used by ${dup.name}`); return; }
    if (edit) {
      if (edit.is_system && form.symbol !== edit.symbol) { toast.error('Cannot change symbol of system UOM'); return; }
      const u = units.map(x => x.id === edit.id ? { ...x, ...form, updated_at: new Date().toISOString() } : x);
      setUnits(u); sv(u); toast.success(`${form.name} updated`); // [JWT] PATCH /api/inventory/uom/:id
    } else {
      const nu: UnitOfMeasure = { ...form, id: `uom-${Date.now()}`, is_system: false, is_active: true, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const u = [...units, nu]; setUnits(u); sv(u); toast.success(`${form.name} created`); // [JWT] POST /api/inventory/uom
    }
    setOpen(false);
  };
  const handleDel = (u: UnitOfMeasure) => {
    if (u.is_system) { toast.error('System UOM cannot be deleted'); return; }
    const d = units.filter(x => x.id !== u.id); setUnits(d); sv(d); toast.success(`${u.name} deleted`); // [JWT] DELETE /api/inventory/uom/:id
  };

  return (
    <div className='max-w-5xl mx-auto space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div><h1 className='text-2xl font-bold flex items-center gap-2'><Ruler className='h-6 w-6' />Measure X</h1>
          <p className='text-sm text-muted-foreground'>Standard UOM set auto-seeded on entity creation — prevents naming inconsistency across branches</p></div>
        <Button size='sm' className='gap-1.5' onClick={openC}><Plus className='h-4 w-4' />Add Custom UOM</Button>
      </div>
      <div className='grid grid-cols-3 md:grid-cols-6 gap-3'>
        {CATS.map((cat) => (
          <Card key={cat.value} className={`cursor-pointer transition-all ${catF === cat.value ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setCatF((f) => f === cat.value ? 'all' : cat.value)}>
            <CardHeader className='pb-2 pt-3 px-3'><CardDescription className='text-xs'>{cat.label}</CardDescription>
              <CardTitle className='text-xl'>{counts[cat.value] || 0}</CardTitle></CardHeader>
          </Card>))}
      </div>
      <div className='flex items-center gap-4'>
        <div className='relative flex-1 max-w-sm'><Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' /><Input className='pl-8 h-9' placeholder='Search UOMs...' value={search}
          onChange={e => setSearch(e.target.value)} /></div>
        {catF !== 'all' && <Badge variant='secondary' className='gap-1'>{CATS.find((c) => c.value === catF)?.label}<button
          onClick={() => setCatF('all')} className='ml-1 hover:text-destructive'>×</button></Badge>}
        <span className='text-xs text-muted-foreground ml-auto'>{fil.length} of {units.length}</span>
      </div>
      <Card><CardContent className='p-0'><Table>
        <TableHeader><TableRow className='bg-muted/40 hover:bg-muted/40'>
          {['Name', 'Symbol', 'Code', 'Category', 'Type', 'Dec', 'UQC', 'Source', ''].map(h => <TableHead key={h} className='text-xs font-semibold uppercase tracking-wider'>{h}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {fil.length === 0 ? (<TableRow><TableCell colSpan={9} className='text-center py-16 text-muted-foreground'>
            <Ruler className='h-10 w-10 mx-auto mb-3 opacity-20' />
            <p className='text-sm'>No UOMs found. Create an entity to auto-seed the standard set.</p>
          </TableCell></TableRow>) : fil.map(u => (
            <TableRow key={u.id} className='group'>
              <TableCell className='font-medium text-sm'>{u.name}</TableCell>
              <TableCell><Badge variant='secondary' className='font-mono text-xs'>{u.symbol}</Badge></TableCell>
              <TableCell className='font-mono text-xs text-muted-foreground'>{u.code || '—'}</TableCell>
              <TableCell><Badge variant='outline' className='text-xs'>{u.category}</Badge></TableCell>
              <TableCell className='text-xs text-muted-foreground'>{u.uom_type}</TableCell>
              <TableCell className='text-xs text-center text-muted-foreground'>{u.decimal_precision}</TableCell>
              <TableCell><Badge variant='secondary' className='font-mono text-xs'>{u.uqc_code || '—'}</Badge></TableCell>
              <TableCell>{u.is_system ? <div className='flex items-center gap-1 text-xs text-muted-foreground'><Lock className='h-3 w-3' />System</div> : <span className='text-xs text-blue-600'>Custom</span>}</TableCell>
              <TableCell><div className='flex gap-1 opacity-0 group-hover:opacity-100'>
                <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => openE(u)}><Edit2 className='h-3.5 w-3.5 text-muted-foreground' /></Button>
                {!u.is_system && <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => handleDel(u)}><Trash2 className='h-3.5 w-3.5 text-destructive' /></Button>}
              </div></TableCell>
            </TableRow>))}
        </TableBody></Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader><DialogTitle>{edit ? `Edit: ${edit.name}` : 'New Custom UOM'}</DialogTitle>
            <DialogDescription>{edit?.is_system ? 'System UOM — symbol locked' : 'Create a custom unit of measure'}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>Name *</Label><Input placeholder='Bundle of 50' value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className='space-y-1.5'><Label>Symbol * {edit?.is_system && <Lock className='h-3 w-3 inline ml-1' />}</Label>
                <Input placeholder='bdl50' value={form.symbol} disabled={edit?.is_system}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toLowerCase() }))} /></div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>Category</Label><Select value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v as UOMCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div className='space-y-1.5'><Label>UOM Type</Label><Select value={form.uom_type}
                onValueChange={v => setForm(f => ({ ...f, uom_type: v as UOMType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-1.5'><Label>Code</Label><Input value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
              <div className='space-y-1.5'><Label>UQC Code</Label><Input placeholder='NOS' value={form.uqc_code}
                onChange={e => setForm(f => ({ ...f, uqc_code: e.target.value.toUpperCase() }))} /></div>
              <div className='space-y-1.5'><Label>Decimals</Label><Input type='number' min={0} max={6}
                value={form.decimal_precision} onChange={e => setForm(f => ({ ...f, decimal_precision: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className='space-y-1.5'><Label>Notes</Label><Input value={form.internal_notes}
              onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant='outline' onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>{edit ? 'Update' : 'Create'} UOM</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
  );
}

export default function MeasureX() {
  return (<SidebarProvider><div className='min-h-screen flex flex-col w-full bg-background'>
    <ERPHeader /><main className='flex-1'><MeasureXPanel /></main>
  </div></SidebarProvider>);
}
