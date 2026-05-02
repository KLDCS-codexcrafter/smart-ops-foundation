/**
 * @file     IRNLockBanner.tsx — Q2-d read-only banner for IRN-locked records
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  Mounted ONLY in InvoiceMemo (D-127 voucher .tsx files unchanged ·
 *           they get engine-level reject from finecore-engine.ts).
 *           Renders nothing when the record isn't IRN-locked.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeIRNLockState, type IRNStatus } from '@/lib/irn-lock-engine';

interface IRNLockBannerProps {
  record: {
    irn?: string | null;
    irn_status?: IRNStatus;
    irn_ack_date?: string | null;
    posted_at?: string | null;
  };
  onCancelClick?: () => void;
}

export function IRNLockBanner({ record, onCancelClick }: IRNLockBannerProps): JSX.Element | null {
  const lock = computeIRNLockState(record);
  if (!lock.is_locked) return null;

  const remaining = lock.cancel_window_remaining_hours;
  const tone: 'red' | 'amber' | 'blue' = !lock.can_cancel || remaining <= 4
    ? 'red'
    : remaining <= 12 ? 'amber' : 'blue';

  const toneClass = tone === 'red'
    ? 'border-destructive/50 bg-destructive/10'
    : tone === 'amber'
      ? 'border-warning/50 bg-warning/10'
      : 'border-primary/40 bg-primary/5';

  const iconClass = tone === 'red'
    ? 'text-destructive'
    : tone === 'amber' ? 'text-warning' : 'text-primary';

  const countdownText = lock.can_cancel
    ? `${remaining.toFixed(1)}h remaining in 24-hour cancellation window`
    : '24h window expired · issue a Credit Note to reverse this invoice';

  return (
    <Card className={cn('border', toneClass)}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3 flex-wrap">
          <Lock className={cn('h-5 w-5 mt-0.5', iconClass)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">IRN Locked</span>
              {lock.irn && (
                <Badge variant="outline" className="font-mono text-[11px]">{lock.irn}</Badge>
              )}
              {!lock.can_cancel && (
                <Badge variant="destructive" className="text-[10px]">24h Expired</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              {lock.can_cancel ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {countdownText}
            </p>
          </div>
          {lock.can_cancel && onCancelClick && (
            <Button size="sm" variant="destructive" onClick={onCancelClick}>
              Cancel within Window
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
