/**
 * LogisticDisputes.tsx — Transporter responds to disputes raised against them.
 * Sprint 15c-2. Gold accent. Closes the 15c-1 dispute workflow loop.
 * [JWT] PATCH /api/dispatch/disputes/:id
 */
import { useState, useMemo } from 'react';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle, History } from 'lucide-react';
import { toast } from 'sonner';
import { getLogisticSession, recordLogisticActivity } from '@/lib/logistic-auth-engine';
import { disputesKey, type Dispute } from '@/types/freight-reconciliation';
import { applyTransition } from '@/lib/dispute-workflow-engine';

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function ageStyle(d: number): React.CSSProperties {
  if (d > 5) return { color: 'hsl(0 84% 60%)' };
  if (d >= 2) return { color: 'hsl(38 92% 45%)' };
  return { color: 'hsl(142 71% 45%)' };
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function LogisticDisputes() {
  const session = getLogisticSession();
  const [list, setList] = useState<Dispute[]>(() => {
    if (!session) return [];
    try {
      const all: Dispute[] = JSON.parse(localStorage.getItem(disputesKey(session.entity_code)) ?? '[]');
      return all.filter(d => d.logistic_id === session.logistic_id)
        .sort((a, b) => ageDays(b.raised_at) - ageDays(a.raised_at));
    } catch { return []; }
  });
  const [respondTarget, setRespondTarget] = useState<Dispute | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Dispute | null>(null);
  const [responseText, setResponseText] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [responseNotes, setResponseNotes] = useState('');

  const groups = useMemo(() => ({
    open:      list.filter(d => ['raised', 'under_review'].includes(d.status)),
    awaiting:  list.filter(d => d.status === 'under_review' && !d.response_text),
    responded: list.filter(d => d.status === 'response_received'),
    resolved:  list.filter(d =>
      ['resolved_in_favor_of_us', 'resolved_in_favor_of_transporter', 'resolved_split', 'withdrawn'].includes(d.status),
    ),
  }), [list]);

  const responseRate = list.length === 0 ? 0
    : Math.round((list.filter(d => d.response_text).length / list.length) * 100);

  if (!session) return <LogisticLayout><div /></LogisticLayout>;

  const persist = (next: Dispute[]) => {
    try {
      const all: Dispute[] = JSON.parse(localStorage.getItem(disputesKey(session.entity_code)) ?? '[]');
      const others = all.filter(d => d.logistic_id !== session.logistic_id);
      localStorage.setItem(disputesKey(session.entity_code), JSON.stringify([...others, ...next]));
      setList(next);
    } catch { toast.error('Failed to save'); }
  };

  const submitResponse = () => {
    if (!respondTarget) return;
    if (responseText.trim().length < 20) return toast.error('Response must be at least 20 characters');
    const result = applyTransition({
      dispute: respondTarget,
      to: 'response_received',
      by: session.party_name,
      notes: responseNotes,
      response_text: responseText.trim(),
      response_from: session.party_name,
      resolution_amount: counterAmount ? parseFloat(counterAmount) : undefined,
    });
    if (result.ok === false) {
      toast.error(result.reason);
      return;
    }
    const updatedDispute = result.dispute;
    const next = list.map(d => d.id === updatedDispute.id ? updatedDispute : d);
    persist(next);
    recordLogisticActivity(session.logistic_id, session.entity_code, 'dispute_response', {
      ref_type: 'dispute', ref_id: respondTarget.id, ref_label: respondTarget.lr_no,
    });
    toast.success('Response submitted');
    setRespondTarget(null); setResponseText(''); setCounterAmount(''); setResponseNotes('');
  };

  const renderTable = (items: Dispute[], allowRespond: boolean) => (
    items.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No disputes in this view</p>
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">LR No</TableHead>
            <TableHead className="text-xs">Reason</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs">Raised</TableHead>
            <TableHead className="text-xs">Age</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(d => {
            const age = ageDays(d.raised_at);
            const canRespond = allowRespond && d.status === 'under_review' && !d.response_text;
            return (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.lr_no}</TableCell>
                <TableCell className="text-xs max-w-xs truncate" title={d.dispute_reason}>{d.dispute_reason}</TableCell>
                <TableCell className="font-mono text-xs text-right">{fmt(d.amount_in_dispute)}</TableCell>
                <TableCell className="text-xs">
                  {new Date(d.raised_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </TableCell>
                <TableCell className="text-xs font-mono" style={ageStyle(age)}>{age}d</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {d.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {canRespond && (
                      <Button size="sm" variant="outline" onClick={() => setRespondTarget(d)}
                        className="h-7 text-[10px]"
                        style={{ background: 'hsl(48 96% 53% / 0.15)', color: 'hsl(38 92% 45%)' }}>
                        Respond
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(d)} className="h-7 text-[10px] gap-1">
                      <History className="h-3 w-3" /> History
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <LogisticLayout title="Disputes" subtitle="Respond to disputes raised against your invoices">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold font-mono mt-1">{groups.open.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awaiting Response</p>
            <p className="text-2xl font-bold font-mono mt-1">{groups.awaiting.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total in Dispute</p>
            <p className="text-2xl font-bold font-mono mt-1">{fmt(list.reduce((s, d) => s + d.amount_in_dispute, 0))}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Response Rate</p>
            <p className="text-2xl font-bold font-mono mt-1">{responseRate}%</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">Open ({groups.open.length})</TabsTrigger>
                <TabsTrigger value="awaiting">Awaiting My Response ({groups.awaiting.length})</TabsTrigger>
                <TabsTrigger value="responded">Responded ({groups.responded.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({groups.resolved.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-4">{renderTable(groups.open, true)}</TabsContent>
              <TabsContent value="awaiting" className="mt-4">{renderTable(groups.awaiting, true)}</TabsContent>
              <TabsContent value="responded" className="mt-4">{renderTable(groups.responded, false)}</TabsContent>
              <TabsContent value="resolved" className="mt-4">{renderTable(groups.resolved, false)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!respondTarget} onOpenChange={(o) => !o && setRespondTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Respond to Dispute — {respondTarget?.lr_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs p-3 rounded bg-muted/50">
              <p className="font-semibold">Reason raised:</p>
              <p className="text-muted-foreground">{respondTarget?.dispute_reason}</p>
              <p className="font-mono mt-2">Amount in dispute: {respondTarget && fmt(respondTarget.amount_in_dispute)}</p>
            </div>
            <div>
              <Label className="text-xs">Your response * (min 20 chars)</Label>
              <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} className="text-xs" rows={4} />
            </div>
            <div>
              <Label className="text-xs">Counter-offer amount (optional)</Label>
              <Input type="number" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} className="text-xs font-mono" />
            </div>
            <div>
              <Label className="text-xs">Internal notes (optional)</Label>
              <Textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} className="text-xs" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondTarget(null)}>Cancel</Button>
            <Button onClick={submitResponse} style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}>
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTarget} onOpenChange={(o) => !o && setHistoryTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispute History — {historyTarget?.lr_no}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {historyTarget?.history.map((h, i) => (
              <div key={i} className="border-l-2 border-border pl-3 py-1">
                <p className="text-xs font-semibold capitalize">{h.action.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {new Date(h.at).toLocaleString('en-IN')} · {h.by}
                </p>
                {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </LogisticLayout>
  );
}
