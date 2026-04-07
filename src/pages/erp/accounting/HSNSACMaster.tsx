/**
 * HSNSACMaster.tsx — Full CRUD with seed from hsn-sac-seed-data.ts
 * [JWT] All mutations mock. Real: GET/POST/PATCH /api/accounting/hsn-sac
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BookOpen, Plus, Search, Edit, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { HSN_CODES, SAC_CODES, type HSNSACCode } from '@/data/hsn-sac-seed-data';

const EMPTY: HSNSACCode = {
  code: '', codeType: 'hsn', description: '', chapter: '',
  cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null,
  reverseCharge: false, exemptionApplicable: false,
};

export default function HSNSACMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HSNSACCode[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [rateFilter, setRateFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<HSNSACCode>({ ...EMPTY });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const chapters = useMemo(() => {
    const set = new Set(records.map(r => r.chapter));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (typeFilter !== 'all' && r.codeType !== typeFilter) return false;
      if (chapterFilter !== 'all' && r.chapter !== chapterFilter) return false;
      if (rateFilter !== 'all') {
        const rateVal = parseInt(rateFilter);
        if (r.igstRate !== rateVal) return false;
      }
      return `${r.code} ${r.description}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, typeFilter, chapterFilter, rateFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    hsn: records.filter(r => r.codeType === 'hsn').length,
    sac: records.filter(r => r.codeType === 'sac').length,
    rcm: records.filter(r => r.reverseCharge).length,
  }), [records]);

  function seedAll() {
    const existing = new Set(records.map(r => r.code));
    const allSeed = [...HSN_CODES, ...SAC_CODES];
    const newRecs = allSeed.filter(r => !existing.has(r.code));
    setRecords(prev => [...prev, ...newRecs]);
    toast.success(`Seeded ${newRecs.length} HSN/SAC codes`);
    setPreviewOpen(false);
  }

  function openCreate() { setFormData({ ...EMPTY }); setEditIndex(null); setFormOpen(true); }
  function openEdit(idx: number) { setFormData({ ...records[idx] }); setEditIndex(idx); setFormOpen(true); }

  function handleSave() {
    if (!formData.code || !formData.description) { toast.error('Code and Description are required'); return; }
    // [JWT] Replace with POST/PATCH /api/accounting/hsn-sac
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? { ...formData } : r));
      toast.success(`Code ${formData.code} updated`);
    } else {
      setRecords(prev => [...prev, { ...formData }]);
      toast.success(`Code ${formData.code} created`);
    }
    setFormOpen(false);
  }

  function updateCode(code: string) {
    const chapter = code.slice(0, 2);
    setFormData(p => ({ ...p, code, chapter }));
  }

  function updateCgst(cgst: number) {
    setFormData(p => ({ ...p, cgstRate: cgst, sgstRate: cgst, igstRate: cgst * 2 }));
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'HSN / SAC Codes' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">HSN / SAC Code Master</h1>
              <p className="text-sm text-muted-foreground">Harmonised System and Service Accounting codes with GST rates.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Codes', count: stats.total },
              { label: 'HSN Codes', count: stats.hsn },
              { label: 'SAC Codes', count: stats.sac },
              { label: 'RCM Applicable', count: stats.rcm },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search codes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="hsn">HSN</SelectItem>
                <SelectItem value="sac">SAC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chapterFilter} onValueChange={setChapterFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Chapters" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters.map(ch => <SelectItem key={ch} value={ch}>Chapter {ch}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rateFilter} onValueChange={setRateFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Rates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rates</SelectItem>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="12">12%</SelectItem>
                <SelectItem value="18">18%</SelectItem>
                <SelectItem value="28">28%</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
              <Zap className="h-4 w-4" /> Load Key Codes
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Code
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>CGST%</TableHead>
                  <TableHead>SGST%</TableHead>
                  <TableHead>IGST%</TableHead>
                  <TableHead>Cess</TableHead>
                  <TableHead>RCM</TableHead>
                  <TableHead>Exempt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {records.length === 0 ? 'No codes yet. Click "Load Key Codes" to seed 80 HSN + 20 SAC codes.' : 'No results.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const realIdx = records.indexOf(r);
                  return (
                    <TableRow key={r.code}>
                      <TableCell className={cn('font-mono font-medium', r.codeType === 'hsn' ? 'text-blue-600' : 'text-purple-600')}>{r.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.codeType === 'hsn' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                        )}>{r.codeType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{r.chapter}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{r.description}</TableCell>
                      <TableCell>{r.cgstRate}%</TableCell>
                      <TableCell>{r.sgstRate}%</TableCell>
                      <TableCell>{r.igstRate}%</TableCell>
                      <TableCell>{r.cessRate != null ? `${r.cessRate}%` : '—'}</TableCell>
                      <TableCell>
                        {r.reverseCharge ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">RCM</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.exemptionApplicable ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Exempt</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(realIdx)}><Edit className="h-4 w-4" /></Button>
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
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader><DialogTitle>Preview: {HSN_CODES.length} HSN + {SAC_CODES.length} SAC Codes</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {[...HSN_CODES, ...SAC_CODES].map(r => (
                <div key={r.code} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    r.codeType === 'hsn' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                  )}>{r.codeType.toUpperCase()}</Badge>
                  <span className="font-mono text-xs w-12">{r.code}</span>
                  <span className="flex-1 truncate">{r.description}</span>
                  <span className="text-xs text-muted-foreground">{r.igstRate}%</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
              <Button onClick={seedAll}>Confirm & Seed</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editIndex !== null ? 'Edit Code' : 'Add Code'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={formData.code} onChange={e => updateCode(e.target.value)} placeholder="8471" className="font-mono" maxLength={8} disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={formData.codeType} onValueChange={v => setFormData(p => ({ ...p, codeType: v as 'hsn' | 'sac' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hsn">HSN</SelectItem>
                      <SelectItem value="sac">SAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Chapter</Label>
                  <Input value={formData.chapter} disabled className="font-mono bg-muted" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description *</Label>
                <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>CGST %</Label>
                  <Input type="number" step="0.5" value={formData.cgstRate} onChange={e => updateCgst(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label>SGST %</Label>
                  <Input type="number" value={formData.sgstRate} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>IGST %</Label>
                  <Input type="number" value={formData.igstRate} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Cess %</Label>
                  <Input type="number" step="0.5" value={formData.cessRate ?? ''} onChange={e => setFormData(p => ({ ...p, cessRate: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="—" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.reverseCharge} onCheckedChange={v => setFormData(p => ({ ...p, reverseCharge: v }))} />
                  <Label>Reverse Charge</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.exemptionApplicable} onCheckedChange={v => setFormData(p => ({ ...p, exemptionApplicable: v }))} />
                  <Label>Exemption Applicable</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editIndex !== null ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
