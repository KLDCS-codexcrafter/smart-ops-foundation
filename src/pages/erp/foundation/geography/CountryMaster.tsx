/**
 * CountryMaster.tsx — Full CRUD + "Add from Library" picker
 * [JWT] All mutations mock. Real: POST/PATCH/DELETE /api/geography/countries
 */
import { useState, useMemo } from 'react';
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
import { Globe, Plus, Search, Edit, Trash2, Library, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { countries as worldCountries, type WorldCountry } from '@/data/world-geography';
import { useNavigate } from 'react-router-dom';
import { onEnterNext } from '@/lib/keyboard';

const COUNTRY_REGIONS = ['Asia','Middle East','Europe','Americas','Africa','Oceania','SAARC'];

interface Country {
  code: string; name: string; flag: string; dialCode: string;
  currencyCode: string; currencySymbol: string; capital: string;
  region: string; timezone: string; status: 'active' | 'inactive';
}

const EMPTY: Country = {
  code:'', name:'', flag:'', dialCode:'', currencyCode:'', currencySymbol:'',
  capital:'', region:'', timezone:'', status:'active',
};

export default function CountryMaster() {
  const navigate = useNavigate();
  const [localCountries, setLocalCountries] = useState<Country[]>(() => {
    try { return JSON.parse(localStorage.getItem('erp_geo_countries') || '[]'); } catch { return []; }
  });

  const saveCountries = (d: Country[]) => {
    localStorage.setItem('erp_geo_countries', JSON.stringify(d));
    /* [JWT] PATCH /api/geography/countries/bulk */
  };
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Country>({...EMPTY});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libSearch, setLibSearch] = useState('');

  const filtered = useMemo(() =>
    localCountries.filter(c =>
      `${c.code} ${c.name} ${c.capital}`.toLowerCase().includes(search.toLowerCase())
    ), [localCountries, search]);

  const libraryFiltered = useMemo(() => {
    const existing = new Set(localCountries.map(c => c.code));
    return worldCountries
      .filter(c => !existing.has(c.code))
      .filter(c => `${c.code} ${c.name}`.toLowerCase().includes(libSearch.toLowerCase()));
  }, [localCountries, libSearch]);

  function pickFromLibrary(wc: WorldCountry) {
    setFormData({
      code: wc.code, name: wc.name, flag: wc.flag, dialCode: wc.dialCode,
      currencyCode: wc.currencyCode, currencySymbol: wc.currencySymbol,
      capital: wc.capital, region: wc.region, timezone: wc.timezone, status: 'active',
    });
    setEditIndex(null);
    setLibraryOpen(false);
    setFormOpen(true);
  }

  function openCreate() {
    setFormData({...EMPTY});
    setEditIndex(null);
    setFormOpen(true);
  }

  function openEdit(idx: number) {
    setFormData({...localCountries[idx]});
    setEditIndex(idx);
    setFormOpen(true);
  }

  function handleSave() {
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required');
      return;
    }
    // [JWT] Replace with real POST/PATCH
    if (editIndex !== null) {
      const next = localCountries.map((c, i) => i === editIndex ? {...formData} : c);
      setLocalCountries(next); saveCountries(next);
      toast.success(`Country ${formData.code} updated`);
    } else {
      const next = [...localCountries, {...formData}];
      setLocalCountries(next); saveCountries(next);
      toast.success(`Country ${formData.code} created`);
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (deleteIndex === null) return;
    const c = localCountries[deleteIndex];
    const next = localCountries.filter((_, i) => i !== deleteIndex);
    setLocalCountries(next); saveCountries(next);
    toast.success(`Country ${c.code} deleted`);
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
            { label:'Countries' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/foundation/geography')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Country Master</h1>
              <p className="text-sm text-muted-foreground">Manage countries for your geography spine.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search countries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { setLibSearch(''); setLibraryOpen(true); }} className="gap-1.5" variant="secondary">
              <Library className="h-4 w-4" /> Add from Library
            </Button>
            <Button data-primary onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Custom Country
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Flag</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Dial Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {localCountries.length === 0
                        ? 'No countries yet. Use "Add from Library" to get started.'
                        : 'No results match your search.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((c, idx) => {
                  const realIdx = localCountries.indexOf(c);
                  return (
                    <TableRow key={c.code}>
                      <TableCell className="text-lg">{c.flag}</TableCell>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.capital}</TableCell>
                      <TableCell>{c.currencyCode} ({c.currencySymbol})</TableCell>
                      <TableCell>{c.dialCode}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'cursor-pointer select-none',
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground',
                          )}
                          title="Click to toggle status"
                          onClick={() => {
                            const next = localCountries.map((item, j) =>
                              j === realIdx ? { ...item, status: item.status === 'active' ? 'inactive' as const : 'active' as const } : item
                            );
                            setLocalCountries(next); saveCountries(next);
                            toast.success('Status updated');
                          }}
                        >
                          {c.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(realIdx)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteIndex(realIdx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Library Picker Dialog */}
        <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Country from Library</DialogTitle>
            </DialogHeader>
            <div data-keyboard-form className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search 55 countries..." value={libSearch} onChange={e => setLibSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                {libraryFiltered.map(wc => (
                  <button
                    key={wc.code}
                    onClick={() => pickFromLibrary(wc)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 text-left transition-colors"
                  >
                    <span className="text-2xl">{wc.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{wc.name}</p>
                      <p className="text-xs text-muted-foreground">{wc.code} · {wc.currencyCode} · {wc.dialCode}</p>
                    </div>
                  </button>
                ))}
              </div>
              {libraryFiltered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No matching countries found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? 'Edit Country' : 'Add Country'}</DialogTitle>
            </DialogHeader>
            <div data-keyboard-form className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={formData.code} onChange={e => setFormData(p => ({...p, code:e.target.value.toUpperCase().slice(0,3)}))} placeholder="IN" className="font-mono" maxLength={3} disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Flag</Label>
                  <Input value={formData.flag} onChange={e => setFormData(p => ({...p, flag:e.target.value}))} placeholder="🇮🇳" />
                </div>
                <div className="space-y-1">
                  <Label>Dial Code</Label>
                  <Input value={formData.dialCode} onChange={e => setFormData(p => ({...p, dialCode:e.target.value}))} placeholder="+91" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({...p, name:e.target.value}))} placeholder="India" />
              </div>
              <div className="space-y-1">
                <Label>Capital</Label>
                <Input value={formData.capital} onChange={e => setFormData(p => ({...p, capital:e.target.value}))} placeholder="New Delhi" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Currency Code</Label>
                  <Input value={formData.currencyCode} onChange={e => setFormData(p => ({...p, currencyCode:e.target.value.toUpperCase()}))} placeholder="INR" className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label>Currency Symbol</Label>
                  <Input value={formData.currencySymbol} onChange={e => setFormData(p => ({...p, currencySymbol:e.target.value}))} placeholder="₹" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Region</Label>
                  <Select value={formData.region} onValueChange={v => setFormData(p => ({...p, region:v}))}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
              <div className="space-y-1">
                <Label>Timezone</Label>
                <Input value={formData.timezone} onChange={e => setFormData(p => ({...p, timezone:e.target.value}))} placeholder="Asia/Kolkata" />
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
              <AlertDialogTitle>Delete Country</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteIndex !== null ? localCountries[deleteIndex]?.name : ''}? This action cannot be undone.
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
