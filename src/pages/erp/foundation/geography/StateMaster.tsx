/**
 * StateMaster.tsx — Full CRUD with country-level filter and smart auto-seed
 * [JWT] All mutations mock. Real: POST/PATCH/DELETE /api/geography/states
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { indianStates } from '@/data/india-geography';
import { UAE_EMIRATES } from '@/data/geo-seed-data';

interface StateRecord {
  code: string; name: string; countryCode: string;
  gstStateCode: string; unionTerritory: boolean; region: string;
  status: 'active' | 'inactive';
}

const EMPTY: StateRecord = {
  code:'', name:'', countryCode:'', gstStateCode:'',
  unionTerritory:false, region:'', status:'active',
};

export function StateMasterPanel() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StateRecord[]>(() => {
    // [JWT] GET /api/geography/states
    try { return JSON.parse(localStorage.getItem('erp_geo_states') || '[]'); } catch { return []; }
  });
  // [JWT] POST /api/geography/states
  const saveRecords = (d: StateRecord[]) => { localStorage.setItem('erp_geo_states', JSON.stringify(d)); /* [JWT] PATCH /api/geography/states/bulk */ };
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<StateRecord>({...EMPTY});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<'india' | 'uae' | null>(null);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (countryFilter !== 'all' && r.countryCode !== countryFilter) return false;
      return `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, countryFilter]);

  function seedIndia() {
    const newRecs: StateRecord[] = indianStates.map(s => ({
      code: s.code, name: s.name, countryCode: 'IN',
      gstStateCode: s.gstStateCode, unionTerritory: s.unionTerritory,
      region: '', status: 'active',
    }));
    const next = [...records, ...newRecs.filter(n => !records.some(p => p.code === n.code))];
    setRecords(next); saveRecords(next);
    toast.success(`Seeded ${indianStates.length} Indian states/UTs`);
  }

  function seedUAE() {
    const newRecs: StateRecord[] = UAE_EMIRATES.map(e => ({
      code: e.code, name: e.name, countryCode: 'AE',
      gstStateCode: '', unionTerritory: false, region: '', status: 'active',
    }));
    const next = [...records, ...newRecs.filter(n => !records.some(p => p.code === n.code))];
    setRecords(next); saveRecords(next);
    toast.success('Seeded 7 UAE Emirates');
  }

  function openCreate() {
    setFormData({...EMPTY, countryCode: countryFilter !== 'all' ? countryFilter : ''});
    setEditIndex(null);
    setFormOpen(true);
  }

  function openEdit(idx: number) {
    setFormData({...records[idx]});
    setEditIndex(idx);
    setFormOpen(true);
  }

  function handleSave() {
    if (!formData.code || !formData.name || !formData.countryCode) {
      toast.error('Code, Name, and Country are required');
      return;
    }
    if (editIndex !== null) {
      const next = records.map((r, i) => i === editIndex ? {...formData} : r);
      setRecords(next); saveRecords(next);
      toast.success(`State ${formData.code} updated`);
    } else {
      const next = [...records, {...formData}];
      setRecords(next); saveRecords(next);
      toast.success(`State ${formData.code} created`);
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (deleteIndex === null) return;
    const r = records[deleteIndex];
    const next = records.filter((_, i) => i !== deleteIndex);
    setRecords(next); saveRecords(next);
    toast.success(`State ${r.code} deleted`);
    setDeleteIndex(null);
  }

  const showIndiaSeed = countryFilter === 'IN' || countryFilter === 'all';
  const showUAESeed = countryFilter === 'AE' || countryFilter === 'all';

  return (
    <div data-keyboard-form className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/foundation/geography')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">State / Province Master</h1>
              <p className="text-sm text-muted-foreground">States, union territories, and emirates.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
                <SelectItem value="AE">🇦🇪 UAE</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search states..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            {showIndiaSeed && (
              <Button variant="outline" className="gap-1.5" onClick={() => { setPreviewTarget('india'); setPreviewOpen(true); }}>
                <Zap className="h-4 w-4" /> Auto-Create All 38 Indian States
              </Button>
            )}
            {showUAESeed && (
              <Button data-primary variant="outline" className="gap-1.5" onClick={() => { setPreviewTarget('uae'); setPreviewOpen(true); }}>
                <Zap className="h-4 w-4" /> Auto-Create 7 Emirates
              </Button>
            )}
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add State
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>GST Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No states found. Use the auto-seed buttons or add manually.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const realIdx = records.indexOf(r);
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.countryCode}</TableCell>
                      <TableCell className="font-mono">{r.gstStateCode || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.unionTerritory
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                        )}>
                          {r.unionTerritory ? 'Union Territory' : 'State'}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.region || '—'}</TableCell>
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
    </div>
  );
}


export default function StateMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col w-full bg-background">
          <ERPHeader
            breadcrumbs={[
              { label:'Operix Core', href:'/erp/dashboard' },
              { label:'Command Center', href:'/erp/command-center' },
              { label:'Foundation' },
              { label:'Geography', href:'/erp/foundation/geography' },
              { label:'States' },
            ]}
            showDatePicker={false} showCompany={false}
          />
        <main className="flex-1 p-6">
          <StateMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}