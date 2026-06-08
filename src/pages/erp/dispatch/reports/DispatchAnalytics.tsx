/**
 * DispatchAnalytics.tsx — 023 · Dispatch analytics snapshot
 * Sprint A.4-Residual · CONSUMES existing dispatch stores via
 * buildDispatchAnalyticsSnapshot. Honest-empty when stores are empty.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { buildDispatchAnalyticsSnapshot } from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-bold font-mono">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function DispatchAnalyticsPanel() {
  const { entityCode } = useCardEntitlement();
  const snap = useMemo(() => buildDispatchAnalyticsSnapshot(entityCode), [entityCode]);

  return (
    <PageFloorShell
      title="Dispatch Analytics"
      subtitle="Read-only aggregation of existing dispatch stores · no fabricated metrics"
      isEmpty={snap.honest_empty}
      emptyMessage="No dispatch data yet. Issue a memo or set up packing materials."
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Delivery Memos</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Total" value={snap.delivery_memos.total} />
            <Tile label="Delivered" value={snap.delivery_memos.delivered} />
            <Tile label="In Transit" value={snap.delivery_memos.in_transit} />
            <Tile label="Pending" value={snap.delivery_memos.pending} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Samples (SOM)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile label="Total" value={snap.samples.total} />
            <Tile label="Refundable" value={snap.samples.refundable} />
            <Tile label="Non-refundable" value={snap.samples.non_refundable} />
            <Tile label="Returned" value={snap.samples.returned} />
            <Tile label="Pending Dispatch" value={snap.samples.pending_dispatch} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Demos (DOM)</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Tile label="Total" value={snap.demos.total} />
            <Tile label="Active" value={snap.demos.active} />
            <Tile label="Returned" value={snap.demos.returned} />
            <Tile label="Converted" value={snap.demos.converted} />
            <Tile label="Lost" value={snap.demos.lost} />
            <Tile label="Overdue" value={snap.demos.overdue} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Tile
            label="Packing Replenishment Alerts"
            value={snap.packing_replenishment_alerts}
            hint="Materials at or below reorder level"
          />
          <Tile
            label="Reusable Packing · Return Rate"
            value={`${snap.reusable_packing.return_rate_pct}%`}
            hint={`${snap.reusable_packing.returned}/${snap.reusable_packing.total} returned`}
          />
          <Tile
            label="Reusable Packing · Overdue"
            value={snap.reusable_packing.overdue}
            hint="Past return due date"
          />
        </div>

        <div className="text-[10px] text-muted-foreground font-mono">
          <Badge variant="outline" className="text-[10px] mr-2">snapshot</Badge>
          generated_at · {snap.generated_at}
        </div>
      </div>
    </PageFloorShell>
  );
}

export default DispatchAnalyticsPanel;
