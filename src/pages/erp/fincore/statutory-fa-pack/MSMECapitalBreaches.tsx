/**
 * MSMECapitalBreaches.tsx — FAR-1 (Sprint 65) · Section 43B(h) capital tracker
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { computeMSMECapitalBreaches } from '@/lib/msme-43bh-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

export function MSMECapitalBreachesPanel({ entityCode }: { entityCode: string }) {
  const fyStart = '2025-04-01';
  const fyEnd = '2026-03-31';
  const breaches = useMemo(
    () => computeMSMECapitalBreaches(entityCode, fyStart, fyEnd),
    [entityCode],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {breaches.length === 0
              ? <ShieldCheck className="h-5 w-5 text-success" />
              : <AlertTriangle className="h-5 w-5 text-destructive" />}
            MSME Capital Purchase Breaches · Section 43B(h)
          </h2>
          <p className="text-xs text-muted-foreground">
            45-day deadline · FY {fyStart} → {fyEnd}
          </p>
        </div>
        <Badge variant={breaches.length === 0 ? 'default' : 'destructive'} className="font-mono">
          {breaches.length} breach{breaches.length === 1 ? '' : 'es'}
        </Badge>
      </div>

      {breaches.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            No MSME capital-purchase breaches detected for this FY.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {breaches.map(b => (
            <Card key={b.assetId} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="font-mono">{b.assetId}</span>
                  <Badge variant="destructive">+{b.daysOverdue}d overdue</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs grid grid-cols-4 gap-3">
                <div><span className="text-muted-foreground">Vendor:</span> {b.vendorName}</div>
                <div><span className="text-muted-foreground">Purchase:</span> <span className="font-mono">{b.purchaseDate}</span></div>
                <div><span className="text-muted-foreground">Deadline:</span> <span className="font-mono">{b.deadlineDate}</span></div>
                <div><span className="text-muted-foreground">Disallowed:</span> <span className="font-mono font-bold">₹{b.disallowedInr.toLocaleString('en-IN')}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MSMECapitalBreaches() {
  const { entityCode } = useEntityCode();
  return <MSMECapitalBreachesPanel entityCode={entityCode || DEFAULT_ENTITY_SHORTCODE} />;
}
