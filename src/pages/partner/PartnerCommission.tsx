/**
 * PartnerCommission.tsx — statement via computePartnerCommission
 * (REUSES commission-engine semantics). Recurring + one-time per customer.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  computePartnerCommission,
  getPartnerCustomers,
  getPartnerProfile,
} from '@/lib/partner-portal-engine';

function fmtINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function PartnerCommission() {
  const profile = getPartnerProfile();
  const customers = getPartnerCustomers();
  const statement = useMemo(
    () => computePartnerCommission(profile, customers),
    [profile, customers],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Commission Statement</h1>
          <p className="text-sm text-muted-foreground">
            Period {statement.period_label} · tier {profile.tier} ({statement.tier_pct}%).
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {statement.delegation_note}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs text-muted-foreground">Recurring (MRR × tier %)</p>
            <p className="text-2xl font-bold font-mono">{fmtINR(statement.recurring_total_paise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs text-muted-foreground">One-time (new licenses ≤30d)</p>
            <p className="text-2xl font-bold font-mono">{fmtINR(statement.one_time_total_paise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs text-muted-foreground">Grand total this period</p>
            <p className="text-2xl font-bold font-mono text-orange-600">{fmtINR(statement.grand_total_paise)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-customer breakdown</CardTitle></CardHeader>
        <CardContent>
          {statement.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No customers in scope this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Customer</th>
                    <th className="text-right py-2 px-3">Recurring</th>
                    <th className="text-right py-2 px-3">One-time</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.lines.map((l) => (
                    <tr key={l.customer_id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-medium">{l.tenant_name}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(l.recurring_paise)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(l.one_time_paise)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{fmtINR(l.total_paise)}</td>
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
