/**
 * @file     CancellationDashboardWidget.tsx — Q3-d UPGRADED dashboard tile
 * @sprint   T-Phase-2.7-c · Card #2.7 sub-sprint 3 of 5
 * @purpose  This-month cancellation pulse for FineCoreMastersModule. Shows
 *           total + severity buckets · alerts when HIGH > 0 · drill-down to
 *           CancellationAuditRegister.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Ban } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  cancellationAuditLogKey,
  type CancellationAuditEntry,
} from '@/types/cancellation-audit-log';

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = now.toISOString();
  return { from, to };
}

export function CancellationDashboardWidget(): JSX.Element {
  const entityCode = useEntityCode();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CancellationAuditEntry[]>([]);

  useEffect(() => {
    try {
      // [JWT] GET /api/cancellation-audit-log?entityCode=:entityCode
      const raw = localStorage.getItem(cancellationAuditLogKey(entityCode));
      setEntries(raw ? (JSON.parse(raw) as CancellationAuditEntry[]) : []);
    } catch { setEntries([]); }
  }, [entityCode]);

  const { totals, hasHigh } = useMemo(() => {
    const { from, to } = thisMonthRange();
    const monthly = entries.filter(e => e.cancelled_at >= from && e.cancelled_at <= to);
    const high = monthly.filter(e => e.severity === 'high').length;
    const med  = monthly.filter(e => e.severity === 'med').length;
    const low  = monthly.filter(e => e.severity === 'low').length;
    return {
      totals: { all: monthly.length, high, med, low },
      hasHigh: high > 0,
    };
  }, [entries]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Cancellation Pulse · This Month
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/erp/finecore/registers/cancellation-audit-register')}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasHigh && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>{totals.high} HIGH-severity cancellation{totals.high === 1 ? '' : 's'}</strong>
              {' '}this month · IRN-bound invoices reversed · review immediately.
            </span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Total</div>
            <div className="text-2xl font-mono mt-1">{totals.all}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">High</div>
            <div className="mt-1">
              <Badge variant="destructive" className="font-mono">{totals.high}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Medium</div>
            <div className="mt-1">
              <Badge className="bg-warning/20 text-warning border-warning/40 font-mono">{totals.med}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Low</div>
            <div className="mt-1">
              <Badge variant="outline" className="font-mono">{totals.low}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
