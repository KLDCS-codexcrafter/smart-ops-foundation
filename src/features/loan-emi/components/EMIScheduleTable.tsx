/**
 * @file     EMIScheduleTable.tsx
 * @purpose  Actionable EMI schedule for a Borrowing ledger. Summary strip,
 *           regenerate button, status-coloured rows, per-row actions.
 *           Replaces the read-only S6.5b EMIPreviewModal in BorrowingLedgerPanel
 *           Step 4.
 * @sprint   T-H1.5-D-D1
 */
import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEMISchedule } from '../hooks/useEMISchedule';
import { EMIRowActionsMenu } from './EMIRowActionsMenu';
import type { EMIStatus } from '../lib/emi-lifecycle-engine';

interface Props {
  ledgerId: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const STATUS_BADGE: Record<EMIStatus, string> = {
  scheduled: 'bg-muted text-muted-foreground border-border',
  due:       'bg-amber-500/10 text-amber-700 border-amber-500/30',
  paid:      'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  partial:   'bg-blue-500/10 text-blue-700 border-blue-500/30',
  overdue:   'bg-red-500/10 text-red-700 border-red-500/30',
  bounced:   'bg-red-500/20 text-red-800 border-red-600/40',
};

export function EMIScheduleTable({ ledgerId }: Props) {
  const { rows, summary, markPaid, markBounced, addNote, regenerate, loaded } = useEMISchedule(ledgerId);
  const [regenOpen, setRegenOpen] = useState(false);
  const [principal, setPrincipal] = useState(0);
  const [rate, setRate] = useState(0);
  const [tenure, setTenure] = useState(0);
  const [firstEmiDate, setFirstEmiDate] = useState('');

  if (!loaded) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Loan record not found.
      </div>
    );
  }

  const submitRegenerate = () => {
    regenerate({
      principal, annualRatePercent: rate, tenureMonths: tenure, firstEmiDate,
    });
    setRegenOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat label="Total EMIs" value={summary.total} />
          <Stat label="Paid" value={summary.paid} tone="emerald" />
          <Stat label="Due" value={summary.due} tone="amber" />
          <Stat label="Overdue" value={summary.overdue} tone="red" />
          <Stat label="Bounced" value={summary.bounced} tone="red" />
          <Stat label="Scheduled" value={summary.scheduled} />
          <Stat label="Outstanding" value={fmt(summary.outstandingAmount)} mono />
          <Stat
            label="Next Due"
            value={summary.nextDueDate
              ? `${summary.nextDueDate} · ${fmt(summary.nextDueAmount)}`
              : '—'}
            mono
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRegenOpen(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" variant="outline" className="gap-1.5" disabled>
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming in D2</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No EMI schedule yet. Click Regenerate to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs text-right">Principal</TableHead>
                <TableHead className="text-xs text-right">Interest</TableHead>
                <TableHead className="text-xs text-right">Total EMI</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={`emi-${r.emiNumber}`}>
                  <TableCell className="text-xs font-mono">{r.emiNumber}</TableCell>
                  <TableCell className="text-xs font-mono">{r.dueDate}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{fmt(r.principalPortion)}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{fmt(r.interestPortion)}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{fmt(r.totalEMI)}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{fmt(r.closingBalance)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                      {r.bouncedCount > 1 && ` ×${r.bouncedCount}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <EMIRowActionsMenu
                      row={r}
                      onMarkPaid={markPaid}
                      onMarkBounced={markBounced}
                      onAddNote={addNote}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Regenerate Dialog */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate EMI Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Warning: regenerating will overwrite all existing rows including paid history. Use only when restructuring.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Principal (₹)</Label>
                <Input type="number" value={principal}
                  onChange={e => setPrincipal(Number(e.target.value) || 0)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Annual Rate (%)</Label>
                <Input type="number" step="0.01" value={rate}
                  onChange={e => setRate(Number(e.target.value) || 0)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Tenure (months)</Label>
                <Input type="number" value={tenure}
                  onChange={e => setTenure(Number(e.target.value) || 0)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">First EMI Date</Label>
                <Input type="date" value={firstEmiDate}
                  onChange={e => setFirstEmiDate(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>Cancel</Button>
            <Button onClick={submitRegenerate}
              disabled={principal <= 0 || tenure <= 0 || !firstEmiDate}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number | string;
  tone?: 'emerald' | 'amber' | 'red';
  mono?: boolean;
}

function Stat({ label, value, tone, mono }: StatProps) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'amber'   ? 'text-amber-700' :
    tone === 'red'     ? 'text-red-700' : '';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${toneClass}`}>{value}</p>
    </div>
  );
}
