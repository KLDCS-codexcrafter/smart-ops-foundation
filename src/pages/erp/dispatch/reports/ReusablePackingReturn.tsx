/**
 * ReusablePackingReturn.tsx — 020 · Reusable packing return tracking
 * Sprint A.4-Residual · CONSUMES ReturnablePackaging via
 * dispatch-residual-engine.summarizeReusablePacking. Honest empty.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageFloorShell } from '@/components/shared/PageFloorShell';
import { summarizeReusablePacking } from '@/lib/dispatch-residual-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' | 'ok' }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-bold font-mono">
          {value}
          {tone && (
            <Badge
              variant={tone === 'warn' ? 'destructive' : 'outline'}
              className="ml-2 text-[10px] align-middle"
            >
              {tone}
            </Badge>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export function ReusablePackingReturnPanel() {
  const { entityCode } = useCardEntitlement();
  const s = useMemo(() => summarizeReusablePacking(entityCode), [entityCode]);

  return (
    <PageFloorShell
      title="Reusable Packing · Return Tracker"
      subtitle="Pallets / drums / crates · issued vs returned · sourced from ReturnablePackaging master"
      isEmpty={s.total === 0}
      emptyMessage="No reusable packaging units registered yet."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total Units" value={s.total} />
        <Tile label="In Stock" value={s.in_stock} />
        <Tile label="With Customer" value={s.with_customer} />
        <Tile label="Returned" value={s.returned} />
        <Tile label="Damaged" value={s.damaged} />
        <Tile label="Lost" value={s.lost} />
        <Tile label="Overdue" value={s.overdue} tone={s.overdue > 0 ? 'warn' : undefined} />
        <Tile label="Return Rate" value={`${s.return_rate_pct}%`} />
      </div>
    </PageFloorShell>
  );
}

export default ReusablePackingReturnPanel;
