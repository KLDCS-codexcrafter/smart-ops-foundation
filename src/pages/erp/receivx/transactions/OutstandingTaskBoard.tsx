/**
 * OutstandingTaskBoard.tsx — Kanban of receivable tasks
 * 6 columns: Open | In Progress | Promised | Partial | Disputed | Legal
 * [JWT] GET/PUT /api/receivx/tasks
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { SidebarProvider } from '@/components/ui/sidebar';
import { RefreshCw, MessageCircle, Mail, CalendarClock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type OutstandingTask, type TaskStatus, type AgeBucket, type PTP,
  receivxTasksKey, receivxPTPsKey,
} from '@/types/receivx';
import type { OutstandingEntry } from '@/types/voucher';
import { reconcileTasks } from '@/lib/receivx-engine';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

const COLUMNS: { id: TaskStatus; label: string; tone: string }[] = [
  { id: 'open',        label: 'Open',        tone: 'border-blue-500' },
  { id: 'in_progress', label: 'In Progress', tone: 'border-amber-500' },
  { id: 'promised',    label: 'Promised',    tone: 'border-green-500' },
  { id: 'partial',     label: 'Partial',     tone: 'border-amber-700' },
  { id: 'disputed',    label: 'Disputed',    tone: 'border-red-500' },
  { id: 'legal',       label: 'Legal',       tone: 'border-red-700' },
];

const BUCKETS: AgeBucket[] = ['0-30', '31-60', '61-90', '91-180', '180+'];

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function OutstandingTaskBoardPanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [tasks, setTasks] = useState<OutstandingTask[]>([]);
  const [ptpDialogFor, setPtpDialogFor] = useState<OutstandingTask | null>(null);
  const [reassignFor, setReassignFor] = useState<OutstandingTask | null>(null);
  const [filterBucket, setFilterBucket] = useState<AgeBucket | 'all'>('all');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [ptpAmount, setPtpAmount] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [ptpNotes, setPtpNotes] = useState('');

  const detailOpen = ptpDialogFor !== null || reassignFor !== null;

  const persist = useCallback((next: OutstandingTask[]) => {
    try {
      // [JWT] PUT /api/receivx/tasks
      localStorage.setItem(receivxTasksKey(entityCode), JSON.stringify(next));
    } catch { toast.error('Save failed'); }
  }, [entityCode]);

  const handleReconcile = useCallback(() => {
    let outstanding: OutstandingEntry[] = [];
    let existingTasks: OutstandingTask[] = [];
    try {
      // [JWT] GET /api/receivx/tasks
      existingTasks = JSON.parse(localStorage.getItem(receivxTasksKey(entityCode)) || '[]');
      // [JWT] GET /api/accounting/outstanding
      outstanding = JSON.parse(localStorage.getItem(`erp_outstanding_${entityCode}`) || '[]');
    } catch { /* noop */ }
    const debtors = outstanding.filter(o => o.party_type === 'debtor');
    const reconciled = reconcileTasks(existingTasks, debtors, new Date().toISOString().slice(0, 10), entityCode);
    setTasks(reconciled);
    persist(reconciled);
    toast.success(`Reconciled: ${reconciled.length} tasks`);
  }, [entityCode, persist]);

  useCtrlS(() => { if (!detailOpen) handleReconcile(); });

  useEffect(() => {
    let existingTasks: OutstandingTask[] = [];
    let outstanding: OutstandingEntry[] = [];
    try {
      // [JWT] GET /api/receivx/tasks
      existingTasks = JSON.parse(localStorage.getItem(receivxTasksKey(entityCode)) || '[]');
      // [JWT] GET /api/accounting/outstanding
      outstanding = JSON.parse(localStorage.getItem(`erp_outstanding_${entityCode}`) || '[]');
    } catch { /* noop */ }
    const debtors = outstanding.filter(o => o.party_type === 'debtor');
    const reconciled = reconcileTasks(existingTasks, debtors, new Date().toISOString().slice(0, 10), entityCode);
    setTasks(reconciled);
    persist(reconciled);
  }, [entityCode, persist]);

  const moveTask = useCallback((id: string, to: TaskStatus) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (to === 'promised') { setPtpDialogFor(t); return; }
    const next = tasks.map(x => x.id === id ? { ...x, status: to, updated_at: new Date().toISOString() } : x);
    setTasks(next);
    persist(next);
  }, [tasks, persist]);

  const savePTP = useCallback(() => {
    if (!ptpDialogFor) return;
    const amt = Number(ptpAmount);
    if (!amt || !ptpDate) { toast.error('Enter date and amount'); return; }
    const now = new Date().toISOString();
    const ptp: PTP = {
      id: `ptp-${Date.now()}`,
      entity_id: entityCode,
      task_id: ptpDialogFor.id,
      party_id: ptpDialogFor.party_id,
      party_name: ptpDialogFor.party_name,
      voucher_no: ptpDialogFor.voucher_no,
      promised_date: ptpDate,
      promised_amount: amt,
      actual_receipt_voucher_no: null,
      actual_receipt_date: null,
      actual_amount: 0,
      status: 'active',
      evaluation_date: null,
      recorded_by: 'current-user',
      recorded_via: 'call',
      notes: ptpNotes,
      created_at: now,
      updated_at: now,
    };
    try {
      // [JWT] GET /api/receivx/ptps
      const existing: PTP[] = JSON.parse(localStorage.getItem(receivxPTPsKey(entityCode)) || '[]');
      // [JWT] POST /api/receivx/ptps
      localStorage.setItem(receivxPTPsKey(entityCode), JSON.stringify([...existing, ptp]));
    } catch { toast.error('PTP save failed'); return; }
    const next = tasks.map(x => x.id === ptpDialogFor.id
      ? { ...x, status: 'promised' as TaskStatus, active_ptp_id: ptp.id, updated_at: now } : x);
    setTasks(next);
    persist(next);
    toast.success('PTP recorded');
    setPtpDialogFor(null);
    setPtpAmount(''); setPtpDate(''); setPtpNotes('');
  }, [ptpDialogFor, ptpAmount, ptpDate, ptpNotes, entityCode, tasks, persist]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterBucket !== 'all' && t.age_bucket !== filterBucket) return false;
    if (searchCustomer && !t.party_name.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
    return t.status !== 'closed';
  }), [tasks, filterBucket, searchCustomer]);

  const totals = useMemo(() => ({
    count: filtered.length,
    pending: filtered.reduce((s, t) => s + t.pending_amount, 0),
  }), [filtered]);

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Outstanding Task Board</h1>
          <p className="text-xs text-muted-foreground">{totals.count} tasks · {fmt(totals.pending)} pending</p>
        </div>
        <Button data-primary onClick={handleReconcile} className="bg-amber-500 hover:bg-amber-600 text-white">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Reconcile from Outstanding
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterBucket} onValueChange={(v) => setFilterBucket(v as AgeBucket | 'all')}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All buckets</SelectItem>
            {BUCKETS.map(b => <SelectItem key={b} value={b}>{b} days</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search customer..."
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          onKeyDown={onEnterNext}
          className="w-60 h-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {COLUMNS.map(col => {
          const cards = filtered.filter(t => t.status === col.id);
          const sum = cards.reduce((s, t) => s + t.pending_amount, 0);
          return (
            <div key={col.id} className={`rounded-lg border-t-2 ${col.tone} bg-card p-2 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">{col.label}</p>
                <Badge variant="outline" className="text-[9px]">{cards.length}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mb-2">{fmt(sum)}</p>
              <div className="space-y-2">
                {cards.map(t => (
                  <Card key={t.id} className="p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{t.party_name}</p>
                      <Badge variant="outline" className="text-[9px]">{t.age_bucket}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{t.voucher_no}</p>
                    <p className="font-mono text-amber-600 font-bold">{fmt(t.pending_amount)}</p>
                    <p className="text-[10px] text-muted-foreground">{t.age_days}d overdue</p>
                    <div className="flex items-center gap-1 pt-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="WhatsApp">
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Email">
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="PTP" onClick={() => setPtpDialogFor(t)}>
                        <CalendarClock className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Reassign" onClick={() => setReassignFor(t)}>
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select value={t.status} onValueChange={(v) => moveTask(t.id, v as TaskStatus)}>
                      <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={ptpDialogFor !== null} onOpenChange={(o) => !o && setPtpDialogFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Promise to Pay — {ptpDialogFor?.party_name}</DialogTitle></DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div>
              <p className="text-xs mb-1">Promised date</p>
              <Input type="date" value={ptpDate} onChange={(e) => setPtpDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <p className="text-xs mb-1">Promised amount (₹)</p>
              <Input type="number" value={ptpAmount} onChange={(e) => setPtpAmount(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <p className="text-xs mb-1">Notes</p>
              <Input value={ptpNotes} onChange={(e) => setPtpNotes(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPtpDialogFor(null)}>Cancel</Button>
              <Button data-primary onClick={savePTP} className="bg-amber-500 hover:bg-amber-600 text-white">Save PTP</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignFor !== null} onOpenChange={(o) => !o && setReassignFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign — {reassignFor?.party_name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Reassignment to collection executive coming next iteration.</p>
          <DialogFooter>
            <Button data-primary onClick={() => setReassignFor(null)} className="bg-amber-500 hover:bg-amber-600 text-white">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OutstandingTaskBoard() {
  return (
    <SidebarProvider>
      <OutstandingTaskBoardPanel entityCode="SMRT" />
    </SidebarProvider>
  );
}
