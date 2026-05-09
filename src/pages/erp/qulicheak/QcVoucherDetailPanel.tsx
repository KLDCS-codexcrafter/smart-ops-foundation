/**
 * @file src/pages/erp/qulicheak/QcVoucherDetailPanel.tsx
 * @purpose Trident QCVVoucher field panel · rendered above QCEntryPage when variant=standard.
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block E
 * @decisions D-NEW-BQ wrapper precedent · Q-LOCK-3b
 * @disciplines FR-19 (QCEntryPage zero-touch) · FR-30
 */
import { Card, CardContent } from '@/components/ui/card';

export function QcVoucherDetailPanel(): JSX.Element {
  return (
    <Card className="mx-6">
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Voucher No</div>
            <div className="font-mono">—</div>
          </div>
          <div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono">—</div>
          </div>
          <div>
            <div className="text-muted-foreground">Inspector</div>
            <div className="font-mono">—</div>
          </div>
          <div>
            <div className="text-muted-foreground">Test Method</div>
            <div className="font-mono">—</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Trident voucher fields preview · entry happens in the panel below.
        </p>
      </CardContent>
    </Card>
  );
}
