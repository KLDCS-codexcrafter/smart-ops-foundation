/**
 * @file     NotionalInterestRunModal.tsx
 * @purpose  Preview + commit UI for the monthly notional-interest run.
 *           Calls planMonthlyNotional() on open, lets the user inspect the
 *           plan (already-posted rows are shown disabled), and commits via
 *           commitMonthlyNotional() with a result toast.
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calculator, CheckCircle2, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  planMonthlyNotional, commitMonthlyNotional,
  NOTIONAL_AGING_THRESHOLD_DAYS, NOTIONAL_ANNUAL_RATE_PERCENT,
  type NotionalPlanItem,
} from '../engines/notional-interest-engine';

interface Props {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function NotionalInterestRunModal({ open, onClose, onPosted }: Props) {
  const { entityCode } = useEntityCode();
  const [asOfDate, setAsOfDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [plan, setPlan] = useState<NotionalPlanItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !entityCode) return;
    setPlan(planMonthlyNotional(asOfDate, entityCode));
  }, [open, asOfDate, entityCode]);

  const summary = useMemo(() => {
    const toPost = plan.filter(p => !p.alreadyPosted);
    const total = toPost.reduce((s, p) => s + p.interestAmount, 0);
    return {
      toPostCount: toPost.length,
      alreadyCount: plan.length - toPost.length,
      totalInterest: Math.round(total * 100) / 100,
    };
  }, [plan]);

  const handleCommit = () => {
    if (!entityCode) return;
    setBusy(true);
    try {
      const res = commitMonthlyNotional(asOfDate, entityCode);
      if (res.errors.length > 0) {
        toast.error(`Posted ${res.posted}, ${res.errors.length} failed`);
      } else if (res.posted === 0) {
        toast.message('Nothing to post', { description: `${res.skipped} already posted this month` });
      } else {
        toast.success(`${res.posted} notional interest ${res.posted === 1 ? 'voucher' : 'vouchers'} posted`);
      }
      // Refresh plan so the just-posted rows flip to alreadyPosted
      setPlan(planMonthlyNotional(asOfDate, entityCode));
      onPosted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Run Monthly Notional Interest
          </DialogTitle>
          <DialogDescription>
            Imputes interest income at {NOTIONAL_ANNUAL_RATE_PERCENT}% p.a. on
            advances aged ≥ {NOTIONAL_AGING_THRESHOLD_DAYS} days.
            Idempotent per calendar month.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="notint-asof" className="text-xs">As of date</Label>
            <Input
              id="notint-asof"
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">To post</p>
              <p className="text-sm font-mono font-semibold text-primary">{summary.toPostCount}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">Already posted</p>
              <p className="text-sm font-mono font-semibold text-muted-foreground">{summary.alreadyCount}</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-[10px] text-muted-foreground">Interest total</p>
              <p className="text-sm font-mono font-semibold text-foreground">{fmt(summary.totalInterest)}</p>
            </div>
          </div>
        </div>

        {plan.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Info className="h-4 w-4" />
            No advances aged ≥ {NOTIONAL_AGING_THRESHOLD_DAYS} days to process for {asOfDate.slice(0, 7)}.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Advance</TableHead>
                  <TableHead className="text-xs">Party</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                  <TableHead className="text-xs text-right">Days Old</TableHead>
                  <TableHead className="text-xs text-right">Interest</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.map(p => (
                  <TableRow key={p.advanceId}>
                    <TableCell className="text-xs font-mono">{p.advanceRefNo}</TableCell>
                    <TableCell className="text-xs">{p.partyName}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{fmt(p.balanceAmount)}</TableCell>
                    <TableCell className="text-xs font-mono text-right">{p.daysOld}</TableCell>
                    <TableCell className="text-xs font-mono text-right font-semibold">{fmt(p.interestAmount)}</TableCell>
                    <TableCell>
                      {p.alreadyPosted ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Posted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button
            onClick={handleCommit}
            disabled={busy || summary.toPostCount === 0 || !entityCode}
          >
            {busy ? 'Posting…' : `Commit ${summary.toPostCount} ${summary.toPostCount === 1 ? 'voucher' : 'vouchers'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
