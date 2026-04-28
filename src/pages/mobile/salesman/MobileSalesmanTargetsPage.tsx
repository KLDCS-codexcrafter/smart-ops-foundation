/**
 * MobileSalesmanTargetsPage.tsx — Target vs achievement (read-only)
 * Sprint T-Phase-1.1.1l-a · Reuses real SalesTarget + targetsKey
 * Achievement is COMPUTED from confirmed/proforma/sales_order quotations
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
import { type Enquiry, enquiriesKey } from '@/types/enquiry';

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

function paceTone(pct: number): string {
  if (pct >= 80) return 'bg-green-500/15 text-green-700 border-green-500/40';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-700 border-amber-500/40';
  return 'bg-red-500/15 text-red-700 border-red-500/40';
}

const ACHIEVED_STAGES = new Set(['confirmed', 'proforma', 'sales_order']);

export default function MobileSalesmanTargetsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const targets = useMemo(
    () => session ? loadList<SalesTarget>(targetsKey(session.entity_code)) : [],
    [session],
  );
  const enquiries = useMemo(
    () => session ? loadList<Enquiry>(enquiriesKey(session.entity_code)) : [],
    [session],
  );
  const quotations = useMemo(
    () => session ? loadList<Quotation>(quotationsKey(session.entity_code)) : [],
    [session],
  );

  const myTargets = useMemo(
    () => targets.filter(t => t.is_active && t.person_id === session?.user_id),
    [targets, session],
  );

  const myEnquiryIds = useMemo(() =>
    new Set(enquiries.filter(e => e.assigned_executive_id === session?.user_id).map(e => e.id)),
    [enquiries, session],
  );

  const achievedValue = useMemo(() =>
    quotations
      .filter(q => q.enquiry_id && myEnquiryIds.has(q.enquiry_id) && ACHIEVED_STAGES.has(q.quotation_stage))
      .reduce((sum, q) => sum + q.total_amount, 0),
    [quotations, myEnquiryIds],
  );

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Targets</h1>
      </div>

      {myTargets.length === 0 ? (
        <Card className="p-6 text-center">
          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No targets assigned</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your sales manager.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myTargets.map(t => {
            const achieved = t.dimension === 'sales_value' ? achievedValue : 0;
            const pct = t.target_value > 0 ? Math.min(100, (achieved / t.target_value) * 100) : 0;
            return (
              <Card key={t.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.period_label}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {t.dimension.replace('_', ' ')} · {t.period}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${paceTone(pct)}`}>
                    {pct.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                  <p>Target: ₹{t.target_value.toLocaleString('en-IN')}</p>
                  <p>Achieved: ₹{achieved.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={pct >= 80 ? 'h-full bg-green-500' : pct >= 50 ? 'h-full bg-amber-500' : 'h-full bg-red-500'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {t.dimension !== 'sales_value' && (
                  <p className="text-[10px] text-amber-600">
                    Note: live tracking for this dimension is wired in Phase 2.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
