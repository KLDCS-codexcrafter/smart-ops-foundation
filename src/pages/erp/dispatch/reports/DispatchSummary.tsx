/**
 * @file        DispatchSummary.tsx
 * @purpose     Sprint 46 Pass 2 · B.1 · Dispatch Summary (4-KPI version per Q2=B1)
 *              13th ratified spec deviation (scorecards section dropped).
 * @module      dops-r-dispatch-summary
 * @reuses      deliveryMemosKey · inwardReceiptsKey (engines 0-DIFF)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Truck, FileCheck2, PackageCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { deliveryMemosKey, type DeliveryMemo } from '@/types/delivery-memo';
import { inwardReceiptsKey, type InwardReceipt } from '@/types/inward-receipt';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function todayStr(): string {
  // IST date YYYY-MM-DD prefix match (memos store ISO yyyy-mm-dd)
  return new Date().toISOString().slice(0, 10);
}

export function DispatchSummaryPanel(): JSX.Element {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [dms, setDms] = useState<DeliveryMemo[]>([]);
  const [inwards, setInwards] = useState<InwardReceipt[]>([]);

  useEffect(() => {
    setDms(ls<DeliveryMemo>(deliveryMemosKey(safeEntity)));
    setInwards(ls<InwardReceipt>(inwardReceiptsKey(safeEntity)));
  }, [safeEntity]);

  const kpis = useMemo(() => {
    const t = todayStr();
    const todays = dms.filter(d => (d.memo_date || '').startsWith(t)).length;
    const pendingPod = dms.filter(d => d.status === 'delivered' && !d.pod_reference).length;
    const inTransit = dms.filter(d => d.status === 'lr_assigned').length;
    const now = Date.now();
    const ewbRisk = inwards.filter(r => {
      if (!r.ewb_valid_till) return false;
      if (r.status === 'released' || r.status === 'rejected' || r.status === 'cancelled') return false;
      const hrs = (new Date(r.ewb_valid_till).getTime() - now) / 3_600_000;
      return hrs < 4;
    }).length;
    return { todays, pendingPod, inTransit, ewbRisk };
  }, [dms, inwards]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Dispatch Summary</h1>
          <p className="text-xs text-muted-foreground">Today's outward movement at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">Today's DMs</p>
            </div>
            <p className="text-3xl font-bold font-mono mt-2">{kpis.todays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCheck2 className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">Pending POD</p>
            </div>
            <p className="text-3xl font-bold font-mono mt-2 text-warning">{kpis.pendingPod}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PackageCheck className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">In-Transit</p>
            </div>
            <p className="text-3xl font-bold font-mono mt-2">{kpis.inTransit}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">EWB Risk ({'< 4h'})</p>
            </div>
            <p className="text-3xl font-bold font-mono mt-2 text-destructive">{kpis.ewbRisk}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2 h-7 text-xs"
              onClick={() => { window.location.href = '/erp/dispatch-hub#dh-r-ewb-monitor'; }}
            >
              Open EWB Monitor <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DispatchSummaryPanel;
