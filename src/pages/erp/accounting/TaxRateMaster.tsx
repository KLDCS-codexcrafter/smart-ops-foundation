/**
 * TaxRateMaster.tsx — Full CRUD with seed from GST_RATES
 * [JWT] All mutations mock. Real: GET/POST/PATCH /api/accounting/tax-rates
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
import { Calculator, Plus, Search, Edit, Zap, ArrowLeft, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GST_RATES, type GSTRate } from '@/data/compliance-seed-data';

const COUNTRY_FLAGS: Record<string, string> = { IN: '🇮🇳', AE: '🇦🇪', SG: '🇸🇬', GB: '🇬🇧' };
const COUNTRY_NAMES: Record<string, string> = { IN: 'India', AE: 'UAE', SG: 'Singapore', GB: 'United Kingdom' };

function rateColor(rate: number) {
  if (rate === 0) return 'bg-muted text-muted-foreground';
  if (rate <= 5) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (rate <= 12) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  if (rate <= 18) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  return 'bg-red-500/10 text-red-600 border-red-500/20';
}

const EMPTY: GSTRate = {
  code: '', name: '', rate: 0, countryCode: 'IN', taxType: 'gst',
  applicableTo: 'both', category: '', effectiveFrom: '', notes: '', status: 'active',
};

export default function TaxRateMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<GSTRate[]>([]);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<GSTRate>({ ...EMPTY });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deactivateIndex, setDeactivateIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (countryFilter !== 'all' && r.countryCode !== countryFilter) return false;
      if (typeFilter !== 'all' && r.taxType !== typeFilter) return false;
      return `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, countryFilter, typeFilter]);

  const stats = useMemo(() => ({
    indiaGst: records.filter(r => r.countryCode === 'IN' && r.taxType === 'gst').length,
    cess: records.filter(r => r.taxType === 'cess').length,
    uae: records.filter(r => r.countryCode === 'AE').length,
    other: records.filter(r => r.countryCode !== 'IN' && r.countryCode !== 'AE').length,
  }), [records]);

  function seedAll() {
    const existing = new Set(records.map(r => r.code));
    const newRecs = GST_RATES.filter(r => !existing.has(r.code));
    setRecords(prev => [...prev, ...newRecs]);
    toast.success(`Seeded ${newRecs.length} tax rates`);
    setPreviewOpen(false);
  }

  function openCreate() { setFormData({ ...EMPTY }); setEditIndex(null); setFormOpen(true); }
  function openEdit(idx: number) { setFormData({ ...records[idx] }); setEditIndex(idx); setFormOpen(true); }

  function handleSave() {
    if (!formData.code || !formData.name) { toast.error('Code and Name are required'); return; }
    // [JWT] Replace with POST/PATCH /api/accounting/tax-rates
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? { ...formData } : r));
      toast.success(`Tax rate ${formData.code} updated`);
    } else {
      setRecords(prev => [...prev, { ...formData }]);
      toast.success(`Tax rate ${formData.code} created`);
    }
    setFormOpen(false);
  }

  function handleDeactivate() {
    if (deactivateIndex === null) return;
    // [JWT] Replace with PATCH /api/accounting/tax-rates/:code { status: 'inactive' }
    setRecords(prev => prev.map((r, i) => i === deactivateIndex ? { ...r, status: 'inactive' } : r));
    toast.success(`Tax rate ${records[deactivateIndex].code} deactivated`);
    setDeactivateIndex(null);
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'Tax Rates' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tax Rate Master</h1>
              <p className="text-sm text-muted-foreground">GST, VAT, Cess and international tax rates.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'India GST', count: stats.indiaGst },
              { label: 'Cess Rates', count: stats.cess },
              { label: 'UAE Rates', count: stats.uae },
              { label: 'Other International', count: stats.other },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search rates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
                <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                <SelectItem value="GB">🇬🇧 UK</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
                <SelectItem value="corporate_tax">Corporate Tax</SelectItem>
                <SelectItem value="cess">Cess</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
              <Zap className="h-4 w-4" /> Seed India GST
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Tax Rate
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {records.length === 0 ? 'No tax rates yet. Use "Seed India GST" to load 24 rates.' : 'No results match your search.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const realIdx = records.indexOf(r);
                  const displayRate = r.taxType === 'cess' && r.cessRate != null ? `${r.rate}% + ${r.cessRate}% cess` : `${r.rate}%`;
                  return (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{COUNTRY_FLAGS[r.countryCode] || ''} {COUNTRY_NAMES[r.countryCode] || r.countryCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(rateColor(r.cessRate ?? r.rate))}>{displayRate}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.applicableTo}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell>{r.effectiveFrom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground',
                        )}>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(realIdx)}><Edit className="h-4 w-4" /></Button>
                          {r.status === 'active' && (
                            <Button variant="ghost" size="icon" onClick={() => setDeactivateIndex(realIdx)}>
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Preview / Seed Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader><DialogTitle>Preview: 24 Tax Rates</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {GST_RATES.map(r => (
                <div key={r.code} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <span className="font-mono text-xs w-28">{r.code}</span>
                  <span className="flex-1">{r.name}</span>
                  <Badge variant="outline" className={cn(rateColor(r.rate), 'text-xs')}>{r.rate}%</Badge>
                  <span className="text-xs text-muted-foreground">{COUNTRY_FLAGS[r.countryCode]}</span>
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
            <DialogHeader><DialogTitle>{editIndex !== null ? 'Edit Tax Rate' : 'Add Tax Rate'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="GST_18" className="font-mono" disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Country *</Label>
                  <Select value={formData.countryCode} onValueChange={v => setFormData(p => ({ ...p, countryCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                      <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                      <SelectItem value="GB">🇬🇧 UK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="GST 18%" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tax Type</Label>
                  <Select value={formData.taxType} onValueChange={v => setFormData(p => ({ ...p, taxType: v as GSTRate['taxType'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gst">GST</SelectItem>
                      <SelectItem value="vat">VAT</SelectItem>
                      <SelectItem value="corporate_tax">Corporate Tax</SelectItem>
                      <SelectItem value="cess">Cess</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Applies To</Label>
                  <Select value={formData.applicableTo} onValueChange={v => setFormData(p => ({ ...p, applicableTo: v as GSTRate['applicableTo'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goods">Goods</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Rate %</Label>
                  <Input type="number" step="0.0001" value={formData.rate} onChange={e => setFormData(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label>Cess Rate %</Label>
                  <Input type="number" step="0.01" value={formData.cessRate ?? ''} onChange={e => setFormData(p => ({ ...p, cessRate: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="standard" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Effective From</Label>
                  <Input type="date" value={formData.effectiveFrom} onChange={e => setFormData(p => ({ ...p, effectiveFrom: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as 'active' | 'inactive' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editIndex !== null ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirmation */}
        <AlertDialog open={deactivateIndex !== null} onOpenChange={o => { if (!o) setDeactivateIndex(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Tax Rate</AlertDialogTitle>
              <AlertDialogDescription>
                Deactivate {deactivateIndex !== null ? records[deactivateIndex]?.code : ''}? Historical transactions using this rate will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
