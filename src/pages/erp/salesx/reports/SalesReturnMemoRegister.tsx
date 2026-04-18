/**
 * SalesReturnMemoRegister.tsx — Register & approval for sales return memos
 * Sprint 6B. Approve / Reject / Convert-to-CN actions per row.
 * [JWT] GET /api/salesx/sales-return-memos
 * [JWT] PATCH /api/salesx/sales-return-memos/:id (approve/reject)
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Eye, Check, X, FileMinus, Send } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  salesReturnMemosKey,
  type SalesReturnMemo,
  type SalesReturnMemoStatus,
} from '@/types/sales-return-memo';

interface Props { entityCode: string }

const STATUS_FILTERS: Array<{ id: 'all' | SalesReturnMemoStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'credit_note_posted', label: 'CN Posted' },
];

const STATUS_COLOR: Record<SalesReturnMemoStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  approved: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  credit_note_posted: 'bg-green-500/15 text-green-700 border-green-500/30',
};

const STATUS_LABEL: Record<SalesReturnMemoStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  credit_note_posted: 'CN Posted',
};

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso); const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function SalesReturnMemoRegisterPanel({ entityCode }: Props) {
  const navigate = useNavigate();
  const [refreshTick, setRefreshTick] = useState(0);
  const memos = useMemo(
    () => ls<SalesReturnMemo>(salesReturnMemosKey(entityCode))
      .sort((a, b) => b.memo_date.localeCompare(a.memo_date)),
    [entityCode, refreshTick],
  );

  const [statusFilter, setStatusFilter] = useState<'all' | SalesReturnMemoStatus>('all');
  const filtered = useMemo(
    () => statusFilter === 'all' ? memos : memos.filter(m => m.status === statusFilter),
    [memos, statusFilter],
  );

  // Approve dialog
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // View dialog
  const [viewId, setViewId] = useState<string | null>(null);

  const reload = () => setRefreshTick(t => t + 1);

  const persistAll = (next: SalesReturnMemo[]) => {
    // [JWT] PATCH /api/salesx/sales-return-memos
    localStorage.setItem(salesReturnMemosKey(entityCode), JSON.stringify(next));
    reload();
  };

  const handleApprove = useCallback(() => {
    if (!approveId) return;
    const all = ls<SalesReturnMemo>(salesReturnMemosKey(entityCode));
    const idx = all.findIndex(m => m.id === approveId);
    if (idx < 0) return;
    const now = new Date().toISOString();
    all[idx] = {
      ...all[idx],
      status: 'approved',
      approved_by_user: 'Current User',
      approved_at: now,
      approval_notes: approveNotes.trim() || null,
      updated_at: now,
    };
    persistAll(all);
    toast.success(`Memo ${all[idx].memo_no} approved`);
    setApproveId(null); setApproveNotes('');
  }, [approveId, approveNotes, entityCode]);

  const handleReject = useCallback(() => {
    if (!rejectId) return;
    if (rejectReason.trim().length < 10) {
      toast.error('Please provide a rejection reason (min. 10 characters)');
      return;
    }
    const all = ls<SalesReturnMemo>(salesReturnMemosKey(entityCode));
    const idx = all.findIndex(m => m.id === rejectId);
    if (idx < 0) return;
    const now = new Date().toISOString();
    all[idx] = {
      ...all[idx],
      status: 'rejected',
      rejection_reason: rejectReason.trim(),
      updated_at: now,
    };
    persistAll(all);
    toast.success(`Memo ${all[idx].memo_no} rejected`);
    setRejectId(null); setRejectReason('');
  }, [rejectId, rejectReason, entityCode]);

  const handleConvert = (m: SalesReturnMemo) => {
    navigate(`/erp/accounting/vouchers/credit-note?from_memo=${m.id}`);
  };

  // Summary
  const summary = useMemo(() => {
    const month = memos.filter(m => isThisMonth(m.memo_date));
    return {
      raised: month.length,
      approved: month.filter(m => m.status === 'approved' || m.status === 'credit_note_posted').length,
      rejected: month.filter(m => m.status === 'rejected').length,
      posted: month.filter(m => m.status === 'credit_note_posted').length,
    };
  }, [memos]);

  const viewMemo = useMemo(
    () => viewId ? memos.find(m => m.id === viewId) ?? null : null,
    [viewId, memos],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales Return Memo Register</h1>
        <p className="text-sm text-muted-foreground">
          Approve memos raised by field force; convert approved memos into Credit Notes.
        </p>
      </div>

      {/* Summary */}
      <Card className="border-orange-500/30">
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">This month — raised</p>
            <p className="text-xl font-bold font-mono">{summary.raised}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-xl font-bold font-mono text-blue-700">{summary.approved}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-xl font-bold font-mono text-destructive">{summary.rejected}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CN Posted</p>
            <p className="text-xl font-bold font-mono text-green-700">{summary.posted}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.id} size="sm"
            variant={statusFilter === f.id ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f.id)}
            className={cn('h-7 text-xs', statusFilter === f.id && 'bg-orange-500 hover:bg-orange-600')}
          >{f.label}</Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No memos found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Memo No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Raised By</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Against Invoice</TableHead>
                  <TableHead className="text-xs text-right">Total ₹</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                    <TableCell className="text-xs">{m.memo_date}</TableCell>
                    <TableCell className="text-xs">
                      <div>{m.raised_by_person_name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{m.raised_by_person_type}</div>
                    </TableCell>
                    <TableCell className="text-xs">{m.customer_name}</TableCell>
                    <TableCell className="text-xs font-mono">{m.against_invoice_no}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {m.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[m.status])}>
                        {STATUS_LABEL[m.status]}
                      </Badge>
                      {m.credit_note_voucher_no && (
                        <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                          CN: {m.credit_note_voucher_no}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                              onClick={() => { setApproveId(m.id); setApproveNotes(''); }}>
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                              onClick={() => { setRejectId(m.id); setRejectReason(''); }}>
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {m.status === 'approved' && (
                          <Button data-primary size="sm" className="h-7 text-[10px] px-2 bg-orange-500 hover:bg-orange-600"
                            onClick={() => handleConvert(m)}>
                            <Send className="h-3 w-3 mr-1" /> Convert to CN
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2"
                          onClick={() => setViewId(m.id)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve dialog */}
      <Dialog open={!!approveId} onOpenChange={o => !o && setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Sales Return Memo</DialogTitle>
            <DialogDescription>Approval notes are optional but recommended.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={approveNotes}
            onChange={e => setApproveNotes(e.target.value)}
            onKeyDown={onEnterNext as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>}
            placeholder="Notes for the team (optional)"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button data-primary onClick={handleApprove} className="bg-orange-500 hover:bg-orange-600">
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={o => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sales Return Memo</DialogTitle>
            <DialogDescription>Provide a clear reason (minimum 10 characters).</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            onKeyDown={onEnterNext as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>}
            placeholder="Why is this memo being rejected?"
            className="min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground">
            {rejectReason.trim().length}/10 characters minimum
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewMemo} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          {viewMemo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileMinus className="h-5 w-5 text-orange-500" />
                  {viewMemo.memo_no}
                </DialogTitle>
                <DialogDescription>
                  Raised on {viewMemo.memo_date} by {viewMemo.raised_by_person_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Customer:</span> {viewMemo.customer_name}</div>
                  <div><span className="text-muted-foreground">Invoice:</span> {viewMemo.against_invoice_no}</div>
                  <div><span className="text-muted-foreground">Reason:</span> {viewMemo.reason}</div>
                  <div><span className="text-muted-foreground">Total:</span> ₹{viewMemo.total_amount.toLocaleString('en-IN')}</div>
                </div>
                {viewMemo.reason_note && (
                  <div className="bg-muted/30 rounded p-2 text-xs">
                    <p className="font-semibold mb-1">Notes</p>
                    {viewMemo.reason_note}
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Rate</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewMemo.items.map(it => (
                      <TableRow key={it.id}>
                        <TableCell className="text-xs">{it.item_name}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{it.qty}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{it.rate.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{it.amount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {viewMemo.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs">
                    <p className="font-semibold mb-1 text-destructive">Rejection reason</p>
                    {viewMemo.rejection_reason}
                  </div>
                )}
                {viewMemo.approval_notes && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs">
                    <p className="font-semibold mb-1 text-blue-700">Approval notes</p>
                    {viewMemo.approval_notes}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalesReturnMemoRegisterPage() {
  return <SalesReturnMemoRegisterPanel entityCode="SMRT" />;
}
