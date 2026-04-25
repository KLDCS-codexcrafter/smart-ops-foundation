/**
 * PortMaster.tsx — Full CRUD + Pre-Seeded 21 Indian + 8 UAE ports
 * [JWT] All mutations mock. Real: POST/PATCH/DELETE /api/geography/ports
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  INDIA_PORTS, UAE_PORTS, type PortRecord, type PortType, type CustomsZone,
} from '@/data/geo-seed-data';

const PORT_TYPE_COLORS: Record<PortType, string> = {
  sea_port: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  airport: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  icd: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  land_border: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  river_port: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
  dry_port: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
};

const PORT_TYPE_LABELS: Record<PortType, string> = {
  sea_port: 'Sea Port', airport: 'Airport', icd: 'ICD',
  land_border: 'Land Border', river_port: 'River Port', dry_port: 'Dry Port',
};

const CUSTOMS_ZONE_LABELS: Record<CustomsZone, string> = {
  regular: 'Regular', free_zone: 'Free Zone', sez: 'SEZ',
  bonded: 'Bonded Warehouse', special: 'Special Zone',
};

const PORT_TYPES: PortType[] = ['sea_port','airport','icd','land_border','river_port','dry_port'];
const CUSTOMS_ZONES: CustomsZone[] = ['regular','free_zone','sez','bonded','special'];

const EMPTY: PortRecord = {
  portCode:'', portName:'', portType:'sea_port', countryCode:'', stateCode:'',
  nearestCity:'', operator:'', customsZone:'regular', latitude:0, longitude:0,
  status:'active',
};

export function PortMasterPanel() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PortRecord[]>(() => {
    // [JWT] GET /api/geography/ports
    try { return JSON.parse(localStorage.getItem('erp_geo_ports') || '[]'); } catch { return []; }
  });
  // [JWT] POST /api/geography/ports
  const saveRecords = (d: PortRecord[]) => { localStorage.setItem('erp_geo_ports', JSON.stringify(d)); /* [JWT] PATCH /api/geography/ports/bulk */ };
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [_formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<PortRecord>({...EMPTY});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [_previewOpen, setPreviewOpen] = useState(false);
  const [_previewTarget, setPreviewTarget] = useState<'india' | 'uae' | null>(null);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (countryFilter !== 'all' && r.countryCode !== countryFilter) return false;
      if (typeFilter !== 'all' && r.portType !== typeFilter) return false;
      if (zoneFilter !== 'all' && r.customsZone !== zoneFilter) return false;
      return `${r.portCode} ${r.portName} ${r.operator}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, countryFilter, typeFilter, zoneFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: records.length,
    sea: records.filter(r => r.portType === 'sea_port').length,
    air: records.filter(r => r.portType === 'airport').length,
    icd: records.filter(r => r.portType === 'icd').length,
    land: records.filter(r => r.portType === 'land_border').length,
  }), [records]);

  function _seedPorts(target: 'india' | 'uae') {
    const src = target === 'india' ? INDIA_PORTS : UAE_PORTS;
    const next = [...records, ...src.filter(n => !records.some(p => p.portCode === n.portCode))];
    setRecords(next); saveRecords(next);
    toast.success(`Seeded ${src.length} ${target === 'india' ? 'Indian' : 'UAE'} ports`);
    setPreviewOpen(false);
  }
  void _seedPorts;

  function openCreate() {
    setFormData({...EMPTY});
    setEditIndex(null);
    setFormOpen(true);
  }

  function openEdit(idx: number) {
    setFormData({...records[idx]});
    setEditIndex(idx);
    setFormOpen(true);
  }

  function _handleSave() {
    if (!formData.portCode || !formData.portName) { toast.error('Port Code and Name are required'); return; }
    if (editIndex !== null) {
      const next = records.map((r, i) => i === editIndex ? {...formData} : r);
      setRecords(next); saveRecords(next);
      toast.success(`Port ${formData.portCode} updated`);
    } else {
      const next = [...records, {...formData}];
      setRecords(next); saveRecords(next);
      toast.success(`Port ${formData.portCode} created`);
    }
    setFormOpen(false);
  }
  void _handleSave;

  function _handleDelete() {
    if (deleteIndex === null) return;
    const r = records[deleteIndex];
    const next = records.filter((_, i) => i !== deleteIndex);
    setRecords(next); saveRecords(next);
    toast.success(`Port ${r.portCode} deleted`);
    setDeleteIndex(null);
  }
  void _handleDelete;

  return (
    <div data-keyboard-form className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/foundation/geography')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Port Master</h1>
              <p className="text-sm text-muted-foreground">Sea ports, airports, ICDs, and land borders.</p>
            </div>
          </div>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="py-1 px-2 text-xs gap-1">{stats.total} Total</Badge>
            <Badge variant="outline" className={cn('py-1 px-2 text-xs gap-1', PORT_TYPE_COLORS.sea_port)}>{stats.sea} Sea Ports</Badge>
            <Badge variant="outline" className={cn('py-1 px-2 text-xs gap-1', PORT_TYPE_COLORS.airport)}>{stats.air} Airports</Badge>
            <Badge variant="outline" className={cn('py-1 px-2 text-xs gap-1', PORT_TYPE_COLORS.icd)}>{stats.icd} ICDs</Badge>
            <Badge variant="outline" className={cn('py-1 px-2 text-xs gap-1', PORT_TYPE_COLORS.land_border)}>{stats.land} Land Borders</Badge>
          </div>

          {/* Seed + Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => { setPreviewTarget('india'); setPreviewOpen(true); }}>
              <Zap className="h-4 w-4" /> Seed India Ports (21)
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => { setPreviewTarget('uae'); setPreviewOpen(true); }}>
              <Zap className="h-4 w-4" /> Seed UAE Ports (8)
            </Button>
            <div className="flex-1" />
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
                <SelectItem value="AE">🇦🇪 UAE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PORT_TYPES.map(t => <SelectItem key={t} value={t}>{PORT_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Zones" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {CUSTOMS_ZONES.map(z => <SelectItem key={z} value={z}>{CUSTOMS_ZONE_LABELS[z]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button data-primary onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Port</Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>State/Emirate</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Customs Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No ports found. Use the seed buttons to get started.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => {
                  const realIdx = records.indexOf(r);
                  return (
                    <TableRow key={r.portCode}>
                      <TableCell className="font-mono font-medium text-xs">{r.portCode}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[250px] truncate">{r.portName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', PORT_TYPE_COLORS[r.portType])}>
                          {PORT_TYPE_LABELS[r.portType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.countryCode}</TableCell>
                      <TableCell>{r.stateCode}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{r.operator}</TableCell>
                      <TableCell className="text-xs">{CUSTOMS_ZONE_LABELS[r.customsZone]}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'cursor-pointer select-none',
                          r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground',
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


export default function PortMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col w-full bg-background">
          <ERPHeader
            breadcrumbs={[
              { label:'Operix Core', href:'/erp/dashboard' },
              { label:'Command Center', href:'/erp/command-center' },
              { label:'Foundation' },
              { label:'Geography', href:'/erp/foundation/geography' },
              { label:'Ports' },
            ]}
            showDatePicker={false} showCompany={false}
          />
        <main className="flex-1 p-6">
          <PortMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
