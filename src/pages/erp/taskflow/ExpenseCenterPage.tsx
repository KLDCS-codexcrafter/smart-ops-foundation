/**
 * @file        src/pages/erp/taskflow/ExpenseCenterPage.tsx
 * @purpose     Cross-task expense register · pending-approval queue · GST/TDS column totals (carried S141 T2 → S142 Block 1b)
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Pillar A.6.4 · TaskFlow Arc
 * @reads-from  taskflow-accountability-engine (listExpenses · approveExpense · rejectExpense)
 * @canon       Indian locale · ₹ paise-aware display via /100. [JWT] Voucher emission to FinCore arrives with P2BB.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Receipt, Check, X } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listExpenses, approveExpense, rejectExpense,
} from '@/lib/taskflow-accountability-engine';
import type { TaskExpense } from '@/types/taskflow';

type StatusChip = 'all' | TaskExpense['status'];
const STATUSES: StatusChip[] = ['all', 'draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

const fmtINR = (n: number): string =>
  `₹ ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

export default function ExpenseCenterPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [expenses, setExpenses] = useState<TaskExpense[]>([]);
  const [filter, setFilter] = useState<StatusChip>('submitted');
  const [decision, setDecision] = useState<{ id: string; kind: 'approve' | 'reject' } | null>(null);
  const [financeNote, setFinanceNote] = useState('');

  const refresh = (): void => { setExpenses(listExpenses(entityCode)); };
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entityCode]);

  const visible = useMemo(
    () => filter === 'all' ? expenses : expenses.filter((e) => e.status === filter),
    [expenses, filter],
  );

  const totals = useMemo(() => {
    const acc = { amount: 0, tax: 0, tds: 0, net: 0 };
    for (const e of visible) {
      acc.amount += e.amount;
      acc.tax += e.taxAmount ?? 0;
      acc.tds += e.tdsAmount ?? 0;
      acc.net += (e.amount + (e.taxAmount ?? 0) - (e.tdsAmount ?? 0));
    }
    return acc;
  }, [visible]);

  const byStatus = useMemo(() => {
    const m: Record<TaskExpense['status'], number> = { draft: 0, submitted: 0, approved: 0, rejected: 0, reimbursed: 0 };
    for (const e of expenses) m[e.status] = (m[e.status] ?? 0) + 1;
    return m;
  }, [expenses]);

  const onApply = (): void => {
    if (!decision || !user) return;
    try {
      if (decision.kind === 'approve') {
        approveExpense(entityCode, decision.id, user.id, financeNote.trim() || undefined);
        toast.success('Expense approved');
      } else {
        rejectExpense(entityCode, decision.id, user.id, financeNote.trim() || undefined);
        toast.success('Expense rejected');
      }
      setDecision(null);
      setFinanceNote('');
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" /> Expense Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-task register · pending-approval queue · GST/TDS visibility. [JWT] Voucher emission to FinCore arrives with P2BB.
          </p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">By status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 font-mono text-sm">
            <span>Draft: {byStatus.draft}</span>
            <span>Submitted: <strong>{byStatus.submitted}</strong></span>
            <span>Approved: {byStatus.approved}</span>
            <span>Rejected: {byStatus.rejected}</span>
            <span>Reimbursed: {byStatus.reimbursed}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{filter === 'all' ? 'All expenses' : `Status: ${filter}`} · {visible.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No expenses in this view.</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((e) => {
                    const net = e.amount + (e.taxAmount ?? 0) - (e.tdsAmount ?? 0);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.taskId}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell className="font-mono text-right">{fmtINR(e.amount)}</TableCell>
                        <TableCell className="font-mono text-right">{fmtINR(e.taxAmount ?? 0)}</TableCell>
                        <TableCell className="font-mono text-right">{fmtINR(e.tdsAmount ?? 0)}</TableCell>
                        <TableCell className="font-mono text-right">{fmtINR(net)}</TableCell>
                        <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {e.status === 'submitted' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setDecision({ id: e.id, kind: 'approve' }); setFinanceNote(''); }}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setDecision({ id: e.id, kind: 'reject' }); setFinanceNote(''); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-3 flex justify-end gap-6 font-mono text-sm border-t pt-3">
                <span>Amount: {fmtINR(totals.amount)}</span>
                <span>GST: {fmtINR(totals.tax)}</span>
                <span>TDS: {fmtINR(totals.tds)}</span>
                <span>Net: <strong>{fmtINR(totals.net)}</strong></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!decision} onOpenChange={(o) => { if (!o) { setDecision(null); setFinanceNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision?.kind === 'approve' ? 'Approve expense' : 'Reject expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="financeNote">Finance note (optional)</Label>
            <Input id="financeNote" value={financeNote} onChange={(e) => setFinanceNote(e.target.value)} placeholder="e.g. matches bill · receipt #..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecision(null); setFinanceNote(''); }}>Cancel</Button>
            <Button onClick={onApply}>{decision?.kind === 'approve' ? 'Approve' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
