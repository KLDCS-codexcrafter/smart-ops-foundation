/**
 * PTPTracker.tsx — Promise-to-Pay register
 * [JWT] GET/PUT /api/receivx/ptps
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { SidebarProvider } from '@/components/ui/sidebar';
import { RefreshCw, CheckCircle2, XCircle, Ban, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { type PTP, type PTPStatus, receivxPTPsKey } from '@/types/receivx';
import type { Voucher } from '@/types/voucher';
import { evaluatePTPs, computePTPKeptRatio } from '@/lib/receivx-engine';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

const STATUS_TONE: Record<PTPStatus, string> = {
  active: 'bg-blue-100 text-blue-800',
  kept: 'bg-green-100 text-green-800',
  broken: 'bg-red-100 text-red-800',
  partial: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

export function PTPTrackerPanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [ptps, setPtps] = useState<PTP[]>([]);
  const [editFor, setEditFor] = useState<PTP | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<PTPStatus | 'all'>('all');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    try {
      // [JWT] GET /api/receivx/ptps
      const list: PTP[] = JSON.parse(localStorage.getItem(receivxPTPsKey(entityCode)) || '[]');
      setPtps(list);
    } catch { /* noop */ }
  }, [entityCode]);

  const persist = useCallback((next: PTP[]) => {
    try {
      // [JWT] PUT /api/receivx/ptps
      localStorage.setItem(receivxPTPsKey(entityCode), JSON.stringify(next));
    } catch { toast.error('Save failed'); }
  }, [entityCode]);

  const handleEvaluateAll = useCallback(() => {
    let vouchers: Voucher[] = [];
    try {
      // [JWT] GET /api/accounting/vouchers
      vouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${entityCode}`) || '[]');
    } catch { /* noop */ }
    const receipts = vouchers
      .filter(v => v.base_voucher_type === 'Receipt' && v.status === 'posted' && !v.is_cancelled && v.party_id)
      .map(v => ({
        voucher_no: v.voucher_no,
        party_id: v.party_id as string,
        amount: v.net_amount,
        date: v.date,
      }));
    const next = evaluatePTPs(ptps, receipts, today());
    setPtps(next);
    persist(next);
    const kept = next.filter(p => p.status === 'kept').length;
    const broken = next.filter(p => p.status === 'broken').length;
    const partial = next.filter(p => p.status === 'partial').length;
    toast.success(`${kept} kept · ${broken} broken · ${partial} partial`);
  }, [ptps, entityCode, persist]);

  const detailOpen = editFor !== null;
  useCtrlS(() => { if (!detailOpen) handleEvaluateAll(); });

  const filtered = useMemo(() => ptps.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchCustomer && !p.party_name.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
    if (fromDate && p.created_at.slice(0, 10) < fromDate) return false;
    if (toDate && p.created_at.slice(0, 10) > toDate) return false;
    return true;
  }), [ptps, filterStatus, searchCustomer, fromDate, toDate]);

  const summary = useMemo(() => {
    const ratio = computePTPKeptRatio(ptps, monthStart(), today());
    const active = ptps.filter(p => p.status === 'active').length;
    return { ...ratio, active, total: ratio.kept + ratio.broken + ratio.partial };
  }, [ptps]);

  const markStatus = useCallback((id: string, status: PTPStatus) => {
    const now = new Date().toISOString();
    const next = ptps.map(p => p.id === id
      ? { ...p, status, evaluation_date: now.slice(0, 10), updated_at: now } : p);
    setPtps(next);
    persist(next);
    toast.success(`PTP marked ${status}`);
  }, [ptps, persist]);

  const saveNotes = useCallback(() => {
    if (!editFor) return;
    const now = new Date().toISOString();
    const next = ptps.map(p => p.id === editFor.id ? { ...p, notes: editNotes, updated_at: now } : p);
    setPtps(next);
    persist(next);
    toast.success('Notes updated');
    setEditFor(null);
  }, [editFor, editNotes, ptps, persist]);

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Promise-to-Pay Tracker</h1>
          <p className="text-xs text-muted-foreground">CFO collections KPI register</p>
        </div>
        <Button data-primary onClick={handleEvaluateAll} className="bg-amber-500 hover:bg-amber-600 text-white">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Evaluate All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">This Month</p>
          <p className="text-xl font-bold font-mono">{summary.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Kept</p>
          <p className="text-xl font-bold font-mono text-green-600">{summary.kept} ({summary.pctKept}%)</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Broken</p>
          <p className="text-xl font-bold font-mono text-red-600">{summary.broken}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Active</p>
          <p className="text-xl font-bold font-mono text-blue-600">{summary.active}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input placeholder="Customer..." value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} onKeyDown={onEnterNext} className="w-48 h-8 text-xs" />
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PTPStatus | 'all')}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="kept">Kept</SelectItem>
            <SelectItem value="broken">Broken</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Logged</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Invoice</TableHead>
              <TableHead className="text-xs">Promised</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Receipt</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No PTPs match.</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-xs font-mono">{p.created_at.slice(0, 10)}</TableCell>
                <TableCell className="text-xs">{p.party_name}</TableCell>
                <TableCell className="text-xs font-mono">{p.voucher_no}</TableCell>
                <TableCell className="text-xs font-mono">{p.promised_date}</TableCell>
                <TableCell className="text-xs font-mono text-right">{fmt(p.promised_amount)}</TableCell>
                <TableCell className="text-xs font-mono">{p.actual_receipt_voucher_no ?? '—'}</TableCell>
                <TableCell><Badge className={`${STATUS_TONE[p.status]} text-[10px]`}>{p.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {p.status === 'active' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Mark Kept" onClick={() => markStatus(p.id, 'kept')}>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Mark Broken" onClick={() => markStatus(p.id, 'broken')}>
                          <XCircle className="h-3 w-3 text-red-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Cancel" onClick={() => markStatus(p.id, 'cancelled')}>
                          <Ban className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Edit notes" onClick={() => { setEditFor(p); setEditNotes(p.notes); }}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={editFor !== null} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit PTP Notes</DialogTitle></DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} onKeyDown={onEnterNext} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditFor(null)}>Cancel</Button>
              <Button data-primary onClick={saveNotes} className="bg-amber-500 hover:bg-amber-600 text-white">Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PTPTracker() {
  return (
    <SidebarProvider>
      <PTPTrackerPanel entityCode="SMRT" />
    </SidebarProvider>
  );
}
