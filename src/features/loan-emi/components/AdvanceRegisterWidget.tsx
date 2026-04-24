/**
 * @file     AdvanceRegisterWidget.tsx
 * @purpose  Command Center dashboard widget surfacing aged open advances.
 *           Closes leak L7 by giving aged advances visibility so users
 *           remember to link them during invoice entry.
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import { Wallet, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvanceRegister } from '../hooks/useAdvanceRegister';
import type { AgeBucket } from '../lib/advance-aging';

interface Props {
  onNavigate?: () => void;
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const BUCKET_TONE: Record<AgeBucket, string> = {
  '0-30d':   'bg-muted text-foreground border-border',
  '31-60d':  'bg-muted text-foreground border-border',
  '61-90d':  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  '91-180d': 'bg-destructive/10 text-destructive border-destructive/30',
  '180+d':   'bg-destructive/20 text-destructive border-destructive/40',
};

const BUCKET_LABEL: Record<AgeBucket, string> = {
  '0-30d':   '0-30 days',
  '31-60d':  '31-60 days',
  '61-90d':  '61-90 days',
  '91-180d': '91-180 days',
  '180+d':   '180+ days',
};

export function AdvanceRegisterWidget({ onNavigate }: Props) {
  const { aging } = useAdvanceRegister();

  const agedOver90 = aging.byBucket
    .filter(b => b.bucket === '91-180d' || b.bucket === '180+d')
    .reduce((sum, b) => sum + b.count, 0);

  if (aging.totalOpenCount === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Aged Advances</h3>
            <p className="text-xs text-muted-foreground">No open advances — good hygiene</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          When advances appear here, they will be aged into buckets so you can
          link them on the next invoice entry.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Aged Advances</h3>
            <p className="text-xs text-muted-foreground">
              {aging.totalOpenCount} open · {fmt(aging.totalOpenAmount)} stuck
            </p>
          </div>
        </div>
        {agedOver90 > 0 && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {agedOver90} over 90d
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 mb-4">
        {aging.byBucket.map(b => (
          <div
            key={b.bucket}
            className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${BUCKET_TONE[b.bucket]}`}
          >
            <span className="text-xs font-medium">{BUCKET_LABEL[b.bucket]}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">
                {b.count} {b.count === 1 ? 'advance' : 'advances'}
              </span>
              <span className="text-xs font-mono font-semibold">{fmt(b.totalAmount)}</span>
            </div>
          </div>
        ))}
      </div>

      {agedOver90 > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          {agedOver90} {agedOver90 === 1 ? 'advance is' : 'advances are'} aged
          beyond 90 days — consider adjustment or notional interest.
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onNavigate?.()}
      >
        View All Advances
        <ArrowRight className="h-3.5 w-3.5 ml-2" />
      </Button>
    </div>
  );
}
