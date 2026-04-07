/**
 * StatutoryRegistrations.tsx — Zone 3 Session 2
 * GSTIN, TAN, PAN, EPF, ESI, PT, LWF, CIN registration tracker per entity.
 * [JWT] Replace with GET/POST/PATCH /api/compliance/statutory-registrations
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export interface StatutoryRegistration {
  id: string;
  entityName: string;
  entityType: 'company' | 'subsidiary' | 'branch';
  registrationType: 'GSTIN' | 'TAN' | 'PAN' | 'EPF' | 'ESI' | 'PT' | 'LWF' | 'CIN' | 'UDYAM' | 'IEC';
  registrationNumber: string;
  stateCode: string | null;
  validFrom: string;
  validTo: string | null;
  status: 'active' | 'suspended' | 'cancelled' | 'applied';
  renewalReminderDays: number;
  notes: string;
}

const TYPE_COLORS: Record<string, string> = {
  GSTIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TAN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  EPF: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ESI: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  LWF: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CIN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  UDYAM: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  IEC: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const VALIDATION_HINTS: Record<string, string> = {
  GSTIN: '15 chars — starts with 2-digit state code (e.g. 22AAAAA0000A1Z5)',
  TAN: '10 chars — ABCD12345E format',
  PAN: '10 chars — ABCDE1234F format',
  EPF: 'EPF establishment code',
  ESI: 'ESI establishment code',
  PT: 'PT registration number',
  LWF: 'LWF registration number',
  CIN: '21 chars — Company Identification Number',
  UDYAM: 'UDYAM-XX-00-0000000 format',
  IEC: '10 digit Import Export Code',
};

const REG_TYPES = ['GSTIN', 'TAN', 'PAN', 'EPF', 'ESI', 'PT', 'LWF', 'CIN', 'UDYAM', 'IEC'] as const;

export default function StatutoryRegistrations() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StatutoryRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<StatutoryRegistration>>({});

  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const in90 = new Date(today.getTime() + 90 * 86400000);

  const filtered = useMemo(() => {
    let f = records;
    if (typeFilter !== 'all') f = f.filter(r => r.registrationType === typeFilter);
    if (statusFilter !== 'all') {
      if (statusFilter === 'expiring') {
        f = f.filter(r => r.validTo && new Date(r.validTo) <= in90 && r.status === 'active');
      } else {
        f = f.filter(r => r.status === statusFilter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(r => r.registrationNumber.toLowerCase().includes(q) || r.entityName.toLowerCase().includes(q));
    }
    return f;
  }, [records, search, typeFilter, statusFilter]);

  // Stats
  const total = records.length;
  const active = records.filter(r => r.status === 'active').length;
  const expiring90 = records.filter(r => r.validTo && new Date(r.validTo) <= in90 && r.status === 'active').length;
  const pending = records.filter(r => r.status === 'applied').length;
  const urgent30 = records.filter(r => r.validTo && new Date(r.validTo) <= in30 && r.status === 'active').length;

  const openCreate = () => {
    setEditId(null);
    setForm({ entityType: 'company', registrationType: 'GSTIN', status: 'active', renewalReminderDays: 30 });
    setShowForm(true);
  };

  const openEdit = (r: StatutoryRegistration) => {
    setEditId(r.id);
    setForm({ ...r });
    setShowForm(true);
  };

  const handleSave = () => {
    // [JWT] Replace with POST/PATCH /api/compliance/statutory-registrations
    const entry: StatutoryRegistration = {
      id: editId ?? crypto.randomUUID(),
      entityName: form.entityName ?? '',
      entityType: form.entityType as any ?? 'company',
      registrationType: form.registrationType as any ?? 'GSTIN',
      registrationNumber: (form.registrationNumber ?? '').toUpperCase(),
      stateCode: form.registrationType === 'GSTIN' ? (form.stateCode ?? null) : null,
      validFrom: form.validFrom ?? '',
      validTo: form.validTo || null,
      status: form.status as any ?? 'active',
      renewalReminderDays: Number(form.renewalReminderDays) || 30,
      notes: form.notes ?? '',
    };
    if (editId) {
      setRecords(prev => prev.map(r => r.id === editId ? entry : r));
      toast.success('Registration updated');
    } else {
      setRecords(prev => [...prev, entry]);
      toast.success('Registration added');
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    // [JWT] Replace with DELETE /api/compliance/statutory-registrations/:id
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Registration deleted');
  };

  const isExpiringSoon = (validTo: string | null) => {
    if (!validTo) return false;
    return new Date(validTo) <= in90;
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Statutory Registrations' },
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
              <h1 className="text-2xl font-bold text-foreground">Statutory Registrations</h1>
              <p className="text-sm text-muted-foreground">Track GSTIN, TAN, PAN, EPF, ESI and other statutory numbers per entity</p>
            </div>
          </div>

          {/* Urgent alert */}
          {urgent30 > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">URGENT:</span> {urgent30} registration(s) expire within 30 days. Review immediately.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Registrations', value: total },
              { label: 'Active', value: active },
              { label: 'Expiring in 90 Days', value: expiring90 },
              { label: 'Pending', value: pending },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search registration..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-9 text-sm" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Registration
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Registration Number</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reminder</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No registrations found. Click "Add Registration" to begin.</TableCell></TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.entityName}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${TYPE_COLORS[r.registrationType] ?? ''}`}>{r.registrationType}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.registrationNumber}</TableCell>
                    <TableCell className="text-xs">{r.stateCode ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.validFrom}</TableCell>
                    <TableCell className={`text-xs ${isExpiringSoon(r.validTo) ? 'text-destructive font-semibold' : ''}`}>{r.validTo ?? 'Perpetual'}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right text-xs">{r.renewalReminderDays}d</TableCell>
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
            <DialogHeader><DialogTitle>{editId ? 'Edit Registration' : 'Add Registration'}</DialogTitle></DialogHeader>
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
                <Label>Registration Type</Label>
                <Select value={form.registrationType ?? 'GSTIN'} onValueChange={v => setForm(p => ({ ...p, registrationType: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Registration Number</Label>
                <Input value={form.registrationNumber ?? ''} onChange={e => setForm(p => ({ ...p, registrationNumber: e.target.value.toUpperCase() }))} />
                <p className="text-[10px] text-muted-foreground mt-1">{VALIDATION_HINTS[form.registrationType ?? 'GSTIN']}</p>
              </div>
              {form.registrationType === 'GSTIN' && (
                <div><Label>State Code</Label><Input value={form.stateCode ?? ''} onChange={e => setForm(p => ({ ...p, stateCode: e.target.value }))} placeholder="e.g. 27" /></div>
              )}
              <div><Label>Valid From</Label><Input type="date" value={form.validFrom ?? ''} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} /></div>
              <div><Label>Valid To</Label><Input type="date" value={form.validTo ?? ''} onChange={e => setForm(p => ({ ...p, validTo: e.target.value || null }))} placeholder="Blank = Perpetual" /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status ?? 'active'} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reminder (days)</Label><Input type="number" value={form.renewalReminderDays ?? 30} onChange={e => setForm(p => ({ ...p, renewalReminderDays: Number(e.target.value) }))} /></div>
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
