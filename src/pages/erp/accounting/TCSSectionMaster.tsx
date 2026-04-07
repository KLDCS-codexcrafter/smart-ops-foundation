/**
 * TCSSectionMaster.tsx — Full CRUD with seed from TCS_SECTIONS
 * [JWT] All mutations mock. Real: GET/POST/PATCH /api/accounting/tcs-sections
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Plus, Search, Edit, Zap, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TCS_SECTIONS, type TCSSection } from '@/data/compliance-seed-data';

const EMPTY: TCSSection = {
  sectionCode: '', sectionName: '', natureOfGoods: '',
  ratePercentage: 0, rateNoPAN: 5, thresholdLimit: null,
  thresholdType: 'per_transaction', buyerType: 'all',
  notes: '', status: 'active',
};

function formatAmount(val: number | null): string {
  if (val === null) return '—';
  if (val >= 10000000) return `Rs ${val / 10000000}Cr`;
  if (val >= 100000) return `Rs ${val / 100000}L`;
  if (val >= 1000) return `Rs ${val / 1000}K`;
  return `Rs ${val}`;
}

export default function TCSSectionMaster() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TCSSection[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<TCSSection>({ ...EMPTY });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filtered = useMemo(() =>
    records.filter(r =>
      `${r.sectionCode} ${r.natureOfGoods} ${r.sectionName}`.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  const stats = useMemo(() => ({
    total: records.length,
    goods: records.filter(r => r.thresholdType === 'per_transaction').length,
    services: records.filter(r => r.thresholdType === 'aggregate_annual').length,
    active: records.filter(r => r.status === 'active').length,
  }), [records]);

  function seedAll() {
    const existing = new Set(records.map(r => r.sectionCode));
    const newRecs = TCS_SECTIONS.filter(r => !existing.has(r.sectionCode));
    setRecords(prev => [...prev, ...newRecs]);
    toast.success(`Seeded ${newRecs.length} TCS sections`);
    setPreviewOpen(false);
  }

  function openCreate() { setFormData({ ...EMPTY }); setEditIndex(null); setFormOpen(true); }
  function openEdit(idx: number) { setFormData({ ...records[idx] }); setEditIndex(idx); setFormOpen(true); }

  function handleSave() {
    if (!formData.sectionCode || !formData.sectionName) { toast.error('Section Code and Name are required'); return; }
    // [JWT] Replace with POST/PATCH /api/accounting/tcs-sections
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? { ...formData } : r));
      toast.success(`TCS section ${formData.sectionCode} updated`);
    } else {
      setRecords(prev => [...prev, { ...formData }]);
      toast.success(`TCS section ${formData.sectionCode} created`);
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
            { label: 'TCS Sections' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">TCS Section Master</h1>
              <p className="text-sm text-muted-foreground">Tax Collected at Source — goods and services rates.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sections', count: stats.total },
              { label: 'Goods', count: stats.goods },
              { label: 'Services', count: stats.services },
              { label: 'Active', count: stats.active },
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
                  <TableHead>Section Code</TableHead>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Nature of Goods/Services</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>No PAN %</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Threshold Type</TableHead>
                  <TableHead>Buyer Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {records.length === 0 ? 'No sections yet. Click "Load All Sections" to seed 11 TCS sections.' : 'No results.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const realIdx = records.indexOf(r);
                  return (
                    <TableRow key={r.sectionCode}>
                      <TableCell className="font-mono font-medium">{r.sectionCode}</TableCell>
                      <TableCell className="font-medium">{r.sectionName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.natureOfGoods}</TableCell>
                      <TableCell>{r.ratePercentage}%</TableCell>
                      <TableCell>{r.rateNoPAN}%</TableCell>
                      <TableCell>{formatAmount(r.thresholdLimit)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          r.thresholdType === 'per_transaction'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                        )}>{r.thresholdType === 'per_transaction' ? 'Per Transaction' : 'Aggregate Annual'}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.buyerType === 'all' ? 'All' : 'Specified'}</TableCell>
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
            <DialogHeader><DialogTitle>Preview: 11 TCS Sections</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-1">
              {TCS_SECTIONS.map(r => (
                <div key={r.sectionCode} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <span className="font-mono text-xs w-32">{r.sectionCode}</span>
                  <span className="flex-1 truncate">{r.natureOfGoods}</span>
                  <span className="text-xs text-muted-foreground">{r.ratePercentage}%</span>
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
            <DialogHeader><DialogTitle>{editIndex !== null ? 'Edit TCS Section' : 'Add TCS Section'}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Section Code *</Label>
                  <Input value={formData.sectionCode} onChange={e => setFormData(p => ({ ...p, sectionCode: e.target.value }))} placeholder="206C_1H_GOODS" className="font-mono" disabled={editIndex !== null} />
                </div>
                <div className="space-y-1">
                  <Label>Section Name *</Label>
                  <Input value={formData.sectionName} onChange={e => setFormData(p => ({ ...p, sectionName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Nature of Goods/Services</Label>
                <Input value={formData.natureOfGoods} onChange={e => setFormData(p => ({ ...p, natureOfGoods: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Rate %</Label>
                  <Input type="number" step="0.01" value={formData.ratePercentage} onChange={e => setFormData(p => ({ ...p, ratePercentage: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label>No PAN %</Label>
                  <Input type="number" step="0.01" value={formData.rateNoPAN} onChange={e => setFormData(p => ({ ...p, rateNoPAN: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Threshold Limit (Rs)</Label>
                  <Input type="number" value={formData.thresholdLimit ?? ''} onChange={e => setFormData(p => ({ ...p, thresholdLimit: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Threshold Type</Label>
                  <Select value={formData.thresholdType} onValueChange={v => setFormData(p => ({ ...p, thresholdType: v as TCSSection['thresholdType'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_transaction">Per Transaction</SelectItem>
                      <SelectItem value="aggregate_annual">Aggregate Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Buyer Type</Label>
                  <Select value={formData.buyerType} onValueChange={v => setFormData(p => ({ ...p, buyerType: v as TCSSection['buyerType'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="specified_buyer">Specified Buyer</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
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
