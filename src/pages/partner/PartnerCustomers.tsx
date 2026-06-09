/**
 * PartnerCustomers.tsx — list mirroring salesman-customers UI pattern.
 * Tenant · plan · MRR · status · renewal date.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getPartnerCustomers } from '@/lib/partner-portal-engine';

function fmtINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function PartnerCustomers() {
  const customers = getPartnerCustomers();
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        c.tenant_name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [customers, q],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Customers</h1>
        <p className="text-sm text-muted-foreground">
          Tenants you have onboarded · {customers.length} total.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">Customer book</CardTitle>
            <Input
              placeholder="Search tenant..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No customers match the search.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Tenant</th>
                    <th className="text-left py-2 px-3">Plan</th>
                    <th className="text-right py-2 px-3">MRR</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Onboarded</th>
                    <th className="text-left py-2 px-3">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-medium">{c.tenant_name}</td>
                      <td className="py-2 px-3 capitalize">{c.plan}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(c.mrr_paise)}</td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={c.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{fmtDate(c.onboarded_at)}</td>
                      <td className="py-2 px-3 font-mono text-xs">{fmtDate(c.renewal_date)}</td>
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
