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

export function CountryMasterPanel() {
  const navigate = useNavigate();
  const [localCountries, setLocalCountries] = useState<Country[]>(() => {
    // [JWT] GET /api/geography/countries
    try { return JSON.parse(localStorage.getItem('erp_geo_countries') || '[]'); } catch { return []; }
  });

  const saveCountries = (d: Country[]) => {
    // [JWT] POST /api/geography/countries
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
    <div data-keyboard-form className="space-y-4">
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
    </div>
  );
}


export default function CountryMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col w-full bg-background">
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
        <main className="flex-1 p-6">
          <CountryMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}