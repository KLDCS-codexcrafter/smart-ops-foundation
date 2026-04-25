/**
 * @file     AccrualRunModal.tsx
 * @purpose  Two-tab modal (Monthly Interest · Daily Penal) for previewing and
 *           committing D2 accrual runs. Each tab shows a plan from the engine
 *           (dry-run), then a Commit button posts standard FineCore Journal
 *           vouchers. Idempotency makes Commit safe to repeat.
 * @sprint   T-H1.5-D-D2
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  planMonthlyAccrual, commitMonthlyAccrual,
  type AccrualPlanItem,
} from '../engines/accrual-engine';
import {
  planDailyPenal, commitDailyPenal,
  type PenalPlanItem,
} from '../engines/penal-engine';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional — scope the preview/commit to a single Borrowing ledger. */
  ledgerId?: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function AccrualRunModal({ open, onClose, ledgerId }: Props) {
  const [tab, setTab] = useState<'monthly' | 'penal'>('monthly');
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [committing, setCommitting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (open) {
      setAsOfDate(todayIso());
      setTab('monthly');
      setRefreshTick(t => t + 1);
    }
  }, [open]);

  // Cleanup-1a: `refreshTick` is bumped on modal open (see useEffect above)
  // and after a successful commit to force a re-plan against fresh ledger
  // state — the plan functions read localStorage outside React's view.
  const monthlyPlan: AccrualPlanItem[] = useMemo(
    () => (open ? planMonthlyAccrual(asOfDate, ledgerId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, asOfDate, ledgerId, refreshTick],
  );
  const penalPlan: PenalPlanItem[] = useMemo(
    () => (open ? planDailyPenal(asOfDate, ledgerId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, asOfDate, ledgerId, refreshTick],
  );

  const monthlyNew = monthlyPlan.filter(p => !p.alreadyAccrued).length;
  const monthlySkip = monthlyPlan.length - monthlyNew;
  const penalNew = penalPlan.filter(p => !p.alreadyPosted).length;
  const penalSkip = penalPlan.length - penalNew;

  const commit = async () => {
    setCommitting(true);
    try {
      const entityCode = DEFAULT_ENTITY_SHORTCODE;
      if (tab === 'monthly') {
        const r = commitMonthlyAccrual(asOfDate, entityCode);
        if (r.errors.length > 0) {
          toast.error(`Posted ${r.posted}, ${r.errors.length} errors. ${r.errors[0].message}`);
        } else {
          toast.success(`Monthly accrual: ${r.posted} posted, ${r.skipped} skipped`);
        }
      } else {
        const r = commitDailyPenal(asOfDate, entityCode);
        if (r.errors.length > 0) {
          toast.error(`Posted ${r.posted}, ${r.errors.length} errors. ${r.errors[0].message}`);
        } else {
          toast.success(`Daily penal: ${r.posted} posted, ${r.skipped} skipped`);
        }
      }
      setRefreshTick(t => t + 1);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            Run Accrual
            {ledgerId && (
              <Badge variant="outline" className="text-[10px] ml-1">single loan</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">As of date</Label>
              <Input type="date" value={asOfDate} className="font-mono"
                onChange={e => setAsOfDate(e.target.value)} />
            </div>
            <p className="text-[10px] text-muted-foreground pb-2">
              Idempotent — safe to re-run; already-posted items are skipped.
            </p>
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as 'monthly' | 'penal')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="monthly">Monthly Interest ({monthlyPlan.length})</TabsTrigger>
              <TabsTrigger value="penal">Daily Penal ({penalPlan.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="mt-3">
              {monthlyPlan.length === 0 ? (
                <EmptyHint label="No EMIs eligible for monthly accrual on this date." />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Ledger</TableHead>
                        <TableHead className="text-xs">EMI #</TableHead>
                        <TableHead className="text-xs">Period</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs text-right">Interest</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyPlan.map(p => (
                        <TableRow key={`${p.ledgerId}-${p.periodKey}`}>
                          <TableCell className="text-xs">{p.ledgerName}</TableCell>
                          <TableCell className="text-xs font-mono">{p.emiNumber}</TableCell>
                          <TableCell className="text-xs font-mono">{p.periodKey}</TableCell>
                          <TableCell className="text-xs font-mono">{p.dueDate}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(p.interestAmount)}</TableCell>
                          <TableCell>
                            {p.alreadyAccrued
                              ? <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Already Accrued</Badge>
                              : <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">New</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Will post <span className="font-mono font-semibold">{monthlyNew}</span> new entries ·{' '}
                <span className="font-mono">{monthlySkip}</span> skipped (already accrued)
              </p>
            </TabsContent>

            <TabsContent value="penal" className="mt-3">
              {penalPlan.length === 0 ? (
                <EmptyHint label="No overdue EMIs with penal rate > 0 on this date." />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Ledger</TableHead>
                        <TableHead className="text-xs">EMI #</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs">Days OD</TableHead>
                        <TableHead className="text-xs text-right">Rate</TableHead>
                        <TableHead className="text-xs text-right">Penal</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {penalPlan.map(p => (
                        <TableRow key={`${p.ledgerId}-${p.periodKey}`}>
                          <TableCell className="text-xs">{p.ledgerName}</TableCell>
                          <TableCell className="text-xs font-mono">{p.emiNumber}</TableCell>
                          <TableCell className="text-xs font-mono">{p.dueDate}</TableCell>
                          <TableCell className="text-xs font-mono">{p.daysOverdue}d</TableCell>
                          <TableCell className="text-xs font-mono text-right">{p.penalRate.toFixed(3)}%</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(p.penalAmount)}</TableCell>
                          <TableCell>
                            {p.alreadyPosted
                              ? <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Already Posted</Badge>
                              : <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">New</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                Will post <span className="font-mono font-semibold">{penalNew}</span> new entries ·{' '}
                <span className="font-mono">{penalSkip}</span> skipped (already posted)
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={committing}>Close</Button>
          <Button onClick={commit} disabled={committing
            || (tab === 'monthly' ? monthlyNew === 0 : penalNew === 0)}>
            {committing
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <PlayCircle className="h-3.5 w-3.5 mr-1.5" />}
            Commit {tab === 'monthly' ? `${monthlyNew} Monthly` : `${penalNew} Penal`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
