/**
 * PartnerRenewals.tsx — upcoming 30/60/90d windows from getUpcomingRenewals.
 * Tally TSS-renewal style.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUpcomingRenewals } from '@/lib/partner-portal-engine';

function fmtINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const BUCKETS: Array<{ key: 30 | 60 | 90; label: string }> = [
  { key: 30, label: 'Next 30 days' },
  { key: 60, label: 'Next 60 days' },
  { key: 90, label: 'Next 90 days' },
];

export default function PartnerRenewals() {
  const [bucket, setBucket] = useState<30 | 60 | 90>(30);
  const renewals = useMemo(() => getUpcomingRenewals('KLDCS', bucket), [bucket]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Upcoming Renewals</h1>
        <p className="text-sm text-muted-foreground">
          Derived from each customer&apos;s renewal_date · Tally TSS-renewal model.
        </p>
      </div>
      <div className="flex gap-2">
        {BUCKETS.map((b) => (
          <Button
            key={b.key}
            variant={bucket === b.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBucket(b.key)}
            className={bucket === b.key ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {b.label}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{renewals.length} renewal(s) in window</CardTitle>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No renewals in this window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Tenant</th>
                    <th className="text-left py-2 px-3">Renewal date</th>
                    <th className="text-right py-2 px-3">Days</th>
                    <th className="text-right py-2 px-3">MRR</th>
                    <th className="text-left py-2 px-3">Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r) => (
                    <tr key={r.customer_id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-medium">{r.tenant_name}</td>
                      <td className="py-2 px-3 font-mono text-xs">{fmtDate(r.renewal_date)}</td>
                      <td className="py-2 px-3 text-right font-mono">{r.days_until}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(r.mrr_paise)}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{r.bucket}d</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
