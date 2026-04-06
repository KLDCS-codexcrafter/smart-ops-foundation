/**
 * RegionMaster.tsx — Sales region groupings. State multi-select. Seed buttons.
 * [JWT] All mutations mock. Real: POST/PATCH/DELETE /api/geography/regions
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Layers, Plus, Search, Edit, Trash2, Zap, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { indianStates } from '@/data/india-geography';
import { UAE_EMIRATES, INDIA_REGIONS, UAE_REGIONS } from '@/data/geo-seed-data';

interface RegionRecord {
  code: string; name: string; countryCode: string;
  states: string[]; status: 'active' | 'inactive';
}

const EMPTY: RegionRecord = {
  code:'', name:'', countryCode:'', states:[], status:'active',
};

export default function RegionMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<RegionRecord[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<RegionRecord>({...EMPTY});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const filtered = useMemo(() =>
    records.filter(r =>
      `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const stateOptionsForForm = useMemo(() => {
    if (formData.countryCode === 'IN') return indianStates.map(s => ({code:s.code, name:s.name}));
    if (formData.countryCode === 'AE') return UAE_EMIRATES.map(e => ({code:e.code, name:e.name}));
    return [];
  }, [formData.countryCode]);

  function seedIndiaRegions() {
    const newRecs: RegionRecord[] = INDIA_REGIONS.map(r => ({
      code: r.code, name: r.name, countryCode: r.countryCode,
      states: r.states, status: 'active',
    }));
    setRecords(prev => [...prev, ...newRecs.filter(n => !prev.some(p => p.code === n.code))]);
    toast.success(`Seeded ${INDIA_REGIONS.length} India regions`);
  }

  function seedUAERegion() {
    const newRecs: RegionRecord[] = UAE_REGIONS.map(r => ({
      code: r.code, name: r.name, countryCode: r.countryCode,
      states: r.states, status: 'active',
    }));
    setRecords(prev => [...prev, ...newRecs.filter(n => !prev.some(p => p.code === n.code))]);
    toast.success('Seeded UAE Operations region');
  }

  function openCreate() {
    setFormData({...EMPTY});
    setEditIndex(null);
    setFormOpen(true);
  }

  function openEdit(idx: number) {
    setFormData({...records[idx], states:[...records[idx].states]});
    setEditIndex(idx);
    setFormOpen(true);
  }

  function toggleState(stateCode: string) {
    setFormData(prev => ({
      ...prev,
      states: prev.states.includes(stateCode)
        ? prev.states.filter(s => s !== stateCode)
        : [...prev.states, stateCode],
    }));
  }

  function selectAllStates() {
    setFormData(prev => ({...prev, states: stateOptionsForForm.map(s => s.code)}));
  }

  function handleSave() {
    if (!formData.code || !formData.name || !formData.countryCode) {
      toast.error('Code, Name, and Country are required');
      return;
    }
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? {...formData} : r));
      toast.success(`Region ${formData.code} updated`);
    } else {
      setRecords(prev => [...prev, {...formData}]);
      toast.success(`Region ${formData.code} created`);
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (deleteIndex === null) return;
    const r = records[deleteIndex];
    setRecords(prev => prev.filter((_, i) => i !== deleteIndex));
    toast.success(`Region ${r.code} deleted`);
    setDeleteIndex(null);
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label:'Operix Core', href:'/erp/dashboard' },
            { label:'Command Center', href:'/erp/command-center' },
            { label:'Foundation' },
            { label:'Geography', href:'/erp/foundation/geography' },
            { label:'Regions' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/foundation/geography')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Region Master</h1>
              <p className="text-sm text-muted-foreground">Sales regions for territory management and MIS roll-ups.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={seedIndiaRegions}>
              <Zap className="h-4 w-4" /> Seed India Regions ({INDIA_REGIONS.length})
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={seedUAERegion}>
              <Zap className="h-4 w-4" /> Seed UAE Region (1)
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search regions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Region
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>States</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No regions found. Use the seed buttons or add manually.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => {
                  const realIdx = records.indexOf(r);
                  const showStates = r.states.slice(0, 5);
                  const moreCount = r.states.length - 5;
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.countryCode}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {showStates.map(s => (
                            <Badge key={s} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">{s}</Badge>
                          ))}
                          {moreCount > 0 && (
                            <Badge variant="outline" className="text-xs">+{moreCount} more</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground',
                        )}>
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

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? 'Edit Region' : 'Add Region'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Region Code *</Label>
                  <Input value={formData.code} onChange={e => setFormData(p => ({...p, code:e.target.value.toUpperCase()}))} placeholder="NORTH-IN" className="font-mono" disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Country *</Label>
                  <Select value={formData.countryCode} onValueChange={v => setFormData(p => ({...p, countryCode:v, states:[]}))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Region Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({...p, name:e.target.value}))} placeholder="North India" />
              </div>

              {/* Member States multi-select */}
              {formData.countryCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Member States</Label>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllStates}>
                      Select All States for {formData.countryCode === 'IN' ? 'India' : 'UAE'}
                    </Button>
                  </div>
                  {/* Selected chips */}
                  {formData.states.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.states.map(sc => (
                        <Badge key={sc} variant="outline" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                          {sc}
                          <button onClick={() => toggleState(sc)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {stateOptionsForForm.map(s => (
                      <label key={s.code} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1 rounded">
                        <Checkbox
                          checked={formData.states.includes(s.code)}
                          onCheckedChange={() => toggleState(s.code)}
                        />
                        <span className="font-mono text-xs w-12">{s.code}</span>
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
              <Button onClick={handleSave}>{editIndex !== null ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete */}
        <AlertDialog open={deleteIndex !== null} onOpenChange={o => { if (!o) setDeleteIndex(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Region</AlertDialogTitle>
              <AlertDialogDescription>
                Delete {deleteIndex !== null ? records[deleteIndex]?.name : ''}?
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
