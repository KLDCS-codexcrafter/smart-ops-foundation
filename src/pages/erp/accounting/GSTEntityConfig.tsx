/**
 * GSTEntityConfig.tsx — Zone 3 Session 2
 * Registration type, e-invoice, QRMP and turnover slab per entity.
 * [JWT] Replace with GET/POST/PATCH /api/compliance/gst-entity-config
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Pencil, Trash2, Check, Minus, Info } from 'lucide-react';
import { toast } from 'sonner';

export interface GSTEntityConfig {
  id: string;
  entityName: string;
  entityType: 'company' | 'subsidiary' | 'branch';
  gstin: string;
  registrationType: 'Regular' | 'Composition' | 'Unregistered' | 'Consumer' | 'SEZ Unit' | 'SEZ Developer' | 'Deemed Export';
  eInvoiceApplicable: boolean;
  eWayBillApplicable: boolean;
  qrmpEnrolled: boolean;
  aggregateTurnoverSlab: 'upto_1.5cr' | '1.5cr_to_5cr' | '5cr_to_20cr' | '20cr_to_100cr' | 'above_100cr';
  effectiveFrom: string;
  notes: string;
}

const SLAB_LABELS: Record<string, string> = {
  'upto_1.5cr': 'Up to Rs 1.5 Cr',
  '1.5cr_to_5cr': 'Rs 1.5 Cr to Rs 5 Cr',
  '5cr_to_20cr': 'Rs 5 Cr to Rs 20 Cr',
  '20cr_to_100cr': 'Rs 20 Cr to Rs 100 Cr',
  'above_100cr': 'Above Rs 100 Cr',
};

export default function GSTEntityConfigPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<GSTEntityConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<GSTEntityConfig>>({});

  // Stats
  const total = records.length;
  const eInvoice = records.filter(r => r.eInvoiceApplicable).length;
  const qrmp = records.filter(r => r.qrmpEnrolled).length;
  const regular = records.filter(r => r.registrationType === 'Regular').length;

  const openCreate = () => {
    setEditId(null);
    setForm({
      entityType: 'company', registrationType: 'Regular',
      eInvoiceApplicable: false, eWayBillApplicable: true, qrmpEnrolled: false,
      aggregateTurnoverSlab: '5cr_to_20cr',
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  };

  const openEdit = (r: GSTEntityConfig) => {
    setEditId(r.id);
    setForm({ ...r });
    setShowForm(true);
  };

  const handleSave = () => {
    // [JWT] Replace with POST/PATCH /api/compliance/gst-entity-config
    const entry: GSTEntityConfig = {
      id: editId ?? crypto.randomUUID(),
      entityName: form.entityName ?? '',
      entityType: form.entityType as any ?? 'company',
      gstin: (form.gstin ?? '').toUpperCase(),
      registrationType: form.registrationType as any ?? 'Regular',
      eInvoiceApplicable: form.eInvoiceApplicable ?? false,
      eWayBillApplicable: form.eWayBillApplicable ?? true,
      qrmpEnrolled: form.qrmpEnrolled ?? false,
      aggregateTurnoverSlab: form.aggregateTurnoverSlab as any ?? '5cr_to_20cr',
      effectiveFrom: form.effectiveFrom ?? '',
      notes: form.notes ?? '',
    };
    if (editId) {
      setRecords(prev => prev.map(r => r.id === editId ? entry : r));
      toast.success('GST config updated');
    } else {
      setRecords(prev => [...prev, entry]);
      toast.success('GST config added');
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    // [JWT] Replace with DELETE /api/compliance/gst-entity-config/:id
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('GST config deleted');
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'GST Entity Config' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">GST Entity Configuration</h1>
              <p className="text-sm text-muted-foreground">Registration type, e-invoice, QRMP and turnover slab per entity</p>
            </div>
          </div>

          {/* QRMP Info callout */}
          <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">QRMP Note</p>
                <p>Entities enrolled in QRMP file GSTR-1 quarterly, not monthly. The system will suppress false unmatched alerts in GSTR-2B reconciliation for months 1 and 2 of each quarter for these entities.</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Entities', value: total },
              { label: 'E-Invoice Applicable', value: eInvoice },
              { label: 'QRMP Enrolled', value: qrmp },
              { label: 'Regular GST', value: regular },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Entity
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Registration Type</TableHead>
                  <TableHead>Turnover Slab</TableHead>
                  <TableHead className="text-center">E-Invoice</TableHead>
                  <TableHead className="text-center">E-Way Bill</TableHead>
                  <TableHead className="text-center">QRMP</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No entities configured. Click "Add Entity" to begin.</TableCell></TableRow>
                )}
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.entityName}</TableCell>
                    <TableCell className="text-xs font-mono">{r.gstin}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.registrationType}</Badge></TableCell>
                    <TableCell className="text-xs">{SLAB_LABELS[r.aggregateTurnoverSlab]}</TableCell>
                    <TableCell className="text-center">
                      {r.eInvoiceApplicable ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.eWayBillApplicable ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.qrmpEnrolled ? <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">QRMP</Badge> : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? 'Edit GST Config' : 'Add GST Entity Config'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Entity Name</Label><Input value={form.entityName ?? ''} onChange={e => setForm(p => ({ ...p, entityName: e.target.value }))} /></div>
              <div>
                <Label>Entity Type</Label>
                <Select value={form.entityType ?? 'company'} onValueChange={v => setForm(p => ({ ...p, entityType: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="subsidiary">Subsidiary</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={form.gstin ?? ''} onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                <p className="text-[10px] text-muted-foreground mt-1">15 chars — 2-digit state code prefix</p>
              </div>
              <div>
                <Label>Registration Type</Label>
                <Select value={form.registrationType ?? 'Regular'} onValueChange={v => setForm(p => ({ ...p, registrationType: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ Unit', 'SEZ Developer', 'Deemed Export'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aggregate Turnover Slab</Label>
                <Select value={form.aggregateTurnoverSlab ?? '5cr_to_20cr'} onValueChange={v => setForm(p => ({ ...p, aggregateTurnoverSlab: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SLAB_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom ?? ''} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} /></div>
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>E-Invoice Applicable</Label>
                    <p className="text-[10px] text-muted-foreground">Mandatory above Rs 5 Cr turnover</p>
                  </div>
                  <Switch checked={form.eInvoiceApplicable ?? false} onCheckedChange={v => setForm(p => ({ ...p, eInvoiceApplicable: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>E-Way Bill Applicable</Label>
                  <Switch checked={form.eWayBillApplicable ?? true} onCheckedChange={v => setForm(p => ({ ...p, eWayBillApplicable: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>QRMP Enrolled</Label>
                    <p className="text-[10px] text-muted-foreground">QRMP entities file GSTR-1 quarterly. Suppress month 1 and 2 reconciliation alerts.</p>
                  </div>
                  <Switch checked={form.qrmpEnrolled ?? false} onCheckedChange={v => setForm(p => ({ ...p, qrmpEnrolled: v }))} />
                </div>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Input value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editId ? 'Update' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
