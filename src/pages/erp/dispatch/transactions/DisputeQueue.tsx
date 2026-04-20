/**
 * DisputeQueue.tsx — Sprint 15c-1
 * MODULE ID: dh-t-dispute-queue
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Send, Reply, Gavel, AlertTriangle, History, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import {
  type Dispute, type DisputeStatus, type MatchLine,
  disputesKey, matchLinesKey,
} from '@/types/freight-reconciliation';
import {
  applyTransition, validNextStatuses, createDisputeFromMatch,
} from '@/lib/dispute-workflow-engine';
import { type TransporterInvoice, transporterInvoicesKey } from '@/types/transporter-invoice';

interface LogisticLite { id: string; partyName: string }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
function nowISO() { return new Date().toISOString(); }
function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function ageColor(d: number): string {
  if (d < 3) return 'text-emerald-600';
  if (d < 7) return 'text-amber-600';
  return 'text-red-600';
}
function statusBadge(s: DisputeStatus) {
  const map: Record<DisputeStatus, string> = {
    raised: 'bg-blue-500/15 text-blue-600',
    under_review: 'bg-amber-500/15 text-amber-600',
    response_received: 'bg-purple-500/15 text-purple-600',
    resolved_in_favor_of_us: 'bg-emerald-500/15 text-emerald-600',
    resolved_in_favor_of_transporter: 'bg-muted text-muted-foreground',
    resolved_split: 'bg-emerald-500/15 text-emerald-600',
    escalated: 'bg-red-500/15 text-red-600',
    withdrawn: 'bg-muted text-muted-foreground',
  };
  return <Badge variant="outline" className={map[s]}>{s.replace(/_/g, ' ')}</Badge>;
}

export function DisputeQueuePanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [matches, setMatches] = useState<MatchLine[]>([]);
  const [invoices, setInvoices] = useState<TransporterInvoice[]>([]);
  const [logistics, setLogistics] = useState<LogisticLite[]>([]);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTransporter, setFilterTransporter] = useState('all');
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [transitionTo, setTransitionTo] = useState<DisputeStatus | null>(null);
  const [respText, setRespText] = useState('');
  const [respFrom, setRespFrom] = useState('');
  const [resAmt, setResAmt] = useState('');
  const [resNotes, setResNotes] = useState('');
  const [trNotes, setTrNotes] = useState('');

  const refresh = useCallback(() => {
    setDisputes(ls<Dispute>(disputesKey(entityCode)));
    setMatches(ls<MatchLine>(matchLinesKey(entityCode)));
    setInvoices(ls<TransporterInvoice>(transporterInvoicesKey(entityCode)));
    setLogistics(ls<LogisticLite>('erp_group_logistic_master'));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-create disputes from match lines flagged auto_decision='dispute' that don't yet have a dispute
  useEffect(() => {
    const existing = new Set(disputes.map(d => d.match_line_id));
    const toRaise = matches.filter(m => m.auto_decision === 'dispute' && !existing.has(m.id));
    if (toRaise.length === 0) return;
    const newOnes: Dispute[] = toRaise.map(m => {
      const inv = invoices.find(i => i.id === m.invoice_id);
      return createDisputeFromMatch(
        m, inv?.logistic_id ?? '', inv?.logistic_name ?? 'Unknown',
        userId,
      );
    });
    const all = ls<Dispute>(disputesKey(entityCode)).concat(newOnes);
    try {
      // [JWT] POST /api/dispatch/disputes
      localStorage.setItem(disputesKey(entityCode), JSON.stringify(all));
    } catch { /* ignore */ }
    setDisputes(all);
  }, [matches, invoices, disputes, userId, entityCode]);

  const filtered = useMemo(() => {
    return disputes.filter(d => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterTransporter !== 'all' && d.logistic_id !== filterTransporter) return false;
      return true;
    });
  }, [disputes, filterStatus, filterTransporter]);

  const kpis = useMemo(() => {
    const open = disputes.filter(d => d.status === 'raised' || d.status === 'under_review').length;
    const awaiting = disputes.filter(d =>
      d.status === 'under_review' && ageDays(d.raised_at) > 3,
    ).length;
    const valueOpen = disputes
      .filter(d => !d.status.startsWith('resolved') && d.status !== 'withdrawn')
      .reduce((s, d) => s + d.amount_in_dispute, 0);
    const monthStart = new Date(); monthStart.setDate(1);
    const resolvedMonth = disputes.filter(d =>
      d.resolved_at && new Date(d.resolved_at) >= monthStart,
    ).length;
    return { open, awaiting, valueOpen, resolvedMonth };
  }, [disputes]);

  const writeDisputes = (next: Dispute[]) => {
    try {
      // [JWT] PATCH /api/dispatch/disputes
      localStorage.setItem(disputesKey(entityCode), JSON.stringify(next));
    } catch { /* ignore */ }
    setDisputes(next);
  };

  const handleTransition = () => {
    if (!activeDispute || !transitionTo) return;
    const result = applyTransition({
      dispute: activeDispute, to: transitionTo, by: userId,
      notes: trNotes || undefined,
      response_text: respText || undefined,
      response_from: respFrom || undefined,
      resolution_amount: resAmt ? Number(resAmt) : undefined,
      resolution_notes: resNotes || undefined,
    });
    if (!result.ok) { toast.error(result.reason); return; }
    const next = disputes.map(d => d.id === activeDispute.id ? result.dispute : d);
    writeDisputes(next);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub', moduleId: 'dh-t-dispute-queue',
      action: 'master_save', refType: 'dispute', refId: activeDispute.id,
      refLabel: `Dispute → ${transitionTo}`,
    });
    toast.success(`Dispute transitioned to ${transitionTo.replace(/_/g, ' ')}`);
    setTransitionTo(null); setActiveDispute(null);
    setRespText(''); setRespFrom(''); setResAmt(''); setResNotes(''); setTrNotes('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Freight Disputes</h2>
          <p className="text-xs text-muted-foreground">State machine · Escalation tracking · Audit trail</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Open Disputes</p>
          <p className="text-2xl font-mono font-bold text-blue-600">{kpis.open}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Awaiting Response (&gt;3d)</p>
          <p className="text-2xl font-mono font-bold text-amber-600">{kpis.awaiting}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Value in Dispute</p>
          <p className="text-2xl font-mono font-bold text-red-600">{fmtINR(kpis.valueOpen)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Resolved This Month</p>
          <p className="text-2xl font-mono font-bold text-emerald-600">{kpis.resolvedMonth}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-3 flex gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="raised">Raised</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="response_received">Response received</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="resolved_in_favor_of_us">Resolved (us)</SelectItem>
            <SelectItem value="resolved_in_favor_of_transporter">Resolved (transporter)</SelectItem>
            <SelectItem value="resolved_split">Resolved split</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTransporter} onValueChange={setFilterTransporter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All transporters</SelectItem>
            {logistics.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.partyName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent></Card>

      {/* Table */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispute ID</TableHead>
              <TableHead>LR No</TableHead>
              <TableHead>Transporter</TableHead>
              <TableHead>Raised</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No disputes. Reconcile invoices in the Inbox to auto-raise disputes from over-billed/ghost lines.
              </TableCell></TableRow>
            )}
            {filtered.map(d => {
              const age = ageDays(d.raised_at);
              const next = validNextStatuses(d.status);
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id.slice(0, 12)}</TableCell>
                  <TableCell className="font-mono text-xs">{d.lr_no}</TableCell>
                  <TableCell className="text-xs">{d.logistic_name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.raised_at.slice(0, 10)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(d.amount_in_dispute)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{d.variance_pct.toFixed(1)}%</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell className={`font-mono text-xs ${ageColor(age)}`}>{age}d</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setActiveDispute(d)} title="View history">
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      {next.includes('under_review') && (
                        <Button size="sm" variant="ghost" title="Notify transporter"
                          onClick={() => { setActiveDispute(d); setTransitionTo('under_review'); }}>
                          <Send className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      )}
                      {next.includes('response_received') && (
                        <Button size="sm" variant="ghost" title="Record response"
                          onClick={() => { setActiveDispute(d); setTransitionTo('response_received'); }}>
                          <Reply className="h-3.5 w-3.5 text-purple-600" />
                        </Button>
                      )}
                      {(next.includes('resolved_in_favor_of_us') ||
                        next.includes('resolved_in_favor_of_transporter') ||
                        next.includes('resolved_split')) && (
                        <Button size="sm" variant="ghost" title="Resolve"
                          onClick={() => { setActiveDispute(d); setTransitionTo('resolved_in_favor_of_us'); }}>
                          <Gavel className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      )}
                      {next.includes('escalated') && (
                        <Button size="sm" variant="ghost" title="Escalate"
                          onClick={() => { setActiveDispute(d); setTransitionTo('escalated'); }}>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      )}
                      {next.includes('withdrawn') && (
                        <Button size="sm" variant="ghost" title="Withdraw"
                          onClick={() => { setActiveDispute(d); setTransitionTo('withdrawn'); }}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Detail / transition dialog */}
      <Dialog open={!!activeDispute} onOpenChange={(b) => { if (!b) { setActiveDispute(null); setTransitionTo(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {activeDispute && (
            <>
              <DialogHeader>
                <DialogTitle>Dispute · {activeDispute.lr_no}</DialogTitle>
                <DialogDescription>{activeDispute.logistic_name} · {activeDispute.dispute_reason}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><p className="text-muted-foreground">Amount</p><p className="font-mono font-bold">{fmtINR(activeDispute.amount_in_dispute)}</p></div>
                <div><p className="text-muted-foreground">Variance</p><p className="font-mono">{activeDispute.variance_pct.toFixed(1)}%</p></div>
                <div><p className="text-muted-foreground">Status</p><p>{statusBadge(activeDispute.status)}</p></div>
              </div>

              {transitionTo && transitionTo !== 'under_review' && transitionTo !== 'withdrawn' && transitionTo !== 'escalated' && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-semibold">Transition → {transitionTo.replace(/_/g, ' ')}</p>
                  {transitionTo === 'response_received' && (
                    <>
                      <div>
                        <Label className="text-xs">Response from (name)</Label>
                        <Input value={respFrom} onChange={e => setRespFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Response text</Label>
                        <Textarea value={respText} onChange={e => setRespText(e.target.value)} />
                      </div>
                    </>
                  )}
                  {transitionTo.startsWith('resolved') && (
                    <>
                      <div>
                        <Label className="text-xs">Resolution outcome</Label>
                        <Select value={transitionTo} onValueChange={(v) => setTransitionTo(v as DisputeStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resolved_in_favor_of_us">In our favor</SelectItem>
                            <SelectItem value="resolved_in_favor_of_transporter">In transporter&apos;s favor</SelectItem>
                            <SelectItem value="resolved_split">Split</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Final agreed amount (₹)</Label>
                        <Input type="number" value={resAmt} onChange={e => setResAmt(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Resolution notes</Label>
                        <Textarea value={resNotes} onChange={e => setResNotes(e.target.value)} />
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-xs">Internal notes</Label>
                    <Textarea value={trNotes} onChange={e => setTrNotes(e.target.value)} />
                  </div>
                </div>
              )}

              {transitionTo && (transitionTo === 'under_review' || transitionTo === 'escalated' || transitionTo === 'withdrawn') && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-semibold">Transition → {transitionTo.replace(/_/g, ' ')}</p>
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea value={trNotes} onChange={e => setTrNotes(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">History</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeDispute.history.map((e, i) => (
                    <div key={`${e.at}-${i}`} className="text-xs flex gap-2 border-l-2 border-blue-500/40 pl-2">
                      <span className="font-mono text-muted-foreground">{e.at.slice(0, 16).replace('T', ' ')}</span>
                      <span className="font-semibold">{e.action}</span>
                      <span>by {e.by}</span>
                      {e.notes && <span className="text-muted-foreground">— {e.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                {transitionTo && (
                  <Button onClick={handleTransition} className="bg-blue-600 hover:bg-blue-700">
                    Confirm transition
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
