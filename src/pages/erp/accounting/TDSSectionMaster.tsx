/**
 * TDSSectionMaster.tsx — Full CRUD with seed from TDS_SECTIONS
 * [JWT] All mutations mock. Real: GET/POST/PATCH /api/accounting/tds-sections
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
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, Plus, Search, Edit, Zap, ArrowLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TDS_SECTIONS, type TDSSection } from '@/data/compliance-seed-data';

const EMPTY: TDSSection = {
  sectionCode: '', sectionName: '', natureOfPayment: '',
  rateIndividual: 0, rateCompany: 0, rateNoPAN: 20,
  thresholdPerTransaction: null, thresholdAggregateAnnual: null,
  lowerDeductionEligible: false, section206ABApplicable: false,
  notes: '', status: 'active',
};

function formatAmount(val: number | null): string {
  if (val === null) return '—';
  if (val >= 10000000) return `Rs ${val / 10000000}Cr`;
  if (val >= 100000) return `Rs ${val / 100000}L`;
  if (val >= 1000) return `Rs ${val / 1000}K`;
  return `Rs ${val}`;
}

export default function TDSSectionMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TDSSection[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<TDSSection>({ ...EMPTY });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = useMemo(() =>
    records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return `${r.sectionCode} ${r.natureOfPayment} ${r.sectionName}`.toLowerCase().includes(search.toLowerCase());
    }), [records, search, statusFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    salary: records.filter(r => r.sectionCode === '192').length,
    vendorContractor: records.filter(r => r.rateIndividual > 0 && r.sectionCode !== '192').length,
    special206AB: records.filter(r => r.section206ABApplicable).length,
  }), [records]);

  function seedAll() {
    const existing = new Set(records.map(r => r.sectionCode));
    const newRecs = TDS_SECTIONS.filter(r => !existing.has(r.sectionCode));
    setRecords(prev => [...prev, ...newRecs]);
    toast.success(`Seeded ${newRecs.length} TDS sections`);
    setPreviewOpen(false);
  }

  function openCreate() { setFormData({ ...EMPTY }); setEditIndex(null); setFormOpen(true); }
  function openEdit(idx: number) { setFormData({ ...records[idx] }); setEditIndex(idx); setFormOpen(true); }

  function handleSave() {
    if (!formData.sectionCode || !formData.sectionName) { toast.error('Section Code and Name are required'); return; }
    // [JWT] Replace with POST/PATCH /api/accounting/tds-sections
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? { ...formData } : r));
      toast.success(`TDS section ${formData.sectionCode} updated`);
    } else {
      setRecords(prev => [...prev, { ...formData }]);
      toast.success(`TDS section ${formData.sectionCode} created`);
    }
    setFormOpen(false);
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'TDS Sections' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">TDS Section Master</h1>
              <p className="text-sm text-muted-foreground">Tax Deducted at Source — all sections with thresholds and rates.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sections', count: stats.total },
              { label: 'Salary (192)', count: stats.salary },
              { label: 'Vendor/Contractor', count: stats.vendorContractor },
              { label: 'Special (206AB)', count: stats.special206AB },
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
              <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
              <Zap className="h-4 w-4" /> Load All Sections
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Section
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Nature of Payment</TableHead>
                  <TableHead>Ind %</TableHead>
                  <TableHead>Co %</TableHead>
                  <TableHead>No PAN %</TableHead>
                  <TableHead>Txn Threshold</TableHead>
                  <TableHead>Annual Threshold</TableHead>
                  <TableHead>206AB</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {records.length === 0 ? 'No sections yet. Click "Load All Sections" to seed 30 sections.' : 'No results.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const realIdx = records.indexOf(r);
                  const is192 = r.sectionCode === '192';
                  const is194Q = r.sectionCode === '194Q';
                  return (
                    <TableRow key={r.sectionCode} className={cn(is194Q && 'bg-amber-500/5')}>
                      <TableCell className={cn('font-mono font-medium', is192 && 'text-blue-600')}>{r.sectionCode}</TableCell>
                      <TableCell className="font-medium">{r.sectionName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.natureOfPayment}</TableCell>
                      <TableCell>{is192 ? <span className="text-blue-600 text-xs">As per slab</span> : `${r.rateIndividual}%`}</TableCell>
                      <TableCell>{is192 ? <span className="text-blue-600 text-xs">As per slab</span> : `${r.rateCompany}%`}</TableCell>
                      <TableCell>{r.rateNoPAN}%</TableCell>
                      <TableCell>{formatAmount(r.thresholdPerTransaction)}</TableCell>
                      <TableCell>
                        {is194Q ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                                Rs 50L/FY <Info className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              TDS deductible only after cumulative purchases from this vendor exceed Rs 50 lakhs in the financial year. Buyer must have turnover {'>'} Rs 10 Cr.
                            </TooltipContent>
                          </Tooltip>
                        ) : formatAmount(r.thresholdAggregateAnnual)}
                      </TableCell>
                      <TableCell>
                        {r.section206ABApplicable ? (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">Yes</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground',
                        )}>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge>
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
            <DialogHeader><DialogTitle>Preview: 30 TDS Sections</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {TDS_SECTIONS.map(r => (
                <div key={r.sectionCode} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <span className="font-mono text-xs w-16">{r.sectionCode}</span>
                  <span className="flex-1 truncate">{r.natureOfPayment}</span>
                  <span className="text-xs text-muted-foreground">{r.rateIndividual}%/{r.rateCompany}%</span>
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
            <DialogHeader><DialogTitle>{editIndex !== null ? 'Edit TDS Section' : 'Add TDS Section'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Section Code *</Label>
                  <Input value={formData.sectionCode} onChange={e => setFormData(p => ({ ...p, sectionCode: e.target.value }))} placeholder="194C" className="font-mono" disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Section Name *</Label>
                  <Input value={formData.sectionName} onChange={e => setFormData(p => ({ ...p, sectionName: e.target.value }))} placeholder="Contractor Payments" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Nature of Payment</Label>
                <Input value={formData.natureOfPayment} onChange={e => setFormData(p => ({ ...p, natureOfPayment: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Individual %</Label>
                  <Input type="number" step="0.01" value={formData.rateIndividual} onChange={e => setFormData(p => ({ ...p, rateIndividual: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label>Company %</Label>
                  <Input type="number" step="0.01" value={formData.rateCompany} onChange={e => setFormData(p => ({ ...p, rateCompany: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label>No PAN %</Label>
                  <Input type="number" step="0.01" value={formData.rateNoPAN} onChange={e => setFormData(p => ({ ...p, rateNoPAN: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Txn Threshold (Rs)</Label>
                  <Input type="number" value={formData.thresholdPerTransaction ?? ''} onChange={e => setFormData(p => ({ ...p, thresholdPerTransaction: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Annual Threshold (Rs)</Label>
                  <Input type="number" value={formData.thresholdAggregateAnnual ?? ''} onChange={e => setFormData(p => ({ ...p, thresholdAggregateAnnual: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Optional" />
                  <p className="text-[10px] text-muted-foreground">For 194Q, 194C: TDS applies only after cumulative payments cross this FY limit</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.lowerDeductionEligible} onCheckedChange={v => setFormData(p => ({ ...p, lowerDeductionEligible: v }))} />
                  <Label>Lower Deduction Eligible</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.section206ABApplicable} onCheckedChange={v => setFormData(p => ({ ...p, section206ABApplicable: v }))} />
                <div>
                  <Label>Section 206AB Applicable</Label>
                  <p className="text-[10px] text-muted-foreground">If Yes: double rate or 5%, whichever higher, when payee has not filed ITR for 2 preceding years</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
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
