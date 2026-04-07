/**
 * ProfessionalTaxMaster.tsx — Zone 3 Session 2
 * State-wise professional tax slab configuration.
 * [JWT] Replace with GET/POST/PATCH /api/payroll-statutory/professional-tax
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Pencil, Trash2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PROFESSIONAL_TAX_SLABS, type ProfessionalTaxSlab } from '@/data/payroll-statutory-seed-data';

export default function ProfessionalTaxMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ProfessionalTaxSlab[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<ProfessionalTaxSlab>>({});

  const distinctStates = useMemo(() => {
    const s = [...new Set(records.map(r => r.stateCode))].sort();
    return s.map(code => ({ code, name: records.find(r => r.stateCode === code)?.stateName ?? code }));
  }, [records]);

  const filtered = useMemo(() => {
    let f = records;
    if (stateFilter !== 'all') f = f.filter(r => r.stateCode === stateFilter);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(r => r.stateCode.toLowerCase().includes(q) || r.stateName.toLowerCase().includes(q));
    }
    return f;
  }, [records, search, stateFilter]);

  // Group by state
  const grouped = useMemo(() => {
    const map = new Map<string, ProfessionalTaxSlab[]>();
    filtered.forEach(r => {
      const key = r.stateCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    map.forEach(arr => arr.sort((a, b) => a.slabFrom - b.slabFrom));
    return map;
  }, [filtered]);

  // Stats
  const statesConfigured = new Set(records.map(r => r.stateCode)).size;
  const totalSlabs = records.length;
  const nilSlabStates = new Set(records.filter(r => r.monthlyTax === 0).map(r => r.stateCode)).size;
  const maxTax = records.length ? Math.max(...records.map(r => r.monthlyTax)) : 0;

  // Preview seed data
  const seedPreview = useMemo(() => {
    const map = new Map<string, number>();
    PROFESSIONAL_TAX_SLABS.forEach(s => map.set(s.stateName, (map.get(s.stateName) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, []);

  const handleSeed = () => {
    // [JWT] Replace with POST /api/payroll-statutory/professional-tax/seed
    setRecords(PROFESSIONAL_TAX_SLABS);
    setShowPreview(false);
    toast.success(`Loaded ${PROFESSIONAL_TAX_SLABS.length} slabs for 12 states`);
  };

  const openCreate = () => {
    setEditIndex(null);
    setForm({ genderExemption: 'none', effectiveFrom: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (idx: number) => {
    const globalIdx = records.indexOf(filtered[idx] ?? records[idx]);
    setEditIndex(globalIdx);
    setForm({ ...records[globalIdx] });
    setShowForm(true);
  };

  const handleSave = () => {
    // [JWT] Replace with POST/PATCH /api/payroll-statutory/professional-tax
    const entry: ProfessionalTaxSlab = {
      stateCode: form.stateCode ?? '',
      stateName: form.stateName ?? '',
      slabFrom: Number(form.slabFrom) || 0,
      slabTo: form.slabTo === null || form.slabTo === undefined || String(form.slabTo) === '' ? null : Number(form.slabTo),
      monthlyTax: Number(form.monthlyTax) || 0,
      annualMax: form.annualMax ? Number(form.annualMax) : null,
      genderExemption: form.genderExemption ?? 'none',
      effectiveFrom: form.effectiveFrom ?? '',
      notificationRef: form.notificationRef ?? '',
    } as ProfessionalTaxSlab;
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? entry : r));
      toast.success('Slab updated');
    } else {
      setRecords(prev => [...prev, entry]);
      toast.success('Slab added');
    }
    setShowForm(false);
  };

  const handleDelete = (globalIdx: number) => {
    // [JWT] Replace with DELETE /api/payroll-statutory/professional-tax/:id
    setRecords(prev => prev.filter((_, i) => i !== globalIdx));
    toast.success('Slab deleted');
  };

  const fmt = (n: number) => n.toLocaleString('en-IN');

  // Track a flat index for edit/delete across grouped rows
  let flatIdx = -1;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Professional Tax Rates' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Professional Tax Rates</h1>
              <p className="text-sm text-muted-foreground">State-wise salary slab configuration</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'States Configured', value: statesConfigured },
              { label: 'Total Slabs', value: totalSlabs },
              { label: 'Nil Slab States', value: nilSlabStates },
              { label: 'Max Tax (Rs)', value: fmt(maxTax) },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search state..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-9 text-sm" />
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {distinctStates.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-1" /> Load 12 States
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Slab
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Code</TableHead>
                  <TableHead>State Name</TableHead>
                  <TableHead className="text-right">Slab From (Rs)</TableHead>
                  <TableHead className="text-right">Slab To (Rs)</TableHead>
                  <TableHead className="text-right">Monthly Tax (Rs)</TableHead>
                  <TableHead className="text-right">Annual Max</TableHead>
                  <TableHead>Gender Exemption</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.size === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No slabs configured. Click "Load 12 States" to seed data.</TableCell></TableRow>
                )}
                {Array.from(grouped.entries()).map(([stateCode, slabs]) => (
                  <>
                    <TableRow key={`hdr-${stateCode}`} className="bg-indigo-500/10">
                      <TableCell colSpan={9} className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 py-2">
                        {stateCode} — {slabs[0].stateName} ({slabs.length} slabs)
                      </TableCell>
                    </TableRow>
                    {slabs.map((slab) => {
                      flatIdx++;
                      const idx = flatIdx;
                      const globalIdx = records.indexOf(slab);
                      return (
                        <TableRow key={`${stateCode}-${slab.slabFrom}`}>
                          <TableCell className="text-xs">{slab.stateCode}</TableCell>
                          <TableCell className="text-xs">{slab.stateName}</TableCell>
                          <TableCell className="text-right text-xs font-mono">₹{fmt(slab.slabFrom)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{slab.slabTo !== null ? `₹${fmt(slab.slabTo)}` : <span className="text-muted-foreground italic">No Limit</span>}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold">₹{fmt(slab.monthlyTax)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{slab.annualMax ? `₹${fmt(slab.annualMax)}` : '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {slab.genderExemption === 'none' ? 'None' : slab.genderExemption === 'female' ? 'Female Exempt' : 'All Exempt'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{slab.effectiveFrom}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(idx)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(globalIdx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Load Professional Tax — 12 States</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-auto">
              {seedPreview.map(s => (
                <div key={s.name} className="flex justify-between text-sm border-b py-1">
                  <span>{s.name}</span>
                  <Badge variant="secondary" className="text-xs">{s.count} slabs</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Total: {PROFESSIONAL_TAX_SLABS.length} slabs across {seedPreview.length} states</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
              <Button onClick={handleSeed}>
                <Download className="h-4 w-4 mr-1" /> Confirm Load
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? 'Edit Slab' : 'Add Slab'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>State Code</Label><Input value={form.stateCode ?? ''} onChange={e => setForm(p => ({ ...p, stateCode: e.target.value.toUpperCase() }))} placeholder="MH" /></div>
              <div><Label>State Name</Label><Input value={form.stateName ?? ''} onChange={e => setForm(p => ({ ...p, stateName: e.target.value }))} placeholder="Maharashtra" /></div>
              <div><Label>Slab From (Rs)</Label><Input type="number" value={form.slabFrom ?? ''} onChange={e => setForm(p => ({ ...p, slabFrom: Number(e.target.value) }))} /></div>
              <div><Label>Slab To (Rs)</Label><Input type="number" value={form.slabTo ?? ''} onChange={e => setForm(p => ({ ...p, slabTo: e.target.value ? Number(e.target.value) : null }))} placeholder="Blank = No Limit" /></div>
              <div><Label>Monthly Tax (Rs)</Label><Input type="number" value={form.monthlyTax ?? ''} onChange={e => setForm(p => ({ ...p, monthlyTax: Number(e.target.value) }))} /></div>
              <div><Label>Annual Max (Rs)</Label><Input type="number" value={form.annualMax ?? ''} onChange={e => setForm(p => ({ ...p, annualMax: e.target.value ? Number(e.target.value) : null }))} placeholder="Optional" /></div>
              <div>
                <Label>Gender Exemption</Label>
                <Select value={form.genderExemption ?? 'none'} onValueChange={v => setForm(p => ({ ...p, genderExemption: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="female">Female Exempt</SelectItem>
                    <SelectItem value="all">All Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom ?? ''} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Notification Ref</Label><Input value={form.notificationRef ?? ''} onChange={e => setForm(p => ({ ...p, notificationRef: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editIndex !== null ? 'Update' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
