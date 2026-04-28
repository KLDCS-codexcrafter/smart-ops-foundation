/**
 * MobileSalesmanTargetsPage.tsx — Target vs achievement (read-only)
 * Sprint T-Phase-1.1.1l-a · Reads DEMO_TARGETS shape from localStorage
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';

interface SalesTargetRow {
  id: string;
  sam_person_id: string;
  sam_person_name: string;
  period: string;
  target_amount: number;
  achieved_amount: number;
  status: string;
}

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadTargets(entityCode: string): SalesTargetRow[] {
  try {
    // [JWT] GET /api/salesx/targets
    const raw = localStorage.getItem(`erp_sales_targets_${entityCode}`);
    return raw ? (JSON.parse(raw) as SalesTargetRow[]) : [];
  } catch { return []; }
}

function paceTone(pct: number): string {
  if (pct >= 80) return 'bg-green-500/15 text-green-700 border-green-500/40';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-700 border-amber-500/40';
  return 'bg-red-500/15 text-red-700 border-red-500/40';
}

export default function MobileSalesmanTargetsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const myTargets = useMemo(() => {
    if (!session) return [];
    return loadTargets(session.entity_code).filter(t => t.sam_person_id === session.user_id);
  }, [session]);

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
            const pct = t.target_amount > 0 ? Math.min(100, (t.achieved_amount / t.target_amount) * 100) : 0;
            return (
              <Card key={t.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.period}</p>
                  <Badge variant="outline" className={`text-[10px] ${paceTone(pct)}`}>{pct.toFixed(0)}%</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                  <p>Target: ₹{t.target_amount.toLocaleString('en-IN')}</p>
                  <p>Achieved: ₹{t.achieved_amount.toLocaleString('en-IN')}</p>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={pct >= 80 ? 'h-full bg-green-500' : pct >= 50 ? 'h-full bg-amber-500' : 'h-full bg-red-500'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
