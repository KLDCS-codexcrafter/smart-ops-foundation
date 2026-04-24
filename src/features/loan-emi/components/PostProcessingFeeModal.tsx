/**
 * @file     PostProcessingFeeModal.tsx
 * @purpose  Preview-then-commit modal for posting one-time loan processing
 *           fee. Shows base + GST split before commit. Idempotent — re-runs
 *           are blocked by processing-fee periodKey in accrualLog.
 * @sprint   T-H1.5-D-D4
 * @finding  CC-065
 */

import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { splitChargeWithGST } from '../engines/gst-charge-engine';
import { postProcessingFee } from '../engines/processing-fee-engine';

const STORAGE_KEY = 'erp_group_ledger_definitions';

interface BorrowingPreview {
  id: string;
  name: string;
  processingFee?: number;
  processingFeeGst?: number;
  gstOnChargesApplicable?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  ledgerId: string;
  entityCode: string;
  onPosted?: (voucherNo: string) => void;
}

const fmt = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loadBorrowing(ledgerId: string): BorrowingPreview | null {
  try {
    // [JWT] GET /api/accounting/ledger-definitions/:id
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as BorrowingPreview[];
    return all.find(l => l.id === ledgerId) ?? null;
  } catch {
    return null;
  }
}

export function PostProcessingFeeModal({
  open, onClose, ledgerId, entityCode, onPosted,
}: Props) {
  const ledger = useMemo(() => (open ? loadBorrowing(ledgerId) : null), [open, ledgerId]);

  const baseFee = ledger?.processingFee ?? 0;
  const gstSpec = useMemo(
    () => splitChargeWithGST(
      {
        id: ledger?.id ?? '',
        name: ledger?.name ?? '',
        gstOnChargesApplicable: ledger?.gstOnChargesApplicable,
        processingFeeGst: ledger?.processingFeeGst,
      },
      baseFee,
    ),
    [ledger, baseFee],
  );

  const handlePost = (): void => {
    const result = postProcessingFee(ledgerId, entityCode);
    if (result.posted && result.voucherNo) {
      toast.success(`Processing fee posted — voucher ${result.voucherNo}`);
      onPosted?.(result.voucherNo);
      onClose();
    } else {
      toast.error(result.skipReason ?? 'Failed to post processing fee');
    }
  };

  if (!ledger) {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Processing Fee</DialogTitle>
            <DialogDescription>Borrowing ledger not found.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const canPost = baseFee > 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Post Processing Fee
          </DialogTitle>
          <DialogDescription>
            One-time posting at loan disbursement. This is idempotent — re-runs are blocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan</span>
            <span className="font-medium">{ledger.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Fee</span>
            <span className="font-mono">{fmt(baseFee)}</span>
          </div>
          {gstSpec.applicable ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  IGST @ {gstSpec.rateApplied}%
                </span>
                <span className="font-mono">{fmt(gstSpec.igstAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{fmt(gstSpec.totalWithTax)}</span>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{fmt(baseFee)}</span>
              </div>
              <Badge variant="outline" className="text-xs">GST not applicable on this loan</Badge>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Voucher will be posted as:</div>
          <div className="font-mono pl-2">
            Dr Loan Processing Fees{'\u00A0\u00A0'}{fmt(baseFee)}<br />
            {gstSpec.applicable && (
              <>
                Dr Input IGST{'\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}{fmt(gstSpec.igstAmount)}<br />
              </>
            )}
            {'\u00A0\u00A0\u00A0\u00A0'}Cr {ledger.name}{'\u00A0\u00A0'}{fmt(gstSpec.totalWithTax)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePost} disabled={!canPost}>Post Voucher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
