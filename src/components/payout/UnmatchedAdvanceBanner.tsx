/**
 * @file     UnmatchedAdvanceBanner.tsx
 * @purpose  Proactive banner shown when a vendor has open/partial advances ·
 *           reusable across PayOut forms.
 * @sprint   T-T8.3-AdvanceIntel · Group B Sprint B.3
 * @whom     VendorPaymentEntry (B.3) · could be wrapped around PurchaseInvoice
 *           later via Option C wrapper without touching D-127 source.
 */
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUnmatchedAdvancesForVendor } from '@/lib/advance-tagger-engine';
import type { AdvanceEntry } from '@/types/compliance';

interface Props {
  entityCode: string;
  vendorId: string;
  onApplyAdvance?: (advance: AdvanceEntry) => void;
  onViewAll?: () => void;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function UnmatchedAdvanceBanner({
  entityCode,
  vendorId,
  onApplyAdvance,
  onViewAll,
}: Props) {
  const advances = useMemo(
    () => (vendorId ? getUnmatchedAdvancesForVendor(entityCode, vendorId) : []),
    [entityCode, vendorId],
  );

  if (advances.length === 0) return null;

  const total = advances.reduce((sum, a) => sum + a.balance_amount, 0);

  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <Wallet className="h-4 w-4 text-amber-600" />
      <AlertTitle className="flex items-center gap-2 text-xs">
        <span>Unmatched advance available for this vendor</span>
        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
          {advances.length} {advances.length === 1 ? 'advance' : 'advances'} · {fmt(total)}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-1.5 text-xs">
          {advances.slice(0, 3).map(a => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border border-amber-500/20 bg-background/40 px-2 py-1"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] truncate">{a.advance_ref_no}</span>
                <Badge variant="outline" className="text-[9px] capitalize">{a.status}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[11px] font-semibold">{fmt(a.balance_amount)}</span>
                {onApplyAdvance && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onApplyAdvance(a)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          ))}
          {advances.length > 3 && onViewAll && (
            <Button size="sm" variant="link" className="h-6 px-0 text-[11px]" onClick={onViewAll}>
              View all {advances.length} advances →
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default UnmatchedAdvanceBanner;
