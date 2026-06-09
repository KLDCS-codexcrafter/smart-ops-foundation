/**
 * PartnerTargets.tsx — target vs actual progress (mirrors salesman-targets pattern).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getPartnerTargets } from '@/lib/partner-portal-engine';

export default function PartnerTargets() {
  const targets = getPartnerTargets();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Targets</h1>
        <p className="text-sm text-muted-foreground">
          Quarterly new-customer targets · mirrors salesman-target rollup.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {targets.map((t) => {
          const pct = t.target_count > 0
            ? Math.min(100, Math.round((t.actual_count / t.target_count) * 100))
            : 0;
          const hit = t.actual_count >= t.target_count;
          return (
            <Card key={t.period}>
              <CardHeader><CardTitle className="text-base">{t.period}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-mono">{t.actual_count}</span>
                  <span className="text-sm text-muted-foreground">/ {t.target_count}</span>
                </div>
                <Progress value={pct} />
                <p className={`text-xs ${hit ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {pct}% · {hit ? 'target met' : `${t.target_count - t.actual_count} to go`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
