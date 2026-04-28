/**
 * MobileManagerTargetsPage.tsx — All targets with achievement
 * Sprint T-Phase-1.1.1l-c · uses real SalesTarget + targetsKey
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type SalesTarget, targetsKey } from '@/pages/erp/salesx/masters/TargetMaster.types';
import { type Quotation, quotationsKey } from '@/types/quotation';
import { cn } from '@/lib/utils';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

const ACHIEVED_STAGES = new Set(['confirmed', 'proforma', 'sales_order']);
const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function paceTone(pct: number): string {
  if (pct >= 80) return 'bg-green-500/15 text-green-700 border-green-500/40';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-700 border-amber-500/40';
  return 'bg-red-500/15 text-red-700 border-red-500/40';
}

export default function MobileManagerTargetsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const rows = useMemo(() => {
    if (!session) return [];
    const targets = loadList<SalesTarget>(targetsKey(session.entity_code)).filter(t => t.is_active);
    const quotations = loadList<Quotation>(quotationsKey(session.entity_code));
    return targets.map(t => {
      const achieved = quotations
        .filter(q => ACHIEVED_STAGES.has(q.quotation_stage))
        .reduce((s, q) => s + (q.total_amount ?? 0), 0);
      const pct = t.target_value > 0 ? (achieved / t.target_value) * 100 : 0;
      return { t, achieved, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Team Targets</h1>
      </div>

      {rows.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Target className="h-8 w-8" />
          No active targets configured.
        </Card>
      )}

      <div className="space-y-2">
        {rows.map(r => (
          <Card key={r.t.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{r.t.person_name ?? 'Company-wide'}</p>
              <Badge variant="outline" className={cn('text-[10px]', paceTone(r.pct))}>
                {r.pct.toFixed(0)}%
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">{r.t.period_label} · {r.t.dimension}</p>
            <div className="text-[11px] font-mono">
              <span className="text-green-700 font-semibold">{fmtINR(r.achieved)}</span>
              <span className="text-muted-foreground"> / {fmtINR(r.t.target_value)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
