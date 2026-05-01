/**
 * ReturnablePackagingMaster.tsx — Pallets, drums, crates lifecycle.
 * Sprint T-Phase-1.2.5
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@/components/ui/collapsible';
import { Recycle, Plus, ChevronDown, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useReturnablePackaging } from '@/hooks/useReturnablePackaging';
import {
  type ReturnablePackaging, type PackagingKind, type PackagingStatus,
  PACKAGING_KIND_LABELS, PACKAGING_STATUS_LABELS,
} from '@/types/returnable-packaging';
import { dAdd, round2 } from '@/lib/decimal-helpers';

const FMT = (n: number): string => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_BADGE = (s: PackagingStatus): string => {
  if (s === 'in_stock') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (s === 'with_customer') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  if (s === 'returned') return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
  if (s === 'damaged') return 'bg-red-500/10 text-red-700 border-red-500/30';
  return 'bg-muted text-muted-foreground';
};

const BLANK = (entity: string): ReturnablePackaging => ({
  id: '', entity_id: entity, unit_no: '', kind: 'pallet', description: '',
  acquisition_cost: 0, expected_lifetime_cycles: null, current_cycle_count: 0,
  status: 'in_stock',
  current_location: 'IN_STOCK', current_godown_id: null, current_customer_id: null,
  sent_with_dln_id: null, sent_to_customer_id: null, sent_to_customer_name: null,
  sent_at: null, return_due_date: null,
  returned_at: null, return_grn_id: null, return_condition: null,
  notes: null, created_at: '', updated_at: '',
});

export function ReturnablePackagingMasterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { units, createUnit, updateUnit, deleteUnit, markReturned } = useReturnablePackaging(safeEntity);

  const [form, setForm] = useState<ReturnablePackaging>(BLANK(safeEntity));
  const [open, setOpen] = useState(false);
  const [filterKind, setFilterKind] = useState<'all' | PackagingKind>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | PackagingStatus>('all');
  const [overdueOpen, setOverdueOpen] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const isOverdue = (u: ReturnablePackaging): boolean =>
    u.status === 'with_customer' && !!u.return_due_date && u.return_due_date < today;

  const filtered = units.filter(u => {
    if (filterKind !== 'all' && u.kind !== filterKind) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    return true;
  });

  const overdue = units.filter(isOverdue);

  const kpi = useMemo(() => {
    const acc = { total: units.length, in_stock: 0, with_customer: 0, overdue: 0, damaged_lost: 0 };
    units.forEach(u => {
      if (u.status === 'in_stock') acc.in_stock++;
      if (u.status === 'with_customer') acc.with_customer++;
      if (u.status === 'damaged' || u.status === 'lost') acc.damaged_lost++;
      if (isOverdue(u)) acc.overdue++;
    });
    return acc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const overdueValueByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    overdue.forEach(u => {
      const k = u.sent_to_customer_name ?? '—';
      m.set(k, round2(dAdd(m.get(k) ?? 0, u.acquisition_cost)));
    });
    return Array.from(m.entries());
  }, [overdue]);

  const openNew = () => { setForm(BLANK(safeEntity)); setOpen(true); };
  const openEdit = (u: ReturnablePackaging) => { setForm(u); setOpen(true); };

  const handleSave = () => {
    if (!form.unit_no.trim()) { toast.error('Unit No. required'); return; }
    const now = new Date().toISOString();
    if (form.id) updateUnit(form.id, form);
    else createUnit({ ...form, id: `pkg-${crypto.randomUUID()}`, created_at: now, updated_at: now });
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Recycle className="h-5 w-5 text-cyan-500" />
          <h2 className="text-xl font-bold">Returnable Packaging</h2>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> Add Unit
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Total</p><p className="text-lg font-bold">{kpi.total}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">In Stock</p><p className="text-lg font-bold text-emerald-600">{kpi.in_stock}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">With Customer</p><p className="text-lg font-bold text-amber-600">{kpi.with_customer}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Overdue</p><p className="text-lg font-bold text-red-600">{kpi.overdue}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Damaged/Lost</p><p className="text-lg font-bold text-muted-foreground">{kpi.damaged_lost}</p></Card>
      </div>

      {overdue.length > 0 && (
        <Collapsible open={overdueOpen} onOpenChange={setOverdueOpen}>
          <Card className="border-red-500/30">
            <CollapsibleTrigger className="w-full p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-sm">Overdue Returns ({overdue.length})</span>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${overdueOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="p-3 pt-0">
              <div className="space-y-1">
                {overdueValueByCustomer.map(([cust, val]) => (
                  <div key={cust} className="flex items-center justify-between text-xs border-t pt-1">
                    <span>{cust}</span>
                    <span className="font-mono text-red-600">{FMT(val)} liability</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <div className="flex items-center gap-2">
        <Select value={filterKind} onValueChange={v => setFilterKind(v as typeof filterKind)}>
          <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {(Object.keys(PACKAGING_KIND_LABELS) as PackagingKind[]).map(k =>
              <SelectItem key={k} value={k}>{PACKAGING_KIND_LABELS[k]}</SelectItem>,
            )}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {(Object.keys(PACKAGING_STATUS_LABELS) as PackagingStatus[]).map(k =>
              <SelectItem key={k} value={k}>{PACKAGING_STATUS_LABELS[k]}</SelectItem>,
            )}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit No</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Cycles</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground text-sm py-6">No units</TableCell></TableRow>
            )}
            {filtered.map(u => (
              <TableRow key={u.id} className={isOverdue(u) ? 'bg-red-500/5' : ''}>
                <TableCell className="font-mono text-xs">{u.unit_no}</TableCell>
                <TableCell className="text-xs">{PACKAGING_KIND_LABELS[u.kind]}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_BADGE(u.status)}>{PACKAGING_STATUS_LABELS[u.status]}</Badge></TableCell>
                <TableCell className="text-xs">{u.sent_to_customer_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{u.sent_at?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell className="text-xs">{u.return_due_date ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{FMT(u.acquisition_cost)}</TableCell>
                <TableCell className="font-mono text-xs">{u.current_cycle_count}{u.expected_lifetime_cycles ? `/${u.expected_lifetime_cycles}` : ''}</TableCell>
                <TableCell>
                  {u.status === 'with_customer' && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markReturned(u.id, 'good', null)}>
                      Mark Returned
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(u)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteUnit(u.id)} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{form.id ? 'Edit' : 'New'} Returnable Unit</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit No *</Label>
                <Input value={form.unit_no} onChange={e => setForm({ ...form, unit_no: e.target.value })} />
              </div>
              <div>
                <Label>Kind</Label>
                <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v as PackagingKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PACKAGING_KIND_LABELS) as PackagingKind[]).map(k =>
                      <SelectItem key={k} value={k}>{PACKAGING_KIND_LABELS[k]}</SelectItem>,
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Acquisition Cost (₹)</Label>
                <Input type="number" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Expected Cycles</Label>
                <Input type="number" value={form.expected_lifetime_cycles ?? ''} onChange={e => setForm({ ...form, expected_lifetime_cycles: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as PackagingStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PACKAGING_STATUS_LABELS) as PackagingStatus[]).map(k =>
                      <SelectItem key={k} value={k}>{PACKAGING_STATUS_LABELS[k]}</SelectItem>,
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Location</Label>
                <Input value={form.current_location ?? ''} onChange={e => setForm({ ...form, current_location: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value || null })} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
