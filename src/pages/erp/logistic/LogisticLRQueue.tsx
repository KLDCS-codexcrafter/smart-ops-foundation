/**
 * LogisticLRQueue.tsx — Transporter accepts/rejects LRs assigned to them.
 * Sprint 15c-2. Gold accent. Auto-seeds LRAcceptance from DLN vouchers
 * where voucher.transporter matches session.party_name.
 * [JWT] PATCH /api/logistic/lr-acceptances/:id
 */
import { useState, useEffect, useMemo } from 'react';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { getLogisticSession, recordLogisticActivity } from '@/lib/logistic-auth-engine';
import { lrAcceptancesKey, type LRAcceptance } from '@/types/logistic-portal';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function ageStyle(d: number): React.CSSProperties {
  if (d > 4) return { color: 'hsl(0 84% 60%)' };
  if (d > 2) return { color: 'hsl(38 92% 45%)' };
  if (d >= 1) return { color: 'hsl(142 71% 45%)' };
  return { color: 'hsl(215 16% 47%)' };
}

export default function LogisticLRQueue() {
  const session = getLogisticSession();
  const [list, setList] = useState<LRAcceptance[]>([]);
  const [acceptTarget, setAcceptTarget] = useState<LRAcceptance | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LRAcceptance | null>(null);
  const [acceptLR, setAcceptLR] = useState('');
  const [acceptDate, setAcceptDate] = useState(new Date().toISOString().slice(0, 10));
  const [acceptNotes, setAcceptNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('Not my LR');
  const [rejectNotes, setRejectNotes] = useState('');

  // Auto-seed on mount
  useEffect(() => {
    if (!session) return;
    const ent = session.entity_code;
    try {
      const existing: LRAcceptance[] = JSON.parse(localStorage.getItem(lrAcceptancesKey(ent)) ?? '[]');
      const allV: Voucher[] = JSON.parse(localStorage.getItem(vouchersKey(ent)) ?? '[]');
      const dlns = allV.filter(v =>
        v.base_voucher_type === 'Delivery Note' &&
        ((v.transporter ?? '').toLowerCase() === session.party_name.toLowerCase() ||
         v.transporter_id === session.logistic_id),
      );
      const existingIds = new Set(existing.map(e => e.dln_voucher_id));
      const seeds: LRAcceptance[] = [];
      const now = new Date().toISOString();
      for (const v of dlns) {
        if (existingIds.has(v.id)) continue;
        seeds.push({
          id: `lra-${v.id}`,
          logistic_id: session.logistic_id,
          entity_code: ent,
          dln_voucher_id: v.id,
          dln_voucher_no: v.voucher_no,
          lr_no: v.lr_no ?? null,
          lr_date: v.lr_date ?? null,
          status: 'awaiting',
          created_at: v.date ?? now,
          updated_at: now,
        });
      }
      if (seeds.length > 0) {
        const merged = [...existing, ...seeds];
        localStorage.setItem(lrAcceptancesKey(ent), JSON.stringify(merged));
        setList(merged.filter(l => l.logistic_id === session.logistic_id));
      } else {
        setList(existing.filter(l => l.logistic_id === session.logistic_id));
      }
    } catch { /* ignore */ }
  }, [session]);

  const groups = useMemo(() => ({
    awaiting: list.filter(l => l.status === 'awaiting'),
    accepted: list.filter(l => l.status === 'accepted'),
    rejected: list.filter(l => l.status === 'rejected'),
    invoiced: list.filter(l => l.status === 'invoiced'),
  }), [list]);

  if (!session) return <LogisticLayout><div /></LogisticLayout>;

  const persist = (next: LRAcceptance[]) => {
    try {
      const all: LRAcceptance[] = JSON.parse(localStorage.getItem(lrAcceptancesKey(session.entity_code)) ?? '[]');
      const others = all.filter(l => l.logistic_id !== session.logistic_id);
      localStorage.setItem(lrAcceptancesKey(session.entity_code), JSON.stringify([...others, ...next]));
      setList(next);
    } catch { toast.error('Failed to save'); }
  };

  const confirmAccept = () => {
    if (!acceptTarget) return;
    if (!acceptLR.trim() && !acceptTarget.lr_no) return toast.error('LR No is required');
    const now = new Date().toISOString();
    const next = list.map(l => l.id === acceptTarget.id ? {
      ...l, status: 'accepted' as const,
      lr_no: acceptLR.trim() || l.lr_no,
      lr_date: acceptDate,
      accepted_at: now, notes: acceptNotes, updated_at: now,
    } : l);
    persist(next);

    // Update DLN voucher with LR no if it was blank
    if (acceptLR.trim()) {
      try {
        const allV: Voucher[] = JSON.parse(localStorage.getItem(vouchersKey(session.entity_code)) ?? '[]');
        const idx = allV.findIndex(v => v.id === acceptTarget.dln_voucher_id);
        if (idx >= 0 && !allV[idx].lr_no) {
          allV[idx] = { ...allV[idx], lr_no: acceptLR.trim(), lr_date: acceptDate };
          localStorage.setItem(vouchersKey(session.entity_code), JSON.stringify(allV));
        }
      } catch { /* ignore */ }
    }
    recordLogisticActivity(session.logistic_id, session.entity_code, 'lr_accept', {
      ref_type: 'lr', ref_id: acceptTarget.id, ref_label: acceptTarget.dln_voucher_no,
    });
    setAcceptTarget(null); setAcceptLR(''); setAcceptNotes('');
    toast.success('LR accepted');
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) return toast.error('Reason is required');
    const now = new Date().toISOString();
    const next = list.map(l => l.id === rejectTarget.id ? {
      ...l, status: 'rejected' as const,
      rejection_reason: rejectReason, notes: rejectNotes, updated_at: now,
    } : l);
    persist(next);
    recordLogisticActivity(session.logistic_id, session.entity_code, 'lr_reject', {
      ref_type: 'lr', ref_id: rejectTarget.id, ref_label: rejectTarget.dln_voucher_no, notes: rejectReason,
    });
    setRejectTarget(null); setRejectNotes('');
    toast.success('LR rejected');
  };

  const renderTable = (items: LRAcceptance[], showActions: boolean) => (
    items.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No LRs in this status</p>
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">DLN No</TableHead>
            <TableHead className="text-xs">LR No</TableHead>
            <TableHead className="text-xs">Created</TableHead>
            <TableHead className="text-xs">Age</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            {showActions && <TableHead className="text-xs text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(l => {
            const d = ageDays(l.created_at);
            return (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.dln_voucher_no}</TableCell>
                <TableCell className="font-mono text-xs">{l.lr_no ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </TableCell>
                <TableCell className="text-xs font-mono" style={ageStyle(d)}>{d}d</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{l.status}</Badge></TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setAcceptTarget(l); setAcceptLR(l.lr_no ?? ''); }} className="h-7 text-[10px] gap-1">
                        <Check className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(l)} className="h-7 text-[10px] gap-1 text-destructive">
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <LogisticLayout title="LR Queue" subtitle="Accept the LRs assigned to you before invoicing">
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="awaiting">
            <TabsList>
              <TabsTrigger value="awaiting">Awaiting ({groups.awaiting.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({groups.accepted.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({groups.rejected.length})</TabsTrigger>
              <TabsTrigger value="invoiced">Invoiced ({groups.invoiced.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="awaiting" className="mt-4">{renderTable(groups.awaiting, true)}</TabsContent>
            <TabsContent value="accepted" className="mt-4">{renderTable(groups.accepted, false)}</TabsContent>
            <TabsContent value="rejected" className="mt-4">{renderTable(groups.rejected, false)}</TabsContent>
            <TabsContent value="invoiced" className="mt-4">{renderTable(groups.invoiced, false)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!acceptTarget} onOpenChange={(o) => !o && setAcceptTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Accept LR — {acceptTarget?.dln_voucher_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">LR No *</Label>
              <Input value={acceptLR} onChange={e => setAcceptLR(e.target.value)} className="font-mono text-xs" placeholder="Enter LR number" />
            </div>
            <div>
              <Label className="text-xs">Pickup Date</Label>
              <Input type="date" value={acceptDate} onChange={e => setAcceptDate(e.target.value)} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={acceptNotes} onChange={e => setAcceptNotes(e.target.value)} className="text-xs" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptTarget(null)}>Cancel</Button>
            <Button onClick={confirmAccept} style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject LR — {rejectTarget?.dln_voucher_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not my LR">Not my LR</SelectItem>
                  <SelectItem value="Incorrect pickup location">Incorrect pickup location</SelectItem>
                  <SelectItem value="Load refused">Load refused</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="text-xs" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Reject LR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LogisticLayout>
  );
}
