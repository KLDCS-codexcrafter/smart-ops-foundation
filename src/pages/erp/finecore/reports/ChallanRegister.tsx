/**
 * ChallanRegister.tsx — TDS Challan Register (fc-rpt-challan)
 * Full management panel with add/edit/delete and deduction linking
 * [JWT] All data via localStorage
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { inr, today } from './reportUtils';
import type { ChallanEntry, TDSDeductionEntry } from '@/types/compliance';
import { challansKey, tdsDeductionsKey } from '@/types/compliance';

function ls<T>(key: string): T[] { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } }
function ss<T>(key: string, d: T[]) { localStorage.setItem(key, JSON.stringify(d)); }

interface Props { entityCode: string; }

const emptyForm = (): Omit<ChallanEntry, 'id' | 'entity_id' | 'created_at' | 'updated_at'> => ({
  challan_no: '', bsr_code: '', cin_no: '', bank_name: '', date: today(),
  major_head: '0020', minor_head: '200', tds_section: '', amount: 0, interest: 0, penalty: 0,
  assessment_year: '2026-27', quarter: 'Q1', period_from: '', period_to: '',
  covered_deduction_ids: [], status: 'pending',
});

export function ChallanRegisterPanel({ entityCode }: Props) {
  const [challans, setChallans] = useState<ChallanEntry[]>(() => ls<ChallanEntry>(challansKey(entityCode)));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // [JWT] GET /api/compliance/tds-deductions
  const tdsEntries = useMemo(() => ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode)).filter(e => e.status !== 'cancelled'), [entityCode]);
  const uncoveredTDS = tdsEntries.filter(e => !e.challan_id).reduce((s, e) => s + e.net_tds_amount, 0);

  // Due date alerts
  const dueAlerts = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const sections = new Set(tdsEntries.filter(e => e.date.startsWith(monthKey) && !e.challan_id).map(e => e.tds_section));
    const dueDay = lastMonth.getMonth() + 1 === 3 ? 30 : 7;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
    return Array.from(sections).map(s => ({ section: s, month: monthKey, dueDate: dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }));
  }, [tdsEntries]);

  const handleSave = useCallback(() => {
    if (!form.challan_no) { toast.error('Challan No is required'); return; }
    const now = new Date().toISOString();
    const store = ls<ChallanEntry>(challansKey(entityCode));
    if (editId) {
      const idx = store.findIndex(c => c.id === editId);
      if (idx >= 0) store[idx] = { ...store[idx], ...form, updated_at: now };
    } else {
      store.push({ ...form, id: `ch-${Date.now()}`, entity_id: entityCode, created_at: now, updated_at: now });
    }
    // [JWT] POST /api/compliance/tds-challans
    ss(challansKey(entityCode), store);
    // Link covered deductions
    if (form.covered_deduction_ids.length > 0) {
      const tds = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
      tds.forEach(t => { if (form.covered_deduction_ids.includes(t.id)) t.challan_id = editId ?? store[store.length - 1].id; });
      ss(tdsDeductionsKey(entityCode), tds);
    }
    setChallans(store); setSheetOpen(false); setEditId(null); setForm(emptyForm());
    toast.success(editId ? 'Challan updated' : 'Challan added');
  }, [form, editId, entityCode]);

  const handleDelete = useCallback((id: string) => {
    const store = ls<ChallanEntry>(challansKey(entityCode)).filter(c => c.id !== id);
    ss(challansKey(entityCode), store);
    // Clear challan_id from linked deductions
    const tds = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
    tds.forEach(t => { if (t.challan_id === id) t.challan_id = undefined; });
    ss(tdsDeductionsKey(entityCode), tds);
    setChallans(store); setDeleteConfirm(null);
    toast.success('Challan deleted');
  }, [entityCode]);

  const openEdit = (ch: ChallanEntry) => {
    setForm({ challan_no: ch.challan_no, bsr_code: ch.bsr_code, cin_no: ch.cin_no, bank_name: ch.bank_name, date: ch.date, major_head: ch.major_head, minor_head: ch.minor_head, tds_section: ch.tds_section, amount: ch.amount, interest: ch.interest, penalty: ch.penalty, assessment_year: ch.assessment_year, quarter: ch.quarter, period_from: ch.period_from, period_to: ch.period_to, covered_deduction_ids: ch.covered_deduction_ids, status: ch.status });
    setEditId(ch.id); setSheetOpen(true);
  };

  const totalDeposited = challans.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Challan Register</h2><p className="text-xs text-muted-foreground">TDS challan deposit tracking</p></div>
        <Button data-primary onClick={() => { setForm(emptyForm()); setEditId(null); setSheetOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add New Challan</Button>
      </div>

      {dueAlerts.map(a => (
        <Alert key={a.section} className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700">TDS u/s {a.section} for {a.month} due by {a.dueDate}.</AlertDescription>
        </Alert>
      ))}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Challans', value: String(challans.length) },
          { label: 'TDS Deposited', value: inr(totalDeposited) },
          { label: 'Periods Covered', value: [...new Set(challans.map(c => c.quarter))].join(', ') || '-' },
          { label: 'Uncovered TDS', value: inr(uncoveredTDS) },
        ].map(c => (<Card key={c.label}><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground">{c.label}</p><p className="text-lg font-bold">{c.value}</p></CardContent></Card>))}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Challan No</TableHead><TableHead className="text-xs">BSR</TableHead>
            <TableHead className="text-xs">CIN</TableHead><TableHead className="text-xs">Bank</TableHead>
            <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Section</TableHead>
            <TableHead className="text-xs">AY</TableHead><TableHead className="text-xs">Quarter</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead><TableHead className="text-xs text-right">Interest</TableHead>
            <TableHead className="text-xs text-right">Total</TableHead><TableHead className="text-xs text-center">Linked</TableHead>
            <TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {challans.length === 0 && <TableRow><TableCell colSpan={14} className="text-center text-xs text-muted-foreground py-8">No challans recorded</TableCell></TableRow>}
            {challans.map(ch => (
              <TableRow key={ch.id}>
                <TableCell className="text-xs font-mono">{ch.challan_no}</TableCell>
                <TableCell className="text-xs font-mono">{ch.bsr_code}</TableCell>
                <TableCell className="text-xs font-mono">{ch.cin_no}</TableCell>
                <TableCell className="text-xs">{ch.bank_name}</TableCell>
                <TableCell className="text-xs">{ch.date}</TableCell>
                <TableCell className="text-xs">{ch.tds_section}</TableCell>
                <TableCell className="text-xs">{ch.assessment_year}</TableCell>
                <TableCell className="text-xs">{ch.quarter}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(ch.amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(ch.interest)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{inr(ch.amount + ch.interest + ch.penalty)}</TableCell>
                <TableCell className="text-xs text-center">{ch.covered_deduction_ids.length}</TableCell>
                <TableCell><Badge variant="outline" className={ch.status === 'paid' ? 'bg-green-500/10 text-green-700 border-green-500/30 text-[10px]' : 'bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]'}>{ch.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ch)}><Edit2 className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(ch.id)}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto" side="right">
          <SheetHeader><SheetTitle>{editId ? 'Edit Challan' : 'Add New Challan'}</SheetTitle></SheetHeader>
          <div data-keyboard-form className="space-y-3 mt-4">
            <div><Label className="text-xs">Challan No</Label><Input value={form.challan_no} onChange={e => setForm(f => ({ ...f, challan_no: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">BSR Code</Label><Input value={form.bsr_code} onChange={e => setForm(f => ({ ...f, bsr_code: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">CIN No</Label><Input value={form.cin_no} onChange={e => setForm(f => ({ ...f, cin_no: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Major Head</Label>
              <Select value={form.major_head} onValueChange={v => setForm(f => ({ ...f, major_head: v as '0020' | '0021' }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0020">0020 — Company</SelectItem><SelectItem value="0021">0021 — Non-company</SelectItem></SelectContent>
              </Select></div>
            <div><Label className="text-xs">Minor Head</Label>
              <Select value={form.minor_head} onValueChange={v => setForm(f => ({ ...f, minor_head: v as '200' | '400' }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="200">200 — TDS Payable</SelectItem><SelectItem value="400">400 — Regular Assessment</SelectItem></SelectContent>
              </Select></div>
            <div><Label className="text-xs">TDS Section</Label><Input value={form.tds_section} onChange={e => setForm(f => ({ ...f, tds_section: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Amount</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Interest</Label><Input type="number" value={form.interest || ''} onChange={e => setForm(f => ({ ...f, interest: Number(e.target.value) }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Penalty</Label><Input type="number" value={form.penalty || ''} onChange={e => setForm(f => ({ ...f, penalty: Number(e.target.value) }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Assessment Year</Label><Input value={form.assessment_year} onChange={e => setForm(f => ({ ...f, assessment_year: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Quarter</Label>
              <Select value={form.quarter} onValueChange={v => setForm(f => ({ ...f, quarter: v as any }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{['Q1','Q2','Q3','Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Period From</Label><Input type="date" value={form.period_from} onChange={e => setForm(f => ({ ...f, period_from: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Period To</Label><Input type="date" value={form.period_to} onChange={e => setForm(f => ({ ...f, period_to: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'pending' | 'paid' }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select></div>
            <Button data-primary className="w-full mt-4" onClick={handleSave}>{editId ? 'Update' : 'Save'}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Challan?</DialogTitle></DialogHeader>
          <p className="text-sm">This will unlink all associated TDS deduction entries.</p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default function ChallanRegister() { return <ChallanRegisterPanel entityCode="SMRT" />; }
