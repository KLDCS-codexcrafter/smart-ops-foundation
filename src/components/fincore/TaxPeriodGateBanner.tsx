/**
 * @file     TaxPeriodGateBanner.tsx — Compliance banner for transaction forms
 * @sprint   T-Phase-1.2.6d-hdr · OOB-13 · Compliance team awareness
 * @purpose  Displays current FY + period-lock status + GST filing due dates
 *           at top of every transaction form. Operators always know what
 *           tax period they are posting to and whether a return is imminent.
 *
 *  Color-coded urgency: amber if < 7 days, red if < 3 days or overdue,
 *  green "Posting allowed" when not locked.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { isPeriodLocked, getPeriodLock } from '@/lib/period-lock-engine';
import { fyForDate, quarterForDate } from '@/lib/fy-helpers';

interface Props {
  entityCode: string;
  /** Date the user is posting against (defaults to today). YYYY-MM-DD or ISO. */
  voucherDate?: string;
}

function daysUntil(target: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - today.getTime()) / 86_400_000);
}

type Tone = 'default' | 'secondary' | 'destructive' | 'outline';
function urgencyTone(days: number): Tone {
  if (days < 0) return 'destructive';
  if (days <= 3) return 'destructive';
  if (days <= 7) return 'default';
  return 'secondary';
}

export function TaxPeriodGateBanner({ entityCode, voucherDate }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const dateToCheck = voucherDate && voucherDate.length >= 10 ? voucherDate : today;
  const isLocked = useMemo(
    () => isPeriodLocked(dateToCheck, entityCode),
    [dateToCheck, entityCode],
  );
  const lockConfig = useMemo(() => getPeriodLock(entityCode), [entityCode]);

  const todayDate = new Date();
  const gstr1Due = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 11);
  const gstr3bDue = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 20);
  const gstr1Days = daysUntil(gstr1Due);
  const gstr3bDays = daysUntil(gstr3bDue);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" className="font-mono">
            <Calendar className="h-3 w-3 mr-1" />
            {fyForDate(dateToCheck)} · {quarterForDate(dateToCheck)}
          </Badge>

          {isLocked && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Period locked
              {lockConfig?.lockedThrough ? ` through ${lockConfig.lockedThrough}` : ''}
            </Badge>
          )}

          <Badge variant={urgencyTone(gstr1Days)}>
            GSTR-1 due {fmt(gstr1Due)} · {gstr1Days < 0 ? 'OVERDUE' : `${gstr1Days}d left`}
          </Badge>
          <Badge variant={urgencyTone(gstr3bDays)}>
            GSTR-3B due {fmt(gstr3bDue)} · {gstr3bDays < 0 ? 'OVERDUE' : `${gstr3bDays}d left`}
          </Badge>

          {!isLocked && (
            <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" /> Posting allowed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
