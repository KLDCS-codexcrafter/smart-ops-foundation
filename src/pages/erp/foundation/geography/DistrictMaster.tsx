/**
 * DistrictMaster.tsx — Full CRUD. Cascade filter Country → State. Auto-seed per Indian state.
 * [JWT] All mutations mock. Real: POST/PATCH/DELETE /api/geography/districts
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MapPin, Plus, Search, Edit, Trash2, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { indianStates, getDistrictsByState } from '@/data/india-geography';
import { UAE_EMIRATES, UAE_DISTRICTS } from '@/data/geo-seed-data';
import { onEnterNext } from '@/lib/keyboard';

interface DistrictRecord {
  code: string; name: string; stateCode: string; countryCode: string;
  headquarters: string; status: 'active' | 'inactive';
}

const EMPTY: DistrictRecord = {
  code:'', name:'', stateCode:'', countryCode:'', headquarters:'', status:'active',
};

export default function DistrictMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<DistrictRecord[]>(() => {
    // [JWT] GET /api/geography/districts
    try { return JSON.parse(localStorage.getItem('erp_geo_districts') || '[]'); } catch { return []; }
  });
  // [JWT] POST /api/geography/districts
  const saveRecords = (d: DistrictRecord[]) => { localStorage.setItem('erp_geo_districts', JSON.stringify(d)); /* [JWT] PATCH /api/geography/districts/bulk */ };
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<DistrictRecord>({...EMPTY});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{name: string; items: {code:string;name:string;headquarters:string}[]}>({name:'',items:[]});

  const stateOptions = useMemo(() => {
    if (countryFilter === 'IN') return indianStates.map(s => ({code:s.code, name:s.name}));
    if (countryFilter === 'AE') return UAE_EMIRATES.map(e => ({code:e.code, name:e.name}));
    return [];
  }, [countryFilter]);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (countryFilter !== 'all' && r.countryCode !== countryFilter) return false;
      if (stateFilter !== 'all' && r.stateCode !== stateFilter) return false;
      return `${r.code} ${r.name} ${r.headquarters}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, countryFilter, stateFilter]);

  function autoSeedState() {
    if (stateFilter === 'all') return;
    const isIndia = countryFilter === 'IN';
    const isUAE = countryFilter === 'AE';
    let items: {code:string;name:string;headquarters:string}[] = [];
    let stateName = stateFilter;

    if (isIndia) {
      const dists = getDistrictsByState(stateFilter);
      items = dists.map(d => ({code:d.code, name:d.name, headquarters:d.headquarters}));
      stateName = indianStates.find(s => s.code === stateFilter)?.name ?? stateFilter;
    } else if (isUAE) {
      items = UAE_DISTRICTS.filter(d => d.stateCode === stateFilter).map(d => ({code:d.code, name:d.name, headquarters:d.headquarters}));
      stateName = UAE_EMIRATES.find(e => e.code === stateFilter)?.name ?? stateFilter;
    }

    if (items.length === 0) {
      toast.error(`No districts/areas found for ${stateName}`);
      return;
    }
    setPreviewData({name: stateName, items});
    setPreviewOpen(true);
  }

  function confirmSeed() {
    const country = countryFilter !== 'all' ? countryFilter : 'IN';
    const newRecs: DistrictRecord[] = previewData.items.map(d => ({
      code: d.code, name: d.name, stateCode: stateFilter,
      countryCode: country, headquarters: d.headquarters, status: 'active',
    }));
    const next = [...records, ...newRecs.filter(n => !records.some(p => p.code === n.code))];
    setRecords(next); saveRecords(next);
    toast.success(`Seeded ${newRecs.length} districts for ${previewData.name}`);
    setPreviewOpen(false);
  }

  function openCreate() {
    setFormData({...EMPTY, countryCode: countryFilter !== 'all' ? countryFilter : '', stateCode: stateFilter !== 'all' ? stateFilter : ''});
    setEditIndex(null);
    setFormOpen(true);
  }

  function openEdit(idx: number) {
    setFormData({...records[idx]});
    setEditIndex(idx);
    setFormOpen(true);
  }

  function handleSave() {
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required');
      return;
    }
    if (editIndex !== null) {
      const next = records.map((r, i) => i === editIndex ? {...formData} : r);
      setRecords(next); saveRecords(next);
      toast.success(`District ${formData.code} updated`);
    } else {
      const fd = {...formData};
      if (!fd.code && fd.stateCode && fd.name) {
        fd.code = `${fd.stateCode}-${fd.name.slice(0,3).toUpperCase()}`;
      }
      const next = [...records, fd];
      setRecords(next); saveRecords(next);
      toast.success(`District ${fd.code} created`);
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (deleteIndex === null) return;
    const r = records[deleteIndex];
    const next = records.filter((_, i) => i !== deleteIndex);
    setRecords(next); saveRecords(next);
    toast.success(`District ${r.code} deleted`);
    setDeleteIndex(null);
  }

  const canAutoSeed = stateFilter !== 'all' && (countryFilter === 'IN' || countryFilter === 'AE');
  const selectedStateName = stateOptions.find(s => s.code === stateFilter)?.name ?? stateFilter;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label:'Operix Core', href:'/erp/dashboard' },
            { label:'Command Center', href:'/erp/command-center' },
            { label:'Foundation' },
            { label:'Geography', href:'/erp/foundation/geography' },
            { label:'Districts' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/foundation/geography')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">District / Area Master</h1>
              <p className="text-sm text-muted-foreground">Districts, business areas, and free zones.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setStateFilter('all'); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
                <SelectItem value="AE">🇦🇪 UAE</SelectItem>
              </SelectContent>
            </Select>
            {countryFilter !== 'all' && (
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All States" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {stateOptions.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search districts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            {canAutoSeed && (
              <Button variant="outline" className="gap-1.5" onClick={autoSeedState}>
                <Zap className="h-4 w-4" /> Auto-Create {selectedStateName} {countryFilter === 'AE' ? 'Areas' : 'Districts'}
              </Button>
            )}
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add District
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Headquarters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No districts found. Select a state and use auto-seed, or add manually.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => {
                  const realIdx = records.indexOf(r);
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.stateCode}</TableCell>
                      <TableCell>{r.countryCode}</TableCell>
                      <TableCell>{r.headquarters || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'cursor-pointer select-none',
                          r.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground',
                        )}
                          title="Click to toggle status"
                          onClick={() => {
                            const next = records.map((item, j) =>
                              j === realIdx ? { ...item, status: item.status === 'active' ? 'inactive' as const : 'active' as const } : item
                            );
                            setRecords(next); saveRecords(next);
                            toast.success('Status updated');
                          }}
                        >
                          {r.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(realIdx)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteIndex(realIdx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview: {previewData.items.length} {countryFilter === 'AE' ? 'Areas' : 'Districts'} for {previewData.name}</DialogTitle>
            </DialogHeader>
            <div data-keyboard-form className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {previewData.items.map(d => (
                <div key={d.code} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <span className="font-mono text-xs w-24">{d.code}</span>
                  <span className="flex-1">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{d.headquarters}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
              <Button onClick={confirmSeed}>Confirm & Seed</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? 'Edit District' : 'Add District'}</DialogTitle>
            </DialogHeader>
            <div data-keyboard-form className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={formData.code} onChange={e => setFormData(p => ({...p, code:e.target.value.toUpperCase()}))} placeholder="MH-MUM" className="font-mono" disabled={editIndex !== null} />
                  <p className="text-xs text-muted-foreground">Auto-generated: STATE-3CHAR</p>
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Select value={formData.countryCode} onValueChange={v => setFormData(p => ({...p, countryCode:v}))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Select value={formData.stateCode} onValueChange={v => setFormData(p => ({...p, stateCode:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {(formData.countryCode === 'IN' ? indianStates.map(s => ({code:s.code,name:s.name})) : formData.countryCode === 'AE' ? UAE_EMIRATES.map(e => ({code:e.code,name:e.name})) : []).map(s =>
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({...p, name:e.target.value}))} placeholder="Mumbai City" />
              </div>
              <div className="space-y-1">
                <Label>Headquarters</Label>
                <Input value={formData.headquarters} onChange={e => setFormData(p => ({...p, headquarters:e.target.value}))} placeholder="Mumbai" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({...p, status:v as 'active'|'inactive'}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button data-primary onClick={handleSave}>{editIndex !== null ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteIndex !== null} onOpenChange={o => { if (!o) setDeleteIndex(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete District</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteIndex !== null ? records[deleteIndex]?.name : ''}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
