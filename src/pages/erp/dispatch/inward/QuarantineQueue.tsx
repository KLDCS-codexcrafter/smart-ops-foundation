/**
 * QuarantineQueue.tsx — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block D
 * MODULE ID: dh-i-quarantine-queue
 * Lists all inward receipts in 'quarantine' status; supports release/reject transitions.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  ROUTING_DECISION_LABELS,
  type InwardReceipt, type InwardReceiptStatus,
} from '@/types/inward-receipt';
import { listQuarantineQueue, transitionInwardReceipt } from '@/lib/inward-receipt-engine';

export function QuarantineQueuePanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [rows, setRows] = useState<InwardReceipt[]>([]);
  const [active, setActive] = useState<InwardReceipt | null>(null);
  const [decision, setDecision] = useState<InwardReceiptStatus | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    setRows(listQuarantineQueue(entityCode));
    setLoading(false);
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const openDecision = (r: InwardReceipt, d: InwardReceiptStatus) => {
    setActive(r); setDecision(d); setReason('');
  };

  const apply = async () => {
    if (!active || !decision) return;
    try {
      await transitionInwardReceipt(active.id, decision, entityCode, userId, reason.trim() || undefined);
      toast.success(`Inward receipt ${active.receipt_no} → ${decision}`);
      setActive(null); setDecision(null); setReason('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transition failed');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Quarantine Queue</h1>
          <p className="text-xs text-muted-foreground">Inward receipts pending QA disposition</p>
        </div>
        <Badge variant="outline" className="ml-auto font-mono">{rows.length} pending</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Q-Lines</TableHead>
                <TableHead>Top Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No quarantine items</p>
                      <p className="text-xs">QA-routed receipts pending disposition will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.map(r => {
                const top = r.lines.find(l =>
                  l.routing_decision === 'quarantine' || l.routing_decision === 'inspection_required',
                );
                return (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{r.receipt_no}</TableCell>
                    <TableCell className="font-mono text-xs">{r.arrival_date}</TableCell>
                    <TableCell className="text-sm">{r.vendor_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.quarantine_lines}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {top ? `${ROUTING_DECISION_LABELS[top.routing_decision]} · ${top.routing_reason}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDecision(r, 'released')}
                          className="text-success border-success/30 hover:bg-success/10"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Release
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDecision(r, 'rejected')}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!active && !!decision} onOpenChange={(o) => { if (!o) { setActive(null); setDecision(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'released' ? 'Release from Quarantine' : 'Reject Inward Receipt'}
            </DialogTitle>
            <DialogDescription>
              {active?.receipt_no} · {active?.vendor_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={decision === 'released' ? 'Release reason / inspection notes (optional)' : 'Rejection reason (required)'}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActive(null); setDecision(null); }}>Cancel</Button>
            <Button
              onClick={apply}
              disabled={decision === 'rejected' && !reason.trim()}
              className={decision === 'released' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuarantineQueuePanel;
