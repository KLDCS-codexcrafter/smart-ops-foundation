/**
 * @file     DuplicatePaymentWarningModal.tsx
 * @purpose  Warns user when a proposed Payment voucher matches recent
 *           postings (party + amount ±₹0.50 + date ±3d). User must
 *           explicitly click "Post Anyway" to proceed.
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DuplicateHit } from '../lib/duplicate-detector';

interface Props {
  open: boolean;
  hits: DuplicateHit[];
  proposedAmount: number;
  proposedPartyName: string;
  proposedDate: string;
  onConfirmProceed: () => void;
  onCancel: () => void;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try { return format(new Date(iso), 'dd MMM yyyy'); }
  catch { return iso; }
}

function daysAgoLabel(daysDiff: number): string {
  if (daysDiff === 0) return 'today';
  if (daysDiff < 0) return `${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? '' : 's'} ago`;
  return `${daysDiff} day${daysDiff === 1 ? '' : 's'} ahead`;
}

export function DuplicatePaymentWarningModal({
  open, hits, proposedAmount, proposedPartyName, proposedDate,
  onConfirmProceed, onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" /> Possible Duplicate Payment
          </DialogTitle>
          <DialogDescription>
            We found {hits.length} recent Payment voucher{hits.length === 1 ? '' : 's'} that look similar to the one you're about to post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {hits.map(hit => (
            <Card key={hit.voucherId} className="p-3 border-warning/30">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono">{formatDate(hit.date)} · {hit.voucherNo}</span>
                <span className="font-mono font-semibold">{formatINR(hit.amount)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {hit.partyName}{hit.narration ? ` · "${hit.narration}"` : ''}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {daysAgoLabel(hit.daysDiff)}
                {hit.amountDiff > 0 && ` · amount differs by ${formatINR(hit.amountDiff)}`}
              </div>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2 text-xs">
          <p>
            You are about to post <span className="font-mono font-semibold">{formatINR(proposedAmount)}</span>
            {' '}for <span className="font-semibold">{proposedPartyName}</span> on {formatDate(proposedDate)}.
          </p>
          <p className="text-muted-foreground">
            This is likely a DUPLICATE. Posting anyway would debit the bank twice and leave cash trapped in suspense at the lender.
          </p>
          <p className="text-muted-foreground">
            Recommended: Cancel and verify the earlier voucher first.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirmProceed}>Post Anyway (I verified)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
