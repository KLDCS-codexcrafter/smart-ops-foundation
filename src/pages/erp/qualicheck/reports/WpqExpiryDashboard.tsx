/**
 * @file        src/pages/erp/qualicheck/reports/WpqExpiryDashboard.tsx
 * @purpose     Lists WPQs expiring within 30 days · ASME IX QW-322
 * @who         Welding Engineer · QA Manager
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.5.c-T2-AuditFix
 * @iso         25010 Performance Efficiency · ASME IX QW-322
 * @whom        Operations Lead
 * @decisions   D-NEW-BN · F-3 perf memoization
 * @disciplines FR-30 · FR-50 (entity scoping) · FR-23
 * @reuses      welder-engine.listExpiringWpqs · listWelders
 * @[JWT]       reads erp_wpq_${entityCode} · erp_welder_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listExpiringWpqs, listWelders } from '@/lib/welder-engine';
import { WELDING_STANDARD_LABELS, type Welder } from '@/types/welder';

export function WpqExpiryDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);

  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // F-3 · O(1) per-row welder lookup · single listWelders call per (entityCode, version)
  const welderById = useMemo<Map<string, Welder>>(() => {
    void version;
    const map = new Map<string, Welder>();
    for (const w of listWelders(entityCode)) map.set(w.id, w);
    return map;
  }, [entityCode, version]);

  const expiring = useMemo(() => {
    void version;
    return listExpiringWpqs(entityCode, 30);
  }, [entityCode, version]);

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WPQ Expiry · Next 30 Days</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per ASME IX QW-322 · Entity {entityCode}
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Expiring Qualifications ({expiring.length})</CardTitle></CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WPQ expiring in the next 30 days.</p>
          ) : (
            <div className="divide-y">
              {expiring.map((w) => {
                const welder = welderById.get(w.related_welder_id);
                const days = Math.ceil(
                  (new Date(w.qualified_through).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
                );
                return (
                  <div key={w.id} className="py-3 grid grid-cols-5 text-sm items-center">
                    <span className="font-mono">{w.wpq_no}</span>
                    <span>{welder?.full_name ?? w.related_welder_id}</span>
                    <Badge variant="outline">{WELDING_STANDARD_LABELS[w.standard]}</Badge>
                    <span className="font-mono">{w.qualified_through.slice(0, 10)}</span>
                    <Badge variant={days < 7 ? 'destructive' : 'secondary'}>
                      {days <= 0 ? 'Expired' : `${days} days`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
