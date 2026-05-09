/**
 * @file src/pages/erp/qulicheak/reports/WpqExpiryDashboard.tsx
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BN · ASME IX QW-322
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listExpiringWpqs, getWelderById } from '@/lib/welder-engine';
import { WELDING_STANDARD_LABELS } from '@/types/welder';

export function WpqExpiryDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const expiring = listExpiringWpqs(entityCode, 30);

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
                const welder = getWelderById(entityCode, w.related_welder_id);
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
